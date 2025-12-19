import logger from '../config/logger.ts';
import { MCPTool } from '../types/mcp.ts';
import { Server } from '@modelcontextprotocol/sdk/server';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const registerMCPTools = (params: { server: Server; tools: MCPTool[] }) => {
    const { server, tools } = params;
    // Register tools list handler
    server.setRequestHandler(ListToolsRequestSchema, () => {
        return {
            tools: tools.map(tool => ({
                name: tool.id,
                title: tool.name,
                description: tool.description,
                inputSchema: zodToJsonSchema(tool.inputSchema as any),
                outputSchema: tool.outputSchema ? zodToJsonSchema(tool.outputSchema as any) : undefined
            }))
        };
    });

    // Register tool execution handler with progress notification support
    server.setRequestHandler(CallToolRequestSchema, async request => {
        const { name, arguments: args } = request.params;

        const tool = tools.find(t => t.id === name);
        if (!tool) {
            throw {
                code: -32601,
                message: `Method not found: ${name}`
            };
        }

        try {
            const result = await tool.fn(args as any);
            return {
                content: [{ type: 'text', text: JSON.stringify(result) }],
                structuredContent: result
            };
        } catch (error) {
            logger.error(`Error executing tool ${name}: ${error}`);
            return {
                isError: true,
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({ error: (error as any)?.message || 'Tool execution failed' })
                    }
                ]
            };
        }
    });
};
