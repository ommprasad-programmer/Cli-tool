import { join } from 'node:path';
import { symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

import { ProjectManager } from './project-manager.js';
import { WorktreeManager } from '../git/worktree-manager.js';
import { GitManager } from '../git/git-manager.js';
import { TmuxManager } from '../tmux/tmux-manager.js';
import { AgentRegistry } from '../agents/agent-registry.js';
import { Agent } from '../agents/agent.js';
import { EventBus } from '../events/event-bus.js';
import { ResourceGovernor } from './resource-governor.js';

export class AgentManager {
  private projectManager: ProjectManager;
  private registry: AgentRegistry;
  private eventBus: EventBus;

  constructor() {
    this.projectManager = new ProjectManager();
    this.registry = AgentRegistry.getInstance();
    this.eventBus = EventBus.getInstance();
  }

  async spawnAgent(projectNameOrId: string, task: string, options?: { role?: 'LEAD' | 'WORKER'; parentId?: string; }): Promise<Agent> {
    ResourceGovernor.checkConcurrency();

    const projects = await this.projectManager.list();
    const project = projects.find(p => p.id === projectNameOrId || p.name === projectNameOrId);
    
    if (!project) {
      throw new Error(`Project ${projectNameOrId} not found`);
    }

    const agentId = randomUUID().slice(0, 8);
    const branchName = `agent-${agentId}`;

    const worktreeManager = new WorktreeManager(project.repositoryPath);
    const tmuxManager = new TmuxManager(project.id);
    
    const worktreePath = await worktreeManager.create(agentId, branchName);

    const sourceNodeModules = join(project.repositoryPath, 'node_modules');
    const destNodeModules = join(worktreePath, 'node_modules');
    if (existsSync(sourceNodeModules) && !existsSync(destNodeModules)) {
      await symlink(sourceNodeModules, destNodeModules, 'junction');
    }

    const tmuxSession = `cf-${project.id}-${agentId}`;
    
    let agent: Agent = {
      id: agentId,
      projectId: project.id,
      task,
      branch: branchName,
      worktree: worktreePath,
      tmuxServer: `cf-${project.id}`,
      tmuxSession: tmuxSession,
      status: 'CREATING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      role: options?.role || 'WORKER',
      parentId: options?.parentId
    };
    
    this.registry.register(agent);

    this.registry.update(agent.id, { status: 'STARTING' });
    this.eventBus.emit('agent.status', agent.id, 'STARTING');
    
    await tmuxManager.createServer();
    await tmuxManager.createSession(tmuxSession, worktreePath);

    const safeTask = task.replace(/"/g, '\\"');
    await tmuxManager.sendKeys(tmuxSession, `echo 'Spawning targeted AI Agent workflow for task: "${safeTask}"'\\n`);

    this.registry.update(agent.id, { status: 'IDLE' });
    this.eventBus.emit('agent.status', agent.id, 'IDLE');

    agent = this.registry.get(agent.id)!;
    this.eventBus.emit('agent.spawned', agent);
    return agent;
  }

  async send(agentId: string, input: string): Promise<void> {
    const agent = this.registry.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    const tmuxManager = new TmuxManager(agent.projectId);
    await tmuxManager.sendKeys(agent.tmuxSession, input);
  }

  async read(agentId: string, linesCount: number = 50): Promise<string> {
    const agent = this.registry.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    const tmuxManager = new TmuxManager(agent.projectId);
    return tmuxManager.capturePane(agent.tmuxSession, linesCount);
  }

  async pause(agentId: string): Promise<void> {
    const agent = this.registry.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    const tmuxManager = new TmuxManager(agent.projectId);
    await tmuxManager.sendKeys(agent.tmuxSession, 'C-z');
    
    this.registry.update(agent.id, { status: 'PAUSED' });
    this.eventBus.emit('agent.status', agent.id, 'PAUSED');
  }

  async resume(agentId: string): Promise<void> {
    const agent = this.registry.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    const tmuxManager = new TmuxManager(agent.projectId);
    await tmuxManager.sendKeys(agent.tmuxSession, 'fg\\n');
    
    this.registry.update(agent.id, { status: 'RUNNING' });
    this.eventBus.emit('agent.status', agent.id, 'RUNNING');
  }

  async analyzePane(agentId: string): Promise<void> {
    const output = await this.read(agentId, 10);
    const agent = this.registry.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    const lines = output.split('\\n');
    let needsPermission = false;
    let isDone = false;

    // Simple heuristic for Claude Code prompts or generic bash confirmations
    for (const line of lines) {
      if (line.includes('? ') || line.trim().endsWith('(Y/n)') || line.trim().endsWith('(y/N)')) {
        needsPermission = true;
      }
      if (line.includes('Task completed') || (line.includes('Done') && agent.status !== 'DONE')) {
        isDone = true;
      }
    }

    if (needsPermission && agent.status !== 'PERMISSION') {
      this.registry.update(agent.id, { status: 'PERMISSION' });
      this.eventBus.emit('agent.status', agent.id, 'PERMISSION');
    } else if (isDone && agent.status !== 'DONE') {
      this.registry.update(agent.id, { status: 'DONE' });
      this.eventBus.emit('agent.status', agent.id, 'DONE');
    }
  }

  async terminate(agentId: string): Promise<void> {
    const agent = this.registry.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    const projects = await this.projectManager.list();
    const project = projects.find(p => p.id === agent.projectId);
    if (!project) throw new Error(`Parent project ${agent.projectId} missing`);

    const tmuxManager = new TmuxManager(agent.projectId);
    await tmuxManager.killSession(agent.tmuxSession).catch(console.error);

    const worktreeManager = new WorktreeManager(project.repositoryPath);
    await worktreeManager.remove(agent.worktree, true).catch(console.error);

    const gitManager = new GitManager(project.repositoryPath);
    await gitManager.deleteBranch(agent.branch, true).catch(console.error);

    this.registry.unregister(agent.id);
    this.eventBus.emit('agent.terminated', agent.id);
  }

  async cleanupOrphans(): Promise<void> {
    const projects = await this.projectManager.list();
    const activeAgents = new Set(this.registry.list().map(a => a.id));

    for (const project of projects) {
      const worktreeManager = new WorktreeManager(project.repositoryPath);
      const gitManager = new GitManager(project.repositoryPath);
      
      const worktrees = await worktreeManager.list().catch(() => []);
      
      for (const wt of worktrees) {
        // Our naming convention maps paths matching `worktree-agent-<id>`
        const parts = wt.split('worktree-agent-');
        if (parts.length > 1) {
          const agentId = parts[1]!.trim().split('/')[0]!;
          if (!activeAgents.has(agentId)) {
            console.log(`🧹 Cleaning up orphaned worktree for agent ${agentId}...`);
            await worktreeManager.remove(wt, true).catch(() => {});
            await gitManager.deleteBranch(`agent-${agentId}`, true).catch(() => {});
          }
        }
      }
    }
  }
}
