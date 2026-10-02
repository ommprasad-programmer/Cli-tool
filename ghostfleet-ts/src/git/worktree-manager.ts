import { CommandExecutor } from '../utils/exec.js';
import { join } from 'node:path';

export class WorktreeManager {
  private repositoryPath: string;

  constructor(repositoryPath: string) {
    this.repositoryPath = repositoryPath;
  }

  private async runGitCommand(args: string[]): Promise<string> {
    const result = await CommandExecutor.run('git', args, { cwd: this.repositoryPath });
    return result.stdout;
  }

  /**
   * Creates a new git worktree tracking a new branch.
   */
  async create(agentId: string, branchName: string): Promise<string> {
    const worktreePath = join(this.repositoryPath, `worktree-agent-${agentId}`);
    
    // Attempt to create the worktree and branch
    await this.runGitCommand(['worktree', 'add', worktreePath, '-b', branchName]);
    
    return worktreePath;
  }

  /**
   * Removes a worktree by its path.
   */
  async remove(worktreePath: string, force: boolean = false): Promise<void> {
    const args = ['worktree', 'remove'];
    if (force) {
      args.push('--force');
    }
    args.push(worktreePath);
    await this.runGitCommand(args);
  }

  /**
   * Lists all active worktrees.
   * Returns an array of canonical paths.
   */
  async list(): Promise<string[]> {
    const stdout = await this.runGitCommand(['worktree', 'list']);
    // Standard format: <path>  <commit_hash>  [<branch>]
    return stdout.split('\\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.split(/\\s+/)[0]!);
  }

  /**
   * Checks if a worktree exists by path in the active tracking list.
   */
  async exists(worktreePath: string): Promise<boolean> {
    const activeWorktrees = await this.list();
    return activeWorktrees.some(wt => wt === worktreePath || wt.includes(worktreePath));
  }

  /**
   * Cleans up orphaned or missing worktrees natively via git prune.
   */
  async cleanup(): Promise<void> {
    await this.runGitCommand(['worktree', 'prune']);
  }
}
