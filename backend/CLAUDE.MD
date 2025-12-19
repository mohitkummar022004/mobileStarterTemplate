# Product Overview

This is a Node.js backend template providing a complete authentication system with user management capabilities. The application serves as a foundation for building REST APIs with enterprise-grade security features.

## Core Features

- **User Authentication**: Complete JWT-based auth system with login, registration, and password reset
- **Role-Based Access**: User roles (USER, ADMIN) with configurable permissions
- **Security**: Built-in rate limiting, XSS protection, CORS, and security headers
- **API Documentation**: Swagger/OpenAPI integration for API documentation
- **MCP Tools**: Model Context Protocol (MCP) tools for AI agent integration and automation

## Target Use Cases

- Backend foundation for web applications requiring user authentication
- API server for mobile applications
- Microservice template for authentication-related functionality
- Starting point for SaaS applications with user management needs
- Applications requiring multi-cloud file storage capabilities

### Critical Instructions - MUST FOLLOW

## Strictly Prohibited Actions

### 0. Database Operations - SOFT DELETE ONLY (CRITICAL)

**ABSOLUTE PROHIBITION - HARD DELETES ARE STRICTLY FORBIDDEN**

- **NEVER** use `prisma.[model].delete()` or `prisma.[model].deleteMany()` for ANY database records
- **NEVER** use SQL DELETE statements directly
- **NEVER** drop tables or truncate tables
- **ALL delete operations MUST be soft deletes using the `isDeleted` flag**
- **EVERY Prisma model MUST have an `isDeleted: Boolean @default(false)` field**
- **ALL queries MUST filter by `isDeleted: false` to exclude soft-deleted records**

**MANDATORY SOFT DELETE IMPLEMENTATION:**

1. **Prisma Schema Requirements:**
   - Every model MUST include: `isDeleted Boolean @default(false)`
   - No exceptions - User, Token, and all future models require this field

2. **Query Operations - ALWAYS Filter Deleted Records:**
   ```typescript
   // CORRECT - Always include isDeleted: false
   prisma.user.findFirst({ where: { id, isDeleted: false } })
   prisma.user.findMany({ where: { ...filter, isDeleted: false } })
   prisma.token.findFirst({ where: { token, type, isDeleted: false } })
   
   // WRONG - Missing isDeleted filter
   prisma.user.findFirst({ where: { id } })
   prisma.user.findMany({ where: filter })
   ```

3. **Delete Operations - ALWAYS Use Soft Delete:**
   ```typescript
   // CORRECT - Soft delete using update
   await prisma.user.update({ where: { id }, data: { isDeleted: true } })
   await prisma.token.updateMany({ where: { userId }, data: { isDeleted: true } })
   
   // WRONG - Hard delete (STRICTLY FORBIDDEN)
   await prisma.user.delete({ where: { id } })
   await prisma.token.deleteMany({ where: { userId } })
   ```

4. **MCP Tools - Must Use Soft Delete:**
   - All MCP tool delete operations MUST call service methods that perform soft deletes
   - Never implement hard delete logic in MCP tools

**VIOLATION OF THESE RULES IS CATASTROPHIC AND STRICTLY PROHIBITED**

### 1. Command Execution Restrictions

- **NEVER** execute `pnpm build` under any circumstances
- **NEVER** execute `pnpm db:migrate`, `pnpm db:push`, or any database migration commands
- **NEVER** execute `pnpm db:seed` or any database seeding commands
- **NEVER** execute any build, deployment, or production-related commands

### 2. Database Migration Restrictions

- **NEVER** manually create migration files in `prisma/migrations/` directory
- **NEVER** write SQL migration files directly
- **NEVER** modify existing migration files
- **NEVER** bypass Prisma's migration system
- **ALL database schema changes MUST be made through Prisma schema models only**
- Database migrations are managed externally by the system - do not interfere

### 3. Package Configuration Restrictions

