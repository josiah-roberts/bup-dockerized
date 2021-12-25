export type Backup = {
  name: string;
  cronLine: string;
  sources: string[];
  id: string;
  exclude?: string;
};

export type Config = {
  rootPath: string;
  backups: Backup[];
};
