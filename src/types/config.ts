export type Backup = {
  repository: string;
  name: string;
  cronLine: string;
  lastRun?: string;
  sources: string[];
  id: string;
};

export type Config = {
  repositories: Array<{
    name: string;
    status: "un-initialized" | "initialized" | "orphaned";
    path: string;
  }>;
  backups: Backup[];
};
