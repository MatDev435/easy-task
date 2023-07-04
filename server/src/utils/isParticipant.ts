import { prisma } from '../lib/prisma';

interface isUserGroupParticipantProps{
    groupId: string;
    userId: string;
}

export async function isUserGroupParticipant({ userId, groupId }: isUserGroupParticipantProps) {
    const participant = await prisma.participant.findFirst({
        where: { groupId, userId }
    });

    if(participant) return true;

    return false;
}