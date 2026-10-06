import { TmuxManager } from '../tmux/tmux-manager.js';
import { Agent } from '../agents/agent.js';
import { EventBus } from '../events/event-bus.js';
import { AgentRegistry } from '../agents/agent-registry.js';
import { AgentAdapter, AgentStartOptions } from '../agents/agent-adapter.js';
import { GenericCliAdapter } from '../agents/adapters/generic-cli-adapter.js';
import { AgentDiscovery } from '../agents/agent-discovery.js';

export interface AgentRunner {
  start(agent: Agent, adapter?: AgentAdapter, startOptions?: Partial<AgentStartOptions>): Promise<void>;
  stop(agent: Agent, adapter?: AgentAdapter): Promise<void>;
}

export class ShellAgentRunner implements AgentRunner {
  private registry = AgentRegistry.getInstance();
  private eventBus = EventBus.getInstance();

  async start(agent: Agent, adapter?: AgentAdapter, startOptions?: Partial<AgentStartOptions>): Promise<void> {
    const tmuxManager = new TmuxManager(agent.projectId);
    
    if (adapter) {
       // Proceed using Universal Agent Runtime Adapter
       this.registry.update(agent.id, { status: 'RUNNING' });
       this.eventBus.emit('agent.status', agent.id, 'RUNNING');
   
       await adapter.start({
          agent,
          cwd: agent.worktree,
          prompt: agent.task,
          ...startOptions
       });
    } else {
       // Legacy Fallback to primitive GHOSTFLEET_AGENT_COMMAND
       const cmd = process.env.GHOSTFLEET_AGENT_COMMAND;
       
       if (cmd) {
         this.registry.update(agent.id, { status: 'RUNNING' });
         this.eventBus.emit('agent.status', agent.id, 'RUNNING');

         const safeTask = agent.task.replace(/"/g, '\\"');
         const executeStr = `${cmd} "${safeTask}"; echo "GHOSTFLEET_EXIT_CODE=$?"`;
         await tmuxManager.sendKeys(agent.tmuxSession, executeStr, true);
       } else {
         this.registry.update(agent.id, { status: 'WAITING' });
         this.eventBus.emit('agent.status', agent.id, 'WAITING');

         await tmuxManager.sendKeys(agent.tmuxSession, `echo "No AI agent command configured."`, true);
         await tmuxManager.sendKeys(agent.tmuxSession, `echo "Agent is waiting in the isolated worktree."`, true);
       }
    }
  }

  async stop(agent: Agent, adapter?: AgentAdapter): Promise<void> {
    if (adapter) {
       await adapter.stop({ agent });
    } else {
       const tmuxManager = new TmuxManager(agent.projectId);
       await tmuxManager.sendKeys(agent.tmuxSession, 'C-c', false);
    }
  }
}
