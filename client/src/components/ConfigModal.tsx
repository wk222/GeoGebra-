import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { configAPI } from '../services/api';
import { AIConfig } from '../types';

interface ConfigModalProps {
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ onClose }) => {
  const { aiConfig, setAIConfig } = useAppStore();
  
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'custom'>(
    aiConfig?.provider || 'openai'
  );
  const [apiKey, setApiKey] = useState(aiConfig?.apiKey || '');
  const [model, setModel] = useState(aiConfig?.model || '');
  const [baseURL, setBaseURL] = useState(aiConfig?.baseURL || '');
  const [models, setModels] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // 加载模型列表
  useEffect(() => {
    const loadModels = async () => {
      try {
        const { models: modelList } = await configAPI.getModels(provider);
        setModels(modelList);
        if (!model && modelList.length > 0) {
          setModel(modelList[0]);
        }
      } catch (error) {
        console.error('加载模型列表失败:', error);
      }
    };
    loadModels();
  }, [provider]);

  const handleValidate = async () => {
    if (!apiKey) {
      setValidationMessage({ type: 'error', text: '请输入 API Key' });
      return;
    }

    if (provider === 'custom' && !baseURL) {
      setValidationMessage({ type: 'error', text: '自定义API需要提供API地址' });
      return;
    }

    setIsValidating(true);
    setValidationMessage(null);

    try {
      const { valid, error } = await configAPI.validate(provider, apiKey, baseURL);
      
      if (valid) {
        setValidationMessage({ type: 'success', text: 'API Key 验证成功！' });
      } else {
        setValidationMessage({ type: 'error', text: error || 'API Key 验证失败' });
      }
    } catch (error) {
      setValidationMessage({ type: 'error', text: '验证失败，请检查网络连接' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    if (!apiKey || !model) {
      alert('请填写完整的配置信息');
      return;
    }

    if (provider === 'custom' && !baseURL) {
      alert('自定义API需要提供API地址');
      return;
    }

    const config: AIConfig = {
      provider,
      apiKey,
      model,
      baseURL: provider === 'custom' ? baseURL : undefined,
    };

    setAIConfig(config);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && aiConfig) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '12px',
          padding: '24px',
          width: '500px',
          maxWidth: '90vw',
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideUp 0.3s',
        }}
      >
        {/* 标题 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            AI API 配置
          </h2>
          {aiConfig && (
            <button
              onClick={onClose}
              style={{
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* 提供商选择 */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            AI 提供商
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setProvider('openai')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: `2px solid ${provider === 'openai' ? 'var(--primary)' : 'var(--border)'}`,
                backgroundColor: provider === 'openai' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                fontWeight: '500',
                fontSize: '13px',
              }}
            >
              OpenAI
            </button>
            <button
              onClick={() => setProvider('anthropic')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: `2px solid ${provider === 'anthropic' ? 'var(--primary)' : 'var(--border)'}`,
                backgroundColor: provider === 'anthropic' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                fontWeight: '500',
                fontSize: '13px',
              }}
            >
              Claude
            </button>
            <button
              onClick={() => setProvider('custom')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: `2px solid ${provider === 'custom' ? 'var(--primary)' : 'var(--border)'}`,
                backgroundColor: provider === 'custom' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                fontWeight: '500',
                fontSize: '13px',
              }}
            >
              自定义API
            </button>
          </div>
        </div>

        {/* 自定义API地址 */}
        {provider === 'custom' && (
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              API 地址
            </label>
            <input
              type="url"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="http://185.183.98.135:3000/v1"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>
        )}

        {/* API Key */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              provider === 'openai' ? 'sk-...' : 
              provider === 'anthropic' ? 'sk-ant-...' : 
              '输入您的API密钥'
            }
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          />
          <button
            onClick={handleValidate}
            disabled={isValidating || !apiKey || (provider === 'custom' && !baseURL)}
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--secondary)',
              color: 'white',
              fontSize: '13px',
              fontWeight: '500',
              opacity: !apiKey || isValidating || (provider === 'custom' && !baseURL) ? 0.5 : 1,
            }}
          >
            {isValidating ? '验证中...' : '验证 API Key'}
          </button>
        </div>

        {/* 验证消息 */}
        {validationMessage && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor:
                validationMessage.type === 'success'
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
              color:
                validationMessage.type === 'success'
                  ? 'var(--secondary)'
                  : 'var(--error)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            {validationMessage.type === 'success' ? (
              <Check size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            {validationMessage.text}
          </div>
        )}

        {/* 模型选择 */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            模型
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              border: '1px solid var(--border)',
            }}
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {aiConfig && (
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: 'var(--background)',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              取消
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!apiKey || !model}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              opacity: !apiKey || !model ? 0.5 : 1,
            }}
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};

