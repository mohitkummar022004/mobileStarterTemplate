import { AuthenticatedRequest, RequestWithAdditionalProperties } from './types.ts';
import { NextFunction, Request, Response } from 'express-serve-static-core';

const catchAsync =
    (fn: (req: RequestWithAdditionalProperties, res: Response, next: NextFunction) => void) =>
    (req: Request, res: Response, next: NextFunction) => {
        const reqWithValidatedQuery = req as RequestWithAdditionalProperties;
        if (!reqWithValidatedQuery.validatedQuery) {
            reqWithValidatedQuery.validatedQuery = req.query;
        }
        Promise.resolve(fn(reqWithValidatedQuery as AuthenticatedRequest, res, next)).catch(err => next(err));
    };

export default catchAsync;
