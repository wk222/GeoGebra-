# LangChain 1.0 状态管理完整指南

## 📋 概述

LangChain 1.0 自带了 **RunnableWithMessageHistory**，这是一个强大的状态管理工具，无需依赖 @langchain/langgraph。

## 🎯 核心功能

### RunnableWithMessageHistory

位置: `@langchain/core/runnables/history`

**功能**：
- ✅ 自动管理对话历史
- ✅ 支持会话 ID（多用户隔离）
- ✅ 可插拔的存储后端
- ✅ 自动添加历史到链输入
- ✅ 自动保存输出到历史

### 架构

```
用户输入
   ↓
RunnableWithMessageHistory
   ├── 1. 获取历史消息（getMessageHistory）
   ├── 2. 合并历史 + 新输入
   ├── 3. 调用内部 Runnable（模型+工具）
   ├── 4. 保存输出到历史
   └── 返回响应
```

## 🗄️ 存储实现

### Supabase 存储

我们实现了 `SupabaseChatMessageHistory`，集成 Supabase 数据库。

#### 数据库表结构

```sql
CREATE TABLE chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  message_type text NOT NULL, -- 'human', 'ai', 'system', 'tool'
  content text NOT NULL,
  additional_kwargs jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at);
```

#### Supabase 存储实现

```typescript
import { BaseListChatMessageHistory } from '@langchain/core/chat_history';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { createClient } from '@supabase/supabase-js';

export class SupabaseChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace = ['langchain', 'stores', 'message', 'supabase'];

  private client: SupabaseClient;
  private sessionId: string;

  constructor(config: { sessionId: string }) {
    super();
    this.sessionId = config.sessionId;
    this.client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }

  async getMessages(): Promise<BaseMessage[]> {
    const { data } = await this.client
      .from('chat_history')
      .select('*')
      .eq('session_id', this.sessionId)
      .order('created_at', { ascending: true });

    return data!.map((record) => {
      switch (record.message_type) {
        case 'human':
          return new HumanMessage(record.content);
        case 'ai':
          return new AIMessage(record.content);
        default:
          return new HumanMessage(record.content);
      }
    });
  }

  async addMessage(message: BaseMessage): Promise<void> {
    await this.client.from('chat_history').insert({
      session_id: this.sessionId,
      message_type: message._getType(),
      content: message.content.toString(),
      additional_kwargs: message.additional_kwargs || {},
    });
  }

  async clear(): Promise<void> {
    await this.client
      .from('chat_history')
      .delete()
      .eq('session_id', this.sessionId);
  }
}
```

## 🔧 使用方式

### 方式 1：基础使用（纯对话）

```typescript
import { RunnableWithMessageHistory } from '@langchain/core/runnables/history';
import { ChatOpenAI } from '@langchain/openai';
import { SupabaseChatMessageHistory } from './supabase-chat-history';

// 创建模型
const model = new ChatOpenAI({
  model: 'gpt-4-turbo-preview',
  apiKey: process.env.OPENAI_API_KEY,
});

// 包装模型，添加历史管理
const modelWithHistory = new RunnableWithMessageHistory({
  runnable: model,
  getMessageHistory: (sessionId) => {
    return new SupabaseChatMessageHistory({ sessionId });
  },
  inputMessagesKey: 'input',
  historyMessagesKey: 'history',
});

// 使用
const response = await modelWithHistory.invoke(
  { input: '你好，我想学习微积分' },
  {
    configurable: {
      sessionId: 'user-123',
    },
  }
);

// 第二次对话会自动包含历史
const response2 = await modelWithHistory.invoke(
  { input: '什么是导数？' },
  {
    configurable: {
      sessionId: 'user-123', // 相同的 sessionId
    },
  }
);
```

### 方式 2：结合工具使用

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { RunnableWithMessageHistory } from '@langchain/core/runnables/history';
import { geogebraTools } from './geogebra-tools';

// 创建带工具的模型
const model = new ChatOpenAI({
  model: 'gpt-4-turbo-preview',
}).bindTools(geogebraTools);

// 添加历史管理
const modelWithHistory = new RunnableWithMessageHistory({
  runnable: model,
  getMessageHistory: (sessionId) => {
    return new SupabaseChatMessageHistory({ sessionId });
  },
});

// 使用（工具调用也会被记录）
const response = await modelWithHistory.invoke(
  { input: '画一个 y=x² 的函数图像' },
  {
    configurable: {
      sessionId: 'user-123',
    },
  }
);
```

### 方式 3：结合 ToolLoopExecutor 使用

由于我们有自定义的工具循环逻辑，可以手动管理历史：

```typescript
export class GeoGebraAgent {
  private toolLoopExecutor: ToolLoopExecutor;

  async chat(messages: Message[], aiConfig: any): Promise<ChatResponse> {
    const sessionId = this.extractSessionId(messages);

    // 1. 加载历史
    const history = new SupabaseChatMessageHistory({ sessionId });
    const historicalMessages = await history.getMessages();

    // 2. 合并历史和新消息
    const allMessages = [
      ...historicalMessages.map(msg => ({
        role: msg._getType() === 'human' ? 'user' : 'assistant',
        content: msg.content.toString(),
      })),
      ...messages,
    ];

    // 3. 执行工具循环
    const result = await this.toolLoopExecutor.execute(this.model, allMessages);

    // 4. 保存到历史
    const lastUserMsg = messages[messages.length - 1];
    await history.addMessage(new HumanMessage(lastUserMsg.content));
    await history.addMessage(new AIMessage(result.message.content));

    return result;
  }
}
```

## 🎨 高级功能

### 1. 会话管理

```typescript
// 不同用户使用不同的 sessionId
const response1 = await modelWithHistory.invoke(
  { input: 'Hello' },
  { configurable: { sessionId: 'user-alice' } }
);

