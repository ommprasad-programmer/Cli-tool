#!/usr/bin/env node
import { Command } from 'commander';
import { CommandExecutor } from '../utils/exec.js';
import { ConfigManager } from '../config/config-manager.js';
import { ProjectManager } from '../core/project-manager.js';
import { AgentManager } from '../core/agent-manager.js';
import { AgentRegistry } from '../agents/agent-registry.js';

const program = new Command();
program
  .name('ghostfleet')
  .description('GhostFleet TypeScript Control Plane')
  .version('1.0.0');

// Initialize config before any command
import { StateManager } from '../state/state-manager.js';

program.hook('preAction', async () => {
  const config = new ConfigManager();
  await config.initialize();

  const stateManager = new StateManager();
  await stateManager.load();
  stateManager.startListening();
});

program
  .command('spawn')
  .description('Spawn an AI agent in a new isolated git worktree / tmux session')
  .requiredOption('-p, --project <nameOrId>', 'Target project name or ID')
  .requiredOption('-t, --task <task>', 'Initial task prompt')
  .action(async (options) => {
    try {
      const am = new AgentManager();
      const agent = await am.spawnAgent(options.project, options.task);
      console.log(`✅ Agent spawned successfully: ID ${agent.id}`);
      console.log(`- Project: ${agent.projectId}`);
      console.log(`- Worktree path: ${agent.worktree}`);
      console.log(`- Tmux Session: ${agent.tmuxSession}`);
      console.log(`- Status: ${agent.status}`);
    } catch (e: any) {
      console.error(`❌ Error spawning agent: ${e.message}`);
      process.exit(1);
    }
  });

const agentCmd = program.command('agent').description('Manage active AI agents');

agentCmd
  .command('send <agentId> <message>')
  .description('Send keystrokes to an agent session')
  .action(async (agentId, message) => {
    try {
      const am = new AgentManager();
      // Emulate appending a newline for executing commands generically here
      await am.send(agentId, message + '\\n');
      console.log(`✅ Sent input to agent ${agentId}`);
    } catch (e: any) {
      console.error(`❌ Error: ${e.message}`);
      process.exit(1);
    }
  });

agentCmd
  .command('read <agentId>')
  .description('Read recent output from an agent session')
  .option('-l, --lines <number>', 'Number of lines to read', '50')
  .action(async (agentId, options) => {
    try {
      const am = new AgentManager();
      const output = await am.read(agentId, parseInt(options.lines, 10));
      console.log(output);
    } catch (e: any) {
      console.error(`❌ Error: ${e.message}`);
      process.exit(1);
    }
  });

agentCmd
  .command('pause <agentId>')
  .description('Pause agent execution (sends Ctrl-Z)')
  .action(async (agentId) => {
    try {
      const am = new AgentManager();
      await am.pause(agentId);
      console.log(`✅ Agent ${agentId} paused`);
    } catch (e: any) {
      console.error(`❌ Error: ${e.message}`);
    }
  });

agentCmd
  .command('resume <agentId>')
  .description('Resume agent execution (sends fg)')
  .action(async (agentId) => {
    try {
      const am = new AgentManager();
      await am.resume(agentId);
      console.log(`✅ Agent ${agentId} resumed`);
    } catch (e: any) {
      console.error(`❌ Error: ${e.message}`);
    }
  });

agentCmd
  .command('terminate <agentId>')
  .description('Terminate agent, clearing tmux session, worktree, and branch')
  .action(async (agentId) => {
    try {
      const am = new AgentManager();
      await am.terminate(agentId);
      console.log(`✅ Agent ${agentId} terminated cleanly`);
    } catch (e: any) {
      console.error(`❌ Error termingating agent: ${e.message}`);
    }
  });

program
  .command('cleanup')
  .description('Garbage collect all orphaned worktrees & branches')
  .action(async () => {
    try {
      const am = new AgentManager();
      console.log('Initiating sweep for orphaned environments...');
      await am.cleanupOrphans();
      console.log('✅ Cleanup complete.');
    } catch (e: any) {
      console.error(`❌ Cleanup failed: ${e.message}`);
      process.exit(1);
    }
  });

