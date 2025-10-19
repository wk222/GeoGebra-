# LangChain.js 1.0.0 完整特性指南

> 基于源码分析的 LangChain.js 1.0.0-alpha 版本特性总结

## 📦 核心包结构

LangChain.js 1.0 采用模块化架构，主要包含以下包：

1. **@langchain/core** (v1.0.1) - 核心抽象和接口
2. **@langchain/openai** (v1.0.0-alpha.3) - OpenAI 集成
3. **@langchain/anthropic** - Anthropic Claude 集成
4. **@langchain/langgraph-sdk** - 状态图编排
5. **@langchain/langgraph-checkpoint** - 检查点持久化

---

## 🧩 核心模块详解

### 1. **Runnables (可运行对象) - LCEL 核心**

Runnable 是 LangChain 1.0 的核心抽象，所有组件都继承自这个基类。

#### 核心方法
```typescript
abstract class Runnable<RunInput, RunOutput, CallOptions> {
  // 单次执行
  abstract invoke(input: RunInput, options?: Partial<CallOptions>): Promise<RunOutput>;
  
  // 批量执行
  batch(inputs: RunInput[], options?): Promise<RunOutput[]>;
  
  // 流式输出
  stream(input: RunInput, options?): Promise<IterableReadableStream<RunOutput>>;
  
  // 管道组合
  pipe<NewRunOutput>(coerceable: RunnableLike<RunOutput, NewRunOutput>): Runnable;
  
  // 配置绑定
  withConfig(config: Partial<CallOptions>): Runnable;
  
  // 重试逻辑
  withRetry(fields?: { stopAfterAttempt?: number }): RunnableRetry;
  
  // 容错处理
  withFallbacks(fields: { fallbacks: Runnable[] }): RunnableWithFallbacks;
  
  // 字段选择
  pick(keys: string | string[]): Runnable;
  
  // 字段赋值
  assign(mapping: RunnableMapLike): Runnable;
  
  // 流式事件
  streamEvents(input, options?): AsyncGenerator<StreamEvent>;
  
  // 流式日志
  streamLog(input, options?): AsyncGenerator<RunLogPatch>;
}
```

#### Runnable 变体
- **RunnableSequence** - 顺序链
- **RunnableParallel** - 并行执行
- **RunnableBranch** - 条件分支
- **RunnablePassthrough** - 透传数据
- **RunnableRouter** - 路由器
- **RunnableBinding** - 配置绑定
- **RunnableRetry** - 重试包装器
- **RunnableWithFallbacks** - 容错包装器

---

### 2. **Language Models (语言模型)**

#### 基础类
```typescript
abstract class BaseLangChain<RunInput, RunOutput, CallOptions> extends Runnable {
  verbose: boolean;
  callbacks?: Callbacks;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

interface BaseLanguageModelParams {
  cache?: BaseCache | boolean;
  callbacks?: Callbacks;
  verbose?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}
```

#### Chat Models
- **ChatOpenAI** - OpenAI 聊天模型（支持自定义 baseURL）
- **ChatAnthropic** - Anthropic Claude 模型
- 支持流式输出、工具调用、结构化输出

#### 关键特性
- **Tool Calling** - 原生函数/工具调用
- **Streaming** - 流式响应
- **Structured Outputs** - 结构化输出（JSON Schema / Zod）
- **Caching** - 缓存机制
- **Token Counting** - Tiktoken 集成

---

### 3. **Tools (工具系统)**

#### 工具基类
```typescript
abstract class StructuredTool<SchemaT, SchemaOutputT, SchemaInputT, ToolOutputT> {
  abstract name: string;
  abstract description: string;
  abstract schema: SchemaT;  // Zod schema
  returnDirect: boolean;
  responseFormat?: "content" | "content_and_artifact";
  
  abstract _call(
    arg: SchemaOutputT,
    runManager?: CallbackManagerForToolRun
  ): Promise<ToolOutputT>;
  
  invoke(input, config?): Promise<ToolReturnType>;
}
```

#### 工具类型
1. **Tool** - 接受字符串输入的简单工具
2. **StructuredTool** - 接受结构化输入（Zod schema）
3. **DynamicTool** - 从函数动态创建
4. **DynamicStructuredTool** - 动态结构化工具

#### 工具定义
```typescript
interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: JsonSchema7Type;  // JSON Schema
  };
}
```

---

### 4. **Prompts (提示模板)**

