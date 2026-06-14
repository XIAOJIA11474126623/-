import { getCharacterById } from "@/lib/characters";
import { imageGenerationConfig } from "./config";

interface DoubaoImageGenerationResponse {
  data?: Array<{
    url?: string;
    size?: string;
  }>;
}

export function buildCharacterImagePrompt(
  prompt: string,
  characterId: string
): string {
  const character = getCharacterById(characterId);
  const characterContext = character
    ? `${character.name}，${character.title}，${character.description}`
    : "女性角色，温暖日常";

  return [
    characterContext,
    prompt,
    "真实生活照片风格，自然光，手机随手拍质感，人物一致性，温暖氛围，清晰细节",
  ].join("，");
}

export async function generateDoubaoImage(
  prompt: string,
  characterId: string
): Promise<string> {
  if (!imageGenerationConfig.enabled) {
    throw new Error("图片生成功能未启用");
  }

  if (!imageGenerationConfig.apiKey || !imageGenerationConfig.endpoint) {
    throw new Error("图片生成服务未配置");
  }

  const response = await fetch(imageGenerationConfig.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${imageGenerationConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: imageGenerationConfig.model,
      prompt: buildCharacterImagePrompt(prompt, characterId),
      sequential_image_generation: "disabled",
      response_format: "url",
      size: imageGenerationConfig.size,
      stream: false,
      watermark: imageGenerationConfig.watermark,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `豆包图片生成 API 错误: ${response.status} ${response.statusText}${
        errorText ? ` - ${errorText}` : ""
      }`
    );
  }

  const data = (await response.json()) as DoubaoImageGenerationResponse;
  const imageUrl = data.data?.[0]?.url;

  if (!imageUrl) {
    throw new Error("豆包图片生成 API 未返回图片 URL");
  }

  return imageUrl;
}
