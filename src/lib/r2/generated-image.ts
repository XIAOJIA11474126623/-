import { randomUUID } from "crypto";
import { uploadToR2 } from "@/lib/r2";

type GenerateTemporaryImageUrl = (prompt: string) => Promise<string>;

type SaveGeneratedImage = (params: {
  userId: string;
  imageUrl: string;
  prompt: string;
  createdAt: Date;
}) => Promise<void>;

interface GenerateAndStoreImageParams {
  userId?: string;
  prompt: string;
  generateTemporaryImageUrl: GenerateTemporaryImageUrl;
  saveGeneratedImage?: SaveGeneratedImage;
}

function getImageExtension(contentType: string): string {
  if (contentType.includes("jpeg")) {
    return "jpg";
  }

  if (contentType.includes("webp")) {
    return "webp";
  }

  return "png";
}

export async function uploadRemoteImageToR2(
  imageUrl: string,
  folder = "images",
): Promise<string> {
  const imageResponse = await fetch(imageUrl);

  if (!imageResponse.ok) {
    throw new Error(
      `下载临时图片失败: ${imageResponse.status} ${imageResponse.statusText}`,
    );
  }

  const contentType = imageResponse.headers.get("content-type") || "image/png";
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const fileName = `${folder}/${randomUUID()}.${getImageExtension(contentType)}`;

  return uploadToR2(imageBuffer, fileName, contentType);
}

export async function generateAndUploadImageToR2({
  userId,
  prompt,
  generateTemporaryImageUrl,
  saveGeneratedImage,
}: GenerateAndStoreImageParams): Promise<string> {
  const tempImageUrl = await generateTemporaryImageUrl(prompt);
  const permanentUrl = await uploadRemoteImageToR2(tempImageUrl);

  if (userId) {
    await saveGeneratedImage?.({
      userId,
      imageUrl: permanentUrl,
      prompt,
      createdAt: new Date(),
    });
  }

  return permanentUrl;
}
