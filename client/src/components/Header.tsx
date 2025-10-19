import React from 'react';
import { Settings, BookOpen, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface HeaderProps {
  onOpenConfig: () => void;
}

const getGeoGebraApp = (): any => {
  if (typeof window !== 'undefined' && (window as any).ggbApplet) {
    return (window as any).ggbApplet;
  }
  return null;
};

export const Header: React.FC<HeaderProps> = ({ onOpenConfig }) => {
  const { newSession, clearMessages } = useAppStore();

  const handleClear = async () => {
    if (confirm('确定要清空对话和画布吗？')) {
      const ggbApp = getGeoGebraApp();
      if (ggbApp) {
        try {
          ggbApp.reset();
          console.log('GeoGebra 画布已清空');
        } catch (error) {
          console.error('清空画布失败:', error);
        }
      }
      clearMessages();
    }
  };

  const handleNewSession = () => {
    if (confirm('确定要开始新会话吗？这将清空当前对话。')) {
      const ggbApp = getGeoGebraApp();
      if (ggbApp) {
        try {
          ggbApp.reset();
        } catch (error) {
          console.error('清空画布失败:', error);
        }
      }
      newSession();
    }
  };

  return (
    <header
      style={{
        height: '60px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        backgroundColor: 'var(--surface)',
        gap: '12px',
      }}
    >
      <BookOpen size={24} color="var(--primary)" />
      <h1 style={{ flex: 1, fontSize: '20px', fontWeight: '600' }}>
        GeoGebra 数学教学助手
      </h1>

      <button
        onClick={handleNewSession}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          backgroundColor: 'var(--background)',
          color: 'var(--text)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '14px',
          fontWeight: '500',
        }}
        title="新会话"
      >
        <RefreshCw size={16} />
        新会话
      </button>

      <button
        onClick={handleClear}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          backgroundColor: 'var(--error)',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500',
        }}
      >
        清空
      </button>

      <button
        onClick={onOpenConfig}
        style={{
          padding: '8px',
          borderRadius: '8px',
          backgroundColor: 'var(--background)',
          display: 'flex',
          alignItems: 'center',
        }}
        title="设置"
      >
        <Settings size={20} color="var(--text)" />
      </button>
    </header>
  );
};

