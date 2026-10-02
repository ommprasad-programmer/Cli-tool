import { AgentRegistry } from '../agents/agent-registry.js';
import { AgentStatus } from '../agents/agent.js';

export class ResourceGovernor {
  private static MAX_CONCURRENT_AGENTS = 5;

  /**
   * Scans the registry for actively hot agents to prevent host CPU explosion.
   * Enforces a hard global ceiling.
   */
  static checkConcurrency(): void {
    const registry = AgentRegistry.getInstance();
    const activeStatuses: AgentStatus[] = ['CREATING', 'STARTING', 'RUNNING', 'THINKING'];
    
    const activeCount = registry.list().filter(a => activeStatuses.includes(a.status)).length;

    if (activeCount >= ResourceGovernor.MAX_CONCURRENT_AGENTS) {
      throw new Error(`Concurrency limit reached: Max ${ResourceGovernor.MAX_CONCURRENT_AGENTS} active computing agents allowed globally.`);
    }
  }
}
