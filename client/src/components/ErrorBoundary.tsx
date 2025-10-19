import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('错误边界捕获到错误:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: 'var(--background)',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              backgroundColor: 'var(--surface)',
              padding: '32px',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <AlertCircle size={32} color="var(--error)" />
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
                应用出错了
              </h1>
            </div>
            
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              抱歉，应用遇到了一个错误。请查看下面的详细信息：
            </p>

            <div
              style={{
                backgroundColor: 'var(--background)',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
                overflow: 'auto',
                maxHeight: '300px',
              }}
            >
              <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: 'var(--error)' }}>
                {this.state.error?.toString()}
              </p>
              {this.state.errorInfo && (
                <pre
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                width: '100%',
              }}
            >
              重新加载页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

