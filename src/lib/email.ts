import { Resend } from "resend";
import { db } from "@/db";
import { users } from "@/db/schema";
import { WelcomeEmail } from "@/emails/welcome";

const resend = new Resend(process.env.RESEND_API_KEY);

const defaultAppUrl = "https://你的域名.com";

function sanitizeEmailText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

async function generateLoveLetter(userName: string): Promise<string> {
  const apiKey = process.env.DOUBAO_API_KEY;
  const apiBase = process.env.DOUBAO_API_BASE;
  const model = process.env.DOUBAO_MODEL;
  const safeUserName = sanitizeEmailText(userName) || "你";

  if (!apiKey || !apiBase || !model) {
    return buildFallbackLoveLetter(safeUserName);
  }

  try {
    const response = await fetch(`${apiBase}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "你是纸片人女友应用里的温柔聊天伴侣。",
                  `今天是${getCurrentBeijingDateLabel()}。`,
                  `请给用户「${safeUserName}」写一段早安情话。`,
                  "要求：中文，45 到 90 字，自然口语化，像微信消息一样温暖；不要称自己为 AI；不要包含标题、署名、Markdown 或引号。",
                ].join("\n"),
              },
            ],
          },
        ],
        max_output_tokens: 180,
        thinking: { type: "disabled" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Doubao API returned ${response.status}`);
    }

    const payload = await response.json();
    return normalizeLoveLetter(extractResponseText(payload)) || buildFallbackLoveLetter(safeUserName);
  } catch (error) {
    console.error("Generate love letter failed, fallback to static content:", error);
    return buildFallbackLoveLetter(safeUserName);
  }
}

export async function sendDailyLoveLetter(
  userEmail: string,
  userName: string,
): Promise<void> {
  const subjectUserName = sanitizeEmailText(userName) || "你";
  const loveLetter = await generateLoveLetter(userName);
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || defaultAppUrl;

  if (!fromEmail) {
    throw new Error("Missing required environment variable: RESEND_FROM_EMAIL");
  }

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: userEmail,
    subject: `早安 ${subjectUserName}，今天也想你了`,
    react: WelcomeEmail({
      userName: subjectUserName,
      loveLetter,
      appUrl,
    }),
  });

  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }
}

export async function sendDailyLoveLetterToAll(): Promise<{
  total: number;
  success: number;
  failed: number;
}> {
  const allUsers = await db
    .select({
      email: users.email,
      nickname: users.nickname,
    })
    .from(users);

  let success = 0;
  let failed = 0;

  for (const user of allUsers) {
    try {
      await sendDailyLoveLetter(user.email, user.nickname);
      success++;
    } catch (error) {
      failed++;
      console.error(`给 ${user.email} 发情话失败：`, error);
    }
  }

  return {
    total: allUsers.length,
    success,
    failed,
  };
}

function buildFallbackLoveLetter(userName: string): string {
  return `早安 ${userName}，今天也要好好吃饭、好好休息。醒来的时候记得先对自己温柔一点，我会一直在这里等你回来聊天。`;
}

function normalizeLoveLetter(value: string): string {
  return value.replace(/^["“”'‘’\s]+|["“”'‘’\s]+$/g, "").trim();
}

function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === "string") {
    return record.output_text;
  }

  const output = record.output;
  if (!Array.isArray(output)) {
    return "";
  }

  let text = "";
  for (const item of output) {
    if (!item || typeof item !== "object") continue;

    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") continue;

      const contentRecord = contentItem as Record<string, unknown>;
      if (typeof contentRecord.text === "string") {
        text += contentRecord.text;
      }
    }
  }

  return text;
}

function getCurrentBeijingDateLabel(): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}