#### 核心组件
- **PromptTemplate** - 字符串模板
- **ChatPromptTemplate** - 聊天消息模板
- **MessagesPlaceholder** - 消息占位符
- **SystemMessage** - 系统消息
- **HumanMessage** - 用户消息
- **AIMessage** - AI 响应
- **ToolMessage** - 工具调用结果

#### 模板变量
- **Mustache** 模板语法支持
- 变量插值
- 部分变量填充

---

### 5. **Messages (消息系统)**

```typescript
abstract class BaseMessage {
  content: MessageContent;  // string | ContentArray
  role: string;
  name?: string;
  additional_kwargs?: Record<string, unknown>;
  response_metadata?: Record<string, unknown>;
  tool_calls?: ToolCall[];
  invalid_tool_calls?: InvalidToolCall[];
}
```

#### 消息类型
- **HumanMessage** - 用户输入
- **AIMessage** - AI 响应
- **SystemMessage** - 系统指令
- **ToolMessage** - 工具执行结果
- **FunctionMessage** - 函数调用结果（已废弃）

---

### 6. **Output Parsers (输出解析器)**

用于将 LLM 输出解析为结构化数据。

#### 解析器类型
- **StringOutputParser** - 字符串解析
- **JsonOutputParser** - JSON 解析
- **StructuredOutputParser** - Zod schema 解析
- **CommaSeparatedListOutputParser** - 逗号分隔列表
- **XMLOutputParser** - XML 解析

---

### 7. **Callbacks (回调系统)**

#### 核心接口
```typescript
interface CallbackManager {
  handleLLMStart(llm, prompts, runId, ...): Promise<void>;
  handleLLMEnd(output, runId, ...): Promise<void>;
  handleLLMError(error, runId, ...): Promise<void>;
  handleChainStart(chain, inputs, runId, ...): Promise<void>;
  handleChainEnd(outputs, runId, ...): Promise<void>;
  handleToolStart(tool, input, runId, ...): Promise<void>;
  handleToolEnd(output, runId, ...): Promise<void>;
}
```

#### 追踪器
- **LangSmith** 集成 - 自动追踪和监控
- **EventStreamCallbackHandler** - 事件流
- **LogStreamCallbackHandler** - 日志流

---

### 8. **Memory (记忆系统)**

- **BufferMemory** - 缓冲区记忆
- **ConversationBufferMemory** - 对话缓冲
- **VectorStoreRetrieverMemory** - 向量存储记忆

---

### 9. **Document Loaders (文档加载器)**

加载各种格式的文档：
- 文本文件
- PDF
- JSON
- CSV
- 网页内容

---

### 10. **Retrievers (检索器)**

从向量数据库或其他源检索相关文档。

---

### 11. **Vector Stores (向量存储)**

支持向量数据库集成：
- 文档嵌入
- 相似度搜索
- 混合检索

---

### 12. **Embeddings (嵌入)**

文本嵌入模型抽象：
- OpenAI Embeddings
- 自定义嵌入模型

---

### 13. **Agents (智能体)**

**注意**: LangChain 1.0 中传统的 Agent 抽象已被弃用，推荐使用 **LangGraph** 构建自定义循环。

#### 传统 Agent 类型（已弃用）
- OpenAI Functions Agent
- Conversational Agent
- ReAct Agent

#### 推荐方式
使用 **Runnable** + **手动循环** 或 **LangGraph**

---

## 🔥 LangChain 1.0 新特性

### 1. **LCEL (LangChain Expression Language)**

链式组合语法：

```typescript
const chain = prompt
  .pipe(model)
  .pipe(outputParser);

// 并行执行
const parallel = RunnableParallel.from({
  joke: jokeChain,
  poem: poemChain
});

// 条件分支
const branch = RunnableBranch.from([
  [(x) => x.topic === "math", mathChain],
  [(x) => x.topic === "history", historyChain],
  defaultChain  // 默认分支
]);
```

### 2. **Streaming 增强**

```typescript
// 流式输出
const stream = await chain.stream(input);
for await (const chunk of stream) {
  console.log(chunk);
}

// 事件流
const eventStream = chain.streamEvents(input, { version: "v2" });
for await (const event of eventStream) {
  if (event.event === "on_chat_model_stream") {
    console.log(event.data.chunk);
  }
}
```

### 3. **Tool Calling 原生支持**

