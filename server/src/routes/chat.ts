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

    // 调用 AI
    const { message, toolCalls } = await aiService.chat(messages);

    // 执行工具调用
    const toolResults = [];
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        try {
          const result = await geogebraService.executeTool(toolCall);
          toolResults.push({
            ...toolCall,
            result,
          });
        } catch (error) {
          logger.error('工具执行失败', error);
          toolResults.push({
            ...toolCall,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // 获取当前画布状态
    const objects = await geogebraService.getAllObjects();

    res.json({
      message: {
        id: message.id || uuidv4(),
        role: message.role,
        content: message.content,
        timestamp: message.timestamp || new Date(),
      },
      toolCalls: toolResults,
      objects,
    });
  } catch (error) {
    logger.error('聊天请求失败', error);
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

