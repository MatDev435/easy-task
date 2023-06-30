import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import ShortUniqueId from 'short-unique-id';

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

    app.get('/groups/:id', async (req) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            id: z.string()
        });

        const { id } = paramsSchema.parse(req.params);

        const group = await prisma.group.findUnique({
            where: {
                id,
            },

            include: {
                participants: true,
                tasks: true
            }
        });

        return {
            group
        }
    })

    app.post('/groups', async (req, rep) => {
        const { sub: userId } = req.user;

        const bodySchema = z.object({
            title: z.string()
        });

        const { title } = bodySchema.parse(req.body);

        const generate = new ShortUniqueId({ length: 6 });
        const code = String(generate()).toUpperCase();

        try {
            await prisma.group.create({
                data: {
                    title,
                    code,
                    ownerId: userId,

                    participants: {
                        create: {
                            userId
                        }
                    }
                }
            });
        } catch (error) {
            console.log(error);
        }

        return rep.status(201).send({ code });
    })
}