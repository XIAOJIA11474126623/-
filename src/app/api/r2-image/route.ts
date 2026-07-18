import { NextRequest } from "next/server";
import { getR2Object, getR2ObjectKeyFromPublicUrl } from "@/lib/r2";

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get("url");

  if (!imageUrl) {
    return new Response("Missing image url", { status: 400 });
  }

  let objectKey: string | null = null;

  try {
    objectKey = getR2ObjectKeyFromPublicUrl(imageUrl);
  } catch {
    return new Response("Invalid image url", { status: 400 });
  }

  if (!objectKey) {
    return new Response("Image url is not allowed", { status: 403 });
  }

  try {
    const object = await getR2Object(objectKey);
    const responseBody = object.body.slice().buffer as ArrayBuffer;

    return new Response(responseBody, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": object.contentType,
      },
    });
  } catch (error) {
    console.error("R2 image proxy failed:", error);
    return new Response("Image not found", { status: 404 });
  }
}
