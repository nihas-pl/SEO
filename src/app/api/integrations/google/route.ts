import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedUser } from '@/server/services/user-workspace';

export async function GET(request: Request) {
    try {
        await getAuthenticatedUser(request);

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`
        );

        // Generate a URL that asks permissions for Google Analytics API
        // We need both the Data API (readonly) and the Admin API (edit) to fetch the list of properties
        const scopes = [
            'https://www.googleapis.com/auth/analytics.readonly',
            'https://www.googleapis.com/auth/analytics.edit',
        ];

        const authorizationUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Requires offline to get a refresh_token
            scope: scopes,
            include_granted_scopes: true,
            prompt: 'consent', // Force consent screen to always get refresh_token
        });

        return NextResponse.redirect(authorizationUrl);
    } catch (error) {
        console.error('[OAUTH START] Error:', error);
        return NextResponse.redirect(new URL('/settings/integrations?error=oauth_failed', request.url || process.env.NEXT_PUBLIC_APP_URL!));
    }
}
