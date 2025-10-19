import React from 'react';
import { User, Bot, Wrench, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Message } from '../types';
import 'katex/dist/katex.min.css';

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
          <div
            className="message-content"
            style={{
              lineHeight: 1.6,
              wordBreak: 'break-word',
            }}
          >
            {isUser ? (
              // 用户消息：简单文本
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {message.content}
              </p>
            ) : (
              // AI 消息：支持 Markdown 和 LaTeX
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  // 自定义代码块样式
                  code: ({node, className, children, ...props}: any) => {
                    const inline = !className;
                    return inline ? (
                      <code
                        style={{
                          backgroundColor: 'var(--background)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.9em',
                          fontFamily: 'monospace',
                        }}
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <pre
                        style={{
                          backgroundColor: 'var(--background)',
                          padding: '12px',
                          borderRadius: '6px',
                          overflow: 'auto',
                          fontSize: '0.9em',
                        }}
                      >
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    );
                  },
                  // 自定义列表样式
                  ul: ({children}) => (
                    <ul style={{ paddingLeft: '1.5em', margin: '0.5em 0' }}>
                      {children}
                    </ul>
                  ),
                  ol: ({children}) => (
                    <ol style={{ paddingLeft: '1.5em', margin: '0.5em 0' }}>
                      {children}
                    </ol>
                  ),
                  // 自定义标题样式
                  h1: ({children}) => (
                    <h1 style={{ fontSize: '1.5em', marginTop: '1em', marginBottom: '0.5em' }}>
                      {children}
                    </h1>
                  ),
                  h2: ({children}) => (
                    <h2 style={{ fontSize: '1.3em', marginTop: '0.8em', marginBottom: '0.4em' }}>
                      {children}
                    </h2>
                  ),
                  h3: ({children}) => (
                    <h3 style={{ fontSize: '1.1em', marginTop: '0.6em', marginBottom: '0.3em' }}>
                      {children}
                    </h3>
                  ),
                  // 自定义段落样式
                  p: ({children}) => (
                    <p style={{ margin: '0.5em 0' }}>
                      {children}
                    </p>
                  ),
                  // 自定义 details 标签
                  details: ({children}) => (
                    <details style={{ 
                      margin: '0.5em 0',
                      padding: '8px',
                      backgroundColor: 'var(--background)',
                      borderRadius: '6px',
                      border: '1px solid var(--border)'
                    }}>
                      {children}
                    </details>
                  ),
                  summary: ({children}) => (
                    <summary style={{ 
                      cursor: 'pointer',
                      fontWeight: '500',
                      padding: '4px',
                      userSelect: 'none'
                    }}>
                      {children}
                    </summary>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

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
