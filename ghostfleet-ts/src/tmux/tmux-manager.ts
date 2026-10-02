import { CommandExecutor } from '../utils/exec.js';
import { TmuxSession } from './tmux-session.js';

export class TmuxManager {
  private projectId: string;
  private socketName: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    // Each project gets its own tmux server isolated by a socket lock
    this.socketName = `cf-${this.projectId}`;
  }

  private async runTmuxCommand(args: string[], throwOnError = true): Promise<string> {
    try {
      const result = await CommandExecutor.run('tmux', ['-L', this.socketName, ...args]);
      return result.stdout;
    } catch (e: any) {
      if (throwOnError) {
        throw new Error(`Tmux error: ${e.message}`);
      }
      return '';
    }
  }

  async createServer(): Promise<void> {
    // In tmux, spawning a session targeting a new socket inherently creates the server.
    // For manual setup, we can explicitly start a detached server process.
    await this.runTmuxCommand(['start-server']);
  }

  async destroyServer(): Promise<void> {
    await this.runTmuxCommand(['kill-server'], false);
  }

  async createSession(sessionName: string, startDirectory?: string): Promise<void> {
    const args = ['new-session', '-d', '-s', sessionName];
    if (startDirectory) {
      args.push('-c', startDirectory);
    }
    await this.runTmuxCommand(args);
  }

  async killSession(sessionName: string): Promise<void> {
    await this.runTmuxCommand(['kill-session', '-t', sessionName], false);
  }

  async sendKeys(sessionName: string, keys: string): Promise<void> {
    await this.runTmuxCommand(['send-keys', '-t', sessionName, keys]);
  }

  async capturePane(sessionName: string, linesCount: number = 20): Promise<string> {
    const output = await this.runTmuxCommand(['capture-pane', '-p', '-t', sessionName, '-S', `-${linesCount}`], false);
    return output;
  }

  async listSessions(): Promise<TmuxSession[]> {
    const output = await this.runTmuxCommand(['list-sessions', '-F', '#{session_name},#{session_created}'], false);
    return output.split('\\n').filter(Boolean).map(line => {
      const [name, created] = line.split(',');
      return { 
        id: name!, 
        name: name!, 
        created: parseInt(created || '0', 10) * 1000 
      };
    });
  }

  async sessionExists(sessionName: string): Promise<boolean> {
    const sessions = await this.listSessions();
    return sessions.some(s => s.name === sessionName);
  }

  async attach(sessionName: string): Promise<void> {
    const args = ['-L', this.socketName, 'attach-session', '-t', sessionName];
    // Attach requires PTY allocation so we use spawnProcess rather than execFile
    CommandExecutor.spawnProcess('tmux', args);
  }

  async detach(): Promise<void> {
    await this.runTmuxCommand(['detach-client']);
  }
}
