# PookieStack (GhostFleet) - Architecture & System Flow

## Overview
PookieStack (also known as GhostFleet-TS) is a high-performance, modular AI agent orchestration system built entirely in **TypeScript/Node.js**. 
It orchestrates autonomous AI coding agents (such as Aider, Claude Engineer) safely on a local development machine by utilizing completely isolated, sandboxed environments. This ensures the agent cannot inadvertently break or corrupt the main project repository that developers are actively working on.

## Core Architectural Pillars
The control plane depends on three primary pillars of isolation and state management:

### 1. File System Isolation (`git worktree`)
Instead of allowing agents to edit the main working directory, the system leverages `git worktree`. 
When an agent is spawned, the `WorktreeManager` creates a secondary hidden folder (e.g. `worktree-agent-<id>`) that checks out an isolated branch of the project. The AI operates uniquely inside this sandbox, while `node_modules` are symlinked to preserve performance.

### 2. Process Isolation (`tmux`)
Instead of running agents directly in the foreground, blocking the terminal, the `TmuxManager` instantiates hidden background UNIX `tmux` sessions. 
This allows the agent process to be isolated. The operating system handles process control, inherently enabling the system to **pause**, **resume**, **monitor (capture-pane)**, and **terminate** agents securely via terminal signals.

### 3. Persistent State Management
The `StateManager` persistently writes all agent and project contexts into a JSON registry physically stored at `~/.config/ghostfleet/`. 
If the system or the daemon crashes, the state is dynamically hydrated across reboots, making the fleet crash-proof.

---

## Directory Structure & Modules
- **`src/cli`**: Contains the Commander-based CLI entry points (e.g. `index.ts`). Handles parsing user arguments.
- **`src/core`**: The orchestration brain.
  - `AgentManager`: Manages the lifecycle of an agent from spawning to termination.
  - `ProjectManager`: Manages tracking and registering local repositories.
  - `AgentRunner`: Executes the underlying CLI agent process internally.
  - `ResourceGovernor`: Observes resource limits.
- **`src/git`**: The `GitManager` and `WorktreeManager` handle sandboxed branch checkout logic.
- **`src/tmux`**: The `TmuxManager` issues commands to `tmux` (creating windows, reading buffers, sending keystrokes).
- **`src/state`**: The `StateManager` tracks the real-time application database across physical storage.
- **`src/agents`**: Extensible handlers for discovering installed agents (`AgentDiscovery`) and storing preset manifests (`AgentRegistry`).
- **`src/mcp`**: The local REST API and WebSocket server proxy for potential Web UI integration.

---

## Command Reference (CLI)

The CLI can be invoked natively after build using `node dist/cli/index.js` (aliased conceptually as `ghostfleet`).

| Command | Description |
|---|---|
| `project add <path> [name]` | Registers a codebase for orchestration. |
| `project list` | Lists all tracked projects from the registry. |
| `project remove <id>` | Removes a project from the registry. |
| `spawn <project> <task> [-a agent] [-m model]` | **Core Action**: Spawns an agent in an isolated worktree + tmux session. |
| `dashboard` | Launches the aesthetic auto-refreshing TUI monitor to view active agents, tails live PTY output. |
| `agent read <agentId>` | Reads the recent terminal buffer (stdout/stderr) of the specified agent. |
| `agent send <agentId> <msg>` | Injects keystrokes (like typing "Yes") directly into the agent's PTY. |
| `agent pause <agentId>` | Pauses computation of an agent process (SIGTSTP). |
| `agent resume <agentId>` | Resumes a suspended agent (fg). |
| `agent terminate <agentId>` | Soft kills the agent and tears down the worktree and session. |
| `agent list` & `agent detect` | Lists configured/detected agents installed on the host. |
| `cleanup` | A global garbage collector that forces teardown of orphaned sessions/worktrees. |
| `server [-p port]` | Bootstraps a local API server/WebSocket proxy for Web UI integrations. |

---

## Lifecycle Flow: Under the Hood
When you type `node dist/cli/index.js spawn <project> "Refactor auth"`:

1. **Initialization:** The CLI delegates the task and project ID to the `AgentManager`.
2. **Setup Worktree:** The `WorktreeManager` issues commands via the `GitManager` to instantiate a discrete `git worktree` under a new auto-generated branch.
3. **Setup Environment:** The `TmuxManager` spawns a detached `tmux` window explicitly pointing its Current Working Directory (CWD) to the newly created worktree.
4. **Agent Bootstrapping:** The `AgentRunner` builds the shell command based on the agent type (e.g. `aider --message "Refactor auth"`) and uses `tmux send-keys` to inject and execute this string in the window.
5. **Monitoring (Dashboard):** The user launches the `dashboard`. Internally, the TUI polls the `StateManager` for active agents and regularly extracts strings via `tmux capture-pane` to display logs.
6. **Intervention:** If an agent acts interactively (e.g. asking for approval to execute a script), its status changes to `PERMISSION`. The developer can resolve it via `agent send <id> <response>`. 
7. **Teardown:** Once validated and committed locally, passing `cleanup` or `agent terminate` initiates the `AgentManager` teardown phase—killing the process via `TmuxManager` and purging the folder via `WorktreeManager`.
