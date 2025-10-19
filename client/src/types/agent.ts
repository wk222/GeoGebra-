export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  tools: string[];
  enabled: boolean;
}
