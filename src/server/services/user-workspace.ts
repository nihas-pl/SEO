import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

/**
 * Get the authenticated user and their workspace from the JWT session cookie.
 * Throws if not authenticated.
 */
export async function getAuthenticatedUser(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    throw new AuthError("Not authenticated", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    throw new AuthError("User not found", 404);
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership?.workspace) {
    throw new AuthError("No workspace found for this user", 404);
  }

  return {
    user,
    workspace: membership.workspace,
  };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

// --- Legacy helpers kept for backward compatibility during migration ---

const DEFAULT_USER_KEY = "user1";

export function normalizeUserKey(input?: string | null): string {
  const value = (input ?? "").trim().toLowerCase();
  return value || DEFAULT_USER_KEY;
}

export function userKeyToEmail(userKey: string): string {
  if (userKey.includes("@")) {
    return userKey;
  }
  return `${userKey}@autorank.local`;
}

export function getUserKeyFromRequest(request: Request): string {
  const fromHeader = request.headers.get("x-user-id");
  const fromQuery = new URL(request.url).searchParams.get("userId");
  return normalizeUserKey(fromHeader || fromQuery);
}

export async function resolveWorkspaceForUser(input?: string | null) {
  const userKey = normalizeUserKey(input);
  const email = userKeyToEmail(userKey);
  const displayName = userKey.split("@")[0] || userKey;

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      username: userKey.replace(/[^a-z0-9_]/g, "_"),
      passwordHash: "legacy-no-password",
      name: displayName,
    },
  });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  if (membership?.workspace) {
    return {
      userKey,
      user,
      workspace: membership.workspace,
    };
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: `${displayName} Workspace`,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  return {
    userKey,
    user,
    workspace,
  };
}
