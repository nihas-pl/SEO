import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const session = await getSessionFromRequest(request);
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                companyName: true,
                emailVerified: true,
                role: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get user's workspace
        const membership = await prisma.workspaceMember.findFirst({
            where: { userId: user.id },
            include: { workspace: true },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({
            user,
            workspace: membership?.workspace || null,
        });
    } catch (error) {
        console.error('[AUTH] /me error:', error);
        return NextResponse.json({ error: 'Failed to get user info' }, { status: 500 });
    }
}
