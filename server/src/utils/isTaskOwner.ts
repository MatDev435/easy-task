import { prisma } from '../lib/prisma';

interface isTaskOwnerProps {
    userId: string;
    taskId: string;
}

export async function isTaskOwner({ userId, taskId }: isTaskOwnerProps) {
    const participant = await prisma.participant.findFirst({
        where: {
            AND: [
                { userId },
                { tasks: { some: { id: taskId } } }
            ]
        }
    });

    if(!participant) {
        return false;
    }

    const task = await prisma.task.findUnique({
        where: { id: taskId }
    });

    if(!task) {
        return false;
    }

    return task.userId === participant.id;
}