import React from 'react';
import { AgentConfig } from '../types/agent';

interface AgentSelectorProps {
  agents: AgentConfig[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
}) => {
  return (
    <div className="agent-selector">
      <div className="agent-selector-label">选择助手：</div>
      <div className="agent-selector-grid">
        {agents.map((agent) => (
          <button
            key={agent.id}
            className={`agent-card ${selectedAgentId === agent.id ? 'active' : ''}`}
            onClick={() => onSelectAgent(agent.id)}
            title={agent.description}
          >
            <div className="agent-icon">{agent.icon}</div>
            <div className="agent-name">{agent.name}</div>
          </button>
        ))}
      </div>

      <style>{`
        .agent-selector {
          margin-bottom: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .agent-selector-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #495057;
          margin-bottom: 0.75rem;
        }

        .agent-selector-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.75rem;
        }

        .agent-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem 0.75rem;
          background: white;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .agent-card:hover {
          border-color: #007bff;
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
          transform: translateY(-2px);
        }

        .agent-card.active {
          border-color: #007bff;
          background: #e7f1ff;
          box-shadow: 0 2px 12px rgba(0, 123, 255, 0.2);
        }

        .agent-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .agent-name {
          font-size: 0.813rem;
          font-weight: 500;
          color: #212529;
          text-align: center;
          line-height: 1.3;
        }

        .agent-card.active .agent-name {
          color: #007bff;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