const response2 = await modelWithHistory.invoke(
  { input: 'Hello' },
  { configurable: { sessionId: 'user-bob' } }
);

// Alice 和 Bob 的历史是隔离的
```

### 2. 清空历史

```typescript
const history = new SupabaseChatMessageHistory({ sessionId: 'user-123' });
await history.clear();
```

### 3. 获取历史记录

```typescript
const history = new SupabaseChatMessageHistory({ sessionId: 'user-123' });
const messages = await history.getMessages();

console.log('历史消息数:', messages.length);
messages.forEach(msg => {
  console.log(`${msg._getType()}: ${msg.content}`);
});
```

### 4. 自定义历史长度

```typescript
// 可以在 getMessages 中实现限制
async getMessages(): Promise<BaseMessage[]> {
  const { data } = await this.client
    .from('chat_history')
    .select('*')
    .eq('session_id', this.sessionId)
    .order('created_at', { ascending: false })
    .limit(20); // 只取最近 20 条

  return data!.reverse().map(/* ... */);
}
```

## 📊 与其他方案对比

| 特性 | RunnableWithMessageHistory | LangGraph StateGraph | 手动管理 |
|------|---------------------------|---------------------|---------|
| LangChain 1.0 支持 | ✅ | ❌ (需要 0.2.x/0.3.x) | ✅ |
| 自动历史管理 | ✅ | ✅ | ❌ |
| 会话隔离 | ✅ | ✅ | 需要实现 |
| 可插拔存储 | ✅ | ✅ | 需要实现 |
| 状态持久化 | ✅ | ✅ | 需要实现 |
| 复杂状态图 | ❌ | ✅ | 需要实现 |
| 学习曲线 | 低 | 高 | 低 |
| 外部依赖 | ❌ | ✅ | ❌ |

## ✅ 最佳实践

### 1. 使用有意义的 sessionId

```typescript
// ✅ 好的做法
const sessionId = `user-${userId}-${conversationId}`;

// ❌ 不好的做法
const sessionId = 'default'; // 所有用户共享历史
```

### 2. 错误处理

```typescript
try {
  await history.addMessage(message);
} catch (error) {
  logger.error('保存历史失败', error);
  // 不要让历史保存失败影响主流程
}
```

### 3. 历史清理

```typescript
// 定期清理旧历史
async cleanOldHistory(daysOld: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  await this.client
    .from('chat_history')
    .delete()
    .lt('created_at', cutoffDate.toISOString());
}
```

### 4. 性能优化

```typescript
// 批量添加消息
await history.addMessages([
  new HumanMessage('Question 1'),
  new AIMessage('Answer 1'),
  new HumanMessage('Question 2'),
  new AIMessage('Answer 2'),
]);

// 而不是
await history.addMessage(new HumanMessage('Question 1'));
await history.addMessage(new AIMessage('Answer 1'));
// ...
```

## 🔮 完整示例

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { RunnableWithMessageHistory } from '@langchain/core/runnables/history';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { SupabaseChatMessageHistory } from './supabase-chat-history';

// 1. 创建提示模板（包含历史占位符）
const prompt = ChatPromptTemplate.fromMessages([
  ['system', '你是一个有用的数学助手'],
  new MessagesPlaceholder('history'), // 历史消息会插入这里
  ['human', '{input}'],
]);

// 2. 创建链
const model = new ChatOpenAI({ model: 'gpt-4-turbo-preview' });
const chain = prompt.pipe(model);

// 3. 添加历史管理
const chainWithHistory = new RunnableWithMessageHistory({
  runnable: chain,
  getMessageHistory: (sessionId) => {
    return new SupabaseChatMessageHistory({ sessionId });
  },
  inputMessagesKey: 'input',
  historyMessagesKey: 'history',
});

// 4. 使用
async function chat(userId: string, message: string) {
  const response = await chainWithHistory.invoke(
    { input: message },
    {
      configurable: {
        sessionId: `user-${userId}`,
      },
    }
  );

  return response.content;
}

// 示例对话
await chat('alice', '你好！');
// 响应: "你好！我是数学助手，有什么可以帮你的？"

await chat('alice', '我刚才说了什么？');
// 响应: "你刚才说'你好！'"（记住了上一条消息）
```

## 📚 相关文档

- [RunnableWithMessageHistory 源码](./server/node_modules/@langchain/core/dist/runnables/history.d.ts)
- [SupabaseChatMessageHistory 实现](./server/src/services/supabase-chat-history.ts)
- [GeoGebra Agent with History](./server/src/agents/geogebra-agent-with-history.ts)

## 🎯 总结

LangChain 1.0 的 **RunnableWithMessageHistory** 提供了：

1. ✅ 内置状态管理（无需 langgraph）
2. ✅ 简单易用的 API
3. ✅ 灵活的存储后端
4. ✅ 完美支持 Supabase
5. ✅ 会话隔离和管理

对于大多数应用场景，这已经完全足够。只有需要复杂的状态图编排时，才需要考虑 LangGraph。

---

**文档创建时间**: 2025-10-19
**基于**: @langchain/core@1.0.0-alpha.7
**存储**: Supabase PostgreSQL
