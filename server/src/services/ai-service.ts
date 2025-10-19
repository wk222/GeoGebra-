import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { zodToJsonSchema } from 'zod-to-json-schema';
import logger from '../utils/logger';
import { AIConfig, Message, ToolCall } from '../types';
import { geogebraTools } from './geogebra-tools';
import { v4 as uuidv4 } from 'uuid';

export class AIService {
  constructor(private config: AIConfig) {}

  updateConfig(newConfig: AIConfig) {
    this.config = newConfig;
  }

  private getModel() {
    if (this.config.provider === 'openai' || this.config.provider === 'custom') {
      return new ChatOpenAI({
        apiKey: this.config.apiKey,
        configuration: {
          baseURL: this.config.baseURL,
        },
        model: this.config.model || 'gpt-4-turbo-preview',
        temperature: 0.7,
      });
    } else if (this.config.provider === 'anthropic') {
      return new ChatAnthropic({
        apiKey: this.config.apiKey,
        anthropicApiUrl: this.config.baseURL,
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
      });
    }
    throw new Error(`不支持的 AI 提供商: ${this.config.provider}`);
  }

  private getToolDefinitions() {
    const toolDefs: any[] = [];
    
    for (const t of geogebraTools) {
      logger.info(`创建工具定义: ${t.name}`);

      // 使用 zodToJsonSchema 将 Zod schema 转换为 JSON Schema
      const jsonSchema: any = zodToJsonSchema(t.parameters as any, { 
        $refStrategy: 'none',
        target: 'openApi3'
      });
      
      // 提取 properties 和 required 字段
      const properties = jsonSchema.properties || {};
      const required = jsonSchema.required || [];
      
      // 构建符合 OpenAI 格式的工具定义
      const toolDef = {
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: {
            type: 'object' as const,
            properties,
            required,
          }
        }
      };
      
      logger.info(`工具 ${t.name} 的定义: ${JSON.stringify(toolDef, null, 2)}`);
      toolDefs.push(toolDef);
    }
    
    logger.info(`共创建 ${toolDefs.length} 个工具定义`);
    return toolDefs;
  }

  async chat(messages: Message[]): Promise<{ message: Message; toolCalls: ToolCall[] }> {
    try {
      const model = this.getModel();
      const tools = this.getToolDefinitions();
      
      // 格式化消息为 LangChain 格式
      const formattedMessages: any[] = messages.map(msg => {
        if (msg.role === 'system') {
          return { role: 'system', content: msg.content };
        } else if (msg.role === 'user') {
          return { role: 'user', content: msg.content };
        } else {
          return { role: 'assistant', content: msg.content };
        }
      });

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

      // 调用模型时传入工具定义
      const response = await (model as any).invoke(formattedMessages, {
        tools: tools,
      });
      
      logger.info('AI 响应成功', {
        hasToolCalls: !!(response.additional_kwargs?.tool_calls?.length),
        toolCallsCount: response.additional_kwargs?.tool_calls?.length || 0,
      });

      // 提取工具调用
      const toolCalls: ToolCall[] = [];
      if (response.additional_kwargs?.tool_calls) {
        for (const tc of response.additional_kwargs.tool_calls) {
          try {
            const args = typeof tc.function.arguments === 'string' 
              ? JSON.parse(tc.function.arguments) 
              : tc.function.arguments;
            
            toolCalls.push({
              id: tc.id || uuidv4(),
              type: 'geogebra',
              tool: tc.function.name,
              parameters: args,
            });
            
            logger.info(`工具调用: ${tc.function.name}`, args);
          } catch (error) {
            logger.error(`解析工具调用参数失败:`, error);
          }
        }
      }

      // 构建返回消息
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response.content as string || '',
        timestamp: new Date(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };

      return {
        message: assistantMessage,
        toolCalls,
      };

    } catch (error: any) {
      logger.error('AI 聊天失败', error.message || error, {
        name: error.name,
        stack: error.stack,
      });
      throw error;
    }
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
