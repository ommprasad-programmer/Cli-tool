import express from 'express';
import { createServer, Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { AgentManager } from '../core/agent-manager.js';
import { AgentRegistry } from '../agents/agent-registry.js';
import { EventBus } from '../events/event-bus.js';

export class MCPServer {
  private app: express.Application;
  private port: number;
  private httpServer: Server;
  private wss: WebSocketServer;

  constructor(port = 3000) {
    this.app = express();
    this.port = port;
    this.httpServer = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.httpServer });
    
    this.setupRoutes();
    this.setupWebSockets();
  }

  private setupWebSockets() {
    const eventBus = EventBus.getInstance();
    
    this.wss.on('connection', (ws: WebSocket) => {
      ws.send(JSON.stringify({ type: 'connected', message: 'GhostFleet WSS ready' }));
    });

    const broadcast = (type: string, payload: any) => {
      const msg = JSON.stringify({ type, payload });
      for (const client of this.wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(msg);
        }
      }
    };

    eventBus.on('agent.spawned', (agent) => broadcast('agent.spawned', agent));
    eventBus.on('agent.status', (id, status) => broadcast('agent.status', { id, status }));
    eventBus.on('agent.terminated', (id) => broadcast('agent.terminated', { id }));
  }

  private setupRoutes() {
    this.app.use(express.json());

    const agentManager = new AgentManager();
    const registry = AgentRegistry.getInstance();

    this.app.post('/spawn', async (req, res) => {
      try {
        const { project, task, role, parentId } = req.body;
        if (!project || !task) {
          return res.status(400).json({ error: 'project and task are required keys' });
        }
        const agent = await agentManager.spawnAgent(project, task, { role, parentId });
        res.json({ agent });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    this.app.get('/status/:agentId', (req, res) => {
      const agent = registry.get(req.params.agentId);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json({ status: agent.status, task: agent.task });
    });
  }

  start() {
    this.httpServer.listen(this.port, () => {
      console.log(`🚀 GhostFleet Local MCP Server & WSS running on http://localhost:${this.port}`);
    });
  }
}
