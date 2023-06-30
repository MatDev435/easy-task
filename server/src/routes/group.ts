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

    app.get('/groups/:id', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            id: z.string()
        });

        const { id } = paramsSchema.parse(req.params);

        const group = await prisma.group.findUnique({
            where: { id },

            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                avatarUrl: true,
                                name: true
                            }
                        }
                    }
                },

                tasks: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        priority: true,
                        finished: true
                    }
                }
            }
        });

        if(!group) {
            return rep.status(404).send('Grupo não encontrado');
        }

        const admins = await prisma.admin.findMany({
            where: {
                groupId: id
            }
        });

        const participant = await prisma.participant.findFirst({
            where: {
                groupId: id,
                userId
            }
        });

        let participantId: string | null = null;

        if(participant) {
            participantId = participant.id;
        }

        const isAdmin = group?.ownerId === userId || admins.some(admin => admin.userId === participantId);

        const groupDetails = {
            ...group,
            isAdmin
        }

        return rep.status(200).send({
            groupDetails,
        })
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