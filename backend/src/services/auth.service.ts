import prisma from '../client.ts';
import { TokenType, User } from '../generated/prisma/index.js';
import { AuthTokensResponse } from '../types/response.ts';
import ApiError from '../utils/ApiError.ts';
import { encryptPassword, isPasswordMatch } from '../utils/encryption.ts';
import exclude from '../utils/exclude.ts';
import tokenService from './token.service.ts';
import userService from './user.service.ts';
import httpStatus from 'http-status';

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Omit<User, 'password'>>}
 */
const loginUserWithEmailAndPassword = async (email: string, password: string): Promise<Omit<User, 'password'>> => {
    const user = await userService.getUserByEmail(email, [
        'id',
        'email',
        'name',
        'password',
        'role',
        'isEmailVerified',
        'isDeleted',
        'createdAt',
        'updatedAt'
    ]);
    if (!user || !(await isPasswordMatch(password, user.password as string))) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
    }
    return exclude(user, ['password']);
};

/**
 * Logout (soft delete)
 * @param {string} refreshToken
 * @returns {Promise<void>}
 */
const logout = async (refreshToken: string): Promise<void> => {
    const refreshTokenData = await prisma.token.findFirst({
        where: {
            token: refreshToken,
            type: TokenType.REFRESH,
            blacklisted: false,
            isDeleted: false
        }
    });
    if (!refreshTokenData) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
    }
    await prisma.token.update({ where: { id: refreshTokenData.id }, data: { isDeleted: true } });
};

/**
 * Refresh auth tokens (soft delete old token)
 * @param {string} refreshToken
 * @returns {Promise<AuthTokensResponse>}
 */
const refreshAuth = async (refreshToken: string): Promise<AuthTokensResponse> => {
    try {
        const refreshTokenData = await tokenService.verifyToken(refreshToken, TokenType.REFRESH);
        const { userId } = refreshTokenData;
        await prisma.token.update({ where: { id: refreshTokenData.id }, data: { isDeleted: true } });
        return tokenService.generateAuthTokens({ id: userId });
    } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
    }
};

/**
 * Reset password (soft delete reset tokens)
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
const resetPassword = async (resetPasswordToken: string, newPassword: string): Promise<void> => {
    try {
        const resetPasswordTokenData = await tokenService.verifyToken(resetPasswordToken, TokenType.RESET_PASSWORD);
        const user = await userService.getUserById(resetPasswordTokenData.userId);
        if (!user) {
            throw new Error();
        }
        const encryptedPassword = await encryptPassword(newPassword);
        await userService.updateUserById(user.id, { password: encryptedPassword });
        await prisma.token.updateMany({
            where: { userId: user.id, type: TokenType.RESET_PASSWORD },
            data: { isDeleted: true }
        });
    } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed');
    }
};

/**
 * Verify email (soft delete verification tokens)
 * @param {string} verifyEmailToken
 * @returns {Promise<void>}
 */
const verifyEmail = async (verifyEmailToken: string): Promise<void> => {
    try {
        const verifyEmailTokenData = await tokenService.verifyToken(verifyEmailToken, TokenType.VERIFY_EMAIL);
        await prisma.token.updateMany({
            where: { userId: verifyEmailTokenData.userId, type: TokenType.VERIFY_EMAIL },
            data: { isDeleted: true }
        });
        await userService.updateUserById(verifyEmailTokenData.userId, { isEmailVerified: true });
    } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
    }
};

export default {
    loginUserWithEmailAndPassword,
    isPasswordMatch,
    encryptPassword,
    logout,
    refreshAuth,
    resetPassword,
    verifyEmail
};
