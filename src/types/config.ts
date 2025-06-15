export type Backup =
  | {
      name: string;
      cronLine: string;
      sources: string[];
      id: string;
      exclude?: string;
      type?: "automatic";
    }
  | {
      type: "monitoring";
      name: string;
      id: string;
      cronLine?: string;
      sources?: string[];
      exclude?: string;
    };

export type RunnableBackup = Exclude<Backup, { type: "monitoring" }>;
export function isAutomatic(b: Backup): b is RunnableBackup {
  return b.type !== "monitoring";
}

export type Config = {
  rootPath: string;
  backups: Backup[];
};
