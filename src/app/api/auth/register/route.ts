import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { signToken, setSessionCookie } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, username, email, password, companyName } = body;

        // Validate required fields
        if (!name || !username || !email || !password) {
            return NextResponse.json(
                { error: 'Name, username, email, and password are required.' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
        }

        // Validate username
        const usernameClean = username.trim().toLowerCase();
        if (usernameClean.length < 3) {
            return NextResponse.json({ error: 'Username must be at least 3 characters.' }, { status: 400 });
        }
        if (!/^[a-z0-9_]+$/.test(usernameClean)) {
            return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores.' }, { status: 400 });
        }

        // Validate password
        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }

        // Check for existing user
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email.toLowerCase() },
                    { username: usernameClean },
                ],
            },
        });

        if (existingUser) {
            if (existingUser.email === email.toLowerCase()) {
                return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
            }
            return NextResponse.json({ error: 'This username is already taken.' }, { status: 409 });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user + workspace in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: name.trim(),
                    username: usernameClean,
                    email: email.toLowerCase().trim(),
                    passwordHash,
                    companyName: companyName?.trim() || null,
                    emailVerified: false,
                },
            });

            const workspace = await tx.workspace.create({
                data: {
                    name: companyName?.trim() || `${name.trim()}'s Workspace`,
                    members: {
                        create: {
                            userId: user.id,
                            role: 'OWNER',
                        },
                    },
                },
            });

            // Generate email verification token
            const verificationToken = randomBytes(32).toString('hex');
            await tx.emailVerificationToken.create({
                data: {
                    userId: user.id,
                    token: verificationToken,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                },
            });

            return { user, workspace, verificationToken };
        });

        // Send verification email (non-blocking)
        sendVerificationEmail(result.user.email, result.verificationToken, result.user.name || undefined)
            .catch((err) => console.error('[AUTH] Failed to send verification email:', err));

        // Set session cookie
        const jwt = await signToken({ userId: result.user.id, email: result.user.email });
        await setSessionCookie(jwt);

        return NextResponse.json({
            user: {
                id: result.user.id,
                name: result.user.name,
                username: result.user.username,
                email: result.user.email,
                companyName: result.user.companyName,
                emailVerified: result.user.emailVerified,
            },
        });
    } catch (error: any) {
        console.error('[AUTH] Register error:', error);
        return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
    }
}
