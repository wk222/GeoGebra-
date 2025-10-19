import { agentOrchestrator } from '../services/agent-orchestrator';
import { GeoGebraAgent } from './geogebra-agent';
import { StepSolverAgent } from './step-solver-agent';
import { ConceptExplainerAgent } from './concept-explainer-agent';
import { ExerciseGeneratorAgent } from './exercise-generator-agent';
import logger from '../utils/logger';

export function initializeAgents() {
  logger.info('🤖 初始化智能体系统...');

  // 注册所有智能体
  agentOrchestrator.registerAgent(new GeoGebraAgent());
  agentOrchestrator.registerAgent(new StepSolverAgent());
  agentOrchestrator.registerAgent(new ConceptExplainerAgent());
  agentOrchestrator.registerAgent(new ExerciseGeneratorAgent());

  const agents = agentOrchestrator.getAllAgents();
  logger.info(`✅ 智能体系统初始化完成，共 ${agents.length} 个智能体`);
  
  agents.forEach(agent => {
    logger.info(`   - ${agent.icon} ${agent.name} (${agent.id})`);
  });
}

export { agentOrchestrator };
