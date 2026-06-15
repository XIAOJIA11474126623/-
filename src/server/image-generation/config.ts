export const imageGenerationConfig = {
  enabled: process.env.IMAGE_GEN_ENABLED
    ? process.env.IMAGE_GEN_ENABLED === "true"
    : true,
  provider: process.env.IMAGE_GEN_PROVIDER || "doubao",
  apiKey: process.env.IMAGE_GEN_API_KEY,
  endpoint:
    process.env.IMAGE_GEN_API_BASE ||
    "https://ark.cn-beijing.volces.com/api/v3/images/generations",
  model: process.env.IMAGE_GEN_MODEL || "doubao-seedream-5-0-260128",
  size: process.env.IMAGE_GEN_SIZE || "2K",
  watermark: process.env.IMAGE_GEN_WATERMARK
    ? process.env.IMAGE_GEN_WATERMARK === "true"
    : true,
  generateInChat: process.env.IMAGE_GEN_IN_CHAT === "true",
};
