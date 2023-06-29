import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export async function groupRoutes(app: FastifyInstance) {
    app.addHook('preHandler', async (request) => {
        await request.jwtVerify()
    })

    app.get('/groups', async (req) => {
        const { sub: userId } = req.user;

        const groups = await prisma.group.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    { participants: { some: { userId } } }
                ]
            }
        });

        return {
            groups
        };
    })
}