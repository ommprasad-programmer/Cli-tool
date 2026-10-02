import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PathUtils } from '../utils/paths.js';

export interface GlobalConfig {
  debugMode: boolean;
}

export class ConfigManager {
  private configDir: string;
  
  constructor() {
    this.configDir = PathUtils.getConfigDir();
  }

  /**
   * Bootstraps the GhostFleet ~/.config structure safely without overwriting.
   */
  async initialize(): Promise<void> {
    const subdirs = ['projects', 'agents', 'state', 'logs'];
    
    await mkdir(this.configDir, { recursive: true });

    for (const d of subdirs) {
      await mkdir(join(this.configDir, d), { recursive: true });
    }

    const configPath = join(this.configDir, 'config.json');
    if (!existsSync(configPath)) {
      const defaultConfig: GlobalConfig = { debugMode: false };
      await writeFile(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    }
  }

  async loadConfig(): Promise<GlobalConfig> {
    const configPath = join(this.configDir, 'config.json');
    if (existsSync(configPath)) {
      const data = await readFile(configPath, 'utf-8');
      return JSON.parse(data) as GlobalConfig;
    }
    return { debugMode: false };
  }
}
