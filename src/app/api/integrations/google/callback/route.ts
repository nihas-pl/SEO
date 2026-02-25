import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedUser } from '@/server/services/user-workspace';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { workspace } = await getAuthenticatedUser(request);
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.redirect(new URL('/settings/integrations?error=no_code', process.env.NEXT_PUBLIC_APP_URL!));
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`
        );

        // Exchange the code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        // Ensure we got an access token
        if (!tokens.access_token) {
            throw new Error("No access token returned from Google");
        }

        // Calculate absolute expiry time
        const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;

        // Upsert the integration in the database for the user's workspace
        await prisma.integration.upsert({
            where: {
                workspaceId_provider: {
                    workspaceId: workspace.id,
                    provider: 'google',
                }
            },
            update: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || undefined, // Don't wipe existing refresh token if not provided (happens on re-auth without consent prompt)
                expiresAt,
            },
            create: {
                workspaceId: workspace.id,
                provider: 'google',
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || null,
                expiresAt,
            }
        });

        console.log(`[OAUTH CALLBACK] Successfully connected Google Analytics for workspace ${workspace.id}`);
        return NextResponse.redirect(new URL('/settings/integrations?success=google_connected', process.env.NEXT_PUBLIC_APP_URL!));

    } catch (error) {
        console.error('[OAUTH CALLBACK] Error exchanging code for token:', error);
        return NextResponse.redirect(new URL('/settings/integrations?error=oauth_failed', process.env.NEXT_PUBLIC_APP_URL!));
    }
}
