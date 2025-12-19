import { mcpDeleteController, mcpGetController, mcpPostController } from '../../controllers/mcp.controller.ts';
import { mcpAuthMiddleware } from '../../middlewares/mcp.ts';
import express from 'express';

const router = express.Router();

router.use(mcpAuthMiddleware);

router.post('/', mcpPostController);
router.get('/', mcpGetController);
router.delete('/', mcpDeleteController);

export default router;
