/**
 * 图片生成工具函数
 * 用于在聊天流中集成图片生成功能
 */

/**
 * 调用图片生成 API
 * @param prompt 图片描述
 * @param characterId 角色 ID
 * @returns 生成的图片 URL
 */
export async function generateImageFromPrompt(
  prompt: string,
  characterId: string
): Promise<string | null> {
  try {
    // 检查图片生成功能是否启用
    if (!process.env.IMAGE_GEN_ENABLED || process.env.IMAGE_GEN_ENABLED !== "true") {
      console.log("图片生成功能未启用");
      return null;
    }

    const response = await fetch("http://localhost:3000/api/image-gen", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        characterId,
      }),
    });

    if (!response.ok) {
      console.error(`图片生成失败: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.imageUrl || null;
  } catch (error) {
    console.error("调用图片生成 API 时出错:", error);
    return null;
  }
}

/**
 * 从 [PHOTO:xxx] 标签提取图片描述
 * @param text 包含 PHOTO 标签的文本
 * @returns { photos: string[], cleanText: string }
 */
export function extractPhotoTags(text: string): {
  photos: string[];
  cleanText: string;
} {
  const photoRegex = /\[PHOTO:\s*([^\]]+?)\]/gi;
  const photos: string[] = [];
  let match;

  while ((match = photoRegex.exec(text)) !== null) {
    photos.push(match[1].trim());
  }

  const cleanText = text.replace(photoRegex, "").trim();

  return { photos, cleanText };
}

/**
 * 场景描述到提示词的增强
 * 为特定角色生成更好的图片生成提示词
 * @param characterId 角色 ID
 * @param sceneDescription 场景描述
 * @returns 增强后的提示词
 */
export function enhancePromptForCharacter(
  characterId: string,
  sceneDescription: string
): string {
  // 角色特定的图片生成风格提示
  const characterStyles: Record<string, string> = {
    xiaomei: "邻家小妹,活泼可爱,温暖日常,柔和光线,高清摄影",
    dajiejie: "知性大姐姐,温柔优雅,成熟气质,自然光线,精致人物摄影",
    xuemei: "傲娇学妹,青春活力,校园风,明亮光线,清新风格摄影",
    zhiyu: "温柔治愈系,治愈系风格,温暖氛围,柔光,舒适日常摄影",
  };

  const style = characterStyles[characterId] || "温暖日常,高质量摄影";
  return `${sceneDescription}, ${style}`;
}
