import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import ShortUniqueId from 'short-unique-id';
import { isUserGroupAdmin } from '../utils/isAdmin';
import { isUserGroupParticipant } from '../utils/isParticipant';

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
                _count: { select: { participants: true } }
            }
        });

        if(!group) {
            return rep.status(404).send('Grupo não encontrado');
        }

        const isParticipant = await isUserGroupParticipant({ userId, groupId: id });

        if(!isParticipant) {
            return rep.status(403).send('Você não tem permissões suficiente');
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
            const group = await prisma.group.create({
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

            return rep.status(201).send({ group });
        } catch (error) {
            return rep.status(500).send('Ero ao criar o grupo');
        }
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

    app.delete('/groups/:id', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            id: z.string()
        });

        const { id } = paramsSchema.parse(req.params);

        try {
            const group = await prisma.group.findUnique({
                where: { id },

                include: {
                    tasks: true
                }
            });

            if(!group) {
                return rep.status(404).send('Grupo não encontrado');
            }

            const isAdmin = await isUserGroupAdmin({ userId, groupId: id });

            if(!isAdmin) {
                return rep.status(403).send('Você não tem permissões suficiente');
            }

            for(const task of group.tasks) {
                await prisma.note.deleteMany({
                    where: { taskId: task.id }
                });
            }

            await prisma.task.deleteMany({
                where: { groupId: id }
            });

            await prisma.admin.deleteMany({
                where: { groupId: id }
            });

            await prisma.participant.deleteMany({
                where: { groupId: id }
            });

            await prisma.group.delete({
                where: { id },
            });

            return rep.status(200).send('Grupo deletado');
        } catch (error) {
            console.log(error);
            return rep.status(500).send('Erro ao excluir o grupo');
        }
    })
}