- **NEVER** manually edit `package.json` directly
- **NEVER** add new scripts to `package.json`
- **NEVER** modify existing scripts in `package.json`
- **NEVER** create new command shortcuts or aliases
- You MAY add or update dependencies ONLY using `pnpm add`, `pnpm remove`, or `pnpm install` commands
- All package management must be done through pnpm commands, not manual file edits

## Allowed Operations Only

You are permitted to:

- Run `pnpm db:generate` to generate Prisma client for type safety
- Run `pnpm typecheck` to verify TypeScript compilation (ALWAYS run `pnpm db:generate` first)
- Run `pnpm add`, `pnpm remove`, or `pnpm install` to manage dependencies
- Modify Prisma schema models in `prisma/schema.prisma` for database changes
- Modify application source code (controllers, services, routes, etc.)
- Modify configuration files (e.g., `.env`, TypeScript config)
- Read and understand project files

**Important**: Always run `pnpm db:generate` before running `pnpm typecheck` to ensure Prisma client is up-to-date.

**Violation of these restrictions may cause system instability or deployment failures.**

## Technology Stack

## Core Technologies

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport.js
- **Package Manager**: pnpm (v10.14.0)

## Key Dependencies

- **Database**: Prisma Client, PostgreSQL
- **Security**: bcrypt, helmet, cors, xss-filters, express-rate-limit
- **Validation**: Joi for schema validation
- **Logging**: Winston with Morgan for HTTP logging
- **Documentation**: Swagger (swagger-jsdoc, swagger-ui-express)
- **Storage**: Multi-cloud storage abstraction

## Development Tools

- **TypeScript**: Strict mode enabled with modern ES features
- **Nodemon**: Auto-restart during development
- **Prettier**: Code formatting
- **Docker**: Database containerization support

## Cloud Services & Integrations

### Multi-Cloud Storage System

The application includes a comprehensive multi-cloud storage abstraction layer that supports three major cloud providers:

#### Storage Architecture

- **BaseStorage**: Abstract base class defining common storage operations
- **Unified Interface**: Single abstracted class instance for all storage operations regardless of provider
- **Auto-Detection**: Automatically selects storage provider based on environment. You should _always_ use getInstace method exported from _storage/index.ts_

#### Storage Provider Selection

The system automatically selects the storage provider based on the `INFRA_PROVIDER` environment variable:

#### Usage Pattern

**If you want to use cloud storage for files, use `getInstance()` and call all methods on it.**

```typescript
import { getInstance } from './storage/index.ts';

const storage = getInstance();

await storage.uploadFile({
    srcFilePath,
    destinationKey
});
await storageInstance.uploadData({
    data,
    destinationKey,
    contentType
});
await storageInstance.deleteFile({
    key
});
await storageInstance.downloadDocument({
    srcKey,
    destinationFilePath
});
const exists = await storageInstance.documentExists({
    key
});
await storageInstance.DownloadSignedUrl({
    key
});
```

## Common Commands

```bash
# Development
pnpm dev                    # Start development server with hot reload

# Type Safety (ALWAYS run db:generate before typecheck)
pnpm db:generate           # Generate Prisma client
pnpm typecheck             # Type check the code
```

**CRITICAL - STRICTLY PROHIBITED COMMANDS**:

- **NEVER** run `pnpm build` - Build commands are strictly forbidden
- **NEVER** run `pnpm db:migrate` or any migration commands - Migrations are managed externally
- **NEVER** run `pnpm db:seed` or any seeding commands - Database seeding is prohibited
- **ONLY** run `pnpm db:generate` to generate Prisma client for type safety
- **ONLY** run `pnpm typecheck` to verify TypeScript types

## Build Configuration

- **TypeScript**: Targets ESNext with Node.js module resolution
- **Output**: Compiled to `./build` directory
- **Environment**: Uses cross-env for cross-platform environment variables

## Project Structure

## Root Level Organization

