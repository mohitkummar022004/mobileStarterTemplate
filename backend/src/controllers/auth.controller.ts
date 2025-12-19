import { authService, tokenService, userService } from '../services/index.ts';
import catchAsync from '../utils/catchAsync.ts';
import catchAsyncWithAuth from '../utils/catchAsyncWithAuth.ts';
import exclude from '../utils/exclude.ts';
import httpStatus from 'http-status';

const register = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const user = await userService.createUser(email, password);
    const userWithoutPassword = exclude(user, ['password', 'createdAt', 'updatedAt']);
    const tokens = await tokenService.generateAuthTokens(user);
    res.status(httpStatus.CREATED).send({ user: userWithoutPassword, tokens });
});

const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const user = await authService.loginUserWithEmailAndPassword(email, password);
    const tokens = await tokenService.generateAuthTokens(user);
    res.send({ user, tokens });
});

const logout = catchAsyncWithAuth(async (req, res) => {
    await authService.logout(req.body.refreshToken);
    res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsyncWithAuth(async (req, res) => {
    const tokens = await authService.refreshAuth(req.body.refreshToken);
    res.send({ ...tokens });
});

const resetPassword = catchAsync(async (req, res) => {
    await authService.resetPassword(req.query.token as string, req.body.password);
    res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
    await authService.verifyEmail(req.query.token as string);
    res.status(httpStatus.NO_CONTENT).send();
});

export default {
    register,
    login,
    logout,
    refreshTokens,
    resetPassword,
    verifyEmail
};
