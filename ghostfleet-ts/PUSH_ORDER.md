# Git Commit Push Order

If you are planning to structure your git commits logically to tell a clean architectural story to other developers reviewing your PR (or mapping to our 22-phase development process), here is the exact chronological sequence in which the files were conceptualized and built:

## 1. Project Initialization & Tooling
*The barebone scaffolding required to run a modular TypeScript system.*
1. `package.json` (ESM configuration, commander, express, ws)
2. `tsconfig.json` (Node16 / target bindings)

## 2. Core Primitives & Setup
*The lowest-level system integration functions wrapping paths and native child process shelling.*
3. `src/utils/paths.ts` (Resolving config directories and global scopes)
4. `src/utils/exec.ts` (Safe `CommandExecutor` wrapping underlying binaries against injection)
5. `src/config/config-manager.ts` (Bootstrapping `~/.config/ghostfleet` logic)

## 3. Data Structures & Registration
*The models defining Agent schemas and exactly how they are cached in Node.js memory.*
6. `src/agents/agent.ts` (Core typings isolating Agent configurations and hierarchy patterns)
7. `src/agents/agent-registry.ts` (Singleton Map storing run-time memory structures)

## 4. Internal Mechanics & Wrappers
*The independent domain abstractions isolating logic across local resources decoupled structurally.*
8. `src/events/event-bus.ts` (Typed global hooks coupling modules across operations safely)
9. `src/core/project-manager.ts` (Parsing and storing target Git repository instances locally via `projects.json`)
10. `src/git/git-manager.ts` (Raw git wrapper binding branch deletions / log queries)
11. `src/git/worktree-manager.ts` (Raw git wrapper binding isolated physical `git worktree` tracking)
12. `src/tmux/tmux-manager.ts` (Terminal multiplexer bindings exposing socket streams and secure `C-m` key binds natively)

## 5. Main Orchestration Logistics
*The central nervous system that pipes the registry into the low-level mechanical wrappers.*
13. `src/core/resource-governor.ts` (Limits computational concurrent explosions dynamically bounded by the registry)
14. `src/core/agent-manager.ts` (The central hub: creating agents, analyzing PTY panes, linking symlinks, managing the lifecycle)
15. `src/state/state-manager.ts` (Hooking into `EventBus` sequentially and sinking the dynamic schema into `state.json` persistently over the disk boundary)

## 6. Integrations & Surfaces
*The external endpoints allowing clients and terminal UI systems to use GhostFleet natively.*
16. `src/mcp/mcp-server.ts` (Simulating the local HTTP bridging wrapping Express and `ws` web sockets over internal Event hooks)
17. `src/cli/index.ts` (Wiring the commander bindings, spinning the continuous Dashboard PTY polling loops)
18. `README.md` (Formal integration and onboarding manual execution sequences)
