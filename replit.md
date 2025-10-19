# GeoGebra Math Tutor - Replit Setup

## Overview
This is a GeoGebra Math Tutor web application that integrates AI (OpenAI/Anthropic Claude) with GeoGebra visualization tools. Students and teachers can interact with AI through natural language, and the AI automatically calls GeoGebra tools to create mathematical visualizations.

**Current Status**: Configured and running in Replit environment (development and production ready)
**Last Updated**: October 19, 2025

## Project Structure

This is a monorepo with frontend and backend:

```
.
├── client/              # Frontend - React + Vite + TypeScript
│   ├── src/
│   │   ├── components/  # React components (ChatPanel, GeoGebraPanel, etc.)
│   │   ├── services/    # API client services
│   │   ├── store/       # Zustand state management
│   │   └── types/       # TypeScript types
│   └── vite.config.ts   # Vite configuration (port 5000)
├── server/              # Backend - Express + TypeScript
│   ├── src/
│   │   ├── agents/      # Multi-agent system (geogebra, step-solver, concept-explainer)
│   │   ├── routes/      # API routes (chat, geogebra, config)
│   │   ├── services/    # AI, GeoGebra, and agent orchestration services
│   │   ├── types/       # TypeScript type definitions
│   │   ├── utils/       # Logger and utilities
│   │   └── index.ts     # Server entry point (port 3001)
└── package.json         # Root workspace configuration
```

## Replit Configuration

### Ports

**Development:**
- **Frontend (Vite)**: Port 5000 (configured for Replit webview)
  - Host: 0.0.0.0
  - AllowedHosts: true (to support Replit proxy)
- **Backend (Express)**: Port 3001 (localhost only)
  - Host: localhost (default)

**Production:**
- **Server**: Port 5000 (serves both API and built frontend static files)
  - The Express server detects production mode via NODE_ENV and serves the built client from `client/dist`

### Workflow
The project uses a single workflow that runs both frontend and backend concurrently:
- Command: `npm run dev`
- This starts both servers simultaneously using concurrently

### Environment Variables
The backend can optionally use environment variables, but API keys can also be configured in the web UI:
- `PORT`: Backend port (default: 3001)
- `NODE_ENV`: development/production
- `OPENAI_API_KEY`: Optional - can be set in UI instead
- `ANTHROPIC_API_KEY`: Optional - can be set in UI instead

## Technologies Used

### Frontend
- React 18
- TypeScript
- Vite (build tool)
- Zustand (state management)
- TanStack Query (data fetching)
- Axios (HTTP client)
- Lucide React (icons)

### Backend
- Express.js
- TypeScript
- **LangChain 1.0.0-alpha.8** (agent orchestration)
- **@langchain/openai** (OpenAI integration)
- **@langchain/anthropic** (Anthropic Claude integration)
- Puppeteer (for GeoGebra automation)
- WebSocket (real-time communication)
- Winston (logging)

## Features
- **多智能体架构** - 5个专业化AI助手：
  - 🎓 数学教学助手 - 全能助手：生成练习题 + GeoGebra 可视化（推荐）
  - 📊 GeoGebra可视化助手 - 专注创建数学图形和可视化
  - 🧮 解题步骤分解器 - 将复杂问题分解成详细步骤
  - 📖 概念解释专家 - 用通俗语言解释数学概念
  - 📝 练习题生成器 - 生成纯文本练习题
- AI-powered math tutoring with OpenAI GPT or Anthropic Claude (including custom API support)
- Real-time GeoGebra visualization with multi-round tool calling
- Natural language interface for creating mathematical diagrams
- Session management
- Export GeoGebra graphics as PNG
- Support for points, lines, circles, polygons, functions, integrals, and custom commands

## Development Notes

### Installing Dependencies
Dependencies are managed via npm workspaces:
```bash
npm install                    # Install root dependencies
cd server && npm install       # Install server dependencies
cd client && npm install       # Install client dependencies
# OR use the convenience script:
npm run install:all
```

