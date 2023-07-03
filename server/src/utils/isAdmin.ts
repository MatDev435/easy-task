import { prisma } from '../lib/prisma';

interface isUserGroupAdminProps {
    groupId: string;
    userId: string;
}

export async function isUserGroupAdmin({ userId, groupId }: isUserGroupAdminProps) {
    const group = await prisma.group.findUnique({
        where: { id: groupId }
    });

    if(!group) return;

    const admins = await prisma.admin.findMany({
        where: { groupId }
    });

    const participant = await prisma.participant.findFirst({
        where: {
            groupId,
            userId
        }
    });

    let participantId: string | null = null;

    if(participant) {
        participantId = participant.id;
    }

    return group?.ownerId === userId || admins.some(admin => admin.userId === participantId);
}