import { Agent } from './agent.js';

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, Agent> = new Map();

  /**
   * Access the central in-memory registry. (Singleton ensures state is pinned per-process).
   * Later this can be refactored to read/write from a persistence store if needed.
   */
  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Registers a newly constructed agent into the memory pool.
   */
  register(agent: Agent): void {
    if (this.exists(agent.id)) {
      throw new Error(`Agent with ID ${agent.id} already exists`);
    }
    // Store a shallow copy to prevent external mutation leaks
    this.agents.set(agent.id, { ...agent });
  }

  /**
   * Removes an agent from the registry completely.
   */
  unregister(agentId: string): void {
    this.agents.delete(agentId);
  }

  /**
   * Retrieves an agent. Returns a clone of the data to maintain immutability.
   */
  get(agentId: string): Agent | undefined {
    const agent = this.agents.get(agentId);
    return agent ? { ...agent } : undefined;
  }

  /**
   * Lists all agents. Optionally filters rigidly by project ID.
   */
  list(projectId?: string): Agent[] {
    const all = Array.from(this.agents.values()).map(a => ({ ...a }));
    if (projectId) {
      return all.filter(a => a.projectId === projectId);
    }
    return all;
  }

  /**
   * Updates an existing agent safely using a partial payload.
   */
  update(agentId: string, partialAgent: Partial<Agent>): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    this.agents.set(agentId, { ...agent, ...partialAgent, updatedAt: Date.now() });
  }

  /**
   * Checks if an agent signature is tracked.
   */
  exists(agentId: string): boolean {
    return this.agents.has(agentId);
  }
}
