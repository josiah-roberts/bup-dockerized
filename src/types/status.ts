export type RunningStatus = "indexing" | "saving";

export type StatusSummary = RunningStatus | "never-run" | "idle" | "working";
export type Readiness =
  | { runnable: true }
  | { runnable: false; reason: "repo-inaccessible" }
  | {
      runnable: false;
      reason: "sources-inaccessible";
      inaccessibleSources: string[];
    };

export type BackupStatus = {
  backupId: string;
  repoAccessible: boolean;
  sourceStatus: {
    source: string;
    accessible: boolean;
  }[];
  readiness: Readiness;
  lastRun: Date | undefined;
  branchSize: number | undefined;
  status: StatusSummary;
};
