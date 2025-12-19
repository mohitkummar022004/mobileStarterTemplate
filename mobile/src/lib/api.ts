import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { AuthResponse, User } from '@/types/user';
import { API_BASE_URL, STORAGE_KEYS } from './constants';

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (error?: any) => void }> = [];

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

const createApiInstance = (): AxiosInstance => {
    const instance = axios.create({
        baseURL: API_BASE_URL,
        timeout: 2 * 60 * 1000, // 2 minutes for AI operations
        headers: {
            'Content-Type': 'application/json'
        }
    });

    instance.interceptors.request.use(
        config => {
            const authHeaders = getAuthHeaders();
            Object.assign(config.headers, authHeaders);
            return config;
        },
        error => {
            return Promise.reject(error);
        }
    );

    instance.interceptors.response.use(
        (response: AxiosResponse) => response,
        async error => {
            const originalRequest = error.config;
            console.error(error);

            if (error.response?.status === 401 && !originalRequest._retry) {
                if (isRefreshing) {
                    // If refresh is already in progress, queue this request
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    })
                        .then(token => {
                            originalRequest.headers['Authorization'] = `Bearer ${token}`;
                            return instance(originalRequest);
                        })
                        .catch(err => {
                            console.log('error in queueing request', err);
                            return Promise.reject(err);
                        });
                }
                originalRequest._retry = true;
                isRefreshing = true;

                const refreshToken = getStoredRefreshToken();
                if (!refreshToken) {
                    processQueue(error, null);
                    clearAuthData();
                    // TODO: Add this redirect once login page is implemented
                    // if (window.location.pathname !== '/login') {
                    //     window.location.href = '/';
                    // }
                    return Promise.reject(error);
                }

                try {
                    // Call refresh token API
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh-tokens`, {
                        refreshToken
                    });

                    const authData = response.data;
                    setAuthData(authData);

                    const newAccessToken = authData.tokens.access.token;
                    processQueue(null, newAccessToken);

                    // Retry original request with new token
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    return instance(originalRequest);
                } catch (refreshError) {
                    console.log('Token refresh failed:', refreshError);
                    processQueue(refreshError, null);
                    clearAuthData();
                    // TODO: Add this redirect once login page is implemented
                    // if (window.location.pathname !== '/login') {
                    //     window.location.href = '/login';
                    // }
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }

            return Promise.reject(error);
        }
    );

    return instance;
};

export const api = createApiInstance();

export const getStoredToken = (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
};

export const getStoredRefreshToken = (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
};

export const getStoredUser = (): User | null => {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
};

export const setAuthData = (authResponse: AuthResponse): void => {
    const token = authResponse.tokens.access.token;
    const refreshToken = authResponse.tokens.refresh.token;
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(authResponse.user));
    api.defaults.headers['Authorization'] = `Bearer ${token}`;
};

export const clearAuthData = (): void => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    delete api.defaults.headers['Authorization'];
};

export const isAuthenticated = (): boolean => {
    const token = getStoredToken();
    const user = getStoredUser();
    return !!(token && user);
};

export const isAdmin = (user?: User | null): boolean => {
    const currentUser = user || getStoredUser();
    return currentUser?.role === 'ADMIN';
};

export const getAuthHeaders = (): Record<string, string> => {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};
