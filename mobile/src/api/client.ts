  /**
   * API Client
   * Base HTTP client for making API requests with authentication and token refresh
   */

  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { ApiError, ApiResponse, RequestConfig, ApiClientConfig } from './types';
  import type { AuthResponse, User } from '../types/user';
  import { API_BASE_URL, STORAGE_KEYS } from '../constants/api';

  // Queue system for handling concurrent requests during token refresh
  let isRefreshing = false;
  let failedQueue: { resolve: (value?: any) => void; reject: (error?: any) => void }[] = [];

  // Track retry attempts to prevent infinite loops - key: request identifier, value: has retried
  const retryMap = new Map<string, boolean>();

  const processQueue = (error: any, token: string | null = null) => {
      failedQueue.forEach(({ resolve, reject }) => {
          if (error) {
              reject(error);
          } else {
              resolve(token);
          }
      });
      failedQueue = [];
  };

  class ApiClient {
    private baseURL: string;
    private defaultHeaders: Record<string, string>;
    private timeout: number;

    constructor(config: ApiClientConfig) {
      this.baseURL = config.baseURL;
      this.timeout = config.timeout || 2 * 60 * 1000; // 2 minutes default (matching web app)
      this.defaultHeaders = {
        'Content-Type': 'application/json',
        ...config.headers,
      };
    }

    /**
     * Build URL with query parameters
     */
    private buildURL(endpoint: string, params?: Record<string, string | number | boolean>): string {
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
      
      if (!params || Object.keys(params).length === 0) {
        return url;
      }

      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      const queryString = searchParams.toString();
      return queryString ? `${url}?${queryString}` : url;
    }

    /**
     * Handle API errors
     */
    private handleError(error: any, status?: number): ApiError {
      if (error instanceof Error) {
        return {
          message: error.message || 'An unexpected error occurred',
          status,
        };
      }

      if (error?.response) {
        const { status, data } = error.response;
        return {
          message: data?.message || `Request failed with status ${status}`,
          status,
          code: data?.code,
          errors: data?.errors,
        };
      }

      return {
        message: error?.message || 'Network error. Please check your connection.',
        status,
      };
    }

    /**
     * Get auth headers with token (async for AsyncStorage)
     */
    private async getAuthHeaders(): Promise<Record<string, string>> {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        return token ? { Authorization: `Bearer ${token}` } : {};
      } catch (error) {
        console.error('Error getting auth headers:', error);
        return {};
      }
    }

    /**
     * Handle token refresh - uses direct fetch to avoid recursion
     * This is critical to prevent infinite loops
     */
    private async refreshToken(): Promise<string | null> {
      try {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
          return null;
        }

        // IMPORTANT: Use direct fetch, NOT through apiClient to prevent infinite loop
        const refreshUrl = `${this.baseURL}/auth/refresh-tokens`;
        const response = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          throw new Error(`Token refresh failed with status ${response.status}`);
        }

        const authData: AuthResponse = await response.json();
        
        // Save new tokens
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.tokens.access.token);
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authData.tokens.refresh.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(authData.user));
        
        // Update default headers
        this.setHeader('Authorization', `Bearer ${authData.tokens.access.token}`);
        
        return authData.tokens.access.token;
      } catch (error) {
        console.log('Token refresh failed:', error);
        // Clear auth data on refresh failure
        try {
          await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
          this.removeHeader('Authorization');
        } catch (clearError) {
          console.error('Error clearing auth data:', clearError);
        }
        return null;
      }
    }

    /**
     * Make HTTP request with automatic auth and token refresh
     */
    async request<T = any>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
      const {
        method = 'GET',
        headers = {},
        body,
        params,
        timeout = this.timeout,
      } = config;

      const url = this.buildURL(endpoint, params);
      
      // Create unique request identifier for retry tracking
      // Include timestamp to handle same endpoint called multiple times
      const requestId = `${method}:${url}:${Date.now()}`;
      const hasRetried = retryMap.get(requestId) || false;

      // Skip token refresh for the refresh endpoint itself to prevent infinite loop
      const isRefreshEndpoint = url.includes('/auth/refresh-tokens');

      // Get auth headers automatically (like request interceptor)
      const authHeaders = isRefreshEndpoint ? {} : await this.getAuthHeaders();
      const requestHeaders = {
        ...this.defaultHeaders,
        ...authHeaders,
        ...headers,
      };

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const requestOptions: RequestInit = {
          method,
          headers: requestHeaders,
          signal: controller.signal,
        };

        if (body && method !== 'GET') {
          requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        // Handle 401 errors with token refresh (like response interceptor)
        // Only retry once per request to prevent infinite loops
        if (response.status === 401 && !hasRetried && !isRefreshEndpoint) {
          retryMap.set(requestId, true);

          // If refresh is already in progress, queue this request
          if (isRefreshing) {
            return new Promise<ApiResponse<T>>((resolve, reject) => {
              failedQueue.push({ 
                resolve: async (token: string | null) => {
                  try {
                    if (!token) {
                      throw new Error('Token refresh failed');
                    }

                    // Retry request with new token
                    const retryHeaders = {
                      ...this.defaultHeaders,
                      Authorization: `Bearer ${token}`,
                      ...headers,
                    };
                    
                    const retryController = new AbortController();
                    const retryTimeoutId = setTimeout(() => retryController.abort(), timeout);
                    
                    try {
                      const retryResponse = await fetch(url, {
                        ...requestOptions,
                        headers: retryHeaders,
                        signal: retryController.signal,
                      });
                      
                      clearTimeout(retryTimeoutId);
                      const retryData = await retryResponse.json().catch(() => ({}));
                      
                      if (!retryResponse.ok) {
                        throw this.handleError(retryData, retryResponse.status);
                      }
                      
                      retryMap.delete(requestId);
                      resolve({
                        data: retryData.data || retryData,
                        message: retryData.message,
                        success: true,
                      });
                    } catch (retryErr) {
                      clearTimeout(retryTimeoutId);
                      retryMap.delete(requestId);
                      reject(this.handleError(retryErr));
                    }
                  } catch (err) {
                    retryMap.delete(requestId);
                    reject(this.handleError(err));
                  }
                },
                reject: (err) => {
                  retryMap.delete(requestId);
                  reject(this.handleError(err));
                }
              });
            });
          }

          // Start token refresh process
          isRefreshing = true;

          try {
            const newToken = await this.refreshToken();
            
            if (!newToken) {
              processQueue(new Error('Token refresh failed'), null);
              retryMap.delete(requestId);
              isRefreshing = false;
              throw {
                message: 'Authentication failed. Please login again.',
                status: 401,
              } as ApiError;
            }

            // Process queued requests
            processQueue(null, newToken);

            // Retry original request with new token
            const retryHeaders = {
              ...this.defaultHeaders,
              Authorization: `Bearer ${newToken}`,
              ...headers,
            };
            
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), timeout);
            
            try {
              const retryResponse = await fetch(url, {
                ...requestOptions,
                headers: retryHeaders,
                signal: retryController.signal,
              });
              
              clearTimeout(retryTimeoutId);
              const retryData = await retryResponse.json().catch(() => ({}));
              
              if (!retryResponse.ok) {
                throw this.handleError(retryData, retryResponse.status);
              }

              retryMap.delete(requestId);
              isRefreshing = false;

              return {
                data: retryData.data || retryData,
                message: retryData.message,
                success: true,
              };
            } catch (retryErr) {
              clearTimeout(retryTimeoutId);
              retryMap.delete(requestId);
              isRefreshing = false;
              throw this.handleError(retryErr);
            }
          } catch (refreshError) {
            console.log('Error in token refresh flow:', refreshError);
            processQueue(refreshError, null);
            retryMap.delete(requestId);
            isRefreshing = false;
            throw this.handleError(refreshError, 401);
          }
        }

        // Log errors for debugging
        if (!response.ok) {
          console.error('API Error:', {
            url,
            status: response.status,
            statusText: response.statusText,
          });
        }

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
          retryMap.delete(requestId);
          throw this.handleError(responseData, response.status);
        }

        retryMap.delete(requestId);
        return {
          data: responseData.data || responseData,
          message: responseData.message,
          success: true,
        };
      } catch (error: any) {
        clearTimeout(timeoutId);
        retryMap.delete(requestId);

        if (error.name === 'AbortError') {
          throw {
            message: 'Request timeout. Please try again.',
            status: 408,
          } as ApiError;
        }

        throw this.handleError(error);
      }
    }

    /**
     * GET request
     */
    get<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, { ...config, method: 'GET' });
    }

    /**
     * POST request
     */
    post<T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, { ...config, method: 'POST', body });
    }

    /**
     * PUT request
     */
    put<T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, { ...config, method: 'PUT', body });
    }

    /**
     * PATCH request
     */
    patch<T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
    }

    /**
     * DELETE request
     */
    delete<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, { ...config, method: 'DELETE' });
    }

    /**
     * Update default headers
     */
    setHeader(key: string, value: string): void {
      this.defaultHeaders[key] = value;
    }

    /**
     * Remove header
     */
    removeHeader(key: string): void {
      delete this.defaultHeaders[key];
    }
  }

  // Storage helper functions (using AsyncStorage for React Native)
  export const getStoredToken = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  };

  export const getStoredRefreshToken = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting stored refresh token:', error);
      return null;
    }
  };

  export const getStoredUser = async (): Promise<User | null> => {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting stored user:', error);
      return null;
    }
  };

  export const setAuthData = async (authResponse: AuthResponse): Promise<void> => {
    try {
      const token = authResponse.tokens.access.token;
      const refreshToken = authResponse.tokens.refresh.token;
      
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(authResponse.user));
      
      // Update default headers in the client instance
      apiClient.setHeader('Authorization', `Bearer ${token}`);
    } catch (error) {
      console.error('Error setting auth data:', error);
      throw error;
    }
  };

  export const clearAuthData = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      
      // Remove auth header from client instance
      apiClient.removeHeader('Authorization');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  export const isAuthenticated = async (): Promise<boolean> => {
    try {
      const token = await getStoredToken();
      const user = await getStoredUser();
      return !!(token && user);
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  };

  export const isAdmin = async (user?: User | null): Promise<boolean> => {
    try {
      const currentUser = user || await getStoredUser();
      return currentUser?.role === 'ADMIN';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  export const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const token = await getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Create default API client instance
  export const apiClient = new ApiClient({
    baseURL: API_BASE_URL,
    timeout: 2 * 60 * 1000, // 2 minutes (matching web app)
  });

  export default apiClient;
