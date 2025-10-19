import { Router } from 'express';
import logger from '../utils/logger';

export const configRouter = Router();

// 验证 API 配置
configRouter.post('/validate', async (req, res) => {
  try {
    const { provider, apiKey, baseURL } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ 
        valid: false, 
        error: '缺少提供商或 API Key' 
      });
    }

    // 简单验证（实际应用中应该调用对应的 API 来验证）
    if (provider === 'openai') {
      if (!apiKey.startsWith('sk-')) {
        return res.json({ 
          valid: false, 
          error: 'OpenAI API Key 格式不正确' 
        });
      }
    } else if (provider === 'anthropic') {
      if (!apiKey.startsWith('sk-ant-')) {
        return res.json({ 
          valid: false, 
          error: 'Anthropic API Key 格式不正确' 
        });
      }
    } else if (provider === 'custom') {
      if (!baseURL) {
        return res.json({ 
          valid: false, 
          error: '自定义API需要提供baseURL' 
        });
      }
      // 验证URL格式
      try {
        new URL(baseURL);
      } catch {
        return res.json({ 
          valid: false, 
          error: 'API地址格式不正确' 
        });
      }
    }

    res.json({ valid: true });
  } catch (error) {
    logger.error('验证配置失败', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取可用的模型列表
configRouter.get('/models/:provider', async (req, res) => {
  try {
    const { provider } = req.params;

    const models: Record<string, string[]> = {
      openai: [
        'gpt-4-turbo-preview',
        'gpt-4',
        'gpt-3.5-turbo',
      ],
      anthropic: [
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
      ],
      custom: [
        'gpt-4',
        'gpt-3.5-turbo',
        'gpt-5-chat',
        'claude-3-5-sonnet',
        'claude-3-opus',
        'claude-3-sonnet',
        'custom-model',
      ],
    };

    res.json({ 
      models: models[provider] || [] 
    });
  } catch (error) {
    logger.error('获取模型列表失败', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

