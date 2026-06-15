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
import { hashPassword } from "@/lib/password";
import { createInitialPoints } from "@/lib/points";

export async function POST(request: Request) {
  try {
    const { email, password, nickname } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const safeNickname = typeof nickname === "string" ? nickname.trim() : "";

    if (!normalizedEmail || !safeNickname || typeof password !== "string") {
      return NextResponse.json({ error: "请填写完整信息" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "密码至少需要 8 位" }, { status: 400 });
    }

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      return NextResponse.json({ error: "这个邮箱已经注册过了" }, { status: 409 });
    }

    const [user] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        nickname: safeNickname,
        passwordHash: hashPassword(password),
      })
      .returning({
        id: users.id,
        email: users.email,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
      });

    const token = createSessionToken();
    const expiresAt = getSessionExpiresAt();

    await db.insert(sessions).values({
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt,
    });

    const pointsBalance = await createInitialPoints(user.id);

    const response = NextResponse.json({
      user: {
        ...user,
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
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json(
      { error: "注册服务暂时不可用，请检查数据库配置后再试" },
      { status: 500 },
    );
  }
}
