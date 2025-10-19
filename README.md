# GeoGebra 数学教学助手 Web 应用

这是一个基于 Web 的数学教学辅助应用，集成了 AI（OpenAI/Claude）和 GeoGebra 画图工具，让学生和教师能够通过自然语言与 AI 对话，AI 会自动调用 GeoGebra 工具来创建数学可视化。

## ✨ 功能特点

- 🤖 **AI 对话**：支持 OpenAI 和 Anthropic Claude API
- 📐 **GeoGebra 集成**：实时数学可视化和动态几何
- 🎨 **现代界面**：简洁美观的用户体验
- 💾 **会话管理**：保存配置，支持多会话
- 📥 **导出功能**：将 GeoGebra 图形导出为 PNG

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm 或 yarn

### 安装

1. **安装所有依赖**：
```bash
cd web-app
npm run install:all
```

这个命令会自动安装根目录、server 和 client 的所有依赖。

如果你想分别安装：
```bash
# 安装根目录依赖
npm install

# 安装服务器依赖
cd server
npm install

# 安装客户端依赖
cd ../client
npm install
```

### 配置

1. **配置服务器环境变量**：

在 `server` 目录创建 `.env` 文件（参考 `.env.example`）：

```env
# 服务器配置
PORT=3001
NODE_ENV=development

# 如果你想在服务器端默认使用某个 API（可选）
# OPENAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here

LOG_LEVEL=info
```

**注意**：你也可以在网页界面中配置 API，不需要在环境变量中设置。

### 启动

有两种启动方式：

**方式 1：同时启动前后端（推荐）**

```bash
npm run dev
```

这将同时启动：
- 后端服务器：http://localhost:3001
- 前端应用：http://localhost:3000

**方式 2：分别启动**

```bash
# 终端 1：启动后端
cd server
npm run dev

# 终端 2：启动前端
cd client
npm run dev
```

### 使用

1. 打开浏览器访问 http://localhost:3000
2. 首次使用会弹出配置窗口
3. 选择 AI 提供商（OpenAI 或 Anthropic）
4. 输入你的 API Key 并验证
5. 选择模型
6. 开始对话！

## 📖 使用示例

### 示例对话

**用户**：画一个圆心在原点，半径为 3 的圆

**AI** 会：
1. 调用 `geogebra_create_point` 创建原点 O
2. 调用 `geogebra_create_circle` 创建圆
3. GeoGebra 画板实时显示结果

**用户**：画函数 y = x^2

**AI** 会：
1. 调用 `geogebra_plot_function` 绘制抛物线
2. 在画板上显示函数图像

## 🏗️ 项目结构

```
web-app/
├── server/                 # 后端服务器
│   ├── src/
│   │   ├── index.ts       # 入口文件
│   │   ├── routes/        # API 路由
│   │   ├── services/      # 业务逻辑
│   │   ├── utils/         # 工具函数
│   │   └── types/         # TypeScript 类型
│   ├── package.json
│   └── tsconfig.json
│
├── client/                 # 前端应用
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── services/      # API 调用
│   │   ├── store/         # 状态管理
│   │   ├── types/         # TypeScript 类型
│   │   ├── App.tsx        # 主应用
│   │   └── main.tsx       # 入口文件
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── package.json           # 根 package.json
└── README.md             # 本文件
```

## 🔧 开发

### 可用脚本

**根目录**：
- `npm run install:all` - 安装所有依赖
- `npm run dev` - 同时启动前后端开发服务器
- `npm run build` - 构建生产版本
- `npm start` - 启动生产服务器

**服务器（server/）**：
- `npm run dev` - 启动开发服务器（热重载）
- `npm run build` - 构建
- `npm start` - 启动生产服务器

**客户端（client/）**：
- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run preview` - 预览生产构建

## 📦 技术栈

### 后端
- **Express** - Web 框架
- **TypeScript** - 类型安全
- **OpenAI SDK** - OpenAI API 集成
- **Anthropic SDK** - Claude API 集成
- **Puppeteer** - GeoGebra 自动化
- **WebSocket** - 实时通信

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Zustand** - 状态管理
- **TanStack Query** - 数据获取
- **Axios** - HTTP 客户端
- **Lucide React** - 图标库

## 🔑 API 配置

### OpenAI

1. 访问 https://platform.openai.com/api-keys
2. 创建 API Key
3. 在应用中输入 API Key（格式：`sk-...`）

### Anthropic Claude

1. 访问 https://console.anthropic.com/settings/keys
2. 创建 API Key
3. 在应用中输入 API Key（格式：`sk-ant-...`）

## 🎯 支持的 GeoGebra 工具

- ✅ 创建点、线、圆
- ✅ 绘制函数图像
- ✅ 创建多边形
- ✅ 执行自定义命令
- ✅ 清空画布
- ✅ 导出 PNG 图像

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙋 常见问题

### Q: API Key 存储在哪里？
A: API Key 存储在浏览器的 localStorage 中，不会上传到服务器。

### Q: 支持哪些 AI 模型？
A: 
- OpenAI: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- Anthropic: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet

### Q: GeoGebra 无法显示？
A: 确保你的网络可以访问 GeoGebra CDN（https://www.geogebra.org）

### Q: 如何清除配置？
A: 在浏览器开发者工具中清除 localStorage，或者在设置中重新配置。

## 📞 支持

如有问题，请提交 Issue 或联系开发者。

---

**注意**：这是从 MCP (Model Context Protocol) 项目改造的 Web 应用版本。原始 MCP 功能仍然可以在父目录中使用。

