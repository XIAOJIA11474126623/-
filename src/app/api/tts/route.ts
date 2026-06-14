import { NextRequest, NextResponse } from "next/server";
import { synthesizeDoubaoTts } from "@/server/tts/doubao";

export async function POST(request: NextRequest) {
  const { text, speaker, speechRate } = await request.json();

  if (!text || !speaker) {
    return NextResponse.json(
      { error: "缺少必要参数" },
      { status: 400 }
    );
  }

  try {
    const audioUri = await synthesizeDoubaoTts({
      text,
      speaker,
      speechRate: speechRate || 0,
    });

    return NextResponse.json({ audioUri });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "语音合成失败";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
