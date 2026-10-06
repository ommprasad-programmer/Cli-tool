import { AgentManifest } from '../agent-manifest.js';

export const aiderPreset: AgentManifest = {
  id: 'aider',
  name: 'Aider',
  command: 'aider',
  execution: {
    mode: 'headless',
    promptFlag: '--message',
    modelFlag: '--model'
  },
  capabilities: {
    interactive: true,
    headless: true,
    streaming: false,
    jsonOutput: false,
    modelSelection: true,
    sessionResume: true
  }
};
