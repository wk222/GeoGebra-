import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { Agent, AgentConfig, ChatResponse } from '../types/agent';
import { Message } from '../types';
import { geogebraTools } from '../services/geogebra-tools';
import { geogebraService } from '../services/geogebra-service';
import { ToolLoopExecutor } from '../utils/tool-loop-executor';
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
  private toolLoopExecutor: ToolLoopExecutor;

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

    // 初始化工具循环执行器
    this.toolLoopExecutor = new ToolLoopExecutor({
      systemPrompt: config.systemPrompt,
      toolExecutor: geogebraService,
      agentName: '数学教学助手',
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

  async chat(messages: Message[], aiConfig: any): Promise<ChatResponse> {
    if (!this.model || JSON.stringify(this.currentAIConfig) !== JSON.stringify(aiConfig)) {
      this.model = this.createModelInstance(aiConfig);
      this.currentAIConfig = aiConfig;
    }

    // 使用工具循环执行器处理整个对话流程
    return await this.toolLoopExecutor.execute(this.model, messages);
  }
}
