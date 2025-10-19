import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { Agent, AgentConfig, ChatResponse } from '../types/agent';
import { Message } from '../types';
import { geogebraTools } from '../services/geogebra-tools';
import { geogebraService } from '../services/geogebra-service';
import logger from '../utils/logger';

/**
 * 练习题生成器智能体（支持 GeoGebra 可视化）
 * 
 * 功能：
 * 1. 根据知识点生成习题
 * 2. 支持难度分级（简单/中等/困难）
 * 3. 自动生成答案和详细解析
 * 4. 支持多种题型（选择题、填空题、解答题）
 * 5. **NEW**: 自动调用 GeoGebra 绘制相关函数图像
 */
export class ExerciseGeneratorAgent extends Agent {
  private model: any;
  private currentAIConfig: any;

  constructor() {
    const config: AgentConfig = {
      id: 'exercise-generator',
      name: '练习题生成器',
      description: '专长：根据知识点生成分级习题，包含答案和详细解析。支持选择题、填空题、解答题。自动配图可视化。',
      icon: '📝',
      systemPrompt: `你是一个专业的数学习题生成专家，擅长根据知识点创建高质量的练习题，并配合 GeoGebra 可视化。

你的任务：
1. 理解用户指定的数学知识点或章节
2. 生成适合初高中难度的练习题
3. 提供完整的答案和详细解析
4. **自动调用 GeoGebra 工具绘制相关图形**（非常重要！）

## 可用的 GeoGebra 工具：

1. **geogebra_plot_function** - 绘制函数曲线
2. **geogebra_plot_integral** - 绘制定积分阴影
3. **geogebra_create_point** - 创建点
4. **geogebra_create_line** - 创建直线
5. **geogebra_create_circle** - 创建圆
6. **geogebra_create_polygon** - 创建多边形

## 何时调用 GeoGebra 工具（必须遵守）：

### 必须调用的情况：
1. **二次函数题目** → 调用 \`geogebra_plot_function\` 绘制抛物线
2. **一次函数题目** → 调用 \`geogebra_plot_function\` 绘制直线
3. **三角函数题目** → 调用 \`geogebra_plot_function\` 绘制 sin/cos 函数
4. **几何图形题目** → 调用相应工具绘制点、线、圆、多边形
5. **积分相关题目** → 调用 \`geogebra_plot_integral\` 绘制阴影面积

### 调用时机：
- 在生成题目**之前**先调用工具
- 题目中提到具体函数表达式时必须可视化
- 可以一次调用多个工具（比如绘制多个函数对比）

## 输出格式（使用 Markdown + LaTeX）：

\`\`\`
## 📋 练习题集 - [知识点名称]

### 难度：⭐ 简单 / ⭐⭐ 中等 / ⭐⭐⭐ 困难

> 📊 **可视化图像**：请查看右侧 GeoGebra 画板

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
\`\`\`

## LaTeX 数学公式规范：

- 行内公式使用 \`$...$\` 或 \`\\(...\\)\`
- 独立公式使用 \`$$...$$\` 或 \`\\[...\\]\`
- 示例：
  - 行内：函数 $f(x) = x^2 + 2x + 1$
  - 独立：$$f(x) = ax^2 + bx + c$$

## 调用示例：

**用户**："生成5道二次函数中等难度题"

**你应该做的**：
1. 先调用工具绘制相关函数（比如 \`geogebra_plot_function("f1", "x^2-4*x+3")\`）
2. 再生成题目文本

**重要提示**：
- 每次生成函数相关题目时**必须**先调用 GeoGebra 工具
- 工具调用在前，文本生成在后
- 可以一次调用多个工具绘制不同函数进行对比

使用中文，语言清晰，题目要有教学价值，解析要详细易懂。`,
      tools: ['geogebra'],
      enabled: true,
    };
    super(config);
  }

  getTools() {
    return geogebraTools;
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

      logger.info(`📝 练习题生成器智能体开始处理（支持 GeoGebra 可视化）...`);

      // 绑定工具
      const modelWithTools = this.model.bindTools(
        geogebraTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.schema,
        }))
      );

      // 手动循环（最多5轮）
      let currentMessages = conversationMessages;
      let iterations = 0;
      const maxIterations = 5;
      const allToolCalls: any[] = [];

      while (iterations < maxIterations) {
        logger.info(`🔄 迭代 ${iterations + 1}/${maxIterations}`);

        const response = await modelWithTools.invoke(currentMessages);

        // 检查是否有内容
        const hasContent = response.content && response.content.trim().length > 0;

        // 检查工具调用
        if (response.tool_calls && response.tool_calls.length > 0) {
          logger.info(`🔧 检测到 ${response.tool_calls.length} 个工具调用`);

          // 执行所有工具调用
          for (const toolCall of response.tool_calls) {
            const tool = geogebraTools.find(t => t.name === toolCall.name);
            
            if (tool) {
              try {
                logger.info(`⚙️  执行工具: ${toolCall.name}`, toolCall.args);
                const result = await tool.execute(toolCall.args);
                
                // 保存工具调用记录
                allToolCalls.push({
                  id: toolCall.id,
                  tool: toolCall.name,
                  args: toolCall.args,
                  result: result,
                  error: false,
                });

                // 添加工具消息（采用 GeoGebra Agent 的方式）
                currentMessages.push({
                  role: 'assistant',
                  content: response.content || '',
                  tool_calls: [toolCall],
                } as any);

                currentMessages.push({
                  role: 'tool',
                  content: JSON.stringify(result),
                  tool_call_id: toolCall.id,
                } as any);

                logger.info(`✅ 工具执行成功: ${toolCall.name}`);
              } catch (error) {
                logger.error(`❌ 工具执行失败: ${toolCall.name}`, error);
                allToolCalls.push({
                  id: toolCall.id,
                  tool: toolCall.name,
                  args: toolCall.args,
                  result: null,
                  error: true,
                });
              }
            }
          }

          iterations++;
          continue;
        }

        // 没有工具调用且有内容，返回最终答案
        if (hasContent) {
          logger.info(`✅ 练习题生成完成，包含 ${allToolCalls.length} 个可视化`);

          const assistantMessage: Message = {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: response.content,
            timestamp: new Date(),
          };

          return {
            message: assistantMessage,
            toolCalls: allToolCalls,
          };
        }

        // 没有工具调用也没有内容，结束
        logger.warn('⚠️  AI 返回空内容且无工具调用');
        break;
      }

      // 达到最大迭代次数
      logger.warn(`⚠️  达到最大迭代次数 (${maxIterations})，返回当前结果`);

      const fallbackMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: '已完成练习题生成，请查看可视化图像。',
        timestamp: new Date(),
      };

      return {
        message: fallbackMessage,
        toolCalls: allToolCalls,
      };

    } catch (error) {
      logger.error('❌ 练习题生成器智能体处理失败', error);
      throw error;
    }
  }
}
