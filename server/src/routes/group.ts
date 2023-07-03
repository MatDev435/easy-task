import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import ShortUniqueId from 'short-unique-id';
import { isUserGroupAdmin } from '../utils/isAdmin';

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
                _count: { select: { participants: true } },

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

        const isAdmin = await isUserGroupAdmin({ userId, groupId: id });

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

    app.patch('/groups/:id', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            id: z.string()
        });

        const bodySchema = z.object({
            newTitle: z.string()
        });

        const { id } = paramsSchema.parse(req.params);
        const { newTitle } = bodySchema.parse(req.body);

        try {
            let group = await prisma.group.findUnique({
                where: { id }
            });

            if(!group) {
                return rep.status(404).send('Grupo não encontrado');
            }

            const isAdmin = await isUserGroupAdmin({ userId, groupId: id });

            if(!isAdmin) {
                return rep.status(403).send('Você não tem permissão suficiente');
            }

            const updatedGroup = await prisma.group.update({
                where: { id },
                data: { title: newTitle }
            });

            return rep.status(200).send(updatedGroup);
        } catch (error) {
            return rep.status(500).send('Erro ao atualizar o grupo');
        }
    })

    
}