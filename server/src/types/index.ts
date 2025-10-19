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
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  model: string;
  baseURL?: string; // 自定义API地址
}

export interface ChatRequest {
  messages: Message[];
  config: AIConfig;
}

export interface ChatResponse {
  message: Message;
  toolCalls?: ToolCall[];
}

export interface GeoGebraCommand {
  command: string;
  params?: Record<string, any>;
}

export interface GeoGebraResponse {
  success: boolean;
  result?: any;
  error?: string;
}

