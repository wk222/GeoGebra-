import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import logger from '../utils/logger';
import { AIConfig, Message } from '../types';
import { geogebraTools } from './geogebra-tools';
import { geogebraService } from './geogebra-service';
import { ToolLoopExecutor } from '../utils/tool-loop-executor';

export class AIService {
  private model: any;
  private toolLoopExecutor: ToolLoopExecutor;

  constructor(private config: AIConfig) {
    this.model = this.createModelInstance();
    this.toolLoopExecutor = new ToolLoopExecutor({
      systemPrompt: this.getSystemPrompt(),
      toolExecutor: geogebraService,
      agentName: 'AI Service',
      maxIterations: 5,
    });
  }

  updateConfig(newConfig: AIConfig) {
    this.config = newConfig;
    this.model = this.createModelInstance();
    // 更新工具循环执行器的系统提示
    this.toolLoopExecutor = new ToolLoopExecutor({
      systemPrompt: this.getSystemPrompt(),
      toolExecutor: geogebraService,
      agentName: 'AI Service',
      maxIterations: 5,
    });
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
    // 使用工具循环执行器处理整个对话流程
    return await this.toolLoopExecutor.execute(this.model, messages);
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
