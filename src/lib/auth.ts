import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, userPoints, users } from "@/db/schema";
import { ensureUserPoints } from "@/lib/points";

export const sessionCookieName = "paper_girlfriend_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  pointsBalance: number;
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiresAt(): Date {
  return new Date(Date.now() + sessionMaxAgeSeconds * 1000);
}

export function getSessionMaxAgeSeconds(): number {
  return sessionMaxAgeSeconds;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const now = new Date();

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      nickname: users.nickname,
      avatarUrl: users.avatarUrl,
      pointsBalance: userPoints.balance,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(userPoints, eq(userPoints.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...row,
    pointsBalance: row.pointsBalance ?? (await ensureUserPoints(row.id)),
  };
}
