import app from './app.ts';
import prisma from './client.ts';
import config from './config/config.ts';
import logger from './config/logger.ts';
import { Server } from 'http';

let server: Server | undefined;

console.log('Starting');
async function main() {
    await prisma.$connect();
    logger.info('Connected to SQL Database');
    server = app.listen(config.port, () => {
        logger.info(`Listening to port ${config.port}`);
    });

    const exitHandler = () => {
        if (server) {
            server.close(() => {
                logger.info('Server closed');
                process.exit(1);
            });
        } else {
            process.exit(1);
        }
    };

    const unexpectedErrorHandler = (error: unknown) => {
        logger.error(error);
        exitHandler();
    };

    process.on('uncaughtException', unexpectedErrorHandler);
    process.on('unhandledRejection', unexpectedErrorHandler);

    process.on('SIGTERM', () => {
        logger.info('SIGTERM received');
        if (server) {
            server.close();
        }
    });
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
