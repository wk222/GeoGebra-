import { createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { Agent, AgentConfig, ChatResponse } from '../types/agent';
import { Message } from '../types';
import { geogebraTools } from '../services/geogebra-tools';
import { geogebraService } from '../services/geogebra-service';
import logger from '../utils/logger';

/**
 * GeoGebra Agent 使用 createAgent API
 *
 * 使用 LangChain 1.0 的标准 createAgent API
 * 优势：
 * - 标准化的 Agent 构建方式
 * - 内置工具循环
 * - 内置状态管理（通过 LangGraph）
 * - 支持中间件
 * - 自动持久化
 */
export class GeoGebraCreateAgent extends Agent {
  private agent: any;
  private currentAIConfig: any;

  constructor() {
    const config: AgentConfig = {
      id: 'geogebra-createagent',
      name: 'GeoGebra 助手 (createAgent)',
      description: '使用 LangChain 1.0 标准 API 构建的 GeoGebra 可视化助手',
      icon: '🎯',
      systemPrompt: `你是一个专业的数学教学助手，擅长使用 GeoGebra 创建数学可视化。

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
- 工具2: geogebra_plot_integral(name="integral1", functionName="f", lowerBound=0, upperBound=2)`,
      tools: ['geogebra'],
      enabled: true,
    };
    super(config);
  }

  getTools() {
    return geogebraTools;
  }

  /**
   * 创建模型实例
   */
  private createModelInstance(aiConfig: any) {
    const { provider, model, apiKey, baseURL } = aiConfig;

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

    return new ChatOpenAI({
      model: model || 'gpt-4-turbo-preview',
      apiKey: apiKey,
      configuration: {
        baseURL: baseURL,
      },
      temperature: 0.7,
    });
  }

  /**
   * 初始化 Agent
   */
  private initAgent(aiConfig: any) {
    const model = this.createModelInstance(aiConfig);

    // 使用 createAgent API 创建 agent
    this.agent = createAgent({
      model: model as any,
      tools: geogebraTools as any,
    } as any);

    logger.info('✅ createAgent 已初始化');
  }

  /**
   * 聊天方法
   */
  async chat(messages: Message[], aiConfig: any): Promise<ChatResponse> {
    // 检查是否需要重新初始化
    if (!this.agent || JSON.stringify(this.currentAIConfig) !== JSON.stringify(aiConfig)) {
      this.initAgent(aiConfig);
      this.currentAIConfig = aiConfig;
    }

    try {
      // 转换消息格式
      const formattedMessages = this.formatMessages(messages);

      logger.info('🔄 调用 createAgent', {
        messageCount: formattedMessages.length,
      });

      // 调用 agent
      const result = await this.agent.invoke({
        messages: formattedMessages,
      });

      logger.info('✅ createAgent 响应成功', {
        hasMessages: !!result.messages,
        messageCount: result.messages?.length || 0,
      });

      // 提取最后一条消息
      const lastMessage = result.messages[result.messages.length - 1];

      return {
        message: {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: lastMessage.content || '',
          timestamp: new Date(),
        },
        toolCalls: [],
      };
    } catch (error: any) {
      logger.error('❌ createAgent 调用失败', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * 格式化消息
   */
  private formatMessages(messages: Message[]): any[] {
    // 添加系统提示作为第一条消息
    const formattedMessages = [
      {
        role: 'system',
        content: this.config.systemPrompt,
      },
    ];

    // 添加用户和助手消息
    for (const msg of messages) {
      formattedMessages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    return formattedMessages;
  }
}
