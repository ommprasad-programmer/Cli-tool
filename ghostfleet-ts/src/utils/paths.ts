import { homedir } from 'node:os';
import { join } from 'node:path';

export class PathUtils {
  /**
   * Returns the global GhostFleet configuration directory.
   * e.g., ~/.config/ghostfleet
   */
  static getConfigDir(): string {
    return join(homedir(), '.config', 'ghostfleet');
  }
}
