import { create } from 'zustand';
import { Message, AIConfig, GeoGebraObject } from '../types';
import { AgentConfig } from '../types/agent';

// 简单的 UUID 生成函数（避免引入 uuid 包）
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface AppState {
  // 聊天相关
  messages: Message[];
  sessionId: string;
  isLoading: boolean;
  
  // AI 配置
  aiConfig: AIConfig | null;
  
  // 智能体相关
  agents: AgentConfig[];
  selectedAgentId: string;
  
  // GeoGebra 相关
  geogebraObjects: GeoGebraObject[];
  
  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setAIConfig: (config: AIConfig) => void;
  setAgents: (agents: AgentConfig[]) => void;
  setSelectedAgent: (agentId: string) => void;
  setGeoGebraObjects: (objects: GeoGebraObject[]) => void;
  newSession: () => void;
}

// 从 localStorage 加载配置
const loadConfig = (): AIConfig | null => {
  try {
    const stored = localStorage.getItem('geogebra-tutor-config');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// 保存配置到 localStorage
const saveConfig = (config: AIConfig | null) => {
  try {
    if (config) {
      localStorage.setItem('geogebra-tutor-config', JSON.stringify(config));
    } else {
      localStorage.removeItem('geogebra-tutor-config');
    }
  } catch (error) {
    console.error('保存配置失败:', error);
  }
};

export const useAppStore = create<AppState>((set) => ({
  // 初始状态
  messages: [],
  sessionId: generateId(),
  isLoading: false,
  aiConfig: loadConfig(),
  agents: [],
  selectedAgentId: 'geogebra',
  geogebraObjects: [],

  // Actions
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: generateId(),
          timestamp: new Date(),
        },
      ],
    })),

  setMessages: (messages) => set({ messages }),

  clearMessages: () => set({ messages: [], geogebraObjects: [] }),

  setLoading: (loading) => set({ isLoading: loading }),

  setAIConfig: (config) => {
    saveConfig(config);
    set({ aiConfig: config });
  },

  setAgents: (agents) => set({ agents }),

  setSelectedAgent: (agentId) => set({ selectedAgentId: agentId }),

  setGeoGebraObjects: (objects) => set({ geogebraObjects: objects }),

  newSession: () =>
    set({
      sessionId: generateId(),
      messages: [],
      geogebraObjects: [],
    }),
}));

