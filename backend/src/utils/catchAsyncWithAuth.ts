import { AuthenticatedRequest } from './types.ts';
import { NextFunction, Request, Response } from 'express';

const catchAsyncWithAuth =
    (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void) =>
    (req: Request, res: Response, next: NextFunction) => {
        const reqWithValidatedQuery = req as AuthenticatedRequest;
        if (!reqWithValidatedQuery.validatedQuery) {
            reqWithValidatedQuery.validatedQuery = req.query;
        }
        Promise.resolve(fn(reqWithValidatedQuery as AuthenticatedRequest, res, next)).catch(err => next(err));
    };

export default catchAsyncWithAuth;
