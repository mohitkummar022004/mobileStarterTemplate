export type UserRole = 'ADMIN' | 'USER';

export interface User {
    id: string;
    email: string;
    name?: string;
    role: UserRole;
    isEmailVerified: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface Admin extends User {
    role: 'ADMIN';
    permissions?: string[];
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface SignupRequest {
    name: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    user: User;
    tokens: {
        access: {
            token: string;
            expires: string;
        };
        refresh: {
            token: string;
            expires: string;
        };
    };
}

export interface CreateUserRequest {
    email: string;
    password: string;
    name: string;
    role: UserRole;
}

export interface GetUsersParams {
    name?: string;
    role?: UserRole;
    sortBy?: string;
    limit?: number;
    page?: number;
}
