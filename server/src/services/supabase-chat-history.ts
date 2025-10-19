import { BaseListChatMessageHistory } from '@langchain/core/dist/chat_history.js';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/dist/messages/index.js';
import logger from '../utils/logger';

// 注意：实际使用时需要安装 @supabase/supabase-js
// npm install @supabase/supabase-js
//
// 当前为演示版本，使用内存存储
// 生产环境请取消下面注释，启用 Supabase 存储

interface StoredMessage {
  id: string;
  session_id: string;
  message_type: string;
  content: string;
  additional_kwargs: any;
  created_at: Date;
}

// 内存存储（演示用）
const memoryStore: Map<string, StoredMessage[]> = new Map();

/**
 * Supabase 消息历史存储
 *
 * 实现 LangChain 的 BaseListChatMessageHistory 接口
 * 使用 Supabase 数据库存储和检索聊天历史
 */
export class SupabaseChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace = ['langchain', 'stores', 'message', 'supabase'];

  private sessionId: string;
  private tableName = 'chat_history';
  private useMemoryStore = true; // 设置为 false 以使用 Supabase

  constructor(config: {
    sessionId: string;
    supabaseUrl?: string;
    supabaseKey?: string;
  }) {
    super();
    this.sessionId = config.sessionId;

    // 初始化内存存储
    if (this.useMemoryStore && !memoryStore.has(this.sessionId)) {
      memoryStore.set(this.sessionId, []);
    }

    logger.info('📝 SupabaseChatMessageHistory 已初始化 (内存模式)', { sessionId: this.sessionId });
  }

  /**
   * 获取所有消息
   */
  async getMessages(): Promise<BaseMessage[]> {
    try {
      if (this.useMemoryStore) {
        // 内存存储实现
        const data = memoryStore.get(this.sessionId) || [];
        const messages = data.map((record) => {
          const { message_type, content, additional_kwargs } = record;

          switch (message_type) {
            case 'human':
              return new HumanMessage({ content, additional_kwargs: additional_kwargs || {} });
            case 'ai':
              return new AIMessage({ content, additional_kwargs: additional_kwargs || {} });
            case 'system':
              return new SystemMessage({ content, additional_kwargs: additional_kwargs || {} });
            default:
              return new HumanMessage({ content, additional_kwargs: additional_kwargs || {} });
          }
        });

        logger.info(`✅ 获取消息历史: ${messages.length} 条`, { sessionId: this.sessionId });
        return messages;
      }

      // Supabase 实现（需要安装 @supabase/supabase-js）
      // const { data, error } = await this.client
      //   .from(this.tableName)
      //   .select('*')
      //   .eq('session_id', this.sessionId)
      //   .order('created_at', { ascending: true });
      //
      // if (error) throw error;
      // return data.map(record => /* ... */);

      return [];
    } catch (error) {
      logger.error('❌ getMessages 失败', error);
      throw error;
    }
  }

  /**
   * 添加消息
   */
  async addMessage(message: BaseMessage): Promise<void> {
    try {
      const messageType = this.getMessageType(message);

      if (this.useMemoryStore) {
        // 内存存储实现
        const messages = memoryStore.get(this.sessionId) || [];
        messages.push({
          id: crypto.randomUUID(),
          session_id: this.sessionId,
          message_type: messageType,
          content: message.content.toString(),
          additional_kwargs: message.additional_kwargs || {},
          created_at: new Date(),
        });
        memoryStore.set(this.sessionId, messages);

        logger.info(`✅ 添加消息: ${messageType}`, { sessionId: this.sessionId });
        return;
      }

      // Supabase 实现
      // const { error } = await this.client
      //   .from(this.tableName)
      //   .insert({
      //     session_id: this.sessionId,
      //     message_type: messageType,
      //     content: message.content.toString(),
      //     additional_kwargs: message.additional_kwargs || {},
      //   });
      //
      // if (error) throw error;

    } catch (error) {
      logger.error('❌ addMessage 失败', error);
      throw error;
    }
  }

  /**
   * 批量添加消息
   */
  async addMessages(messages: BaseMessage[]): Promise<void> {
    try {
      if (this.useMemoryStore) {
        // 内存存储实现
        for (const message of messages) {
          await this.addMessage(message);
        }
        logger.info(`✅ 批量添加消息: ${messages.length} 条`, { sessionId: this.sessionId });
        return;
      }

      // Supabase 实现
      // const records = messages.map(message => ({
      //   session_id: this.sessionId,
      //   message_type: this.getMessageType(message),
      //   content: message.content.toString(),
      //   additional_kwargs: message.additional_kwargs || {},
      // }));
      //
      // const { error } = await this.client
      //   .from(this.tableName)
      //   .insert(records);
      //
      // if (error) throw error;

    } catch (error) {
      logger.error('❌ addMessages 失败', error);
      throw error;
    }
  }

  /**
   * 清空消息历史
   */
  async clear(): Promise<void> {
    try {
      if (this.useMemoryStore) {
        // 内存存储实现
        memoryStore.set(this.sessionId, []);
        logger.info('✅ 清空消息历史', { sessionId: this.sessionId });
        return;
      }

      // Supabase 实现
      // const { error } = await this.client
      //   .from(this.tableName)
      //   .delete()
      //   .eq('session_id', this.sessionId);
      //
      // if (error) throw error;

    } catch (error) {
      logger.error('❌ clear 失败', error);
      throw error;
    }
  }

  /**
   * 获取消息类型
   */
  private getMessageType(message: BaseMessage): string {
    if (message._getType) {
      return message._getType();
    }

    // 备用类型检测
    if (message.constructor.name.includes('Human')) return 'human';
    if (message.constructor.name.includes('AI')) return 'ai';
    if (message.constructor.name.includes('System')) return 'system';

    return 'human'; // 默认
  }
}
