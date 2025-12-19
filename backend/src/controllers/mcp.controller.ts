import { JSONRPC_INTERNAL_ERROR, JSONRPC_INVALID_REQUEST } from '../constants/jsonrpc.constants.ts';
import { registerMCPTools } from '../services/mcp.service.ts';
import { userTools } from '../tools/user.tool.ts';
import catchAsync from '../utils/catchAsync.ts';
import { Server } from '@modelcontextprotocol/sdk/server';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport | undefined } = {};

export const mcpPostController = catchAsync(async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
        transport = transports[sessionId]!;
    } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => uuid(),
            onsessioninitialized: newSessionId => {
                console.log('New MCP session initialized:', newSessionId);
                transports[newSessionId] = transport;
            }
        });

        transport.onclose = () => {
            if (transport.sessionId) {
                delete transports[transport.sessionId];
            }
        };

        const server = new Server(
            {
                name: 'app-builder-mcp-server',
                title: 'App Builder MCP Server',
                version: '1.0.0'
            },
            {
                capabilities: {
                    logging: {},
                    tools: {}
                }
            }
        );

        registerMCPTools({ server, tools: [...userTools] });
        await server.connect(transport);
    } else {
        res.status(400).json({
            jsonrpc: '2.0',
            error: {
                code: JSONRPC_INVALID_REQUEST,
                message: 'Invalid Request: No valid session ID provided'
            },
            id: req.body?.id || null
        });
        return;
    }

    await transport.handleRequest(req, res, req.body);
});

export const mcpGetController = catchAsync(async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId || !transports[sessionId]) {
        res.status(400).json({
            jsonrpc: '2.0',
            error: {
                code: JSONRPC_INVALID_REQUEST,
                message: 'Invalid Request: Invalid or missing session ID'
            },
            id: null
        });
        return;
    }

    try {
        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
    } catch (error) {
        res.status(500).json({
            jsonrpc: '2.0',
            error: {
                code: JSONRPC_INTERNAL_ERROR,
                message: 'Internal error',
                data: { details: (error as Error).message }
            },
            id: null
        });
    }
});

export const mcpDeleteController = catchAsync(async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId || !transports[sessionId]) {
        res.status(400).json({
            jsonrpc: '2.0',
            error: {
                code: JSONRPC_INVALID_REQUEST,
                message: 'Invalid Request: Invalid or missing session ID'
            },
            id: null
        });
        return;
    }

    try {
        const transport = transports[sessionId];

        // Handle the delete request through transport first
        await transport.handleRequest(req, res);

        // Clean up the session after successful deletion
        if (transport.sessionId) {
            delete transports[transport.sessionId];
        }
    } catch (error) {
        res.status(500).json({
            jsonrpc: '2.0',
            error: {
                code: JSONRPC_INTERNAL_ERROR,
                message: 'Internal error',
                data: { details: (error as Error).message }
            },
            id: null
        });
    }
});
