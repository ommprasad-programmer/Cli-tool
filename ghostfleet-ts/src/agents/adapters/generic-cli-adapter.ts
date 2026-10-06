import { AgentAdapter, AgentStartOptions, AgentStopOptions } from '../agent-adapter.js';
import { AgentManifest } from '../agent-manifest.js';
import { AgentCapabilities } from '../capabilities.js';
import { AgentHealth } from '../health-check.js';
import { CommandExecutor } from '../../utils/exec.js';
import { TmuxManager } from '../../tmux/tmux-manager.js';

export class GenericCliAdapter implements AgentAdapter {
  constructor(private manifest: AgentManifest) {}

  get id() { return this.manifest.id; }
  get name() { return this.manifest.name; }

  async detect(): Promise<boolean> {
    try {
      // Use command -v to check if binary exists in PATH safely using args array
      const result = await CommandExecutor.run('command', ['-v', this.manifest.command]);
      return result.stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  async getVersion(): Promise<string | null> {
    try {
      const res = await CommandExecutor.run(this.manifest.command, ['--version']);
      return res.stdout.trim() || null;
    } catch {
      return null;
    }
  }

  async getCapabilities(): Promise<AgentCapabilities> {
    return this.manifest.capabilities;
  }

  async healthCheck(): Promise<AgentHealth> {
    const isInstalled = await this.detect();
    if (!isInstalled) return AgentHealth.NOT_INSTALLED;
    
    // As long as it's installed and generic, we default to READY until more granular auth checks are possible
    return AgentHealth.READY; 
  }

  async start(options: AgentStartOptions): Promise<void> {
    const args: string[] = [];

    // Base command arguments mapped via provider config
    if (options.modelConfig && options.modelConfig.model && this.manifest.execution.modelFlag) {
      args.push(this.manifest.execution.modelFlag, options.modelConfig.model);
    }

    if (options.prompt && this.manifest.execution.promptFlag) {
      args.push(this.manifest.execution.promptFlag, options.prompt);
    }
    
    // Instead of constructing a raw shell string mapping `command "task"` directly natively which
    // opens up injection vulnerabilities over quotes/newlines natively, we utilize bash's argument escaping:
    const safeArgs = args.map(arg => this.escapeBashArg(arg));
    const executeStr = `${this.manifest.command} ${safeArgs.join(' ')}; echo "GHOSTFLEET_EXIT_CODE=$?"`;
    
    const tmuxManager = new TmuxManager(options.agent.projectId);
    await tmuxManager.sendKeys(options.agent.tmuxSession, executeStr, true);
  }

  async stop(options: AgentStopOptions): Promise<void> {
    const tmuxManager = new TmuxManager(options.agent.projectId);
    await tmuxManager.sendKeys(options.agent.tmuxSession, 'C-c', false);
  }

  private escapeBashArg(arg: string): string {
    // Escaping algorithm to handle newlines, quotes natively for a bash input stream securely.
    // Replace single quotes with '"'"' and wrap the entire arg in single quotes
    return `'${arg.replace(/'/g, "'\"'\"'")}'`;
  }
}