import { MCPServer } from '../mcp/mcp-server.js';
program
  .command('server')
  .description('Launch the local GhostFleet REST API server')
  .option('-p, --port <number>', 'Port to listen on', '3000')
  .action((options) => {
    try {
      const server = new MCPServer(parseInt(options.port, 10));
      server.start();
    } catch (e: any) {
      console.error(`❌ Error starting MCP Server: ${e.message}`);
      process.exit(1);
    }
  });

program
  .command('dashboard')
  .description('Launch real-time text-based TUI to monitor fleet')
  .action(() => {
    try {
      const am = new AgentManager();
      const registry = AgentRegistry.getInstance();

      console.clear();
      console.log('Starting GhostFleet Dashboard...');

      setInterval(async () => {
        const agents = registry.list();
        
        // Autonomously invoke pane analysis on active agents
        for (const agent of agents) {
          if (agent.status === 'RUNNING' || agent.status === 'STARTING' || agent.status === 'IDLE') {
            await am.analyzePane(agent.id).catch(() => {});
          }
        }

        const updated = registry.list().map(a => ({
          ID: a.id,
          Project: a.projectId,
          Status: a.status,
          Task: a.task.length > 30 ? a.task.slice(0, 27) + '...' : a.task
        }));

        console.clear();
        console.log('====================================');
        console.log('       GHOSTFLEET DASHBOARD         ');
        console.log('====================================');
        
        if (updated.length === 0) {
          console.log('\\n   No active agents.\\n');
        } else {
          console.table(updated);
        }
        console.log('\\nPress Ctrl+C to exit.');
      }, 2000);
      
    } catch (e: any) {
      console.error(`❌ Error starting dashboard: ${e.message}`);
      process.exit(1);
    }
  });

const projectCmd = program.command('project').description('Manage GhostFleet projects');

projectCmd
  .command('add <path> [name]')
  .description('Register a new project repository')
  .action(async (path, name) => {
    try {
      const pm = new ProjectManager();
      const proj = await pm.add(path, name);
      console.log(`✅ Project added: ${proj.name} [ID: ${proj.id}]`);
    } catch (e: any) {
      console.error(`❌ Error: ${e.message}`);
      process.exit(1);
    }
  });

projectCmd
  .command('list')
  .description('List registered projects')
  .action(async () => {
    const pm = new ProjectManager();
    const list = await pm.list();
    if (list.length === 0) {
      console.log('No projects registered.');
      return;
    }
    console.table(list.map(p => ({ ID: p.id, Name: p.name, Path: p.repositoryPath })));
  });

projectCmd
  .command('remove <nameOrId>')
  .description('Remove a project by name or ID')
  .action(async (nameOrId) => {
    try {
      const pm = new ProjectManager();
      await pm.remove(nameOrId);
      console.log(`✅ Project '${nameOrId}' removed.`);
    } catch (e: any) {
      console.error(`❌ Error: ${e.message}`);
      process.exit(1);
    }
  });

// Keep legacy checks as a 'check' command
program
  .command('check')
  .description('Run dependency checks (Phase 2 test)')
  .action(async () => {
    try {
      const gitStatus = await CommandExecutor.run('git', ['--version']);
      console.log(`✅ Git OK: ${gitStatus.stdout}`);

      const tmuxStatus = await CommandExecutor.run('tmux', ['-V']);
      console.log(`✅ Tmux OK: ${tmuxStatus.stdout}`);
    } catch (error: any) {
      if (error.message.includes('ENOENT')) {
        console.error(`⚠️  Dependency missing (not installed in this container): ${error.message}`);
      } else {
        console.error(`❌ Dependency test failed: ${error.message}`);
        process.exit(1);
      }
    }
  });

program.parseAsync(process.argv);
