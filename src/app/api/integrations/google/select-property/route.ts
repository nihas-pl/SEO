import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthError } from '@/server/services/user-workspace';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const { workspace } = await getAuthenticatedUser(request);
        const body = await request.json();
        const { propertyId, propertyName } = body;

        if (!propertyId || !propertyName) {
            return NextResponse.json({ error: 'Property ID and Name are required' }, { status: 400 });
        }

        const integration = await prisma.integration.update({
            where: {
                workspaceId_provider: {
                    workspaceId: workspace.id,
                    provider: 'google',
                }
            },
            data: {
                accountId: propertyId,
                accountName: propertyName,
            }
        });

        return NextResponse.json({ success: true, integration });

    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        // If the record doesn't exist, prisma update throws a specific error
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Google Account not connected' }, { status: 400 });
        }

        console.error('[GA4 API] Failed to select property:', error?.message || error);

        return NextResponse.json(
            { error: 'Failed to save selected property' },
            { status: 500 }
        );
    }
}
