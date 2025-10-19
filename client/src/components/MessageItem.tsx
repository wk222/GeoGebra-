import React from 'react';
import { User, Bot, Wrench, AlertCircle } from 'lucide-react';
import { Message } from '../types';

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // 系统消息使用特殊样式
  if (isSystem) {
    return (
      <div
        style={{
          marginBottom: '16px',
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--error)',
          animation: 'fadeIn 0.3s ease-in',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} color="var(--error)" />
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--error)' }}>
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginBottom: '16px',
        display: 'flex',
        gap: '12px',
        animation: 'fadeIn 0.3s ease-in',
      }}
    >
      {/* 头像 */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: isUser ? 'var(--primary)' : 'var(--secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isUser ? <User size={20} color="white" /> : <Bot size={20} color="white" />}
      </div>

      {/* 消息内容 */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: isUser ? 'var(--background)' : 'var(--surface)',
            border: isUser ? '1px solid var(--border)' : 'none',
            boxShadow: isUser ? 'none' : 'var(--shadow)',
          }}
        >
          <p
            style={{
              margin: 0,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {message.content}
          </p>

          {/* 工具调用 */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div style={{ marginTop: '12px', fontSize: '13px' }}>
              {message.toolCalls.map((toolCall) => (
                <div
                  key={toolCall.id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--background)',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Wrench size={14} color="var(--text-secondary)" />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    调用工具: <code>{toolCall.tool}</code>
                  </span>
                  {toolCall.error && (
                    <span style={{ color: 'var(--error)', marginLeft: 'auto' }}>
                      失败
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 时间戳 */}
        <div
          style={{
            marginTop: '4px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            paddingLeft: '4px',
          }}
        >
          {new Date(message.timestamp).toLocaleTimeString('zh-CN')}
        </div>
      </div>
    </div>
  );
};

