export type AgentStatus =
  | "CREATING"
  | "STARTING"
  | "IDLE"
  | "THINKING"
  | "RUNNING"
  | "WAITING"
  | "PERMISSION"
  | "ERROR"
  | "DONE"
  | "PAUSED"
  | "HIBERNATED"
  | "COMPLETED"
  | "FAILED"
  | "TERMINATED";

export interface Agent {
  id: string;
  projectId: string;
  task: string;
  branch: string;
  worktree: string;
  tmuxServer: string;
  tmuxSession: string;
  status: AgentStatus;
  error?: string;
  createdAt: number;
  updatedAt: number;
  role: 'LEAD' | 'WORKER';
  parentId?: string;
}
