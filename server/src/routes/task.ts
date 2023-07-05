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
}