import config from '../config/config.ts';
import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDef: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API documentation',
            version: '1'
        },
        servers: [
            {
                url: `http://localhost:${config.port}`
            }
        ]
    },
    apis: ['src/docs/*.yml', 'src/routes/v1/*.ts']
};

export default swaggerDef;
