# AGENTS.md

## 项目概览

纸片人女友 —— 有温度的 AI 聊天伴侣应用。用户可从四位性格各异的女性角色中选择一位，进行文字、图片、语音三模态对话。

### 核心功能
- 首页角色选择（4位角色：邻家小妹、知性大姐姐、傲娇学妹、温柔治愈系）
- 聊天页：流式文字对话 + 预置图库图片分享 + TTS 语音合成
- 角色主动发起对话（问候语）
- 每位角色有独立性格 Prompt、专属 TTS 音色、预置生活照片

### 版本技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **AI SDK**: coze-coding-dev-sdk (LLMClient + TTSClient)

## 目录结构

```
├── public/                     # 静态资源
├── src/
│   ├── app/
│   │   ├── page.tsx            # 首页 - 角色选择
│   │   ├── layout.tsx          # 全局布局
│   │   ├── globals.css         # 全局样式（深色暖调主题）
│   │   ├── chat/[id]/
│   │   │   └── page.tsx        # 聊天页 - 核心交互页面
│   │   └── api/
│   │       ├── chat/route.ts   # LLM 流式对话 API
│   │       └── tts/route.ts    # TTS 语音合成 API
│   ├── components/ui/          # Shadcn UI 组件库
│   ├── hooks/                  # 自定义 Hooks
│   └── lib/
│       ├── characters.ts       # 角色数据配置（核心数据源）
│       └── utils.ts            # 通用工具函数
├── DESIGN.md                   # 设计规范
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 核心数据结构

角色配置位于 `src/lib/characters.ts`，包含：
- `Character` 接口：id, name, title, description, avatar, accentColor, ttsSpeaker, personality, greeting, lifePhotos, speechRate
- `characters` 数组：4位角色的完整配置
- `getCharacterById()` 函数：按 ID 获取角色

## API 接口

### POST /api/chat
流式对话接口，SSE 协议返回。
- 入参：`{ characterId, messages: [{role, content}] }`
- 返回：SSE 事件流，事件类型：`text`（文本块）、`image`（图片URL）、`[DONE]`
- 内部逻辑：通过 System Prompt 注入角色性格，LLM 生成文本，自动检测 `[PHOTO:场景]` 标签并匹配预置图库

### POST /api/tts
语音合成接口，同步返回。
- 入参：`{ text, speaker, speechRate }`
- 返回：`{ audioUri }` 音频文件 URL

## 角色与 TTS 音色映射

| 角色 | TTS Speaker ID |
|------|---------------|
| 小萌（邻家小妹） | `saturn_zh_female_tiaopigongzhu_tob` |
| 知韵（知性大姐姐） | `saturn_zh_female_cancan_tob` |
| 傲雪（傲娇学妹） | `saturn_zh_female_keainvsheng_tob` |
| 暖汐（温柔治愈系） | `zh_female_meilinvyou_saturn_bigtts` |

## 构建与测试命令

```bash
pnpm install          # 安装依赖
pnpm ts-check         # TypeScript 类型检查
pnpm lint --quiet     # ESLint 检查
pnpm build            # 构建生产版本
```

## 编码规范

- TypeScript strict 模式，禁止隐式 any
- 后端 API 必须使用 `HeaderUtils.extractForwardHeaders` 转发请求头
- `coze-coding-dev-sdk` 只能在后端使用，禁止前端直接调用
- 流式输出必须使用 SSE 协议，前端用 `ReadableStream` + `getReader()` 消费
- 仅使用 pnpm 管理依赖

## Hydration 注意事项

- 聊天页使用 `"use client"` + `useState`/`useEffect` 确保动态内容仅客户端渲染
- 不在 JSX 中直接使用 `typeof window`、`Date.now()` 等动态数据
- 外部图片使用原生 `<img>` 标签（非 Next.js Image），避免域名白名单问题

## 已知限制

- 图片使用预置图库，非 AI 实时生图（保证一致性和速度）
- 语音在文字生成完成后异步请求，短文本（<300字）才生成语音
- 角色主动发起对话目前仅在首次进入时触发（问候语）
