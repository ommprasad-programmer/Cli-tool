# GhostFleet-TS

GhostFleet-TS is a high-performance, modular AI agent orchestration system built entirely in TypeScript/Node.js. It manages autonomous coding agents using isolated Git worktrees and localized tmux sessions.

## Prerequisites

1. **Node.js** (v18+)
2. **Git**
3. **tmux** (required for creating isolated agent terminal sessions)

## Installation & Compilation

1. Clone or navigate into the GhostFleet-TS repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile the TypeScript orchestrator:
   ```bash
   npm run build
   ```

## Usage

GhostFleet exposes its CLI entry point via Node.js executing the compiled `dist/cli/index.js`. 

*(Tip: You can alias this in your `.bashrc`/`.zshrc` as `alias ghostfleet="node /path/to/ghostfleet-ts/dist/cli/index.js"` for convenience).*

### 1. Register a Project
Before you can spawn an agent, GhostFleet needs to know which repositories are available.
```bash
# Add the current directory as a project
node dist/cli/index.js project add . 

# List all tracked projects
node dist/cli/index.js project list
```

### 2. Spawn an AI Agent
Spawns a new isolated AI agent working on a specified task. It automatically creates an isolated `git worktree` and hooks it into a secure `tmux` window.
```bash
# Spawn an agent for a specific project tracking (by name or ID)
node dist/cli/index.js spawn <project-name-or-id> "Migrate the login component to React Server Components"
```

### 3. Monitor the Fleet (Terminal UI)
GhostFleet comes with an autonomous terminal dashboard mapping real-time streaming PTY output hooks and state status.
```bash
node dist/cli/index.js dashboard
```
> The dashboard continuously tracks all active agents in the centralized registry, evaluating whether they are `IDLE`, `RUNNING`, or blocked on `PERMISSION`.

### 4. Interact with an Agent
If an agent is blocked on a permission request (like Claude Code asking for Yes/No):
```bash
# Read the current terminal buffered output for an agent
node dist/cli/index.js agent read <agent-id>

# Send keystrokes or inputs into the agent's PTY
node dist/cli/index.js agent send <agent-id> "Yes"
```

### 5. Control Agent Lifecycles
```bash
# Temporarily pause computation (SIGTSTP)
node dist/cli/index.js agent pause <agent-id>

# Resume a suspended agent (fg)
node dist/cli/index.js agent resume <agent-id>

# Terminate an agent permanently
node dist/cli/index.js agent terminate <agent-id>
```

### 6. Orchestrate over the UI Server
To wrap GhostFleet into a React or external Web UI Client, launch the local MCP REST Proxy and WebSocket server:
```bash
node dist/cli/index.js server --port 3000
```
*(The server provides robust HTTP Endpoints (`POST /spawn`) alongside dynamic WebSockets that bubble internal orchestration EventBus hooks).*

### 7. Global Worktree Cleanup
If ghost sessions or PTY shells crash abruptly breaking out of the registry state manager, invoke garbage collection to sever and teardown isolated orphaned branch routes implicitly:
```bash
node dist/cli/index.js cleanup
```

---

## State Persistence
GhostFleet transparently hooks into the underlying file system, saving state persistently inside `~/.config/ghostfleet/`. Processes automatically dynamically hydrate from this registry across reboots making ghost fleets inherently crash-proof.
