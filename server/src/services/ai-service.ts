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
    
    if (provider === 'openai' || provider === 'custom') {
      const modelInstance = new ChatOpenAI({
        model: model || 'gpt-4-turbo-preview',
        apiKey: apiKey,
        configuration: {
          baseURL: baseURL,
        },
        temperature: 0.7,
      });
      
      // 直接绑定 LangChain 工具
      return modelInstance.bindTools(geogebraTools);
    } else if (provider === 'anthropic') {
      const modelInstance = new ChatAnthropic({
        model: model || 'claude-3-5-sonnet-20241022',
        apiKey: apiKey,
        temperature: 0.7,
      });
      
      // 直接绑定 LangChain 工具
      return modelInstance.bindTools(geogebraTools);
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
    
    return modelInstance.bindTools(geogebraTools);
  }

  async chat(messages: Message[]): Promise<{ message: Message; toolCalls: any[] }> {
    try {
      // 添加系统提示
      let conversationMessages = [
        { role: 'system', content: this.getSystemPrompt() },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const allToolCalls: any[] = [];
      const maxIterations = 5;
      let iteration = 0;

      logger.info('🚀 开始对话循环', {
        initialMessageCount: conversationMessages.length,
      });

      while (iteration < maxIterations) {
        iteration++;
        
        logger.info(`🔄 循环 ${iteration}/${maxIterations}`, {
          messageCount: conversationMessages.length,
        });

        // 调用模型
        const response = await this.model.invoke(conversationMessages);
        
        // 提取工具调用
        const toolCalls = ((response as any).tool_calls || []).map((tc: any) => ({
          id: tc.id || `tool-${Date.now()}-${Math.random()}`,
          type: 'geogebra' as const,
          tool: tc.name,
          parameters: tc.args,
        }));

        logger.info(`✅ 模型响应 [${iteration}]`, {
          hasContent: !!response.content,
          toolCallsCount: toolCalls.length,
        });

        // 如果有内容但没有工具调用，结束循环
        if (response.content && toolCalls.length === 0) {
          logger.info('✅ 对话完成（有内容，无工具调用）');
          
          const responseMessage: Message = {
            id: (response as any).id || crypto.randomUUID(),
            role: 'assistant',
            content: typeof response.content === 'string' ? response.content : '',
            timestamp: new Date(),
          };

          return {
            message: responseMessage,
            toolCalls: allToolCalls,
          };
        }

        // 如果没有工具调用也没有内容，结束
        if (toolCalls.length === 0) {
          logger.info('✅ 对话完成（无工具调用）');
          
          const responseMessage: Message = {
            id: (response as any).id || crypto.randomUUID(),
            role: 'assistant',
            content: typeof response.content === 'string' ? response.content : '操作已完成',
            timestamp: new Date(),
          };

          return {
            message: responseMessage,
            toolCalls: allToolCalls,
          };
        }

        // 执行工具调用
        const toolResults = [];
        for (const toolCall of toolCalls) {
          try {
            logger.info(`🔧 执行工具 [${iteration}]: ${toolCall.tool}`, toolCall.parameters);
            const geogebraResult = await geogebraService.executeTool(toolCall);
            toolResults.push({
              tool_call_id: toolCall.id,
              output: 'success',
            });
            allToolCalls.push({
              ...toolCall,
              result: geogebraResult, // 保存完整的结果（包含 command）
            });
            logger.info(`✅ 工具成功 [${iteration}]: ${toolCall.tool}`);
          } catch (error) {
            logger.error(`❌ 工具失败 [${iteration}]: ${toolCall.tool}`, error);
            toolResults.push({
              tool_call_id: toolCall.id,
              output: `error: ${error}`,
            });
            allToolCalls.push({
              ...toolCall,
              result: { success: false, error: String(error) },
            });
          }
        }

        // 添加助手消息（带工具调用）和工具结果到对话
        conversationMessages.push({
          role: 'assistant',
          content: response.content || '',
          tool_calls: (response as any).tool_calls,
        } as any);

        conversationMessages.push({
          role: 'tool',
          content: JSON.stringify(toolResults),
          tool_call_id: toolResults[0]?.tool_call_id,
        } as any);
      }

      // 达到最大迭代次数
      logger.warn('⚠️ 达到最大迭代次数');
      
      const responseMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '已完成所有可视化操作',
        timestamp: new Date(),
      };

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