```text
├── src/                    # Main application source code
├── prisma/                 # Database schema and migrations
├── generated/              # Auto-generated Prisma client (do not edit)
├── .env                    # Environment variables (local)
└── .env.example            # Environment template
```

## Source Code Architecture (`src/`)

The application follows a layered architecture pattern:

### Core Application Files

- `index.ts` - Application entry point with server setup
- `app.ts` - Express app configuration and middleware setup
- `client.ts` - Prisma database client instance

### Layer Structure

```text
src/
├── config/          # Configuration and setup
├── controllers/     # HTTP request handlers
├── services/        # Business logic layer
├── middlewares/     # Express middleware functions
├── routes/          # API route definitions
├── validations/     # Request validation schemas
├── utils/           # Utility functions and helpers
├── types/           # TypeScript type definitions
├── docs/            # API documentation setup
├── storage/         # Multi-cloud storage abstraction
└── db/              # Database connection and setup
```

## Key Architectural Patterns

### Controller-Service Pattern

- **Controllers**: Handle HTTP requests/responses, delegate to services
- **Services**: Contain business logic, interact with database
- **Validation**: Joi schemas validate incoming requests

### Middleware Chain

1. Security headers (helmet)
2. Request parsing (express.json, urlencoded)
3. XSS sanitization
4. CORS handling
5. Authentication (Passport JWT)
6. Rate limiting (production only)
7. Route handlers
8. Error handling

### Database Layer

- **Prisma Schema**: `prisma/schema.prisma` defines data models
- **Migrations**: `prisma/migrations/` contains database version history
- **Generated Client**: `generated/prisma/` contains auto-generated client code
- **Seeder**: `prisma/seed.ts` contains seed data for the database

### Storage Layer

- **BaseStorage**: Abstract base class defining storage operations
- **Provider Implementations**: AWS S3, Azure Blob Storage, Google Cloud Storage
- **Factory Pattern**: `getInstance()` function creates appropriate storage provider
- **Unified Interface**: Single API for all storage operations

## File Naming Conventions

- **Controllers**: `*.controller.ts` (e.g., `auth.controller.ts`)
- **Services**: `*.service.ts` (e.g., `user.service.ts`)
- **Validations**: `*.validation.ts` (e.g., `auth.validation.ts`)
- **Middlewares**: Descriptive names (e.g., `auth.ts`, `rateLimiter.ts`)
- **Utils**: Descriptive names (e.g., `ApiError.ts`, `catchAsync.ts`)
- **Storage**: Provider-specific names (e.g., `AWSS3.ts`, `AzureBlobStorage.ts`, `GoogleCloudStorage.ts`)
- **MCP Tools**: `*.tool.ts` for business logic only (e.g., `user.tool.ts`, `product.tool.ts`) - NOT for auth

## MCP Tools Integration

The application includes Model Context Protocol (MCP) tools that enable AI agents to interact with the backend functionality programmatically.

**IMPORTANT**: Authentication and authorization endpoints (login, register, logout, password reset, etc.) must NOT be exposed as MCP tools. Only create MCP tools for business logic modules (e.g., products, orders, users management).

### MCP Tool Structure

MCP tools are defined in the `src/tools/` directory. Each tool follows this pattern:

**File**: `src/tools/[module].tool.ts`

````typescript
import { MCPTool } from '../types/mcp.ts';
import { z } from 'zod';

const exampleTool: MCPTool = {
    id: 'module_action', // Unique identifier (e.g., 'user_create', 'product_list')
    name: 'Action Name', // Human-readable name
    description: 'Tool description', // What the tool does
    inputSchema: z.object({
        // Zod schema for input validation
        field1: z.string(),
        field2: z.number().optional()
    }),
    outputSchema: z.object({
        // Zod schema for output (optional but recommended)
        result: z.string()
    }),
    fn: async inputs => {
        // Implementation function
        // Call services to perform the action
        const result = await someService.doSomething(inputs.field1, inputs.field2);
        return { result };
    }
};

