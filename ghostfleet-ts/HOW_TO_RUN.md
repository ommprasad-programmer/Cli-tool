# How to Run GhostFleet-TS

Because GhostFleet manages isolated AI processes inside `git worktrees`, **the folder you are isolating must formally be tracked as a `git` project.** (If you run the CLI on a folder that isn't connected to git, it will throw an error since it cannot safely branch an AI agent out).

To run GhostFleet-TS seamlessly right now, navigate to your compiled setup and use the pre-compiled `node` executable against the CLI endpoint.

Here is exactly how to start:

### 1. Register a Target Git Project
Tell GhostFleet which project folder you want the AI agents to hack on. 
*(Assuming `/home/omm/DEV-26/Cli-tool/ghostfleet-ts` is a git repository, you can add it directly)*:
```bash
cd /home/omm/DEV-26/Cli-tool/ghostfleet-ts
node dist/cli/index.js project add .
```

### 2. Spawn your first Agent
Now that the orchestrator tracks the project, you can spawn an intelligent sub-agent natively in one command passing a project ID/name and the task prompt:
```bash
node dist/cli/index.js spawn . "List all files in the src folder"
```
*(GhostFleet will immediately fork a new child process, generate an isolated node environment natively caching `/node_modules`, and push the target logic continuously inside a detached `tmux` layer).*

### 3. Open the Dashboard (TUI)
You can leave a terminal window open running the live PTY multiplexer dashboard which continuously tracks all of your active and blocked agents running on the machine autonomously:
```bash
node dist/cli/index.js dashboard
```

*(You can cancel the dashboard anytime safely with `Ctrl+C`. Don't worry, GhostFleet saves your process state automatically, and the agents will safely continue to run in the background undisturbed!)*
