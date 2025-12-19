import prisma from '../client.ts';
import { TokenType } from '../generated/prisma/index.js';
import config from './config.ts';
import { ExtractJwt, Strategy as JwtStrategy, VerifyCallback } from 'passport-jwt';

const jwtOptions = {
    secretOrKey: config.jwt.secret,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
};

const jwtVerify: VerifyCallback = async (payload, done) => {
    try {
        if (payload.type !== TokenType.ACCESS) {
            throw new Error('Invalid token type');
        }
        const user = await prisma.user.findFirst({
            select: {
                id: true,
                email: true,
                name: true,
                role: true
            },
            where: { id: payload.sub, isDeleted: false }
        });
        if (!user) {
            return done(null, false);
        }
        done(null, user);
    } catch (error) {
        done(error, false);
    }
};

export const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);
