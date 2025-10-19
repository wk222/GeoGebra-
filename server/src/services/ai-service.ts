import { generateText, tool, jsonSchema } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { zodToJsonSchema } from 'zod-to-json-schema';
import logger from '../utils/logger';
import { AIConfig, Message, ToolCall } from '../types';
import { geogebraTools } from './geogebra-tools';

export class AIService {
  constructor(private config: AIConfig) {}

  private getModel() {
    if (this.config.provider === 'openai' || this.config.provider === 'custom') {
      const openai = createOpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
      });
      return openai(this.config.model || 'gpt-4-turbo-preview');
    } else if (this.config.provider === 'anthropic') {
      const anthropic = createAnthropic({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
      });
      return anthropic(this.config.model || 'claude-3-5-sonnet-20241022');
    }
    throw new Error(`不支持的 AI 提供商: ${this.config.provider}`);
  }

  private getTools() {
    const tools: Record<string, any> = {};
    
    for (const t of geogebraTools) {
      logger.info(`创建工具: ${t.name}`);

      // 使用 zodToJsonSchema 将 Zod schema 转换为 JSON Schema
      // 这对于自定义 API provider 是必需的
      const convertedSchema = zodToJsonSchema(t.parameters, { $refStrategy: 'none' });
      
      // 移除顶层的 $schema 和 definitions 字段，只保留核心的 object schema
      const { $schema, definitions, ...coreSchema } = convertedSchema as any;
      
      logger.info(`工具 ${t.name} 的 schema:`, JSON.stringify(coreSchema, null, 2));

      // 使用 jsonSchema() 包装转换后的 JSON Schema
      tools[t.name] = tool({
        description: t.description,
        parameters: jsonSchema(coreSchema),
      } as any);
    }
    
    logger.info(`共创建 ${Object.keys(tools).length} 个工具`);
    return tools;
  }

  async chat(messages: Message[]): Promise<{ message: Message; toolCalls: ToolCall[] }> {
    try {
      const model = this.getModel();
      const tools = this.getTools();
      
      // 格式化消息
      const formattedMessages = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      // 如果没有系统消息，添加默认的
      if (!messages.some(msg => msg.role === 'system')) {
        formattedMessages.unshift({
          role: 'system',
          content: this.getDefaultSystemPrompt(),
        });
      }

      logger.info('开始 AI 对话', { 
        provider: this.config.provider, 
        model: this.config.model,
        messageCount: formattedMessages.length 
      });

      let result;
      try {
        // 使用类型断言绕过 maxSteps 的类型检查问题
        result = await generateText({
          model,
          messages: formattedMessages,
          tools,
          maxSteps: 5, // 允许最多5步工具调用
        } as any);
      } catch (err) {
        logger.error('调用 AI 接口失败', err);
        throw err;
      }

      logger.info('AI 对话完成', { 
        text: result.text?.substring(0, 100)
      });

      // 从结果中提取所有工具调用
      const toolCalls: ToolCall[] = [];
      // @ts-ignore - steps 字段在运行时存在
      if (result.toolCalls && Array.isArray(result.toolCalls)) {
        for (const toolCall of result.toolCalls) {
          const params = (toolCall as any).args || {};
          toolCalls.push({
            id: (toolCall as any).toolCallId || `call-${Date.now()}`,
            type: 'geogebra',
            tool: (toolCall as any).toolName || '',
            parameters: params,
          });
          logger.info(`工具调用: ${(toolCall as any).toolName}`, params);
        }
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: result.text || '',
        timestamp: new Date(),
      };

      return { message: assistantMessage, toolCalls };
    } catch (error) {
      logger.error('AI 聊天失败', error);
      throw error;
    }
  }

  updateConfig(config: AIConfig) {
    this.config = config;
  }

  private getDefaultSystemPrompt(): string {
    return `你是一个专业的数学教学助手，擅长使用 GeoGebra 创建数学可视化。

可用的 GeoGebra 工具：
1. geogebra_plot_function - 绘制函数曲线
2. geogebra_plot_integral - 绘制定积分的阴影面积（函数和x轴之间的填充区域）
3. geogebra_create_point - 创建点
4. geogebra_create_line - 创建直线
5. geogebra_create_circle - 创建圆
6. geogebra_create_polygon - 创建多边形
7. geogebra_eval_command - 执行自定义 GeoGebra 命令

重要规则：
1. 你可以在一次回复中调用多个工具（通过返回多个 tool_calls）
2. 当用户要求"积分图"、"积分示意图"、"积分面积"、"阴影面积"时，必须：
   - 第一个工具调用：geogebra_plot_function 定义函数
   - 第二个工具调用：geogebra_plot_integral 绘制积分阴影
3. 只画函数曲线时才只用 geogebra_plot_function
4. 使用中文与用户交流，用清晰简洁的语言解释数学概念

示例：
用户："画出 x² 从 0 到 2 的积分示意图"
你应该调用：
- 工具1: geogebra_plot_function(name="f", expression="x^2")
- 工具2: geogebra_plot_integral(name="integral1", functionName="f", lowerBound=0, upperBound=2)`;
  }
}

