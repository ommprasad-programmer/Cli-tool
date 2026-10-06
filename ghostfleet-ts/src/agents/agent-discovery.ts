import { AgentManifest } from './agent-manifest.js';
import { AgentAdapter } from './agent-adapter.js';
import { GenericCliAdapter } from './adapters/generic-cli-adapter.js';
import { aiderPreset } from './presets/aider.js';
import { claudePreset } from './presets/claude.js';
import { codexPreset } from './presets/codex.js';
import { genericPresets } from './presets/other.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { AgentHealth } from './health-check.js';

export interface DiscoveryResult {
  manifest: AgentManifest;
  installed: boolean;
  version: string | null;
  health: AgentHealth;
}

export class AgentDiscovery {
  private static instance: AgentDiscovery;
  private customManifests: Map<string, AgentManifest> = new Map();
  private builtInManifests: AgentManifest[] = [
    aiderPreset,
    claudePreset,
    codexPreset,
    ...genericPresets
  ];

  private configDir = path.join(os.homedir(), '.config', 'ghostfleet', 'agents');
  
  public static getInstance(): AgentDiscovery {
    if (!AgentDiscovery.instance) {
      AgentDiscovery.instance = new AgentDiscovery();
    }
    return AgentDiscovery.instance;
  }

  async loadCustomAgents(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
      const files = await fs.readdir(this.configDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(this.configDir, file), 'utf-8');
          const manifest: AgentManifest = JSON.parse(content);
          this.customManifests.set(manifest.id, manifest);
        }
      }
    } catch (e) {
      // Ignore initial loading errors safely returning empty config
    }
  }

  async registerCustomAgent(manifest: AgentManifest): Promise<void> {
    await fs.mkdir(this.configDir, { recursive: true });
    await fs.writeFile(
      path.join(this.configDir, `${manifest.id}.json`), 
      JSON.stringify(manifest, null, 2)
    );
    this.customManifests.set(manifest.id, manifest);
  }

  getAdapter(agentId: string): AgentAdapter {
    let manifest = this.builtInManifests.find(m => m.id === agentId);
    if (!manifest) {
      manifest = this.customManifests.get(agentId);
    }
    if (!manifest) throw new Error(`Agent ${agentId} not configured.`);
    
    // In a real system, you might have specific adapters if logic is complex.
    // Here we use GenericCliAdapter for everything mapped via declarative manifests.
    return new GenericCliAdapter(manifest);
  }

  getManifest(agentId: string): AgentManifest | undefined {
    let manifest = this.builtInManifests.find(m => m.id === agentId);
    return manifest || this.customManifests.get(agentId);
  }

  listAllManifests(): AgentManifest[] {
    return [...this.builtInManifests, ...Array.from(this.customManifests.values())];
  }

  async detectAll(): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    const manifests = this.listAllManifests();
    for (const manifest of manifests) {
      const adapter = this.getAdapter(manifest.id);
      const installed = await adapter.detect();
      let version = null;
      let health = AgentHealth.NOT_INSTALLED;
      if (installed) {
        version = await adapter.getVersion();
        health = await adapter.healthCheck();
      }
      results.push({ manifest, installed, version, health });
    }
    return results;
  }
}
