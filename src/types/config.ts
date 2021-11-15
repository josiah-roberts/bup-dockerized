export type Backup = {
  repository: string;
  name: string;
  cronLine: string;
  sources: string[];
};

export type Config = {
  repositories: Array<{
    name: string;
  }>;
  backups: Backup[];
};
