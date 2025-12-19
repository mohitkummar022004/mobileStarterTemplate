import { NextFunction, Request, Response } from 'express';

export const mcpAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers.authorization as string | undefined;

    // Validate API key exists
    if (!apiKey) {
        return res.status(401).json({
            jsonrpc: '2.0',
            error: {
                code: -32001,
                message: 'Unauthorized: API key required'
            },
            id: req.body?.id || null
        });
    }

    const validApiKey = process.env.MCP_API_KEY;

    // eslint-disable-next-line security/detect-possible-timing-attacks
    if (apiKey !== validApiKey) {
        return res.status(401).json({
            jsonrpc: '2.0',
            error: {
                code: -32001,
                message: 'Unauthorized: Invalid API key'
            },
            id: req.body?.id || null
        });
    }

    next();
};
