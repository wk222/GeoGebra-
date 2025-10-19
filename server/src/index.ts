import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import logger from './utils/logger';
import { chatRouter } from './routes/chat';
import { geogebraRouter } from './routes/geogebra';
import { configRouter } from './routes/config';
import { setupWebSocket } from './websocket';

// 加载环境变量
dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || (isProduction ? 5000 : 3001);

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/chat', chatRouter);
app.use('/api/geogebra', geogebraRouter);
app.use('/api/config', configRouter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 在生产环境中提供静态文件
if (isProduction) {
  const clientDistPath = path.join(__dirname, '../../client/dist');
  logger.info(`📁 Serving static files from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  
  // 所有其他路由返回 index.html（用于 SPA 路由）
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 创建 HTTP 服务器和 WebSocket 服务器
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// 设置 WebSocket
setupWebSocket(wss);

// 启动服务器
server.listen(PORT, () => {
  logger.info(`🚀 服务器启动成功！`);
  logger.info(`📡 HTTP 服务: http://localhost:${PORT}`);
  logger.info(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  logger.info(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信号，正在关闭服务器...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

