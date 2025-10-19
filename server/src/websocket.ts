import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import logger from './utils/logger';

interface Client {
  id: string;
  ws: WebSocket;
}

const clients = new Map<string, Client>();

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    const clientId = uuidv4();
    clients.set(clientId, { id: clientId, ws });
    
    logger.info(`WebSocket 客户端连接: ${clientId}`);

    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString(),
    }));

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        logger.debug('收到 WebSocket 消息', message);

        // 处理不同类型的消息
        handleWebSocketMessage(clientId, message);
      } catch (error) {
        logger.error('WebSocket 消息处理失败', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : '未知错误',
        }));
      }
    });

    ws.on('close', () => {
      logger.info(`WebSocket 客户端断开: ${clientId}`);
      clients.delete(clientId);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket 错误: ${clientId}`, error);
    });
  });
}

function handleWebSocketMessage(clientId: string, message: any) {
  const client = clients.get(clientId);
  if (!client) {
    return;
  }

  // 根据消息类型处理
  switch (message.type) {
    case 'ping':
      client.ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString(),
      }));
      break;

    default:
      logger.warn(`未知的 WebSocket 消息类型: ${message.type}`);
  }
}

// 广播消息给所有客户端
export function broadcast(message: any) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

// 发送消息给特定客户端
export function sendToClient(clientId: string, message: any) {
  const client = clients.get(clientId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

