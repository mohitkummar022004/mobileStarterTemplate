import { mockAuthResponse } from '@/data/mockData';
import { api, clearAuthData, getStoredRefreshToken, setAuthData } from '@/lib/api';
import { mockApiDelay } from '@/lib/utils';
import type { AuthResponse, LoginRequest, SignupRequest } from '@/types/user';

export const authService = {
    login: async (credentials: LoginRequest): Promise<AuthResponse> => {
        if (process.env.USE_MOCK_DATA === 'true') {
            console.log('--- MOCK API: login ---', credentials);
            await mockApiDelay();
            return mockAuthResponse;
        }
        const response = await api.post('/auth/login', credentials);
        console.log('response in login', response);
        setAuthData(response.data);
        return response.data;
    },

    register: async (userData: SignupRequest): Promise<AuthResponse> => {
        if (process.env.USE_MOCK_DATA === 'true') {
            console.log('--- MOCK API: register ---', userData);
            await mockApiDelay();
            return mockAuthResponse;
        }
        const response = await api.post('/auth/register', userData);
        setAuthData(response.data);
        return response.data;
    },

    refreshToken: async (): Promise<AuthResponse> => {
        if (process.env.USE_MOCK_DATA === 'true') {
            console.log('--- MOCK API: refreshToken ---');
            await mockApiDelay();
            return mockAuthResponse;
        }
        const response = await api.post('/auth/refresh');
        setAuthData(response.data);
        return response.data;
    },

    logout: async (): Promise<void> => {
        if (process.env.USE_MOCK_DATA === 'true') {
            console.log('--- MOCK API: logout ---');
            await mockApiDelay();
            return;
        }
        const refreshToken = getStoredRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token found');
        }
        await api.post('/auth/logout', { refreshToken });
        clearAuthData();
    }
};
