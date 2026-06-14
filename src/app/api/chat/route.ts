import { NextRequest } from "next/server";
import { getCharacterById } from "@/lib/characters";
import { generateDoubaoImage } from "@/server/image-generation/doubao";
import { imageGenerationConfig } from "@/server/image-generation/config";

export async function POST(request: NextRequest) {
  const { characterId, messages } = await request.json();

  const character = getCharacterById(characterId);
  if (!character) {
    return new Response(JSON.stringify({ error: "角色不存在" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const currentTimeContext = getCurrentBeijingTimeContext();

  // Build system prompt with personality and image instructions
  const systemPrompt = `${character.personality}

当前真实时间：${currentTimeContext.label}，当前时段：${currentTimeContext.period}。

重要规则：
1. 你是在和用户进行日常聊天，绝对不要以AI助手的身份回答问题
2. 回复要自然口语化，像发微信消息一样，不要太长
3. 绝大多数回复只发文字，不要主动频繁发图片
4. 只有用户明确要求看照片、自拍、图片，或聊天隔了很久且话题非常适合时，才在回复末尾单独一行加上 [PHOTO:场景描述]
5. 保持角色性格的一致性，不要跳出角色
6. 涉及早安、午饭、下午、晚安、睡觉、今天、明天、昨天等时间概念时，必须以上面的真实时间为准，不要把晚上说成下午或早上`;

  // Build message list for Doubao API
  const doubaoMessages = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: [
      {
        type: "input_text",
        text: m.content,
      },
    ],
  }));

  // Add system prompt as the first message
  const llmInput = [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: systemPrompt,
        },
      ],
    },
    ...doubaoMessages,
  ];

  // Ensure there's at least one user message
  if (!messages.some((m: { role: string }) => m.role === "user")) {
    return new Response(JSON.stringify({ error: "需要至少一条用户消息" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const apiKey = process.env.DOUBAO_API_KEY;
        const apiBase = process.env.DOUBAO_API_BASE;
        const model = process.env.DOUBAO_MODEL;

        if (!apiKey || !apiBase || !model) {
          throw new Error(
            "豆包 API 配置不完整。请检查环境变量: DOUBAO_API_KEY, DOUBAO_API_BASE, DOUBAO_MODEL"
          );
        }

        const response = await fetch(`${apiBase}/responses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            input: llmInput,
            max_output_tokens: 420,
            thinking: { type: "disabled" },
            stream: true,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(
            `豆包 API 错误: ${response.status} ${response.statusText}${
              errorText ? ` - ${errorText}` : ""
            }`
          );
        }

        let buffer = "";
        const collectedTags: string[] = [];

        const emitText = (content: string) => {
          if (!content) return;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "text", content })}\n\n`
            )
          );
        };

        const processText = (text: string) => {
          for (const char of text) {
            buffer += char;

            const completeMatch = buffer.match(/\[PHOTO:\s*([^\]]+?)\]/i);
            if (completeMatch) {
              collectedTags.push(completeMatch[1].trim());
              buffer = buffer.replace(/\[PHOTO:\s*[^\]]+?\]/i, "");
              continue;
            }

            const couldBePhotoTag = /^\[P(H(O(T(O(:.*)?)?)?)?)?$/i.test(buffer) ||
              /^\[PHOTO:\s*[^\]]*$/.test(buffer);

            if (couldBePhotoTag) {
              continue;
            }

            const notAPhotoTag = /^\[(?!PHOTO)/.test(buffer) && buffer.length > 1;

            if (notAPhotoTag) {
              emitText(buffer);
              buffer = "";
              continue;
            }

            const lastOpenBracket = buffer.lastIndexOf("[");
            if (lastOpenBracket === -1) {
              emitText(buffer);
              buffer = "";
            } else if (lastOpenBracket > 0) {
              const toFlush = buffer.slice(0, lastOpenBracket);
              emitText(toFlush);
              buffer = buffer.slice(lastOpenBracket);
            }
          }
        };

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("豆包 API 未返回流式响应");
        }

        const decoder = new TextDecoder();
        let sseBuffer = "";
        let streamedText = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split(/\r?\n/);
          sseBuffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const rawData = line.slice(6).trim();
            if (!rawData || rawData === "[DONE]") continue;

            const event = JSON.parse(rawData);
            const delta = extractTextDelta(event);
            if (delta) {
              streamedText = true;
              processText(delta);
            } else if (!streamedText) {
              const completedText = extractCompletedText(event);
              if (completedText) {
                streamedText = true;
                processText(completedText);
              }
            }
          }
        }

        // Flush any remaining buffer
        const remainingPhotoMatch = buffer.match(/\[PHOTO:\s*([^\]]+?)\]/i);
        if (remainingPhotoMatch) {
          collectedTags.push(remainingPhotoMatch[1].trim());
        } else if (buffer && !/^\[PHOTO:\s*[^\]]*$/.test(buffer)) {
          const cleaned = buffer
            .replace(/\[PHOTO:\s*[^\]]*$/gi, "")
            .replace(/\]\s*$/g, "");
          if (cleaned) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", content: cleaned })}\n\n`
              )
            );
          }
        }

        if (shouldSendPhoto(messages, collectedTags)) {
          const scene = collectedTags[0] || "自拍";

          let imageUrl: string | null = null;
          let imageScene = scene;

          if (imageGenerationConfig.generateInChat) {
            try {
              imageUrl = await generateDoubaoImage(scene, character.id);
            } catch (error) {
              console.error("Image generation failed, fallback to preset photo:", error);
            }
          }

          if (!imageUrl) {
            imageUrl = character.avatar;
            imageScene = scene;
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "image",
                url: imageUrl,
                scene: imageScene,
              })}\n\n`
            )
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const errorMessage = formatErrorMessage(error);
        console.error("Chat API route error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", content: errorMessage })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function formatErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "未知错误";
  }

  const cause = error.cause;
  if (cause instanceof Error && cause.message) {
    return `${error.message}: ${cause.message}`;
  }

  return error.message;
}

function extractTextDelta(event: unknown): string {
  if (!event || typeof event !== "object") {
    return "";
  }

  const record = event as Record<string, unknown>;
  return record.type === "response.output_text.delta" &&
    typeof record.delta === "string"
    ? record.delta
    : "";
}

function extractCompletedText(event: unknown): string {
  if (!event || typeof event !== "object") {
    return "";
  }

  const output = (event as Record<string, unknown>).output;
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
      if (contentRecord.type === "output_text" && typeof contentRecord.text === "string") {
        text += contentRecord.text;
      }
    }
  }

  return text;
}

function shouldSendPhoto(
  messages: Array<{ role: string; content: string }>,
  collectedTags: string[]
): boolean {
  if (collectedTags.length === 0) {
    return false;
  }

  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content || "";

  const explicitPhotoRequest =
    /(照片|图片|自拍|相片|图|拍.*给我|发.*(照片|图片|自拍|图)|看看你|看一下你|给我看)/.test(
      lastUserMessage
    );

  if (explicitPhotoRequest) {
    return true;
  }

  const visualTopic =
    /(吃|喝|咖啡|奶茶|甜品|蛋糕|风景|花|阳光|逛街|穿搭|书|窗边|旅行|出去玩)/.test(
      lastUserMessage
    );
  const assistantMessageCount = messages.filter(
    (message) => message.role === "assistant"
  ).length;

  return visualTopic && assistantMessageCount > 0 && assistantMessageCount % 5 === 0;
}

function getCurrentBeijingTimeContext(): { label: string; period: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";

  const hour = Number(value("hour"));
  const period = getChineseDayPeriod(hour);
  const label = `北京时间 ${value("year")}年${value("month")}月${value("day")}日 ${value("weekday")} ${value("hour")}:${value("minute")}`;

  return { label, period };
}

function getChineseDayPeriod(hour: number): string {
  if (hour >= 5 && hour <= 10) return "早上";
  if (hour >= 11 && hour <= 13) return "中午";
  if (hour >= 14 && hour <= 17) return "下午";
  if (hour >= 18 && hour <= 22) return "晚上";
  return "深夜/凌晨";
}
