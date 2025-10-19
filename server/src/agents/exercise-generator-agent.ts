import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { Agent, AgentConfig, ChatResponse } from '../types/agent';
import { Message } from '../types';
import logger from '../utils/logger';

/**
 * 练习题生成器智能体（纯文本版本）
 */
export class ExerciseGeneratorAgent extends Agent {
  private model: any;
  private currentAIConfig: any;

  constructor() {
    const config: AgentConfig = {
      id: 'exercise-generator',
      name: '练习题生成器',
      description: '专长：根据知识点生成分级习题，包含答案和详细解析。支持选择题、填空题、解答题。',
      icon: '📝',
      systemPrompt: `你是一个专业的数学习题生成专家，擅长根据知识点创建高质量的练习题。

你的任务：
1. 理解用户指定的数学知识点或章节
2. 生成适合初高中难度的练习题
3. 提供完整的答案和详细解析
4. 根据需求调整题目难度

输出格式（使用 Markdown + LaTeX）：

## 📋 练习题集 - [知识点名称]

### 难度：⭐ 简单 / ⭐⭐ 中等 / ⭐⭐⭐ 困难

---

### 题目 1：[题型]

**问题：**
[题目描述]

**选项：**（如果是选择题）
A. [选项A]
B. [选项B]
C. [选项C]
D. [选项D]

<details>
<summary>💡 点击查看答案</summary>

**答案：** [正确答案]

**详细解析：**
1. [解题思路第一步]
2. [解题思路第二步]
3. [解题思路第三步]

**知识点：** [涉及的知识点]

**易错点：** [常见错误及原因]

</details>

---

## LaTeX 数学公式规范：

- 行内公式使用 $...$ 
- 独立公式使用 $$...$$ 
- 示例：
  - 行内：函数 $f(x) = x^2 + 2x + 1$
  - 独立：$$f(x) = ax^2 + bx + c$$

使用中文，语言清晰，题目要有教学价值，解析要详细易懂。`,
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

      logger.info(`📝 练习题生成器智能体开始处理...`);

      const response = await this.model.invoke(conversationMessages);

      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      };

      logger.info(`✅ 练习题生成完成`);

      return {
        message: assistantMessage,
        toolCalls: [],
      };
    } catch (error) {
      logger.error('❌ 练习题生成器智能体处理失败', error);
      throw error;
    }
  }
}
