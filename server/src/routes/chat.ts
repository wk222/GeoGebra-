import { Router } from 'express';
import { AIService } from '../services/ai-service';
import { geogebraService } from '../services/geogebra-service';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const chatRouter = Router();

// 存储会话的 AI 服务实例
const aiServices = new Map<string, AIService>();

chatRouter.post('/message', async (req, res) => {
  try {
    const { messages, config, sessionId } = req.body;

    if (!messages || !config) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 获取或创建 AI 服务实例
    let aiService = aiServices.get(sessionId);
    if (!aiService) {
      aiService = new AIService(config);
      aiServices.set(sessionId, aiService);
    } else {
      aiService.updateConfig(config);
    }

    // 调用 AI（createAgent 内置循环处理）
    logger.info('📨 处理聊天请求', { sessionId, messageCount: messages.length });
    const { message, toolCalls } = await aiService.chat(messages);

    // 获取当前画布状态
    const objects = await geogebraService.getAllObjects();

    res.json({
      message: {
        id: message.id || uuidv4(),
        role: message.role,
        content: message.content,
        timestamp: message.timestamp || new Date(),
      },
      toolCalls,
      objects,
    });
  } catch (error) {
    logger.error('❌ 聊天请求失败', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '服务器错误',
    });
  }
});

chatRouter.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    aiServices.delete(sessionId);
    res.json({ success: true });
  } catch (error) {
    logger.error('删除会话失败', error);
    res.status(500).json({ error: '服务器错误' });
  }
});
