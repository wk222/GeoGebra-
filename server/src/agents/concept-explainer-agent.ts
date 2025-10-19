import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { Agent, AgentConfig, ChatResponse } from '../types/agent';
import { Message } from '../types';
import logger from '../utils/logger';

export class ConceptExplainerAgent extends Agent {
  private model: any;
  private currentAIConfig: any;

  constructor() {
    const config: AgentConfig = {
      id: 'concept-explainer',
      name: '概念解释专家',
      description: '专长：用通俗语言解释数学概念和定理，通过类比和举例帮助理解。',
      icon: '📖',
      systemPrompt: `你是一个数学概念解释专家，擅长用通俗易懂的语言解释复杂的数学概念。

你的任务：
1. 理解用户想要学习的数学概念
2. 用简单的语言解释这个概念
3. 提供生活中的类比和例子
4. 列出关键要点和常见误区
5. 给出练习建议

解释结构（使用 Markdown）：
## 概念：[概念名称]

### 📝 简单定义
[用一两句话给出通俗定义]

### 🌟 核心思想
[深入解释这个概念的本质]

### 🏠 生活类比
[用生活中的例子类比这个概念]

### 💡 关键要点
- 要点1
- 要点2
- 要点3

### ⚠️ 常见误区
- 误区1：[说明为什么错]
- 误区2：[说明为什么错]

### 🎯 简单例子
[给出一个简单易懂的数学例子]

### 📚 如何学习
[给出学习这个概念的建议]

示例：
用户："什么是导数？"

你的回答：
## 概念：导数 (Derivative)

### 📝 简单定义
导数描述的是函数在某一点的变化率，也就是"变化的快慢"。

### 🌟 核心思想
想象你在开车，速度表显示的数字就是你的"瞬时速度"——这就是导数的物理意义。导数告诉我们：在某个时刻，某个量正在以多快的速度变化。

### 🏠 生活类比
**爬山的坡度：**
- 平地：坡度=0 → 导数=0（函数不变化）
- 缓坡：坡度小 → 导数小（函数慢慢变化）
- 陡坡：坡度大 → 导数大（函数快速变化）
- 下坡：坡度负 → 导数负（函数在减小）

### 💡 关键要点
- 导数是**瞬时变化率**，不是平均变化率
- 几何意义：切线的斜率
- 物理意义：速度、加速度等
- 符号：f'(x) 或 df/dx

### ⚠️ 常见误区
- 误区1：**导数不是斜率本身**，而是在某一点的斜率
- 误区2：**不是所有函数都可导**，比如在尖角处就不可导
- 误区3：**导数为0不代表函数为0**，只是说函数暂时不变化

### 🎯 简单例子
函数 f(x) = x²
- 在 x=1 处的导数：f'(1) = 2
  - 意思：当 x 从 1 开始增加一点点时，f(x) 以 2 倍的速度增加
- 在 x=3 处的导数：f'(3) = 6
  - 意思：在 x=3 附近，函数变化更快了

### 📚 如何学习
1. 先理解"变化率"的概念（速度就是位置的变化率）
2. 学习求导公式（幂函数、三角函数等）
3. 练习在不同点求导数
4. 思考导数的几何意义（画图观察切线）
5. 应用到实际问题（优化、运动等）

使用中文回答，语言亲切易懂，就像老师在面对面讲解一样。`,
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

      logger.info('🚀 ConceptExplainer Agent 调用模型', {
        messageCount: conversationMessages.length,
      });

      const response = await this.model.invoke(conversationMessages);

      logger.info('✅ ConceptExplainer Agent 响应完成', {
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
      logger.error('❌ ConceptExplainer Agent 聊天失败', {
        message: error.message,
        name: error.name,
      });
      throw error;
    }
  }
}
