# 🚀 快速启动指南

## 第一步：安装依赖

在 `web-app` 目录下运行：

```bash
npm run install:all
```

这会自动安装所有前端和后端依赖。

## 第二步：启动应用

```bash
npm run dev
```

这会同时启动：
- 后端服务器：http://localhost:3001
- 前端应用：http://localhost:3000

## 第三步：配置 AI

1. 浏览器会自动打开 http://localhost:3000
2. 首次使用会弹出配置窗口
3. 选择 AI 提供商：
   - **OpenAI**：需要 OpenAI API Key（https://platform.openai.com/api-keys）
   - **Anthropic**：需要 Claude API Key（https://console.anthropic.com/settings/keys）
4. 输入 API Key 并点击"验证"
5. 选择模型后保存

## 第四步：开始使用

在聊天框输入数学问题，例如：

- "画一个圆心在原点，半径为3的圆"
- "绘制函数 y = x^2"
- "创建一个等边三角形"
- "画出 sin(x) 和 cos(x) 的图像"

AI 会自动调用 GeoGebra 工具在右侧画板上显示结果！

## 🎯 技巧

- 使用 Shift+Enter 在输入框中换行
- 点击"清空"按钮清除对话和画布
- 点击"新会话"开始新的对话
- 点击"导出"按钮保存 GeoGebra 图像
- 点击设置图标随时修改 API 配置

## ❓ 遇到问题？

### 依赖安装失败
```bash
# 尝试清理缓存
npm cache clean --force
npm run install:all
```

### 端口已被占用
修改 `server/.env` 中的 `PORT`，以及 `client/vite.config.ts` 中的端口配置。

### GeoGebra 无法显示
确保网络可以访问 https://www.geogebra.org

### API Key 无效
- 检查 API Key 是否正确
- 确认 API Key 有足够的配额
- 检查网络连接

---

**享受使用！** 🎉

