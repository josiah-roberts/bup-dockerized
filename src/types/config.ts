export type Backup = {
  name: string;
  cronLine: string;
  sources: string[];
  id: string;
};

export type Config = {
  rootPath: string;
  backups: Backup[];
};
