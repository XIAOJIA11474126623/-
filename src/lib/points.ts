import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { userPoints } from "@/db/schema";

export const INITIAL_POINTS = 100;
export const DAILY_LOGIN_REWARD_POINTS = 10;

function getBeijingDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function createInitialPoints(userId: string): Promise<number> {
  const [row] = await db
    .insert(userPoints)
    .values({
      userId,
      balance: INITIAL_POINTS,
      totalEarned: INITIAL_POINTS,
    })
    .onConflictDoNothing({ target: userPoints.userId })
    .returning({ balance: userPoints.balance });

  if (row) {
    return row.balance;
  }

  const [existing] = await db
    .select({ balance: userPoints.balance })
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);

  return existing?.balance ?? 0;
}

export async function ensureUserPoints(userId: string): Promise<number> {
  const [existing] = await db
    .select({ balance: userPoints.balance })
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);

  if (existing) {
    return existing.balance;
  }

  return createInitialPoints(userId);
}

export async function grantDailyLoginReward(userId: string): Promise<number> {
  const now = new Date();
  const [existing] = await db
    .select({
      balance: userPoints.balance,
      lastLoginRewardAt: userPoints.lastLoginRewardAt,
    })
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);

  if (!existing) {
    const [created] = await db
      .insert(userPoints)
      .values({
        userId,
        balance: INITIAL_POINTS + DAILY_LOGIN_REWARD_POINTS,
        totalEarned: INITIAL_POINTS + DAILY_LOGIN_REWARD_POINTS,
        lastLoginRewardAt: now,
        updatedAt: now,
      })
      .returning({ balance: userPoints.balance });

    return created.balance;
  }

  const rewardedToday =
    existing.lastLoginRewardAt &&
    getBeijingDateKey(existing.lastLoginRewardAt) === getBeijingDateKey(now);

  if (rewardedToday) {
    return existing.balance;
  }

  const [updated] = await db
    .update(userPoints)
    .set({
      balance: sql`${userPoints.balance} + ${DAILY_LOGIN_REWARD_POINTS}`,
      totalEarned: sql`${userPoints.totalEarned} + ${DAILY_LOGIN_REWARD_POINTS}`,
      lastLoginRewardAt: now,
      updatedAt: now,
    })
    .where(eq(userPoints.userId, userId))
    .returning({ balance: userPoints.balance });

  return updated.balance;
}
