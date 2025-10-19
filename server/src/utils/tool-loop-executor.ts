import logger from './logger';
import { Message } from '../types';

export interface ToolCall {
  id: string;
  type: string;
  tool: string;
  parameters: any;
}

export interface ToolExecutor {
  executeTool(toolCall: ToolCall): Promise<any>;
}

export interface ToolLoopConfig {
  maxIterations?: number;
  systemPrompt: string;
  toolExecutor: ToolExecutor;
  agentName?: string;
}

export interface ToolLoopResult {
  message: Message;
  toolCalls: any[];
}

/**
 * 通用工具循环执行器
 *
 * 这个类封装了 LangChain 工具调用的标准循环模式：
 * 1. 调用模型
 * 2. 提取工具调用
 * 3. 执行工具
 * 4. 将结果添加到对话历史
 * 5. 重复直到没有更多工具调用或达到最大迭代次数
 */
export class ToolLoopExecutor {
  private config: Required<ToolLoopConfig>;

  constructor(config: ToolLoopConfig) {
    this.config = {
      maxIterations: config.maxIterations || 5,
      systemPrompt: config.systemPrompt,
      toolExecutor: config.toolExecutor,
      agentName: config.agentName || 'Agent',
    };
  }

  async execute(
    model: any,
    messages: Message[]
  ): Promise<ToolLoopResult> {
    try {
      // 准备对话消息
      let conversationMessages = [
        { role: 'system', content: this.config.systemPrompt },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const allToolCalls: any[] = [];
      let iteration = 0;

      logger.info(`🚀 ${this.config.agentName} 开始工具循环`);

      while (iteration < this.config.maxIterations) {
        iteration++;
        logger.info(`🔄 ${this.config.agentName} 循环 ${iteration}/${this.config.maxIterations}`);

        // 调用模型
        const response = await model.invoke(conversationMessages);

        // 提取工具调用
        const toolCalls = this.extractToolCalls(response);

        logger.info(`✅ ${this.config.agentName} 响应 [${iteration}]`, {
          hasContent: !!response.content,
          toolCallsCount: toolCalls.length,
        });

        // 如果有内容但没有工具调用，结束循环
        if (response.content && toolCalls.length === 0) {
          logger.info(`✅ ${this.config.agentName} 对话完成（有内容，无工具调用）`);
          return this.createSuccessResult(response, allToolCalls);
        }

        // 如果没有工具调用，结束循环
        if (toolCalls.length === 0) {
          logger.info(`✅ ${this.config.agentName} 对话完成（无工具调用）`);
          return this.createSuccessResult(response, allToolCalls);
        }

        // 执行所有工具调用
        const toolResults = await this.executeTools(toolCalls, allToolCalls, iteration);

        // 更新对话历史
        conversationMessages = this.updateConversationHistory(
          conversationMessages,
          response,
          toolResults
        );
      }

      // 达到最大迭代次数
      logger.warn(`⚠️ ${this.config.agentName} 达到最大迭代次数`);
      return this.createTimeoutResult(allToolCalls);

    } catch (error: any) {
      logger.error(`❌ ${this.config.agentName} 执行失败`, {
        message: error.message,
        name: error.name,
      });
      throw error;
    }
  }

  private extractToolCalls(response: any): ToolCall[] {
    return ((response as any).tool_calls || []).map((tc: any) => ({
      id: tc.id || `tool-${Date.now()}-${Math.random()}`,
      type: 'geogebra' as const,
      tool: tc.name,
      parameters: tc.args,
    }));
  }

  private async executeTools(
    toolCalls: ToolCall[],
    allToolCalls: any[],
    iteration: number
  ): Promise<any[]> {
    const toolResults = [];

    for (const toolCall of toolCalls) {
      try {
        logger.info(
          `🔧 ${this.config.agentName} 执行工具 [${iteration}]: ${toolCall.tool}`,
          toolCall.parameters
        );

        const result = await this.config.toolExecutor.executeTool(toolCall);

        toolResults.push({
          tool_call_id: toolCall.id,
          output: 'success',
        });

        allToolCalls.push({
          ...toolCall,
          result,
        });

        logger.info(`✅ ${this.config.agentName} 工具成功 [${iteration}]: ${toolCall.tool}`);
      } catch (error) {
        logger.error(`❌ ${this.config.agentName} 工具失败 [${iteration}]: ${toolCall.tool}`, error);

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

    return toolResults;
  }

  private updateConversationHistory(
    conversationMessages: any[],
    response: any,
    toolResults: any[]
  ): any[] {
    return [
      ...conversationMessages,
      {
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.tool_calls,
      },
      {
        role: 'tool',
        content: JSON.stringify(toolResults),
        tool_call_id: toolResults[0]?.tool_call_id,
      },
    ];
  }

  private createSuccessResult(response: any, toolCalls: any[]): ToolLoopResult {
    const responseMessage: Message = {
      id: (response as any).id || crypto.randomUUID(),
      role: 'assistant',
      content: typeof response.content === 'string' ? response.content : '操作已完成',
      timestamp: new Date(),
    };

    return {
      message: responseMessage,
      toolCalls,
    };
  }

  private createTimeoutResult(toolCalls: any[]): ToolLoopResult {
    const responseMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '已完成所有操作',
      timestamp: new Date(),
    };

    return {
      message: responseMessage,
      toolCalls,
    };
  }
}