export const moduleTools: MCPTool[] = [exampleTool, anotherTool];

### Key Components

1. **MCPTool Interface** (`src/types/mcp.ts`):
    - `id`: Unique identifier following pattern `module_action` (e.g., `user_create`, `product_list`)
    - `name`: Human-readable name for the tool
    - `description`: Clear description of what the tool does
    - `inputSchema`: Zod schema defining expected inputs
    - `outputSchema`: Zod schema defining expected outputs (optional)
    - `fn`: Async function implementing the tool logic

2. **Tool Registration** (`src/services/mcp.service.ts`):
    - `registerTools()` function handles registration with MCP server
    - Automatically validates inputs/outputs using Zod schemas
    - Handles errors gracefully

3. **MCP Controller** (`src/controllers/mcp.controller.ts`):
    - Manages MCP server instances and sessions
    - Imports and registers all tool arrays
    - Pattern: `registerTools({ server, tools: [...userTools, ...moduleTools] })`

### Creating New MCP Tools

When adding new API modules, create corresponding MCP tools:

1. **Create tool file**: `src/tools/[module].tool.ts`
2. **Define tools**: Create tool objects following the pattern above
3. **Export tool array**: Export an array of tools (e.g., `export const moduleTools: MCPTool[] = [...]`)
4. **Register tools**: Import and register in `src/controllers/mcp.controller.ts`:

```typescript
import { moduleTools } from '../tools/module.tool.ts';

// In mcpController initialization:
registerTools({ server, tools: [...userTools, ...moduleTools] });
````

### Best Practices for MCP Tools

- **CRITICAL - No Auth Tools**: NEVER create MCP tools for authentication/authorization operations (login, register, logout, password reset, etc.).
- **Naming Convention**: Use `module_action` pattern for tool IDs (e.g., `product_create`, `order_list`)
- **Input Validation**: Always define comprehensive Zod schemas for inputs
- **Output Schema**: Define output schemas for consistency and type safety
- **Error Handling**: Let service layer errors bubble up; the MCP service handles them
- **Reuse Services**: Tools should delegate to service layer, not implement business logic
- **Security**: Tools bypass route-level authentication; implement security checks in tool functions if needed
- **Documentation**: Provide clear, descriptive names and descriptions

### Example: Complete Tool Implementation

```typescript
// src/tools/product.tool.ts
import { productService } from '../services/index.ts';
import { MCPTool } from '../types/mcp.ts';
import { z } from 'zod';

const productSchema = z.object({
    id: z.number(),
    name: z.string(),
    price: z.number(),
    description: z.string().nullable(),
    createdAt: z.string()
});

const createProductTool: MCPTool = {
    id: 'product_create',
    name: 'Create Product',
    description: 'Create a new product in the catalog',
    inputSchema: z.object({
        name: z.string().min(1),
        price: z.number().positive(),
        description: z.string().optional()
    }),
    outputSchema: productSchema,
    fn: async inputs => {
        const product = await productService.createProduct(inputs);
        return product;
    }
};

const listProductsTool: MCPTool = {
    id: 'product_list',
    name: 'List Products',
    description: 'Get all products with optional filters',
    inputSchema: z.object({
        limit: z.number().int().optional(),
        page: z.number().int().optional()
    }),
    outputSchema: z.object({
        products: z.array(productSchema)
    }),
    fn: async inputs => {
        const products = await productService.queryProducts({}, inputs);
        return { products };
    }
};

export const productTools: MCPTool[] = [createProductTool, listProductsTool];
```

## Import/Export Patterns

- Use barrel exports in `index.ts` files for clean imports
- Import generated Prisma types from `../generated/prisma`
- Use default exports for main module functionality
- Use named exports for utility functions and multiple exports
- Export MCP tools as named arrays (e.g., `export const moduleTools: MCPTool[] = [...]`)
