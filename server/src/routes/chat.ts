import { Router } from 'express';
import { agentOrchestrator } from '../agents';
import { geogebraService } from '../services/geogebra-service';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const chatRouter = Router();

// 获取所有可用智能体
chatRouter.get('/agents', async (req, res) => {
  try {
    const agents = agentOrchestrator.getEnabledAgents();
    res.json({ agents });
  } catch (error) {
    logger.error('❌ 获取智能体列表失败', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '服务器错误',
    });
  }
});

// 发送消息
chatRouter.post('/message', async (req, res) => {
  try {
    const { messages, config, sessionId, agentId = 'geogebra' } = req.body;

    if (!messages || !config) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 获取指定的智能体
    const agent = agentOrchestrator.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: `智能体不存在: ${agentId}` });
    }

    logger.info('📨 处理聊天请求', { 
      sessionId, 
      messageCount: messages.length,
      agentId,
      agentName: agent.getConfig().name 
    });

    // 调用智能体
    const { message, toolCalls } = await agent.chat(messages, config);

    // 获取当前画布状态（仅 GeoGebra Agent）
    const objects = agentId === 'geogebra' 
      ? await geogebraService.getAllObjects()
      : [];

    res.json({
      message: {
        id: message.id || uuidv4(),
        role: message.role,
        content: message.content,
        timestamp: message.timestamp || new Date(),
      },
      toolCalls,
      objects,
      agentId,
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
    // 智能体是无状态的，不需要删除会话
    logger.info(`会话删除请求: ${sessionId}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('删除会话失败', error);
    res.status(500).json({ error: '服务器错误' });
  }
});
