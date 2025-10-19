import React, { useState } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { GeoGebraPanel } from './components/GeoGebraPanel';
import { ConfigModal } from './components/ConfigModal';
import { Header } from './components/Header';
import { useAppStore } from './store/useAppStore';

const App: React.FC = () => {
  const [showConfig, setShowConfig] = useState(false);
  const { aiConfig, selectedAgentId } = useAppStore();

  // 如果没有配置，强制显示配置模态框
  React.useEffect(() => {
    if (!aiConfig) {
      setShowConfig(true);
    }
  }, [aiConfig]);

  // GeoGebra 智能体和数学教学助手显示画板
  const showGeoGebra = selectedAgentId === 'geogebra' || selectedAgentId === 'math-tutor';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header onOpenConfig={() => setShowConfig(true)} />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左侧：聊天面板 */}
        <div style={{ 
          width: showGeoGebra ? '40%' : '100%', 
          borderRight: showGeoGebra ? '1px solid var(--border)' : 'none',
          transition: 'width 0.3s ease'
        }}>
          <ChatPanel />
        </div>

        {/* 右侧：GeoGebra 画板（仅 GeoGebra 智能体显示） */}
        {showGeoGebra && (
          <div style={{ flex: 1 }}>
            <GeoGebraPanel />
          </div>
        )}
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

