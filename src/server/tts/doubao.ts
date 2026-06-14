import { randomUUID } from "crypto";

interface DoubaoTtsOptions {
  text: string;
  speaker?: string;
  speechRate?: number;
}

interface DoubaoSseEvent {
  code?: number;
  message?: string;
  data?: string;
  header?: {
    code?: number;
    message?: string;
  };
}

const speakerMap: Record<string, string> = {
  saturn_zh_female_tiaopigongzhu_tob: "zh_female_linjianvhai_uranus_bigtts",
  saturn_zh_female_cancan_tob: "zh_female_cancan_uranus_bigtts",
  saturn_zh_female_keainvsheng_tob: "zh_female_sajiaoxuemei_uranus_bigtts",
  zh_female_meilinvyou_saturn_bigtts: "zh_female_wenroushunv_uranus_bigtts",
};

export async function synthesizeDoubaoTts({
  text,
  speaker,
  speechRate,
}: DoubaoTtsOptions): Promise<string> {
  const apiKey = process.env.DOUBAO_TTS_API_KEY || process.env.DOUBAO_API_KEY;
  const apiUrl =
    process.env.DOUBAO_TTS_API_URL ||
    "https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse";
  const resourceId = process.env.DOUBAO_TTS_RESOURCE_ID || "seed-tts-2.0";
  const model = process.env.DOUBAO_TTS_MODEL || "seed-tts-2.0-expressive";
  const defaultSpeaker =
    process.env.DOUBAO_TTS_DEFAULT_SPEAKER || "zh_female_vv_uranus_bigtts";
  const resolvedSpeaker = speaker
    ? speakerMap[speaker] || speaker
    : defaultSpeaker;

  if (!apiKey) {
    throw new Error("豆包 TTS 未配置 DOUBAO_TTS_API_KEY");
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      "X-Api-Resource-Id": resourceId,
      "X-Api-Request-Id": randomUUID(),
    },
    body: JSON.stringify({
      user: {
        uid: "girlfriend-app-user",
      },
      req_params: {
        text,
        speaker: resolvedSpeaker,
        model,
        audio_params: {
          format: "mp3",
          sample_rate: 24000,
          speech_rate: speechRate || 0,
        },
      },
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `豆包 TTS API 错误: ${response.status} ${response.statusText} ${responseText}`
    );
  }

  const audioBase64 = parseDoubaoTtsAudio(responseText);
  if (!audioBase64) {
    throw new Error(`豆包 TTS 未返回音频数据: ${responseText.slice(0, 500)}`);
  }

  return `data:audio/mp3;base64,${audioBase64}`;
}

function parseDoubaoTtsAudio(responseText: string): string {
  const trimmed = responseText.trim();

  if (trimmed.startsWith("{")) {
    return parseJsonAudio(trimmed);
  }

  const chunks: string[] = [];
  for (const line of responseText.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith("data:")) continue;

    const payload = trimmedLine.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;

    const event = JSON.parse(payload) as DoubaoSseEvent;
    const errorCode = event.header?.code ?? event.code;
    if (errorCode && errorCode !== 0 && errorCode !== 20000000) {
      throw new Error(event.header?.message || event.message || "豆包 TTS 合成失败");
    }

    if (event.data) {
      chunks.push(event.data);
    }
  }

  return chunks.join("");
}

function parseJsonAudio(responseText: string): string {
  const event = JSON.parse(responseText) as DoubaoSseEvent;
  const errorCode = event.header?.code ?? event.code;

  if (errorCode && errorCode !== 0 && errorCode !== 20000000) {
    throw new Error(event.header?.message || event.message || "豆包 TTS 合成失败");
  }

  return event.data || "";
}
