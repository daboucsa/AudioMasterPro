# AudioMasterPro

一款强大的 AI 语音合成工具，支持多种 TTS 引擎、音色管理与音频转录功能。

## ✨ 功能特性

- 🎙️ **多引擎语音合成** — 支持 ElevenLabs、Agnes TTS、Agnes 视频转音频、火山引擎、Azure、百度 TTS、浏览器内置
- 🌏 **多语言支持** — 支持中文、英文等多种语言合成
- 🎭 **自定义音色** — 录音或上传音频，创建专属音色
- 📝 **语音转文字** — 上传音频文件，自动转录为文本
- 🎤 **实时语音输入** — 使用浏览器 Web Speech API 进行语音录入
- ⚙️ **灵活配置** — 可在界面切换 TTS 引擎，管理 API Key
- 🌐 **响应式设计** — 基于 Tailwind CSS，适配移动端与桌面端

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| UI 样式 | Tailwind CSS 3 |
| 状态管理 | Zustand |
| 路由 | React Router (HashRouter) |
| 图标库 | Lucide React |
| 后端 | Express 4 (Node.js) |
| 部署 | GitHub Pages / Vercel |

## 📦 安装与运行

### 环境要求

- Node.js >= 20
- npm

### 快速开始

```bash
# 安装依赖
npm install

# 开发模式（同时启动前后端）
npm run dev

# 仅前端开发
npm run client:dev

# 仅后端开发
npm run server:dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

开发模式下：
- 前端：`http://localhost:5173`
- 后端 API：`http://localhost:3001`

## 🎯 使用指南

1. 打开应用后，在文本框输入要合成的文字
2. 点击右上角 **⚙️ AI 配置** 按钮，选择 TTS 引擎并填入对应的 API Key
3. 点击 **▶️ 生成音频** 即可合成语音
4. 使用 **🎤 语音录入** 录制自定义音色
5. 使用 **📁 上传音频** 将音频文件转为文字

### 支持的 TTS 引擎

| 引擎 | 说明 | 配置项 |
|------|------|--------|
| 浏览器内置 | 无需配置，使用系统语音 | 无 |
| ElevenLabs | 高质量多语言合成 | API Key + Model + Voice ID |
| Agnes TTS | Agnes AI 语音合成 | API Key + Model |
| Agnes 视频转音频 | 通过视频生成 API 合成 | API Key + Model |
| 火山引擎 | 豆包 TTS 服务 | API Key + Secret Key |
| Azure TTS | 微软 Azure 语音服务 | API Key + Region + Model |
| 百度 TTS | 百度语音合成 | API Key + Secret Key |

## 🚀 部署

### 方案一：GitHub Pages（仅前端）

```bash
# 自动部署由 GitHub Actions 完成
# 推送代码到 main 分支即可触发
git push origin main
```

在 GitHub 仓库 **Settings → Pages** 中将 Source 设置为 **GitHub Actions**。

> ⚠️ GitHub Pages 为静态托管，以下功能依赖后端 API，**不可用**：
> - Agnes TTS / 视频转音频
> - ElevenLabs 语音克隆
> - 音频转录
> 
> 浏览器内置 TTS 与语音输入功能可正常使用。

### 方案二：Vercel（全栈推荐）

1. 在 Vercel 创建项目并关联 GitHub 仓库
2. 在仓库 **Settings → Secrets and variables → Actions** 中添加：
   - `VERCEL_TOKEN` — Vercel Personal Token
   - `VERCEL_ORG_ID` — Vercel Organization ID
   - `VERCEL_PROJECT_ID` — Vercel Project ID
3. 推送代码到 `main` 分支，GitHub Actions 自动部署

## 📁 项目结构

```
AudioMasterPro/
├── src/
│   ├── components/       # 组件
│   │   ├── SettingsPanel.tsx
│   │   └── Empty.tsx
│   ├── pages/            # 页面
│   │   └── Home.tsx
│   ├── types/            # 类型定义
│   │   ├── index.ts
│   │   └── settings.ts
│   ├── lib/              # 工具函数
│   │   └── utils.ts
│   ├── hooks/            # React Hooks
│   │   └── useTheme.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── api/                  # 后端 API
│   ├── routes/
│   │   ├── auth.ts
│   │   └── tts.ts
│   ├── app.ts
│   ├── index.ts          # Vercel Serverless 入口
│   └── server.ts
├── public/               # 静态资源
│   └── favicon.svg
├── .github/workflows/    # CI/CD
│   ├── deploy-gh-pages.yml
│   └── deploy-vercel.yml
├── vercel.json           # Vercel 配置
├── vite.config.ts        # Vite 配置
├── tailwind.config.js    # Tailwind 配置
└── package.json
```

## ⚠️ 注意事项

- 部分 TTS 引擎需要有效的 API Key 才能使用
- 音频转录功能依赖 ElevenLabs API
- 使用语音录入功能需在 Chrome / Edge 浏览器中运行
- 本地开发时 API 代理已配置，前端请求 `/api/*` 会自动转发到后端

## 📄 License

MIT
