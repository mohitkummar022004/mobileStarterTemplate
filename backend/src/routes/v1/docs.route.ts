import swaggerDefinition from '../../docs/swaggerDef.ts';
import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const router = express.Router();

const specs = swaggerJsdoc(swaggerDefinition);

router.use(
    '/',
    swaggerUi.serve,
    swaggerUi.setup(specs, {
        explorer: true
    })
);

export default router;
