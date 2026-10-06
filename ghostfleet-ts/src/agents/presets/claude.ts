import { AgentManifest } from '../agent-manifest.js';

export const claudePreset: AgentManifest = {
  id: 'claude',
  name: 'Claude Code',
  command: 'claude',
  execution: {
    mode: 'headless',
    promptFlag: '-p',
  },
  capabilities: {
    interactive: true,
    headless: true,
    streaming: true,
    jsonOutput: false,
    modelSelection: false,
    sessionResume: true
  }
};
