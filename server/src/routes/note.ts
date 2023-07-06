import { FastifyInstance } from "fastify";
import { prisma } from '../lib/prisma';
import { z } from "zod";
import { isNoteOwner } from "../utils/isNoteOwner";
import { isUserGroupAdmin } from "../utils/isAdmin";

export async function noteRoutes(app: FastifyInstance) {
    app.addHook('preHandler', async (request) => {
        await request.jwtVerify()
    })

    app.get('/tasks/:taskId/notes', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            taskId: z.string()
        });

        const { taskId } = paramsSchema.parse(req.params);

        try {
            const notes = await prisma.note.findMany({
                where: { taskId }
            });

            if(notes.length < 1) {
                return rep.status(404).send('Essa tarefa não possui nenhuma nota');
            }

            return rep.status(200).send({ notes });
        } catch (error) {
            return rep.status(500).send('Erro ao listar as notas');
        }
    })

    app.post('/groups/:groupId/tasks/:taskId/notes', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            groupId: z.string(),
            taskId: z.string()
        });

        const bodySchema = z.object({
            content: z.string().min(2)
        });

        const { groupId, taskId } = paramsSchema.parse(req.params);
        const { content } = bodySchema.parse(req.body);

        try {
            const participant = await prisma.participant.findFirst({
                where: {
                    AND: [
                        { userId },
                        { groupId }
                    ]
                }
            });

            if(!participant) {
                return rep.status(403).send('Você não tem permissões suficiente');
            }

            const task = await prisma.task.findUnique({
                where: { id: taskId }
            });

            if(!task) {
                return rep.status(404).send('Tarefa não encontrada');
            }

            const note = await prisma.note.create({
                data: {
                    content,
                    userId: participant.id,
                    taskId
                }
            });

            return rep.status(201).send({ note });
        } catch (error) {
            return rep.status(500).send('Erro ao criar a nota');
        }
    })

    app.delete('/groups/:groupId/tasks/:taskId/notes/:noteId', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            taskId: z.string(),
            noteId: z.string(),
            groupId: z.string()
        });

        const { groupId, taskId, noteId } = paramsSchema.parse(req.params);

        try {
            const task = await prisma.task.findUnique({
                where: { id: taskId }
            });

            if(!task) {
                return rep.status(404).send('Tarefa não encontrada');
            }

            const note = await prisma.note.findUnique({
                where: { id: noteId }
            });

            if(!note) {
                return rep.status(404).send('Nota não encontrada');
            }

            const isOwner = await isNoteOwner({ userId, noteId });
            const isAdmin = await isUserGroupAdmin({ userId, groupId });

            if(!isOwner || !isAdmin) {
                return rep.status(403).send('Você não tem permissões suficiente');
            }

            await prisma.note.delete({
                where: { id: noteId }
            });

            return rep.status(200).send('Nota deletada');
        } catch (error) {
            return rep.status(500).send('Erro ao deletar a nota');
        }
    })
}