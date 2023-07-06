import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { isUserGroupAdmin } from "../utils/isAdmin";

export async function adminRoutes(app: FastifyInstance) {
    app.addHook('preHandler', async (request) => {
        await request.jwtVerify()
    })

    app.post('/groups/:id/admins', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            id: z.string()
        });

        const bodySchema = z.object({
            participantId: z.string()
        });

        const { id } = paramsSchema.parse(req.params);
        const { participantId } = bodySchema.parse(req.body);

        try {
            const group = await prisma.group.findUnique({
                where: { id }
            });

            if(!group) {
                return rep.status(404).send('Grupo não encontrado');
            }

            const participant = await prisma.participant.findUnique({
                where: { id: participantId }
            });

            if(!participant) {
                return rep.status(404).send('Usuário não encontrado');
            }

            const isAdmin = await isUserGroupAdmin({ userId, groupId: id });

            if(!isAdmin) {
                return rep.status(403).send('Você não tem permissões suficiente');
            }

            const admin = await prisma.admin.findFirst({
                where: { userId: participant.id }
            });

            if(admin) {
                return rep.status(409).send('O usuário já é administrador do grupo');
            }

            await prisma.admin.create({
                data: {
                    userId: participant.id,
                    groupId: group.id
                }
            });

            return rep.status(201).send('Permissão de adminstrador adicionada');
        } catch (error) {
            return rep.status(500).send('Erro ao adicionar o administrador');
        }
    })

    app.delete('/groups/:id/admins/:adminId', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            id: z.string(),
            adminId: z.string()
        });

        const bodySchema = z.object({
            participantId: z.string()
        });

        const { id, adminId } = paramsSchema.parse(req.params);
        const { participantId } = bodySchema.parse(req.body);

        try {
            const group = await prisma.group.findUnique({
                where: { id }
            });

            if(!group) {
                return rep.status(404).send('Grupo não encontrado');
            }

            const isAdmin = await isUserGroupAdmin({ userId, groupId: id });

            const admin = await prisma.admin.findFirst({
                where: {
                    AND: [
                        { userId: participantId },
                        { groupId: group.id }
                    ]
                }
            });

            if(!admin) {
                return rep.status(404).send('Esse usuário não é um administrador');
            }

            await prisma.admin.delete({
                where: { id: adminId }
            });

            return rep.status(200).send('Removido a permissão de administrador');
        } catch (error) {
            return rep.status(500).send('Erro ao tirar a permissão de administrador');
        }
    })
}