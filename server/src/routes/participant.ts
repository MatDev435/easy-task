import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { isUserGroupAdmin } from "../utils/isAdmin";

export async function participantRoutes(app: FastifyInstance) {
    app.addHook('preHandler', async (request) => {
        await request.jwtVerify()
    })

    app.get('/groups/:id/participants', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            id: z.string()
        });

        const { id } = paramsSchema.parse(req.params);

        try {
            const group = await prisma.group.findUnique({
                where: { id }
            });

            if(!group) {
                return rep.status(404).send('Grupo não encontrado');
            }

            const participants = await prisma.participant.findMany({
                where: { groupId: id },

                select: {
                    id: true,
                    
                    user: {
                        select: {
                            name: true,
                            avatarUrl: true
                        }
                    }
                },

            });

            if(!participants) {
                return rep.status(404).send('Esse grupo não possui nenhum participante');
            }

            return rep.status(200).send({ participants });
        } catch (error) {
            return rep.status(500).send('Erro ao listar os participantes');
        }
    })

    app.post('/groups/:id/join', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            id: z.string()
        });

        const bodySchema = z.object({
            code: z.string()
        });

        const { id } = paramsSchema.parse(req.params);
        const { code } = bodySchema.parse(req.body);

        try {
            const group = await prisma.group.findUnique({
                where: { id }
            });

            if(!group || group.code !== code) {
                return rep.status(404).send('Grupo não encontrado');
            }

            let participant = await prisma.participant.findFirst({
                where: { userId, groupId: id }
            });

            if(participant) {
                return rep.status(409).send('Você já faz parte desse grupo');
            }

            participant = await prisma.participant.create({
                data: {
                    userId,
                    groupId: id
                }
            });

            return rep.status(201).send({ participant });
        } catch (error) {
            return rep.status(500).send('Erro ao entrar no grupo');
            console.log(error);
        }
    })

    app.delete('/groups/:id/participants/:participantId/leave', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            id: z.string(),
            participantId: z.string()
        });

        const { id, participantId } = paramsSchema.parse(req.params);

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

            const participant = await prisma.participant.findFirst({
                where: { userId, groupId: group.id }
            });

            if(!participant) {
                return rep.status(404).send('Você não faz parte desse grupo');
            }

            if(participant.userId === group.ownerId) {
                return rep.status(403).send('Você não pode sair do grupo');
            }

            const admin = await prisma.admin.findFirst({
                where: { groupId: group.id, userId: participant.id }
            });

            if(admin) {
                await prisma.admin.delete({
                    where: { id: admin.id }
                });
            }

            if(group.tasks.length > 0) {
                for(const task of group.tasks) {
                    await prisma.note.deleteMany({
                        where: { taskId: task.id, userId: participant.id }
                    });
                }

                await prisma.task.deleteMany({
                    where: { userId: participant.id, groupId: group.id }
                });
            }

            await prisma.participant.delete({
                where: { id: participant.id },
            });

            return rep.status(200).send('Você saiu do grupo');
        } catch (error) {
            return rep.status(500).send('Erro ao sair do grupo');
            
        }
    })

    app.delete('/groups/:id/participants/:participantId/kick', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            id: z.string(),
            participantId: z.string()
        });

        const { id, participantId } = paramsSchema.parse(req.params);

        try {
            const group = await prisma.group.findUnique({
                where: { id },

                include: { tasks: true }
            });

            if(!group) {
                return rep.status(404).send('Grupo não encontrado');
            }

            const userParticipant = await prisma.participant.findFirst({
                where: { userId, groupId: group.id }
            });

            if(!userParticipant) {
                return rep.status(404).send('Você não faz parte desse grupo');
            }

            const isAdmin = await isUserGroupAdmin({ userId, groupId: group.id });

            if(!isAdmin) {
                return rep.status(403).send('Você não tem permissões suficientes');
            }

            const participant = await prisma.participant.findUnique({
                where: { id: participantId }
            });

            if(!participant) {
                return rep.status(404).send('Esse usuário não faz parte do grupo');
            }

            if(participant.userId === group.ownerId) {
                return rep.status(403).send('Você não tem permissões suficientes');
            }

            const admin = await prisma.admin.findFirst({
                where: { userId: participant.id, groupId: group.id }
            });

            if(admin && userParticipant.userId === group.ownerId) {
                await prisma.admin.delete({
                    where: { id: admin.id }
                });
            }else if(admin && userParticipant.userId !== group.ownerId) {
                return rep.status(403).send('Você não tem permissões suficientes');
            }

            if(group.tasks.length > 0) {
                for(const task of group.tasks) {
                    await prisma.note.deleteMany({
                        where: { taskId: task.id, userId: participant.id }
                    });
                }

                await prisma.task.deleteMany({
                    where: { userId: participant.id, groupId: group.id }
                });
            }

            await prisma.participant.delete({
                where: { id: participant.id }
            });

            return rep.status(200).send('Usuário expulso');
        } catch (error) {
            console.log(error);
            return rep.status(500).send('Erro ao expulsar o usuário');
        }
    })
}
