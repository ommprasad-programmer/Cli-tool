import { AgentManifest } from '../agent-manifest.js';

export const genericPresets = [
  {
    id: 'gemini',
    name: 'Gemini CLI',
    command: 'gemini',
    execution: { mode: 'headless', promptFlag: '-p' }
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    execution: { mode: 'headless', promptFlag: 'run' }
  },
  {
    id: 'goose',
    name: 'Goose',
    command: 'goose',
    execution: { mode: 'headless', promptFlag: '--prompt' }
  }
].map(p => ({
  ...p,
  capabilities: {
    interactive: true,
    headless: true,
    streaming: false,
    jsonOutput: false,
    modelSelection: false,
    sessionResume: false
  }
} as AgentManifest));
