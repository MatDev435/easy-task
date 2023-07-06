import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";

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
}
