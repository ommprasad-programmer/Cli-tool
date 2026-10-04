# GhostFleet Verification Flow

This guide walks you through exactly how to test and verify the core isolation mechanisms of GhostFleet (Tmux encapsulation and Git Worktree branching) in real-time on your local machine.

For the best experience, open **two separate terminal windows** side-by-side.

---

### Terminal 1: Start the Dashboard

In your first terminal window, boot up the live GhostFleet dashboard. This terminal will constantly scan the internal `state.json` registry and update automatically, visualizing agent lifecycles in real-time.

```bash
cd /home/omm/DEV-26/Cli-tool/ghostfleet-ts
node dist/cli/index.js dashboard
```
> **Expected Output:** You should see an empty, auto-refreshing table displaying "No active agents".

---

### Terminal 2: Spawn an Agent & Verify Mechanics

Keep Terminal 1 open and visible. In your second terminal window, run the following commands sequentially:

#### 1. Spawn a target agent
Request GhostFleet to allocate an agent to the current (`.`) project.
```bash
cd /home/omm/DEV-26/Cli-tool/ghostfleet-ts
node dist/cli/index.js spawn -p . -t "Validate GhostFleet Architecture"
```
> **Expected Output:** Look at Terminal 1! You will instantly see the new agent pop up on the dashboard table with its generated ID and a status of `IDLE` or `STARTING`.

#### 2. Verify Git Isolation (The Magic)
Check your file system to witness GhostFleet's branching engine. Run this command to list all items:
```bash
ls -la | grep worktree-agent
```
> **Expected Output:** You will see a physical folder named `worktree-agent-<id>`. If you `cd` into it, you will notice a complete clone of your codebase with `node_modules` instantly symlinked! The agent can safely execute destructive testing inside this folder without breaking your primary main workspace.

#### 3. Verify Tmux Process Isolation
Check the native multiplexer buffers to see the hidden session powering the agent's UNIX shell:
```bash
tmux ls
```
> **Expected Output:** You will see a low-level UNIX session tagged natively with `cf-<project-id>-<agent-id>`. GhostFleet safely pipes all autonomous agent shell processes recursively into this locked context so it can be streamed to Web/React endpoints later.

#### 4. Trigger Garbage Cleanup
When you are done validating the framework, use GhostFleet's core cleanup logic to wipe everything out automatically:
```bash
node dist/cli/index.js cleanup
```
> **Expected Output:** GhostFleet will parse the git history, forcefully delete the isolated `worktree-agent-<id>` branch natively, unmount the folder safely off your disk, and clear the registry out. Terminal 1 will revert to "No active agents".
