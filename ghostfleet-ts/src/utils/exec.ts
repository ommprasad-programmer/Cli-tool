import { execFile, spawn, ExecFileOptions, ChildProcess, SpawnOptions } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export class CommandExecutor {
  /**
   * Safe execution of a simple command using execFile to prevent shell injection.
   * Do not use for commands that require an interactive TTY.
   */
  static async run(command: string, args: string[] = [], options?: ExecFileOptions): Promise<ExecResult> {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, options);
      return { stdout: stdout.toString().trim(), stderr: stderr.toString().trim() };
    } catch (error: any) {
      throw new Error(`Command execution failed: ${command} ${args.join(' ')}\nDetails: ${error.message}`);
    }
  }

  /**
   * Spawns a long-running process (e.g., launching an agent inside a tmux window).
   * Safe wrapper around Node spawn.
   */
  static spawnProcess(command: string, args: string[] = [], options?: SpawnOptions): ChildProcess {
    return spawn(command, args, { stdio: 'inherit', ...options });
  }
}
