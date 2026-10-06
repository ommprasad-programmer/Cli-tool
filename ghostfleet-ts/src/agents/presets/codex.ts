import { AgentManifest } from '../agent-manifest.js';

export const codexPreset: AgentManifest = {
  id: 'codex',
  name: 'Codex CLI',
  command: 'codex',
  execution: {
    mode: 'headless',
    promptFlag: 'exec'
  },
  capabilities: {
    interactive: false,
    headless: true,
    streaming: false,
    jsonOutput: false,
    modelSelection: false,
    sessionResume: false
  }
};
