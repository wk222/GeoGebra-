export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'geogebra';
  tool: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  model: string;
  baseURL?: string; // 自定义API地址
}

export interface GeoGebraObject {
  name: string;
  type: string;
  definition?: string;
  value?: any;
}