```typescript
const model = new ChatOpenAI({ modelName: "gpt-4" });

// 绑定工具
const modelWithTools = model.bindTools([
  {
    name: "get_weather",
    description: "Get weather for a location",
    parameters: zodToJsonSchema(weatherSchema)
  }
]);

// 自动工具调用
const response = await modelWithTools.invoke([
  new HumanMessage("What's the weather in SF?")
]);

// 检查工具调用
if (response.tool_calls && response.tool_calls.length > 0) {
  const toolCall = response.tool_calls[0];
  // 执行工具...
}
```

### 4. **结构化输出**

```typescript
import { z } from "zod";

const schema = z.object({
  answer: z.string(),
  confidence: z.number(),
  sources: z.array(z.string())
});

const structuredModel = model.withStructuredOutput(schema);
const result = await structuredModel.invoke("Question...");
// result 自动符合 schema 类型
```

### 5. **Configuration Binding**

```typescript
// 绑定默认配置
const configuredChain = chain.withConfig({
  metadata: { userId: "123" },
  tags: ["production"],
  callbacks: [customHandler]
});
```

---

## 🛠️ 可组合的高级工具/模式

基于 LangChain 1.0 的特性，可以组合创建以下高级工具：

### 1. **多智能体系统**
✅ **已实现** - 我们的 GeoGebra Math Tutor

```typescript
// Agent Orchestrator 模式
class AgentOrchestrator {
  private agents: Map<string, Agent>;
  
  register(agent: Agent): void;
  getAgent(id: string): Agent | undefined;
  
  async route(input: string, agentId: string): Promise<Response> {
    const agent = this.getAgent(agentId);
    return agent.chat(input);
  }
}

// 每个 Agent 使用不同的 tools 和 system prompt
const visualizationAgent = new Agent({
  tools: [geogebraTools],
  systemPrompt: "你是可视化专家..."
});

const solverAgent = new Agent({
  tools: [],
  systemPrompt: "你是解题专家..."
});
```

### 2. **RAG (检索增强生成) 系统**

```typescript
const ragChain = RunnableSequence.from([
  // 1. 检索相关文档
  {
    context: retriever.pipe(formatDocs),
    question: new RunnablePassthrough()
  },
  // 2. 使用上下文生成答案
  promptTemplate,
  model,
  new StringOutputParser()
]);
```

### 3. **自适应工具调用链**

```typescript
// 自动决定何时使用哪个工具
const toolChain = RunnableSequence.from([
  prompt,
  model.bindTools(allTools),
  new ToolCallingLoop({
    maxIterations: 5,
    tools: toolExecutors
  })
]);
```

### 4. **条件路由系统**

```typescript
const routeChain = RunnableBranch.from([
  // 分类器
  [(input) => input.type === "code", codeGeneratorChain],
  [(input) => input.type === "math", mathSolverChain],
  [(input) => input.type === "creative", creativeWritingChain],
  // 默认
  generalChain
]);
```

### 5. **分层缓存系统**

```typescript
// L1: 内存缓存
// L2: Redis 缓存
const cachedModel = model.withConfig({
  cache: new MultiLevelCache({
    l1: new InMemoryCache(),
    l2: new RedisCache()
  })
});
```

### 6. **自我修正循环**

```typescript
const selfCorrectingChain = async (input) => {
  let attempts = 0;
  let result;
  
  while (attempts < 3) {
    result = await generatorChain.invoke(input);
    
    // 验证输出
    const validation = await validatorChain.invoke(result);
    
    if (validation.valid) break;
    
    // 使用错误信息重试
    input = {
      ...input,
      previousError: validation.error,
      previousAttempt: result
    };
    attempts++;
  }
  
  return result;
};
```

### 7. **实时协作系统**

```typescript
// 多个 Agent 协作完成任务
const collaborativeSystem = RunnableParallel.from({
  research: researchAgent,
  analysis: analysisAgent,
  synthesis: synthesisAgent
}).pipe(aggregatorAgent);
```

### 8. **渐进式细化 (Progressive Refinement)**

```typescript
const refinementChain = async (input) => {
  let draft = await draftChain.invoke(input);
  
  for (let i = 0; i < 3; i++) {
    const critique = await critiqueChain.invoke(draft);
    draft = await refineChain.invoke({
      draft,
      critique
    });
  }
  
  return draft;
};
```

### 9. **知识图谱构建器**

