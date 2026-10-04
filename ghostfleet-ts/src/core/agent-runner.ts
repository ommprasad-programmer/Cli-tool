import { TmuxManager } from '../tmux/tmux-manager.js';
import { Agent } from '../agents/agent.js';
import { EventBus } from '../events/event-bus.js';
import { AgentRegistry } from '../agents/agent-registry.js';

export interface AgentRunner {
  start(agent: Agent): Promise<void>;
  stop(agent: Agent): Promise<void>;
}

export class ShellAgentRunner implements AgentRunner {
  private registry = AgentRegistry.getInstance();
  private eventBus = EventBus.getInstance();

  async start(agent: Agent): Promise<void> {
    const tmuxManager = new TmuxManager(agent.projectId);
    const cmd = process.env.GHOSTFLEET_AGENT_COMMAND;
    
    if (cmd) {
      // Process correctly launched, transition into RUNNING context implicitly
      this.registry.update(agent.id, { status: 'RUNNING' });
      this.eventBus.emit('agent.status', agent.id, 'RUNNING');

      const safeTask = agent.task.replace(/"/g, '\\"');
      // Append tracking token to gracefully monitor script completion within analyzePane safely
      const executeStr = `${cmd} "${safeTask}"; echo "GHOSTFLEET_EXIT_CODE=$?"`;
      await tmuxManager.sendKeys(agent.tmuxSession, executeStr, true);
    } else {
      // Fallback explicitly prevents pretending process ran safely gating to WAIT
      this.registry.update(agent.id, { status: 'WAITING' });
      this.eventBus.emit('agent.status', agent.id, 'WAITING');

      await tmuxManager.sendKeys(agent.tmuxSession, `echo "No AI agent command configured."`, true);
      await tmuxManager.sendKeys(agent.tmuxSession, `echo "Agent is waiting in the isolated worktree."`, true);
    }
  }

  async stop(agent: Agent): Promise<void> {
    const tmuxManager = new TmuxManager(agent.projectId);
    // Transmit C-c to SIGINT the underlying running agent command logically returning control to bash
    await tmuxManager.sendKeys(agent.tmuxSession, 'C-c', false);
  }
}
