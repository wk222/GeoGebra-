import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import logger from '../utils/logger';
import { AIConfig, Message } from '../types';
import { geogebraTools } from './geogebra-tools';
import { geogebraService } from './geogebra-service';

export class AIService {
  private model: any;

  constructor(private config: AIConfig) {
    this.model = this.createModelInstance();
  }

  updateConfig(newConfig: AIConfig) {
    this.config = newConfig;
    this.model = this.createModelInstance();
  }

  private createModelInstance() {
    const { provider, model, apiKey, baseURL } = this.config;
    
    logger.info('创建模型实例', {
      provider,
      model,
      hasApiKey: !!apiKey,
      hasBaseURL: !!baseURL,
    });
    
    // 转换工具为 OpenAI 格式
    const tools = geogebraTools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema,
      },
    }));
    
    if (provider === 'openai' || provider === 'custom') {
      const modelInstance = new ChatOpenAI({
        model: model || 'gpt-4-turbo-preview',
        apiKey: apiKey,
        configuration: {
          baseURL: baseURL,
        },
        temperature: 0.7,
      });
      
      // 绑定工具
      return (modelInstance as any).bind({ tools });
    } else if (provider === 'anthropic') {
      const modelInstance = new ChatAnthropic({
        model: model || 'claude-3-5-sonnet-20241022',
        apiKey: apiKey,
        temperature: 0.7,
      });
      
      // 绑定工具
      return (modelInstance as any).bind({ tools });
    }
    
    // 默认 OpenAI
    const modelInstance = new ChatOpenAI({
      model: model || 'gpt-4-turbo-preview',
      apiKey: apiKey,
      configuration: {
        baseURL: baseURL,
      },
      temperature: 0.7,
    });
    
    return (modelInstance as any).bind({ tools });
  }

  async chat(messages: Message[]): Promise<{ message: Message; toolCalls: any[] }> {
    try {
      // 添加系统提示
      const allMessages = [
        { role: 'system', content: this.getSystemPrompt() },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      logger.info('🚀 调用模型', {
        messageCount: allMessages.length,
      });

      // 调用模型
      const response = await this.model.invoke(allMessages);
      
      // 提取工具调用
      const toolCalls = ((response as any).tool_calls || []).map((tc: any) => ({
        id: tc.id || `tool-${Date.now()}`,
        type: 'geogebra' as const,
        tool: tc.name,
        parameters: tc.args,
      }));

      logger.info('✅ 模型响应', {
        hasContent: !!response.content,
        toolCallsCount: toolCalls.length,
      });

      // 执行工具调用
      for (const toolCall of toolCalls) {
        try {
          logger.info(`🔧 执行工具: ${toolCall.tool}`, toolCall.parameters);
          await geogebraService.executeTool(toolCall);
          logger.info(`✅ 工具成功: ${toolCall.tool}`);
        } catch (error) {
          logger.error(`❌ 工具失败: ${toolCall.tool}`, error);
        }
      }

      // 构建返回消息
      const responseMessage: Message = {
        id: (response as any).id || crypto.randomUUID(),
        role: 'assistant',
        content: typeof response.content === 'string' ? response.content : '',
        timestamp: new Date(),
      };

      return {
        message: responseMessage,
        toolCalls: toolCalls.map(tc => ({
          ...tc,
          result: { success: true },
        })),
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
