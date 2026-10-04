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
      await am.send(agentId, message);
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
  .action(async () => {
    try {
      const am = new AgentManager();
      const registry = AgentRegistry.getInstance();
      const readline = await import('node:readline');
      
      let selectedIndex = 0;
      let intervalId: any;

      const render = async () => {
        const agents = registry.list();
        if (selectedIndex >= agents.length) selectedIndex = Math.max(0, agents.length - 1);
        
        for (const agent of agents) {
          if (agent.status === 'RUNNING' || agent.status === 'STARTING' || agent.status === 'IDLE') {
            await am.analyzePane(agent.id).catch(() => {});
          }
        }
        
        const termWidth = process.stdout.columns || 80;
        const supportsUnicode = (process.env.LANG && process.env.LANG.includes('UTF-8')) || 
                                (process.env.LC_ALL && process.env.LC_ALL.includes('UTF-8')) || 
                                process.env.TERM?.includes('256color') || 
                                process.platform === 'darwin' || 
                                process.platform === 'win32';
        const emoji = supportsUnicode ? '🧸' : '';
        
        console.clear();

        if (termWidth >= 66) {
          console.log('\x1b[35m╭──────────────────────────────────────────────────────────────╮\x1b[0m');
          console.log('\x1b[35m│                                                              │\x1b[0m');
          console.log('\x1b[35m│  ██████╗  ██████╗  ██████╗ ██╗  ██╗██╗███████╗████████╗     │\x1b[0m');
          console.log('\x1b[35m│  ██╔══██╗██╔═══██╗██╔═══██╗██║ ██╔╝██║██╔════╝╚══██╔══╝     │\x1b[0m');
          console.log('\x1b[35m│  ██████╔╝██║   ██║██║   ██║█████╔╝ ██║█████╗     ██║        │\x1b[0m');
          console.log('\x1b[35m│  ██╔═══╝ ██║   ██║██║   ██║██╔═██╗ ██║██╔══╝     ██║        │\x1b[0m');
          console.log('\x1b[35m│  ██║     ╚██████╔╝╚██████╔╝██║  ██╗██║███████╗   ██║        │\x1b[0m');
          console.log('\x1b[35m│  ╚═╝      ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝   ╚═╝        │\x1b[0m');
          console.log('\x1b[35m│                                                              │\x1b[0m');
          if (supportsUnicode) {
            console.log('\x1b[35m│             🧸  Stack your pookies. Ship code.              │\x1b[0m');
          } else {
            console.log('\x1b[35m│                Stack your pookies. Ship code.                │\x1b[0m');
          }
          console.log('\x1b[35m│                                                              │\x1b[0m');
          console.log('\x1b[35m╰──────────────────────────────────────────────────────────────╯\x1b[0m');
        } else {
          console.log('\x1b[35m====================================\x1b[0m');
          console.log('\x1b[95m            POOKIESTACK             \x1b[0m');
          if (supportsUnicode) {
            console.log('\x1b[35m   🧸 Stack your pookies. Ship code. \x1b[0m');
          } else {
            console.log('\x1b[35m     Stack your pookies. Ship code.     \x1b[0m');
          }
          console.log('\x1b[35m====================================\x1b[0m');
        }

        console.log('\n   \x1b[95m✦ YOUR POOKIES\x1b[0m\n');
        
        if (agents.length === 0) {
          console.log('   \x1b[90mNo active pookies right now.\x1b[0m');
        }
        
        const cWidth = Math.min(Math.max(termWidth - 8, 40), 61);
        const truncate = (str: string, max: number) => str.length > max ? str.slice(0, max - 3) + '...' : str.padEnd(max);
        
        for (let i = 0; i < agents.length; i++) {
          const a = agents[i];
          const isSelected = i === selectedIndex;
          
          let color = '\x1b[90m'; 
          if (a.status === 'RUNNING') color = '\x1b[35m'; // lavender/purple
          else if (a.status === 'STARTING' || a.status === 'WAITING' || a.status === 'PERMISSION') color = '\x1b[36m'; // soft cyan
          else if (a.status === 'THINKING') color = '\x1b[95m'; // pink/magenta 
          else if (a.status === 'FAILED') color = '\x1b[31m'; // soft red
          else if (a.status === 'COMPLETED' || a.status === 'DONE') color = '\x1b[32m'; // soft green
          
          const highlightPrefix = isSelected ? '\x1b[95m>\x1b[0m' : ' ';
          const bLine = '─'.repeat(cWidth - 3);
          const icon = ['RUNNING','THINKING','STARTING'].includes(a.status) ? '●' : '◐';
          const innerW = cWidth - 6;

          console.log(` ${highlightPrefix} \x1b[35m╭─ ${color}${icon}\x1b[35m ${bLine}╮\x1b[0m`);
          
          const rawId = a.id;
          const statusText = a.status.padEnd(10);
          
          // Row 1: ID & Status
          const idSpace = innerW - rawId.length - statusText.length;
          console.log(`   \x1b[35m│  \x1b[0m${emoji}  ${rawId}${' '.repeat(Math.max(0, idSpace))}${color}${statusText}\x1b[0m\x1b[35m  │\x1b[0m`);
          // Row 2: Default Details
          console.log(`   \x1b[35m│      \x1b[90m${truncate('Agent Model', innerW - 4)}\x1b[35m  │\x1b[0m`);
          // Row 3: Task
          console.log(`   \x1b[35m│      \x1b[0m${truncate(a.task.replace(/\\n/g, ' '), innerW - 4)}\x1b[35m  │\x1b[0m`);
          
          console.log(`   \x1b[35m╰${'─'.repeat(cWidth + 1)}╯\x1b[0m`);
          console.log('');
        }

        // Live Log viewing
        if (agents.length > 0 && selectedIndex < agents.length) {
           const sa = agents[selectedIndex];
           const activityW = Math.min(termWidth - 2, 62);
           const pLine = '─'.repeat(activityW - 2);
           const innW = activityW - 4;
           
           console.log(`\x1b[35m┌${pLine}┐\x1b[0m`);
           console.log(`\x1b[35m│  \x1b[95mPOOKIE ACTIVITY${' '.repeat(Math.max(0, innW - 15))}\x1b[35m│\x1b[0m`);
           console.log(`\x1b[35m│${' '.repeat(Math.max(0, activityW - 2))}│\x1b[0m`);
           console.log(`\x1b[35m│  \x1b[95m✦ \x1b[0m${sa.id}${' '.repeat(Math.max(0, innW - 3 - sa.id.length))} \x1b[35m│\x1b[0m`);
           
           try {
              const logs = await am.read(sa.id, 5);
              let rawLines = logs.split('\\n').map(l => l.replace(/\\u001b\\[[0-9;]*m/g, '').trim()).filter(l => l !== '');
              rawLines = rawLines.slice(Math.max(rawLines.length - 3, 0));
              for(const l of rawLines) {
                 const trunc = '*' + (l.length > innW - 7 ? l.substring(0, innW - 10) + '...' : l);
                 console.log(`\x1b[35m│    \x1b[90m└─ ${trunc.padEnd(innW - 7)} \x1b[35m│\x1b[0m`);
              }
              if (rawLines.length === 0) {
                 console.log(`\x1b[35m│    \x1b[90m└─ (Waiting for output)${' '.repeat(Math.max(0, innW - 27))} \x1b[35m│\x1b[0m`);
              }
           } catch(e) {
              console.log(`\x1b[35m│    \x1b[90m└─ (Connecting...)${' '.repeat(Math.max(0, innW - 22))} \x1b[35m│\x1b[0m`);
           }
           console.log(`\x1b[35m│${' '.repeat(Math.max(0, activityW - 2))}│\x1b[0m`); 
           console.log(`\x1b[35m└${pLine}┘\x1b[0m`);
        }

        console.log('\n\x1b[90m[↑/↓] Navigate  [P] Pause  [R] Resume  [T] Terminate  [Ctrl+C] Exit\x1b[0m');
      };

      if (process.stdin.isTTY) {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', async (str: string, key: any) => {
          if (key.ctrl && key.name === 'c') {
            process.exit(0);
          }
          const agents = registry.list();
          if (key.name === 'up') {
            selectedIndex = Math.max(0, selectedIndex - 1);
            await render();
          } else if (key.name === 'down') {
            selectedIndex = Math.min(agents.length - 1, selectedIndex + 1);
            await render();
          }
          
          const sa = agents[selectedIndex];
          if (sa) {
            if (key.name === 'p') {
              await am.pause(sa.id).catch(() => {});
              await render();
            } else if (key.name === 'r') {
               await am.resume(sa.id).catch(() => {});
               await render();
            } else if (key.name === 't') {
               await am.terminate(sa.id).catch(() => {});
               selectedIndex = 0;
               await render();
            }
          }
        });
      }

      console.clear();
      console.log('Starting PookieStack UI...');
      intervalId = setInterval(render, 2000);
      render(); // initial render
      
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
