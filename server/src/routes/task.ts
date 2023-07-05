import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export async function taskRoutes(app: FastifyInstance) {
    app.addHook('preHandler', async (request) => {
        await request.jwtVerify()
    })

    app.get('/groups/:id/tasks', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            id: z.string()
        });

        const { id } = paramsSchema.parse(req.params);

        try {
            const tasks = await prisma.task.findMany({
                where: { groupId: id }
            });

            if(tasks.length < 1) {
                return rep.status(404).send('Nenhuma tarefa existente');
            }

            return rep.status(200).send({ tasks });
        } catch (error) {
            return rep.status(500).send('Erro ao carregar as tarefas');
        }
    })

    app.post('/groups/:id/tasks', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            id: z.string()
        });

        const bodySchema = z.object({
            title: z.string().min(2),
            description: z.string(),
            priority: z.string(),
            dueDate: z.string().datetime()
        });

        const { id } = paramsSchema.parse(req.params);
        const { title, description, priority, dueDate } = bodySchema.parse(req.body);

        try {
            const group = await prisma.group.findUnique({
                where: { id }
            });

            if(!group) {
                return rep.status(404).send('O grupo não existe');
            }

            const participant = await prisma.participant.findFirst({
                where: { groupId: id, userId }
            });

            if(!participant) {
                return rep.status(404).send('Você não faz parte desse grupo');
            }

            const task = await prisma.task.create({
                data: {
                    title,
                    description,
                    priority,
                    dueDate,
                    userId: participant.id,
                    groupId: group.id
                }
            });

            return rep.status(201).send({ task });
        } catch (error) {
            console.log(error);
            return rep.status(500).send('Erro ao criar a tarefa');
        }
    })

    app.patch('/tasks/:id', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            id: z.string()
        });

        const bodySchema = z.object({
            finished: z.boolean()
        });

        const { id } = paramsSchema.parse(req.params);
        const { finished } = bodySchema.parse(req.body);

        try {
            const task = await prisma.task.findUnique({
                where: { id }
            });

            if(!task) {
                return rep.status(404).send('Tarefa não encontrada');
            }

            await prisma.task.update({
                where: { id },

                data: {
                    finished
                }
            });

            return rep.status(200).send('Status alterado');
        } catch (error) {
            return rep.status(500).send('Erro ao alterar o status de conclusão da tarefa');
        }
    })

    app.delete('/tasks/:id', async (req, rep) => {
        const { sub: userId } = req.user;

        const paramsSchema = z.object({
            id: z.string()
        });

        const { id } = paramsSchema.parse(req.params);

        try {
            const task = await prisma.task.findUnique({
                where: { id }
            });

            if(!task) {
                return rep.status(404).send('Tarefa não encontrada');
            }

            await prisma.task.delete({
                where: { id }
            });

            return rep.status(200).send('Tarefa deletada');
        } catch (error) {
            return rep.status(500).send('Erro ao deletar a tarefa');
        }
    })
}