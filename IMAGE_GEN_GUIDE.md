# 图片生成功能集成指南

## 📋 功能概述

本项目现已预留图片生成功能的完整框架。在聊天过程中，当 LLM 输出包含 `[PHOTO:场景描述]` 标签时，系统可以自动调用图片生成 API 生成对应的图片。

## 🏗️ 架构说明

### 文件结构
```
src/
├── app/api/
│   └── image-gen/
│       └── route.ts              # 图片生成 API 端点
├── lib/
│   └── image-gen.ts              # 图片生成工具函数
.env.local                         # 环境变量配置
```

### 代码文件说明

#### 1. `src/app/api/image-gen/route.ts` - API 端点
- 处理图片生成请求
- 支持多种 API 提供者（OpenAI DALL-E、Flux、Coze、自定义）
- 根据 `IMAGE_GEN_PROVIDER` 环境变量动态选择实现

#### 2. `src/lib/image-gen.ts` - 工具函数
- `generateImageFromPrompt()` - 调用图片生成 API
- `extractPhotoTags()` - 从文本中提取 `[PHOTO:xxx]` 标签
- `enhancePromptForCharacter()` - 根据角色为提示词增强

## 🔧 快速开始

### 第一步：启用图片生成功能
编辑 `.env.local`，设置以下变量：

```bash
# 启用图片生成
IMAGE_GEN_ENABLED=true

# 选择 API 提供者
IMAGE_GEN_PROVIDER=openai  # 或 flux / coze / custom
```

### 第二步：配置 API 认证信息
根据你使用的 API 提供者，设置对应的环境变量：

#### OpenAI DALL-E 配置
```bash
IMAGE_GEN_PROVIDER=openai
IMAGE_GEN_API_KEY=sk-...your_openai_api_key...
IMAGE_GEN_API_BASE=https://api.openai.com/v1
IMAGE_GEN_MODEL=dall-e-3
```

#### Flux 配置
```bash
IMAGE_GEN_PROVIDER=flux
IMAGE_GEN_API_KEY=...your_flux_api_key...
IMAGE_GEN_API_BASE=...flux_api_url...
IMAGE_GEN_MODEL=flux-pro  # 或其他模型
```

#### Coze 图片生成配置
```bash
IMAGE_GEN_PROVIDER=coze
IMAGE_GEN_API_KEY=...your_coze_api_key...
IMAGE_GEN_API_BASE=https://api.coze.cn
IMAGE_GEN_MODEL=...coze_image_gen_model...
```

### 第三步：提供 API 实现
当你决定了使用的 API 提供者后，提供给我以下信息：

#### 需要提供的信息模板：
```
图片生成 API 提供者: [OpenAI / Flux / Coze / 其他]

API 端点信息：
- API Base URL: [基础 URL]
- API Key 获取方式: [如何获取]
- 请求格式: [API 的请求格式示例]
- 响应格式: [API 的响应格式示例]

认证方式: [Bearer Token / API Key header / 其他]

可选：
- 支持的图片尺寸: [如 1024x1024, 512x512 等]
- 支持的输出格式: [如 PNG, JPEG, WebP]
- 速率限制: [每分钟请求数等信息]
```

## 📝 使用示例

### 在聊天中触发图片生成

当用户说"给我看一张你的自拍"时，LLM 可以这样回复：

```
我帮你找一张！特别喜欢这个角度呢～

[PHOTO:自拍]
```

系统将自动：
1. 识别 `[PHOTO:自拍]` 标签
2. 调用 `/api/image-gen` 端点生成"自拍"相关的图片
3. 在聊天界面展示生成的图片

## 🔌 支持的 API 提供者

### 已预留实现框架
- ✅ OpenAI DALL-E 3
- ✅ Flux (Black Forest Labs)
- ✅ Coze 图片生成
- ✅ 自定义 API (custom)

### 实现步骤
当你提供 API 信息后，我会：
1. 在 `src/app/api/image-gen/route.ts` 中填充具体的 API 调用代码
2. 处理 API 认证、请求格式、错误处理
3. 集成到聊天流中

## 🚀 集成流程

### 当前状态
- ✅ API 端点框架已创建
- ✅ 工具函数已编写
- ✅ 环境变量配置已预设
- ⏳ 等待你提供图片生成 API

### 后续步骤
1. **你提供 API 信息** → 告诉我使用哪个图片生成服务以及认证方式
2. **我实现具体调用** → 根据 API 文档实现请求和响应处理
3. **测试集成** → 在聊天中测试图片生成功能
4. **上线部署** → 生产环境中使用

## ⚙️ 配置要点

### 环境变量
```bash
# 核心配置
IMAGE_GEN_ENABLED=true/false              # 是否启用
IMAGE_GEN_PROVIDER=openai|flux|coze|...   # API 提供者
IMAGE_GEN_API_KEY=...                     # API 密钥
IMAGE_GEN_API_BASE=...                    # API 基础 URL

# 可选配置
IMAGE_GEN_MODEL=...                       # 具体模型名称
IMAGE_GEN_TIMEOUT=30000                   # 超时时间 (毫秒)
IMAGE_GEN_MAX_RETRIES=3                   # 最大重试次数
```

### 错误处理
- 如果图片生成 API 失败，系统将降级到预置图库
- 所有错误都会被记录到服务器日志
- 用户端只会看到文字回复（没有图片）

## 📚 参考文档

已创建以下文件供参考：
- [src/app/api/image-gen/route.ts](src/app/api/image-gen/route.ts) - API 端点实现
- [src/lib/image-gen.ts](src/lib/image-gen.ts) - 工具函数实现

## 💡 下一步

当你准备好时，请告诉我：
1. 选择的图片生成 API 提供者
2. 提供相应的 API 认证信息
3. 提供 API 文档或接口说明

我就能完成实现并测试集成！
