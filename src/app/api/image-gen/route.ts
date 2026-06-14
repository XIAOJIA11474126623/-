import { NextRequest, NextResponse } from "next/server";
import { generateDoubaoImage } from "@/server/image-generation/doubao";
import { imageGenerationConfig } from "@/server/image-generation/config";

/**
 * 图片生成 API 端点
 * 用于根据场景描述生成或获取相应的图片
 * 
 * 请求格式：
 * POST /api/image-gen
 * {
 *   "prompt": "图片描述或场景",
 *   "characterId": "角色ID"
 * }
 * 
 * 响应格式：
 * {
 *   "imageUrl": "生成的图片 URL",
 *   "source": "api" | "cache"  // api 表示实时生成，cache 表示从预置图库获取
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const { prompt, characterId } = await request.json();

    if (!prompt || !characterId) {
      return NextResponse.json(
        { error: "缺少必要参数: prompt 或 characterId" },
        { status: 400 }
      );
    }

    const imageUrl = await generateImage(prompt, characterId);

    return NextResponse.json({
      imageUrl,
      source: "api",
      prompt,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "图片生成失败";
    console.error("Image generation error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * 图片生成核心函数
 * @param prompt 图片描述/场景
 * @param characterId 角色 ID
 * @returns 生成的图片 URL
 * 
 * 实现步骤：
 * 1. 根据 characterId 获取角色信息（用于风格化提示词）
 * 2. 调用图片生成 API（需要配置以下环境变量）
 * 3. 返回生成的图片 URL
 * 
 * 所需环境变量（待配置）：
 * - IMAGE_GEN_API_KEY: 图片生成 API 的密钥
 * - IMAGE_GEN_API_BASE: 图片生成 API 的基础 URL
 * - IMAGE_GEN_MODEL: 使用的模型名称
 * - IMAGE_GEN_PROVIDER: API 提供者（如 openai, flux, midjourney 等）
 */
async function generateImage(prompt: string, characterId: string): Promise<string> {
  if (!imageGenerationConfig.apiKey || !imageGenerationConfig.endpoint) {
    throw new Error("图片生成服务未配置。请检查服务端图片生成配置");
  }

  switch (imageGenerationConfig.provider.toLowerCase()) {
    case "doubao":
    case "volcengine":
    case "ark":
      return await generateDoubaoImage(prompt, characterId);
    default:
      throw new Error(`不支持的图片生成提供者: ${imageGenerationConfig.provider}`);
  }
}