### Running Locally
The Replit workflow automatically runs:
```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5000) concurrently.

### Building for Production
```bash
npm run build
```

This builds both the server (compiles TypeScript) and client (creates optimized static bundle in `client/dist`).

### Production Server
In production, the Express server:
1. Serves the built frontend static files from `client/dist`
2. Handles all API routes (`/api/*`)
3. Provides WebSocket endpoint (`/ws`)
4. Returns `index.html` for all other routes (SPA routing)

The server automatically detects production mode via `NODE_ENV=production` and switches to serving static files on port 5000.

## API Configuration
Users can configure their AI provider (OpenAI or Anthropic) directly in the web UI:
1. Click the settings icon
2. Choose AI provider
3. Enter API key
4. Verify and save

API keys are stored in browser localStorage for convenience and security.

## Recent Changes

### 2025-10-19 (Latest) - Math Tutor Agent + LaTeX Rendering
- **Created Math Tutor Agent** (`math-tutor-agent.ts`)
  - All-in-one agent: Exercise generation + GeoGebra visualization
  - Uses proven tool-calling pattern from GeoGebra Agent
  - Avoids API compatibility issues with custom API
  - Supports 7 GeoGebra tools for automatic visualization
- **Added LaTeX rendering support**
  - Installed: `react-markdown`, `remark-math`, `rehype-katex`, `katex`
  - Modified `MessageItem.tsx` to render LaTeX in AI messages
  - Supports inline ($...$) and display ($$...$$) math formulas
  - Full Markdown support: headings, lists, code blocks, details/summary
- **Exercise Generator reverted to text-only**
  - No tool calling to avoid custom API format issues
  - Focuses on generating well-formatted exercise text
- **Frontend updates**
  - Math Tutor agent shows GeoGebra panel
  - LaTeX formulas render beautifully
  - Collapsible answers using details/summary tags

### 2025-10-19 - Multi-Agent Architecture Implementation
- **Created multi-agent system** with AgentOrchestrator pattern
  - Base `Agent` class with standard interface (`chat()`, `getConfig()`)
  - Agent registry and orchestration in `agent-orchestrator.ts`
  - Three specialized agents:
    1. **GeoGebra Agent** (`geogebra-agent.ts`) - Math visualization with 7 tools
    2. **Step Solver Agent** (`step-solver-agent.ts`) - Problem decomposition (text-only)
    3. **Concept Explainer Agent** (`concept-explainer-agent.ts`) - Concept explanation (text-only)
- **Frontend agent selector**
  - `AgentSelector` component with visual card-based UI
  - Zustand store integration for agent selection state
  - API service updated to pass `agentId` parameter
  - Dynamic placeholder text based on selected agent
- **API updates**
  - New endpoint: `GET /api/chat/agents` returns available agents
  - Modified `POST /api/chat/message` accepts `agentId` parameter
  - Agent-specific responses (GeoGebra objects only for GeoGebra agent)
- **Architecture benefits**
  - Clean separation of concerns (each agent has specific expertise)
  - Easy to add new agents (just extend base class and register)
  - Maintains LangChain 1.0 compatibility with custom loop

### 2025-10-19 - LangChain 1.0 Integration
- **Upgraded to LangChain 1.0.0-alpha.8** with hybrid architecture:
  - Uses LangChain.js for model interface (`ChatOpenAI`, `ChatAnthropic`)
  - Implemented **manual agent loop** for custom OpenAI-compatible API compatibility
  - Custom API (http://185.183.98.135:3000) doesn't support native tool calling
  - Solution: Manually check `tool_calls` in responses and execute tools via loop
- **Architecture Decision**: Hybrid approach balances modern framework with custom API needs
  - LangChain handles model communication and tool schema
  - Custom loop in `chat.ts` handles multi-turn tool execution (max 5 iterations)
  - Maintains compatibility with both standard OpenAI API and custom endpoints

### 2025-10-19 - Initial Replit Setup
  - Configured Vite to use port 5000 with host 0.0.0.0
  - Added allowedHosts: true configuration for Replit proxy support
  - Created workflow to run both frontend and backend in development
  - Updated server to serve static files in production mode
  - Configured production server to use port 5000 when NODE_ENV=production
  - Configured deployment settings for autoscale deployment with proper production build

## User Preferences
None documented yet.

## Deployment
Deployment is configured for Replit's autoscale deployment:
- Build command: `npm run build` (builds both server and client)
- Run command: Starts the Express server in production mode with `NODE_ENV=production`
- The server serves both the API backend and the built frontend on port 5000
- The application will be publicly accessible via Replit deployment URL
