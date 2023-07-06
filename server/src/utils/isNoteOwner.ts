import { prisma } from '../lib/prisma';

interface isTaskOwnerProps {
    userId: string;
    noteId: string;
}

export async function isNoteOwner({ userId, noteId }: isTaskOwnerProps) {
    const participant = await prisma.participant.findFirst({
        where: {
            AND: [
                { userId },
                { note: { some: { id: noteId } } }
            ]
        }
    });

    if(!participant) {
        return false;
    }

    const note = await prisma.note.findUnique({
        where: { id: noteId }
    });

    if(!note) {
        return false;
    }

    return note.userId === participant.id;
}