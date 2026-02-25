import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signToken, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }

        // Find user by email or username
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email.toLowerCase().trim() },
                    { username: email.toLowerCase().trim() },
                ],
            },
            include: {
                memberships: {
                    include: { workspace: true }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        // Set session cookie
        const jwt = await signToken({ userId: user.id, email: user.email });
        await setSessionCookie(jwt);

        const primaryWorkspace = user.memberships[0]?.workspace;

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                companyName: user.companyName,
                emailVerified: user.emailVerified,
                onboardingCompleted: primaryWorkspace?.onboardingCompleted || false,
            },
        });
    } catch (error: any) {
        console.error('[AUTH] Login error:', error);
        return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
    }
}
