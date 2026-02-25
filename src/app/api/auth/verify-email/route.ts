import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signToken, setSessionCookie } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.redirect(new URL('/verify-email?error=missing-token', request.url));
        }

        const verificationRecord = await prisma.emailVerificationToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!verificationRecord) {
            return NextResponse.redirect(new URL('/verify-email?error=invalid-token', request.url));
        }

        if (verificationRecord.expiresAt < new Date()) {
            // Clean up expired token
            await prisma.emailVerificationToken.delete({ where: { id: verificationRecord.id } });
            return NextResponse.redirect(new URL('/verify-email?error=expired-token', request.url));
        }

        // Mark user as verified and delete the token
        await prisma.$transaction([
            prisma.user.update({
                where: { id: verificationRecord.userId },
                data: { emailVerified: true },
            }),
            prisma.emailVerificationToken.delete({
                where: { id: verificationRecord.id },
            }),
        ]);

        // Auto-login the user after verification (helpful if they verified on a different device)
        const jwt = await signToken({ userId: verificationRecord.user.id, email: verificationRecord.user.email });
        await setSessionCookie(jwt);

        const userWithWorkspace = await prisma.user.findUnique({
            where: { id: verificationRecord.userId },
            include: { memberships: { include: { workspace: true } } }
        });
        const onboardingCompleted = userWithWorkspace?.memberships[0]?.workspace?.onboardingCompleted;

        console.log(`[AUTH] Email verified and autologged in user: ${verificationRecord.user.email}`);

        if (onboardingCompleted) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        } else {
            return NextResponse.redirect(new URL('/onboarding', request.url));
        }
    } catch (error) {
        console.error('[AUTH] Email verification error:', error);
        return NextResponse.redirect(new URL('/verify-email?error=server-error', request.url));
    }
}
