export type Backup = {
  repository: string;
  name: string;
  cronLine: string;
  sources: string[];
  id: string;
};

export type Repository = {
  name: string;
  status: "un-initialized" | "initialized" | "orphaned";
  path: string;
};

export type Config = {
  repositories: Repository[];
  backups: Backup[];
};
