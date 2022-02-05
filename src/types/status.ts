export type RunningStatus = "indexing" | "saving";

export type StatusSummary = RunningStatus | "never-run" | "idle";
export type Runnability =
  | { runnable: true }
  | { runnable: false; reason: "repo-inaccessable" }
  | {
      runnable: false;
      reason: "sources-inaccessable";
      inacessableSources: string[];
    };

export type BackupStatus = {
  backupId: string;
  repoAccessable: boolean;
  sourceStatus: {
    source: string;
    accessable: boolean;
  }[];
  runnability: Runnability;
  lastRun: Date | undefined;
  branchSize: number | undefined;
  status: StatusSummary;
};
