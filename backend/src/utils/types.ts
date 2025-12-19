import { User } from '../generated/prisma/index.js';
import { Request } from 'express';

export interface CustomParamsDictionary {
    [key: string]: any;
}

export interface RequestWithAdditionalProperties
    extends Request<CustomParamsDictionary, any, any, any, Record<string, any>> {
    validatedQuery?: any;
}

export interface AuthenticatedRequest extends RequestWithAdditionalProperties {
    user: User;
}
