import { AgentCapabilities } from './capabilities.js';
import { AgentHealth } from './health-check.js';
import { Agent } from './agent.js';

export interface AgentModelConfig {
  provider?: string;
  model?: string;
  baseUrl?: string;
  apiKeyEnv?: string;
}

export interface AgentStartOptions {
  agent: Agent;
  cwd: string;
  env?: Record<string, string>;
  modelConfig?: AgentModelConfig;
  prompt?: string;
}

export interface AgentStopOptions {
  agent: Agent;
}

export interface AgentAdapter {
  readonly id: string;
  readonly name: string;

  detect(): Promise<boolean>;
  getVersion(): Promise<string | null>;
  getCapabilities(): Promise<AgentCapabilities>;
  healthCheck(): Promise<AgentHealth>;
  
  start(options: AgentStartOptions): Promise<void>;
  stop(options: AgentStopOptions): Promise<void>;
}
