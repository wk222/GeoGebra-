import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { chatAPI } from '../services/api';
import { Message } from '../types';
import { MessageItem } from './MessageItem';

// 获取全局 GeoGebra 应用实例
const getGeoGebraApp = (): any => {
  if (typeof window !== 'undefined' && (window as any).ggbApplet) {
    return (window as any).ggbApplet;
  }
  return null;
};

export const ChatPanel: React.FC = () => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    sessionId,
    aiConfig,
    addMessage,
    setLoading,
  } = useAppStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !aiConfig) return;

    const userMessage: Message = {
      id: '',
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput('');
    setLoading(true);

    try {
      const response = await chatAPI.sendMessage(
        [...messages, userMessage],
        aiConfig,
        sessionId
      );

      addMessage({
        role: 'assistant',
        content: response.message.content,
        toolCalls: response.toolCalls,
      });

      // 执行 GeoGebra 命令
      if (response.toolCalls && response.toolCalls.length > 0) {
        const ggbApp = getGeoGebraApp();
        if (ggbApp) {
          let successCount = 0;
          let errorCount = 0;
          
          for (const toolCall of response.toolCalls) {
            if (toolCall.result?.command) {
              console.log(`🔵 执行 GeoGebra 命令: ${toolCall.result.command}`);
              try {
                const success = ggbApp.evalCommand(toolCall.result.command);
                if (success) {
                  console.log(`✅ 命令执行成功: ${toolCall.result.command}`);
                  successCount++;
                } else {
                  console.error(`❌ 命令执行失败: ${toolCall.result.command}`);
                  console.error('可能的原因：1) 语法错误 2) 引用了不存在的对象 3) GeoGebra不支持该命令');
                  errorCount++;
                }
              } catch (error) {
                console.error(`💥 GeoGebra 命令执行异常: ${toolCall.result.command}`, error);
                errorCount++;
              }
            } else if (toolCall.error) {
              console.error(`⚠️ 工具调用错误: ${toolCall.tool}`, toolCall.error);
              errorCount++;
            }
          }
          
          console.log(`📊 执行完成: ${successCount} 成功, ${errorCount} 失败`);
          
          if (errorCount > 0) {
            // 添加错误提示消息
            addMessage({
              role: 'system',
              content: `⚠️ ${errorCount} 个命令执行失败。请查看浏览器控制台（F12）获取详细错误信息。`,
            });
          }
        } else {
          console.warn('⚠️ GeoGebra 应用未就绪，请稍后重试');
          addMessage({
            role: 'system',
            content: '⚠️ GeoGebra 还未加载完成，请稍等片刻后重试。',
          });
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      addMessage({
        role: 'assistant',
        content: '抱歉，发送消息时出错了。请检查 API 配置和网络连接。',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!aiConfig) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <div>
          <h2 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
            请先配置 AI API
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            点击右上角的设置按钮配置 OpenAI 或 Anthropic API
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--surface)',
      }}
    >
      {/* 消息列表 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <div>
              <h3 style={{ marginBottom: '8px' }}>开始对话</h3>
              <p>问我任何数学问题，我会用 GeoGebra 帮你可视化！</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入区域 */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          padding: '16px',
          backgroundColor: 'var(--background)',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入数学问题... (Shift+Enter 换行)"
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              resize: 'none',
              minHeight: '60px',
              maxHeight: '120px',
              fontSize: '14px',
            }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              backgroundColor: isLoading ? 'var(--text-secondary)' : 'var(--primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '500',
              opacity: !input.trim() || isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                思考中...
              </>
            ) : (
              <>
                <Send size={16} />
                发送
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

