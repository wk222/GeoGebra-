import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { chatAPI } from '../services/api';
import { Message } from '../types';
import { MessageItem } from './MessageItem';
import { AgentSelector } from './AgentSelector';

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
    agents,
    selectedAgentId,
    addMessage,
    setLoading,
    setAgents,
    setSelectedAgent,
  } = useAppStore();

  // 加载智能体列表
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const { agents: availableAgents } = await chatAPI.getAgents();
        setAgents(availableAgents);
      } catch (error) {
        console.error('加载智能体列表失败:', error);
      }
    };
    loadAgents();
  }, [setAgents]);

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
        sessionId,
        selectedAgentId
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
      <div className="chat-panel">
        <div className="empty-state">
          <p>请先配置 API 密钥</p>
          <p style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.5rem' }}>
            点击右上角的设置图标进行配置
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      {/* 智能体选择器 */}
      {agents.length > 0 && (
        <AgentSelector
          agents={agents}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgent}
        />
      )}

      {/* 消息列表 */}
      <div className="messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <h3>👋 你好！我是数学助手</h3>
            <p>我可以帮你：</p>
            <ul style={{ textAlign: 'left', marginTop: '1rem' }}>
              <li>📊 创建数学可视化（GeoGebra）</li>
              <li>🧮 分解解题步骤</li>
              <li>📖 解释数学概念</li>
            </ul>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6c757d' }}>
              选择上方的助手，然后开始提问吧！
            </p>
          </div>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            agents.find(a => a.id === selectedAgentId)
              ? `向 ${agents.find(a => a.id === selectedAgentId)?.name} 提问...`
              : '输入消息...'
          }
          disabled={isLoading}
          rows={3}
        />
        <button onClick={handleSend} disabled={isLoading || !input.trim()}>
          {isLoading ? <Loader2 className="icon-spin" /> : <Send />}
        </button>
      </div>

      <style>{`
        .chat-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: white;
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: #6c757d;
          text-align: center;
        }

        .empty-state h3 {
          margin-bottom: 1rem;
          color: #212529;
        }

        .empty-state ul {
          list-style: none;
          padding: 0;
        }

        .empty-state li {
          margin: 0.5rem 0;
          padding: 0.5rem;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .input-area {
          display: flex;
          gap: 0.5rem;
          padding: 1rem;
          border-top: 1px solid #dee2e6;
          background: #f8f9fa;
        }

        .input-area textarea {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #ced4da;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.938rem;
          resize: none;
        }

        .input-area textarea:focus {
          outline: none;
          border-color: #007bff;
        }

        .input-area textarea:disabled {
          background: #e9ecef;
          cursor: not-allowed;
        }

        .input-area button {
          padding: 0.75rem 1.5rem;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .input-area button:hover:not(:disabled) {
          background: #0056b3;
        }

        .input-area button:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .icon-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
