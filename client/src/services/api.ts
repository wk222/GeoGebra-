import axios from 'axios';
import { Message, AIConfig, GeoGebraObject } from '../types';
import { AgentConfig } from '../types/agent';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

export const chatAPI = {
  getAgents: async (): Promise<{ agents: AgentConfig[] }> => {
    const response = await api.get('/chat/agents');
    return response.data;
  },

  sendMessage: async (
    messages: Message[],
    config: AIConfig,
    sessionId: string,
    agentId?: string
  ): Promise<{
    message: Message;
    toolCalls?: any[];
    objects?: GeoGebraObject[];
    agentId?: string;
  }> => {
    const response = await api.post('/chat/message', {
      messages,
      config,
      sessionId,
      agentId,
    });
    return response.data;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/chat/session/${sessionId}`);
  },
};

export const geogebraAPI = {
  getObjects: async (): Promise<{ objects: GeoGebraObject[] }> => {
    const response = await api.get('/geogebra/objects');
    return response.data;
  },

  clear: async (): Promise<void> => {
    await api.post('/geogebra/clear');
  },

  exportPNG: async (): Promise<{ image: string }> => {
    const response = await api.get('/geogebra/export/png');
    return response.data;
  },

  executeCommand: async (command: string): Promise<any> => {
    const response = await api.post('/geogebra/command', { command });
    return response.data;
  },
};

export const configAPI = {
  validate: async (
    provider: string,
    apiKey: string,
    baseURL?: string
  ): Promise<{ valid: boolean; error?: string }> => {
    const response = await api.post('/config/validate', {
      provider,
      apiKey,
      baseURL,
    });
    return response.data;
  },

  getModels: async (provider: string): Promise<{ models: string[] }> => {
    const response = await api.get(`/config/models/${provider}`);
    return response.data;
  },
};

