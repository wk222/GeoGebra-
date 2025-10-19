import { Message } from './index';

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  tools: string[];
  enabled: boolean;
}

export interface ChatResponse {
  message: Message;
  toolCalls: any[];
}

export interface AgentTool {
  name: string;
  description: string;
  schema: any;
  execute: (params: any) => Promise<any>;
}

export abstract class Agent {
  constructor(protected config: AgentConfig) {}
  
  abstract chat(messages: Message[], aiConfig: any): Promise<ChatResponse>;
  abstract getTools(): AgentTool[];
  
  getConfig(): AgentConfig {
    return this.config;
  }
}
