import { Agent, AgentConfig } from '../types/agent';
import logger from '../utils/logger';

export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map();

  registerAgent(agent: Agent): void {
    const config = agent.getConfig();
    this.agents.set(config.id, agent);
    logger.info(`✅ 注册智能体: ${config.name} (${config.id})`);
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values()).map(agent => agent.getConfig());
  }

  getEnabledAgents(): AgentConfig[] {
    return this.getAllAgents().filter(config => config.enabled);
  }

  hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }
}

export const agentOrchestrator = new AgentOrchestrator();
