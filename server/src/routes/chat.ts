import { Router } from 'express';
import { AIService } from '../services/ai-service';
import { geogebraService } from '../services/geogebra-service';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';

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

    // Agent 循环：让 AI 可以多次调用工具
    const maxIterations = 5; // 最多循环 5 次防止无限循环
    let currentMessages = [...messages];
    let allToolResults: any[] = [];
    let finalMessage: Message | null = null;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      logger.info(`Agent 循环 ${iteration + 1}/${maxIterations}`);

      // 调用 AI
      const { message, toolCalls } = await aiService.chat(currentMessages);
      finalMessage = message;

      // 如果没有工具调用，说明 AI 已经完成任务
      if (!toolCalls || toolCalls.length === 0) {
        logger.info('AI 没有更多工具调用，循环结束');
        break;
      }

      // 执行工具调用
      const toolResults = [];
      for (const toolCall of toolCalls) {
        try {
          const result = await geogebraService.executeTool(toolCall);
          const toolResult = {
            ...toolCall,
            result,
          };
          toolResults.push(toolResult);
          allToolResults.push(toolResult);
        } catch (error) {
          logger.error('工具执行失败', error);
          const toolResult = {
            ...toolCall,
            error: error instanceof Error ? error.message : String(error),
          };
          toolResults.push(toolResult);
          allToolResults.push(toolResult);
        }
      }

      // 将 AI 的消息和工具结果添加到对话历史中
      currentMessages.push(message);
      
      // 添加工具执行结果作为系统消息
      const toolResultMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: `工具执行结果：\n${toolResults.map(tr => 
          `- ${tr.tool}: ${tr.result ? '成功' : '失败'}`
        ).join('\n')}`,
        timestamp: new Date(),
      };
      currentMessages.push(toolResultMessage);

      logger.info(`已执行 ${toolResults.length} 个工具，继续下一轮...`);
    }

    // 获取当前画布状态
    const objects = await geogebraService.getAllObjects();

    res.json({
      message: {
        id: finalMessage?.id || uuidv4(),
        role: finalMessage?.role || 'assistant',
        content: finalMessage?.content || '',
        timestamp: finalMessage?.timestamp || new Date(),
      },
      toolCalls: allToolResults,
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
