import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PathUtils } from '../utils/paths.js';
import { EventBus } from '../events/event-bus.js';

export interface Project {
  id: string;
  name: string;
  repositoryPath: string;
  createdAt: number;
}

export class ProjectManager {
  private projectsFile: string;
  private eventBus: EventBus;

  constructor() {
    this.projectsFile = join(PathUtils.getConfigDir(), 'projects', 'registry.json');
    this.eventBus = EventBus.getInstance();
  }

  async list(): Promise<Project[]> {
    if (!existsSync(this.projectsFile)) {
      return [];
    }
    const data = await readFile(this.projectsFile, 'utf-8');
    return JSON.parse(data) as Project[];
  }

  private async save(projects: Project[]): Promise<void> {
    await writeFile(this.projectsFile, JSON.stringify(projects, null, 2), 'utf-8');
  }

  async add(repositoryPath: string, name?: string): Promise<Project> {
    const projects = await this.list();
    const extractedName = name || repositoryPath.split('/').filter(Boolean).pop() || 'unknown';
    
    if (projects.find(p => p.name === extractedName || p.repositoryPath === repositoryPath)) {
      throw new Error(`Project with name '${extractedName}' or identical path already exists.`);
    }

    const newProject: Project = {
      id: randomUUID().slice(0, 8),
      name: extractedName,
      repositoryPath,
      createdAt: Date.now()
    };
    
    projects.push(newProject);
    await this.save(projects);
    
    this.eventBus.emit('project.added', newProject);
    return newProject;
  }

  async remove(nameOrId: string): Promise<void> {
    const projects = await this.list();
    const updated = projects.filter(p => p.name !== nameOrId && p.id !== nameOrId);
    if (updated.length === projects.length) {
      throw new Error(`Project '${nameOrId}' not found.`);
    }
    await this.save(updated);
  }
}
