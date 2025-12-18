/**
 * API Layer Entry Point
 * Export all API-related modules from here
 */

// Export API client
export { apiClient, default as ApiClient } from './client';

// Export types
export type {
  ApiResponse,
  ApiError,
  RequestConfig,
  ApiClientConfig,
} from './types';

// Export auth helper functions
export {
  getStoredToken,
  getStoredRefreshToken,
  getStoredUser,
  setAuthData,
  clearAuthData,
  isAuthenticated,
  isAdmin,
  getAuthHeaders,
} from './client';

