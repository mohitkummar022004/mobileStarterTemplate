import { Role } from '../generated/prisma/index.js';
import { userService } from '../services/index.ts';
import { MCPTool } from '../types/mcp.ts';
import pick from '../utils/pick.ts';
import { z } from 'zod';

const userSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
    password: z.string(),
    role: z.string(),
    isEmailVerified: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
});

const createUserTool: MCPTool = {
    id: 'user_create',
    name: 'Create User',
    description: 'Create a new user (admin only)',
    inputSchema: z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string(),
        role: z.enum([Role.USER, Role.ADMIN])
    }),
    outputSchema: userSchema,
    fn: async (inputs: { email: string; password: string; name: string; role: Role }) => {
        const user = await userService.createUser(inputs.email, inputs.password, inputs.name, inputs.role);
        return user;
    }
};

const getUsersTool: MCPTool = {
    id: 'user_get_all',
    name: 'Get All Users',
    description: 'Get all users with optional filters and pagination',
    inputSchema: z.object({
        name: z.string().optional(),
        role: z.string().optional(),
        sortBy: z.string().optional(),
        limit: z.number().int().optional(),
        page: z.number().int().optional()
    }),
    outputSchema: z.object({
        users: z.array(userSchema)
    }),
    fn: async (inputs: { name?: string; role?: string; sortBy?: string; limit?: number; page?: number }) => {
        const filter = pick(inputs, ['name', 'role']);
        const options = pick(inputs, ['sortBy', 'limit', 'page']);
        const result = await userService.queryUsers(filter, options);
        return { users: result };
    }
};

const getUserTool: MCPTool = {
    id: 'user_get_by_id',
    name: 'Get User By ID',
    description: 'Get a single user by their ID',
    inputSchema: z.object({
        userId: z.string()
    }),
    outputSchema: userSchema,
    fn: async (inputs: { userId: string }) => {
        const user = await userService.getUserById(inputs.userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }
};

const updateUserTool: MCPTool = {
    id: 'user_update',
    name: 'Update User',
    description: 'Update user information by ID',
    inputSchema: z.object({
        userId: z.string(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        password: z.string().min(8).optional()
    }),
    outputSchema: userSchema,
    fn: async (inputs: { userId: string; name?: string; email?: string; password?: string }) => {
        const updateBody = pick(inputs, ['name', 'email', 'password']);
        const user = await userService.updateUserById(inputs.userId, updateBody);
        return user;
    }
};

const deleteUserTool: MCPTool = {
    id: 'user_delete',
    name: 'Delete User',
    description: 'Delete a user by their ID',
    inputSchema: z.object({
        userId: z.string()
    }),
    outputSchema: z.object({
        success: z.boolean()
    }),
    fn: async (inputs: { userId: string }) => {
        await userService.deleteUserById(inputs.userId);
        return { success: true };
    }
};

export const userTools: MCPTool[] = [createUserTool, getUsersTool, getUserTool, updateUserTool, deleteUserTool];
