import { Router } from 'express';
import { geogebraService } from '../services/geogebra-service';
import logger from '../utils/logger';

export const geogebraRouter = Router();

// 获取所有对象
geogebraRouter.get('/objects', async (req, res) => {
  try {
    const objects = await geogebraService.getAllObjects();
    res.json({ objects });
  } catch (error) {
    logger.error('获取对象失败', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 清空画布
geogebraRouter.post('/clear', async (req, res) => {
  try {
    const result = await geogebraService.clearConstruction();
    res.json(result);
  } catch (error) {
    logger.error('清空画布失败', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 导出 PNG
geogebraRouter.get('/export/png', async (req, res) => {
  try {
    const base64Image = await geogebraService.exportPNG();
    res.json({ image: base64Image });
  } catch (error) {
    logger.error('导出 PNG 失败', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 执行命令
geogebraRouter.post('/command', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: '缺少命令参数' });
    }

    const result = await geogebraService.executeTool({
      id: 'manual',
      type: 'geogebra',
      tool: 'geogebra_eval_command',
      parameters: { command },
    });

    res.json(result);
  } catch (error) {
    logger.error('执行命令失败', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

