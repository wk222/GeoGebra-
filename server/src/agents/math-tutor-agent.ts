import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { Agent, AgentConfig, ChatResponse } from '../types/agent';
import { Message } from '../types';
import { geogebraTools } from '../services/geogebra-tools';
import { geogebraService } from '../services/geogebra-service';
import logger from '../utils/logger';

/**
 * 数学教学助手 - 多功能智能体
 * 
 * 集成功能：
 * 1. 练习题生成
 * 2. GeoGebra 可视化
 * 3. 解题指导
 * 4. 概念讲解
 */
export class MathTutorAgent extends Agent {
  private model: any;
  private currentAIConfig: any;

  constructor() {
    const config: AgentConfig = {
      id: 'math-tutor',
      name: '数学教学助手',
      description: '全能助手：生成练习题、绘制函数图像、几何图形、积分可视化等。一个智能体搞定所有数学教学需求。',
      icon: '🎓',
      systemPrompt: `你是一个全能的数学教学助手，擅长：
1. 生成各种类型的练习题
2. 使用 GeoGebra 创建数学可视化
3. 解题指导和概念讲解

## 可用的 GeoGebra 工具：

1. **geogebra_plot_function** - 绘制函数曲线
2. **geogebra_plot_integral** - 绘制定积分阴影
3. **geogebra_create_point** - 创建点
4. **geogebra_create_line** - 创建直线
5. **geogebra_create_circle** - 创建圆
6. **geogebra_create_polygon** - 创建多边形
7. **geogebra_eval_command** - 执行自定义命令

## 工作模式：

### 模式 1：生成练习题 + 自动配图
当用户要求"生成练习题"时：
1. 先调用 GeoGebra 工具绘制相关图形（如果涉及函数或几何）
2. 再生成题目文本（包含 LaTeX 公式）

### 模式 2：纯可视化
当用户要求"画图"、"绘制"、"可视化"时：
直接调用 GeoGebra 工具

### 模式 3：解题指导
当用户提问题时：
1. 如果需要图形辅助理解，先调用工具
2. 再给出详细解答

## 练习题格式（使用 Markdown + LaTeX）：

\`\`\`markdown
## 📋 练习题集 - [知识点名称]

### 难度：⭐⭐ 中等

> 📊 **图形已绘制**：请查看右侧 GeoGebra 画板

---

### 题目 1：

**问题：** 
[题目描述]

<details>
<summary>💡 点击查看答案</summary>

**答案：** [答案]

**详细解析：**
1. [步骤1]
2. [步骤2]

**知识点：** [知识点]
**易错点：** [易错点]

</details>
\`\`\`

## LaTeX 规范：
- 行内公式：$x^2 + 2x + 1$
- 独立公式：$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

## 调用时机：
- 二次函数题 → geogebra_plot_function
- 几何题 → geogebra_create_point/line/circle 等
- 积分题 → geogebra_plot_integral
- 可以一次调用多个工具

使用中文，图文并茂，详细易懂。`,
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

  async chat(messages: Message[], aiConfig: any): Promise<ChatResponse> {
    if (!this.model || JSON.stringify(this.currentAIConfig) !== JSON.stringify(aiConfig)) {
      this.model = this.createModelInstance(aiConfig);
      this.currentAIConfig = aiConfig;
    }

    try {
      let conversationMessages = [
        { role: 'system', content: this.config.systemPrompt },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const allToolCalls: any[] = [];
      const maxIterations = 5;
      let iteration = 0;

      logger.info('🎓 数学教学助手开始对话循环');

      while (iteration < maxIterations) {
        iteration++;
        logger.info(`🔄 数学教学助手循环 ${iteration}/${maxIterations}`);

        const response = await this.model.invoke(conversationMessages);

        const toolCalls = ((response as any).tool_calls || []).map((tc: any) => ({
          id: tc.id || `tool-${Date.now()}-${Math.random()}`,
          type: 'geogebra' as const,
          tool: tc.name,
          parameters: tc.args,
        }));

        logger.info(`✅ 数学教学助手响应 [${iteration}]`, {
          hasContent: !!response.content,
          toolCallsCount: toolCalls.length,
        });

        if (response.content && toolCalls.length === 0) {
          logger.info('✅ 数学教学助手对话完成（有内容，无工具调用）');

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

        if (toolCalls.length === 0) {
          logger.info('✅ 数学教学助手对话完成（无工具调用）');

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

        const toolResults = [];
        for (const toolCall of toolCalls) {
          try {
            logger.info(`🔧 数学教学助手执行工具 [${iteration}]: ${toolCall.tool}`, toolCall.parameters);
            const geogebraResult = await geogebraService.executeTool(toolCall);
            toolResults.push({
              tool_call_id: toolCall.id,
              output: 'success',
            });
            allToolCalls.push({
              ...toolCall,
              result: geogebraResult,
            });
            logger.info(`✅ 数学教学助手工具成功 [${iteration}]: ${toolCall.tool}`);
          } catch (error) {
            logger.error(`❌ 数学教学助手工具失败 [${iteration}]: ${toolCall.tool}`, error);
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

      logger.warn('⚠️ 数学教学助手达到最大迭代次数');

      const responseMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '已完成所有操作',
        timestamp: new Date(),
      };

      return {
        message: responseMessage,
        toolCalls: allToolCalls,
      };

    } catch (error) {
      logger.error('❌ 数学教学助手处理失败', error);
      throw error;
    }
  }
}
