import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import {
  createSessionToken,
  getSessionExpiresAt,
  getSessionMaxAgeSeconds,
  hashSessionToken,
  sessionCookieName,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { grantDailyLoginReward } from "@/lib/points";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedEmail || typeof password !== "string") {
    return NextResponse.json({ error: "请输入邮箱和密码" }, { status: 400 });
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      nickname: users.nickname,
      avatarUrl: users.avatarUrl,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  const token = createSessionToken();
  const expiresAt = getSessionExpiresAt();

  await db.insert(sessions).values({
    userId: user.id,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });

  const pointsBalance = await grantDailyLoginReward(user.id);

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      pointsBalance,
    },
  });

  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
    expires: expiresAt,
  });

  return response;
}
