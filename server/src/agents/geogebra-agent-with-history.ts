import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { RunnableWithMessageHistory } from '@langchain/core/dist/runnables/history.js';
import { Agent, AgentConfig, ChatResponse } from '../types/agent';
import { Message } from '../types';
import { geogebraTools } from '../services/geogebra-tools';
import { geogebraService } from '../services/geogebra-service';
import { SupabaseChatMessageHistory } from '../services/supabase-chat-history';
import { ToolLoopExecutor } from '../utils/tool-loop-executor';
import logger from '../utils/logger';

/**
 * GeoGebra Agent with Message History
 *
 * 使用 LangChain 1.0 的 RunnableWithMessageHistory 实现状态管理
 * 聊天历史自动存储到 Supabase 数据库
 */
export class GeoGebraAgentWithHistory extends Agent {
  private model: any;
  private currentAIConfig: any;
  private toolLoopExecutor: ToolLoopExecutor;

  constructor() {
    const config: AgentConfig = {
      id: 'geogebra-history',
      name: 'GeoGebra 助手（带历史记录）',
      description: '专长：几何图形、函数绘图、积分可视化。自动保存对话历史。',
      icon: '📊',
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
5. 你可以记住之前的对话内容，提供连贯的对话体验

示例：
用户："画出 x² 从 0 到 2 的积分示意图"
你应该调用：
- 工具1: geogebra_plot_function(name="f", expression="x^2")
- 工具2: geogebra_plot_integral(name="integral1", functionName="f", lowerBound=0, upperBound=2)`,
      tools: ['geogebra'],
      enabled: true,
    };
    super(config);

    // 初始化工具循环执行器
    this.toolLoopExecutor = new ToolLoopExecutor({
      systemPrompt: config.systemPrompt,
      toolExecutor: geogebraService,
      agentName: 'GeoGebra Agent (History)',
      maxIterations: 5,
    });
  }

  getTools() {
    return geogebraTools;
  }

  private createModelInstance(aiConfig: any) {
    const { provider, model, apiKey, baseURL } = aiConfig;

    if (provider === 'openai' || provider === 'custom') {
      const modelInstance = new ChatOpenAI({
        model: model || 'gpt-4-turbo-preview',
        apiKey: apiKey,
        configuration: {
          baseURL: baseURL,
        },
        temperature: 0.7,
      });
      return modelInstance.bindTools(geogebraTools);
    } else if (provider === 'anthropic') {
      const modelInstance = new ChatAnthropic({
        model: model || 'claude-3-5-sonnet-20241022',
        apiKey: apiKey,
        temperature: 0.7,
      });
      return modelInstance.bindTools(geogebraTools);
    }

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

  /**
   * 聊天方法（带历史记录）
   *
   * 使用 RunnableWithMessageHistory 自动管理历史
   * sessionId 从消息中提取或使用默认值
   */
  async chat(messages: Message[], aiConfig: any): Promise<ChatResponse> {
    if (!this.model || JSON.stringify(this.currentAIConfig) !== JSON.stringify(aiConfig)) {
      this.model = this.createModelInstance(aiConfig);
      this.currentAIConfig = aiConfig;
    }

    try {
      // 提取或生成 sessionId
      const sessionId = this.extractSessionId(messages);

      logger.info('🔄 使用历史记录模式', { sessionId });

      // 创建带历史记录的 Runnable
      // 注意：这需要重新设计来适配我们的工具循环逻辑
      // 目前先使用 ToolLoopExecutor，未来可以集成 RunnableWithMessageHistory

      // 使用工具循环执行器处理对话
      const result = await this.toolLoopExecutor.execute(this.model, messages);

      // 保存到历史记录
      await this.saveToHistory(sessionId, messages, result.message);

      return result;
    } catch (error: any) {
      logger.error('❌ GeoGebra Agent (History) 聊天失败', {
        message: error.message,
        name: error.name,
      });
      throw error;
    }
  }

  /**
   * 从消息中提取 sessionId
   */
  private extractSessionId(messages: Message[]): string {
    // 可以从第一条消息的元数据中提取
    // 或者使用用户 ID
    // 这里使用简单的默认值
    return 'default-session';
  }

  /**
   * 保存到历史记录
   */
  private async saveToHistory(sessionId: string, messages: Message[], response: Message): Promise<void> {
    try {
      const history = new SupabaseChatMessageHistory({ sessionId });

      // 保存最后一条用户消息
      if (messages.length > 0) {
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage.role === 'user') {
          await history.addMessage({
            content: lastUserMessage.content,
            additional_kwargs: {},
            _getType: () => 'human',
          } as any);
        }
      }

      // 保存助手响应
      await history.addMessage({
        content: response.content,
        additional_kwargs: {},
        _getType: () => 'ai',
      } as any);

      logger.info('✅ 历史记录已保存', { sessionId });
    } catch (error) {
      logger.error('❌ 保存历史记录失败', error);
      // 不抛出错误，避免影响主流程
    }
  }
}
