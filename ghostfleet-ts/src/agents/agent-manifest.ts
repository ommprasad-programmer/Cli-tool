import { AgentCapabilities } from './capabilities.js';

export interface AgentExecutionConfig {
  mode: 'headless' | 'interactive';
  promptFlag?: string;
  modelFlag?: string;
}

export interface AgentManifest {
  id: string;
  name: string;
  command: string;
  execution: AgentExecutionConfig;
  capabilities: AgentCapabilities;
}
