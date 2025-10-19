import { createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import logger from '../utils/logger';
import { AIConfig, Message } from '../types';
import { geogebraTools } from './geogebra-tools';
import { geogebraService } from './geogebra-service';

export class AIService {
  private agent: any;

  constructor(private config: AIConfig) {
    this.createAgent();
  }

  updateConfig(newConfig: AIConfig) {
    this.config = newConfig;
    this.createAgent();
  }

  private createModelInstance() {
    const { provider, model, apiKey, baseURL } = this.config;
    
    logger.info('创建模型实例', {
      provider,
      model,
      hasApiKey: !!apiKey,
      hasBaseURL: !!baseURL,
    });
    
    if (provider === 'openai' || provider === 'custom') {
      return new ChatOpenAI({
        model: model || 'gpt-4-turbo-preview',
        apiKey: apiKey,
        configuration: {
          baseURL: baseURL,
        },
        temperature: 0.7,
      });
    } else if (provider === 'anthropic') {
      return new ChatAnthropic({
        model: model || 'claude-3-5-sonnet-20241022',
        apiKey: apiKey,
        temperature: 0.7,
      });
    }
    
    // 默认 OpenAI
    return new ChatOpenAI({
      model: model || 'gpt-4-turbo-preview',
      apiKey: apiKey,
      configuration: {
        baseURL: baseURL,
      },
      temperature: 0.7,
    });
  }

  private createAgent() {
    const modelInstance = this.createModelInstance();

    logger.info('创建 Agent', {
      provider: this.config.provider,
      toolsCount: geogebraTools.length,
    });

    this.agent = createAgent({
      model: modelInstance,
      tools: geogebraTools,
      systemPrompt: this.getSystemPrompt(),
    } as any);
    
    logger.info('✅ Agent 创建完成');
  }

  async chat(messages: Message[]): Promise<{ message: Message; toolCalls: any[] }> {
    try {
      // 转换消息格式
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      logger.info('🚀 调用 Agent', {
        messageCount: formattedMessages.length,
      });

      // 调用 agent（内置循环）
      const result = await this.agent.invoke({
        messages: formattedMessages,
      });

      // 提取最后的 AI 消息
      const lastMessage = result.messages[result.messages.length - 1];
      
      // 构建返回消息
      const responseMessage: Message = {
        id: lastMessage.id || crypto.randomUUID(),
        role: 'assistant',
        content: lastMessage.content || '',
        timestamp: new Date(),
      };

      // 提取所有工具调用并执行 GeoGebra 命令
      const allToolCalls: any[] = [];
      for (const msg of result.messages) {
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          for (const tc of msg.tool_calls) {
            const toolCall = {
              id: tc.id,
              type: 'geogebra' as const,
              tool: tc.name,
              parameters: tc.args,
              result: { success: true },
            };
            allToolCalls.push(toolCall);
            
            // 执行实际的 GeoGebra 命令
            try {
              logger.info(`🔧 执行 GeoGebra 工具: ${tc.name}`, tc.args);
              await geogebraService.executeTool(toolCall);
              logger.info(`✅ GeoGebra 执行成功: ${tc.name}`);
            } catch (geoError) {
              logger.error(`❌ GeoGebra 执行失败: ${tc.name}`, geoError);
            }
          }
        }
      }

      logger.info('✅ Agent 响应完成', {
        hasContent: !!responseMessage.content,
        toolCallsCount: allToolCalls.length,
      });

      return {
        message: responseMessage,
        toolCalls: allToolCalls,
      };

    } catch (error: any) {
      logger.error('❌ AI 聊天失败', {
        message: error.message,
        name: error.name,
      });
      throw error;
    }
  }

  private getSystemPrompt(): string {
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
