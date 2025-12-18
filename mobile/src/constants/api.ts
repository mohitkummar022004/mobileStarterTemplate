export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_DATA: 'user_data'
} as const;

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

