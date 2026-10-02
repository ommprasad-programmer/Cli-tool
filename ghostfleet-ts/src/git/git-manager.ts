import { CommandExecutor } from '../utils/exec.js';

export class GitManager {
  private repositoryPath: string;

  constructor(repositoryPath: string) {
    this.repositoryPath = repositoryPath;
  }

  /**
   * Helper payload handling cwd routing
   */
  private async runGitCommand(args: string[]): Promise<string> {
    const result = await CommandExecutor.run('git', args, { cwd: this.repositoryPath });
    return result.stdout;
  }

  /**
   * Retrieves the current concise status of the git repository.
   */
  async status(): Promise<string> {
    return this.runGitCommand(['status', '--short']);
  }

  /**
   * Lists all local branches.
   */
  async branch(): Promise<string[]> {
    const stdout = await this.runGitCommand(['branch', '--format=%(refname:short)']);
    return stdout.split('\\n').map(b => b.trim()).filter(Boolean);
  }

  /**
   * Creates a new branch at the current HEAD or specified start point.
   */
  async createBranch(branchName: string, startPoint: string = 'HEAD'): Promise<void> {
    await this.runGitCommand(['branch', branchName, startPoint]);
  }

  /**
   * Deletes a local branch.
   */
  async deleteBranch(branchName: string, force: boolean = false): Promise<void> {
    await this.runGitCommand(['branch', force ? '-D' : '-d', branchName]);
  }

  /**
   * Checks out the specified branch.
   */
  async checkout(branchName: string): Promise<void> {
    await this.runGitCommand(['checkout', branchName]);
  }

  /**
   * Merges a branch into the current working branch.
   */
  async merge(branchName: string): Promise<void> {
    await this.runGitCommand(['merge', branchName]);
  }
}
