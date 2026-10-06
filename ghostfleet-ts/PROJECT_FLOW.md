# PookieStack (GhostFleet) - Architecture & Project Flow

Welcome! This document outlines what this project actually is, how it works under the hood, and the exact flow of how a new user utilizes the system—all without requiring you to read the source code.

## 1. What is this project?

PookieStack (originally named GhostFleet) is a **high-performance, modular AI agent orchestration system**. 

When building AI coding agents (like Claude Engineer, Aider, etc.), giving them direct access to your codebase is dangerous and hard to manage. If they break something or delete files, your main project gets corrupted.

This project solves this by being a **"Control Plane"** for AI. It safely orchestrates and manages multiple AI coding agents locally on your machine by giving them completely isolated sandboxes.

## 2. Core Concepts (The Magic)

Before diving into the usability flow, you should understand the two core mechanisms this tool uses to sandbox AI:

1. **Git Worktrees (File System Isolation):** When an agent is created, the system uses the `git worktree` command to spawn an instant, isolated branch of your project placed in a hidden folder (e.g., `worktree-agent-<id>`). It symlinks `node_modules` so it's lightning fast. The agent can break, delete, and obliterate this folder without affecting your actual main repository.
2. **Tmux (Process Isolation):** The AI agent's execution shell is wrapped into a hidden background UNIX `tmux` session. This ensures that the agent's environment runs concurrently in the background, does not block your terminal, and can be paused, resumed, or killed safely at the operating system level.
3. **State Persistence:** All agent states are tracked in a persistent JSON registry cache. If your computer crashes, the system can instantly re-hydrate the state of the agents on reboot!

---

## 3. The User Journey (Proper Usage Flow)

Here is the exact lifecycle a user walks through to orchestrate an AI agent.

### Step 1: Register Context
The system first needs to know *what* codebase it is targeting. You register the repository you want the agents to work on.
```bash
node dist/cli/index.js project add .
```

### Step 2: Spawn an Autonomous Agent
You spawn an agent by passing the project directory and the task prompt. 
```bash
node dist/cli/index.js spawn . "Refactor the authentication flow"
```
*What happens under the hood?*
- The codebase creates a `git worktree` isolation folder.
- A hidden `tmux` session is booted up.
- The AI agent launches inside that tmux session, pointed directly at the worktree folder, and begins writing code.

### Step 3: Monitor via the Dashboard (TUI)
You don't just stare at logs. You bring up a beautiful Terminal UI (TUI) dashboard that dynamically queries the background `.json` state registry to monitor all active agents.
```bash
node dist/cli/index.js dashboard
```
You can see which agents are `IDLE`, `RUNNING`, or blocked on `PERMISSION`.

### Step 4: Interact & Intervene 
Sometimes an AI agent stops and asks for permission (e.g., "Are you sure you want to run this bash script?"). You can inject commands directly into the AI's isolated shell from your main terminal:
```bash
# Read what the agent is currently doing
node dist/cli/index.js agent read <agent-id>

# Inject an input (like typing "Yes") into its tmux session
node dist/cli/index.js agent send <agent-id> "Yes"
```

### Step 5: Advanced Control
You possess God-level process control over the AIs through operating system signals.
```bash
# Send a SIGTSTP command (pauses process execution dynamically)
node dist/cli/index.js agent pause <agent-id>

# Bring the background process back up
node dist/cli/index.js agent resume <agent-id>

# Nuke the process forcefully
node dist/cli/index.js agent terminate <agent-id>
```

### Step 6: Garbage Collection
Once the AI has pushed its code or the task is finished, you tear down the sandboxes. GhostFleet wipes the worktrees, clears the tmux sessions, and purges the registry.
```bash
node dist/cli/index.js cleanup
```

---

## The Master Control HTTP Server (Optional Flow)

Because everything is decoupled into Git, Tmux, and JSON storage, the system can also be driven over HTTP/WebSockets instead of the CLI.

```bash
node dist/cli/index.js server --port 3000
```
This launches an API that allows a Web UI to send `POST /spawn` requests and listen to WebSocket events for real-time terminal streaming of what the agent is typing.
