import React, { useState } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { GeoGebraPanel } from './components/GeoGebraPanel';
import { ConfigModal } from './components/ConfigModal';
import { Header } from './components/Header';
import { useAppStore } from './store/useAppStore';

const App: React.FC = () => {
  const [showConfig, setShowConfig] = useState(false);
  const { aiConfig } = useAppStore();

  // 如果没有配置，强制显示配置模态框
  React.useEffect(() => {
    if (!aiConfig) {
      setShowConfig(true);
    }
  }, [aiConfig]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header onOpenConfig={() => setShowConfig(true)} />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左侧：聊天面板 */}
        <div style={{ width: '40%', borderRight: '1px solid var(--border)' }}>
          <ChatPanel />
        </div>

        {/* 右侧：GeoGebra 画板 */}
        <div style={{ flex: 1 }}>
          <GeoGebraPanel />
        </div>
      </div>

      {/* 配置模态框 */}
      {showConfig && (
        <ConfigModal
          onClose={() => {
            if (aiConfig) {
              setShowConfig(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default App;

