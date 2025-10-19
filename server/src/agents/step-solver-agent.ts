import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { Agent, AgentConfig, ChatResponse } from '../types/agent';
import { Message } from '../types';
import logger from '../utils/logger';

export class StepSolverAgent extends Agent {
  private model: any;
  private currentAIConfig: any;

  constructor() {
    const config: AgentConfig = {
      id: 'step-solver',
      name: '解题步骤分解器',
      description: '专长：将复杂数学问题分解成详细步骤，适用于代数、微积分、线性代数问题。',
      icon: '🧮',
      systemPrompt: `你是一个专业的数学解题助手，擅长将复杂的数学问题分解成清晰的步骤。

你的任务：
1. 仔细阅读用户的数学问题
2. 识别问题类型（代数、微积分、线性代数等）
3. 将解题过程分解成清晰的步骤
4. 每个步骤都要：
   - 说明目标（这一步要做什么）
   - 展示计算过程
   - 解释为什么这样做
   - 给出结果

输出格式（使用 Markdown）：
## 问题分析
[简要分析问题类型和解题思路]

## 解题步骤

### 步骤 1: [步骤名称]
**目标：** [这一步的目标]
**过程：**
\`\`\`
[数学计算过程，使用 LaTeX 或纯文本]
\`\`\`
**解释：** [为什么这样做]
**结果：** [这一步的结果]

### 步骤 2: [步骤名称]
...

## 最终答案
[总结最终答案]

示例：
用户："求解方程 x² - 5x + 6 = 0"

你的回答：
## 问题分析
这是一个一元二次方程，可以使用因式分解法或求根公式求解。

## 解题步骤

### 步骤 1: 识别方程形式
**目标：** 确认这是标准的一元二次方程
**过程：**
\`\`\`
ax² + bx + c = 0
其中 a=1, b=-5, c=6
\`\`\`
**解释：** 标准形式有助于选择合适的解法
**结果：** a=1, b=-5, c=6

### 步骤 2: 因式分解
**目标：** 将左边分解为两个一次因式的乘积
**过程：**
\`\`\`
x² - 5x + 6 = (x - 2)(x - 3)
\`\`\`
**解释：** 找到两个数，相乘得6，相加得-5，即-2和-3
**结果：** (x - 2)(x - 3) = 0

### 步骤 3: 求解
**目标：** 令每个因式等于0
**过程：**
\`\`\`
x - 2 = 0  →  x = 2
x - 3 = 0  →  x = 3
\`\`\`
**解释：** 乘积为0，则至少有一个因子为0
**结果：** x = 2 或 x = 3

## 最终答案
方程 x² - 5x + 6 = 0 的解为：**x = 2** 和 **x = 3**

使用中文回答，语言清晰易懂，适合学生理解。`,
      tools: [],
      enabled: true,
    };
    super(config);
  }

  getTools() {
    return [];
  }

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

  async chat(messages: Message[], aiConfig: any): Promise<ChatResponse> {
    if (!this.model || JSON.stringify(this.currentAIConfig) !== JSON.stringify(aiConfig)) {
      this.model = this.createModelInstance(aiConfig);
      this.currentAIConfig = aiConfig;
    }

    try {
      const conversationMessages = [
        { role: 'system', content: this.config.systemPrompt },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      logger.info('🚀 StepSolver Agent 调用模型', {
        messageCount: conversationMessages.length,
      });

      const response = await this.model.invoke(conversationMessages);

      logger.info('✅ StepSolver Agent 响应完成', {
        hasContent: !!response.content,
      });

      const responseMessage: Message = {
        id: (response as any).id || crypto.randomUUID(),
        role: 'assistant',
        content: typeof response.content === 'string' ? response.content : '',
        timestamp: new Date(),
      };

      return {
        message: responseMessage,
        toolCalls: [],
      };
    } catch (error: any) {
      logger.error('❌ StepSolver Agent 聊天失败', {
        message: error.message,
        name: error.name,
      });
      throw error;
    }
  }
}