```typescript
const kgBuilder = RunnableSequence.from([
  documentLoader,
  entityExtractor,
  relationshipExtractor,
  graphConstructor,
  graphStorage
]);
```

### 10. **多模态处理链**

```typescript
const multimodalChain = RunnableSequence.from([
  // 输入：{ text, image, audio }
  new RunnableParallel({
    textAnalysis: textModel,
    imageAnalysis: visionModel,
    audioAnalysis: whisperModel
  }),
  fusionModel,  // 融合多模态结果
  outputGenerator
]);
```

---

## 🎯 实用工具组合示例

### 示例 1: 智能客服系统

```typescript
const customerServiceBot = RunnableSequence.from([
  // 意图识别
  intentClassifier,
  
  // 路由到不同处理器
  RunnableBranch.from([
    [(x) => x.intent === "refund", refundHandler],
    [(x) => x.intent === "technical", technicalSupportHandler],
    [(x) => x.intent === "sales", salesHandler],
    generalInquiryHandler
  ]),
  
  // 响应生成
  responseFormatter
]);
```

### 示例 2: 代码审查助手

```typescript
const codeReviewAssistant = RunnableSequence.from([
  codeParser,
  
  RunnableParallel.from({
    bugs: bugDetector,
    security: securityScanner,
    performance: performanceAnalyzer,
    style: styleChecker
  }),
  
  reportAggregator,
  suggestionGenerator
]);
```

### 示例 3: 内容生成工作流

```typescript
const contentPipeline = RunnableSequence.from([
  topicGenerator,
  outlineCreator,
  contentWriter,
  factChecker,
  styleRefiner,
  seoOptimizer,
  publishFormatter
]);
```

---

## 📊 架构优势

### LangChain 1.0 vs 0.x

| 特性 | 0.x | 1.0 |
|------|-----|-----|
| Agent 抽象 | 内置 Agent 类 | 推荐自定义循环 |
| 组合方式 | 继承类 | LCEL (pipe/序列) |
| 流式支持 | 有限 | 全面支持 |
| 工具调用 | 手动解析 | 原生 `bindTools()` |
| 类型安全 | 一般 | 强类型（Zod + TS） |
| 模块化 | 单包 | 多包（core/openai/etc） |
| 性能 | 一般 | 优化（并行/流式） |

---

## 🔮 未来可能的创新工具

基于这些特性，可以创建：

1. **自主 AI 研究员** - 多步骤文献检索、分析、综合
2. **实时协作编程助手** - 多人协作 + AI 实时建议
3. **自适应学习系统** - 根据学生表现调整教学策略
4. **复杂决策支持系统** - 多因素分析、风险评估
5. **创意工作室** - 多 Agent 协作创作（文案、设计、视频）
6. **智能数据分析平台** - 自动探索、可视化、洞察生成
7. **端到端自动化系统** - 从需求理解到代码部署全流程
8. **知识库问答系统** - 企业内部知识管理 + RAG
9. **多语言翻译润色系统** - 翻译 + 文化适配 + 风格调整
10. **AI 驱动的游戏 NPC** - 动态对话、记忆、决策

---

## 📚 核心依赖

```json
{
  "@langchain/core": "^1.0.1",
  "zod": "^3.25.76 || ^4",
  "langsmith": "^0.3.64",
  "js-tiktoken": "^1.0.12",
  "mustache": "^4.2.0"
}
```

---

## 🎓 最佳实践

1. **使用 LCEL** 而不是类继承组合链
2. **利用流式输出** 提升用户体验
3. **使用 Zod schema** 定义工具输入，确保类型安全
4. **善用 `withRetry()` 和 `withFallbacks()`** 提高稳定性
5. **合理使用缓存** 减少 API 调用成本
6. **启用 LangSmith** 追踪和调试
7. **避免使用已弃用的 Agent 类**，使用手动循环或 LangGraph

---

## 🔗 相关资源

- [LangChain.js 官方文档](https://js.langchain.com/)
- [LangChain 1.0 迁移指南](https://js.langchain.com/docs/versions/v1_migration)
- [LangGraph 文档](https://langchain-ai.github.io/langgraphjs/)
- [LangSmith 平台](https://smith.langchain.com/)

---

**文档生成时间**: 2025-10-19  
**基于**: @langchain/core@1.0.1, @langchain/openai@1.0.0-alpha.3  
**分析方法**: 源码类型定义分析 + 实际项目经验
