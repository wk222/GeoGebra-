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
│   │   ├── routes/      # API routes (chat, geogebra, config)
│   │   ├── services/    # AI and GeoGebra services
│   │   ├── utils/       # Logger and utilities
│   │   └── index.ts     # Server entry point (port 3001)
└── package.json         # Root workspace configuration
```

## Replit Configuration

### Ports

**Development:**
- **Frontend (Vite)**: Port 5000 (configured for Replit webview)
  - Host: 0.0.0.0
  - AllowedHosts: ['all'] to support Replit proxy
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
- OpenAI SDK
- Anthropic SDK
- Puppeteer (for GeoGebra automation)
- WebSocket (real-time communication)
- Winston (logging)

## Features
- AI-powered math tutoring with OpenAI GPT or Anthropic Claude
- Real-time GeoGebra visualization
- Natural language interface for creating mathematical diagrams
- Session management
- Export GeoGebra graphics as PNG
- Support for points, lines, circles, polygons, functions, and custom commands

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
- **2025-10-19**: Initial Replit setup
  - Configured Vite to use port 5000 with host 0.0.0.0
  - Added allowedHosts configuration for Replit proxy support
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
