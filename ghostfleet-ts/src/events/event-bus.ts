import { EventEmitter } from 'node:events';
import { Agent, AgentStatus } from '../agents/agent.js';
import { Project } from '../core/project-manager.js';

export interface SystemEvents {
  'agent.spawned': (agent: Agent) => void;
  'agent.status': (agentId: string, status: AgentStatus) => void;
  'agent.terminated': (agentId: string) => void;
  'project.added': (project: Project) => void;
}

export class EventBus {
  private static instance: EventBus;
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  emit<K extends keyof SystemEvents>(event: K, ...args: Parameters<SystemEvents[K]>): boolean {
    return this.emitter.emit(event, ...args);
  }

  on<K extends keyof SystemEvents>(event: K, listener: SystemEvents[K]): this {
    this.emitter.on(event, listener as any);
    return this;
  }

  off<K extends keyof SystemEvents>(event: K, listener: SystemEvents[K]): this {
    this.emitter.off(event, listener as any);
    return this;
  }
}
