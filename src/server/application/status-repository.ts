import { Backup } from "../../types/config";
import { lstat } from "fs";
import { checkBranchCommitted, checkBranchBytes } from "./bup-actions";
import { BackupStatus, Readiness, RunningStatus } from "../../types/status";
import { emit } from "./events";
import { getBackupDir } from "./config-repository";

const statusMap: { [id: string]: BackupStatus } = {};

function getReadiness(
  repoAccessible: boolean,
  sourcesStatus: Array<{ source: string; accessible: boolean }>
): Readiness {
  if (!repoAccessible) {
    return { runnable: false, reason: "repo-inaccessible" };
  }

  const inaccessibleSources = sourcesStatus
    .filter((x) => !x.accessible)
    .map((x) => x.source);

  if (inaccessibleSources.length > 0) {
    return {
      runnable: false,
      reason: "sources-inaccessible",
      inaccessibleSources,
    };
  }

  return { runnable: true };
}

function isAccessibleDir(path: string) {
  return new Promise<boolean>((res) => {
    lstat(path, (e, stats) => {
      if (e) {
        console.error(e);
        res(false);
      } else {
        res(stats.isDirectory());
      }
    });
  });
}

function getInitialStatusSummary(lastRun: Date | undefined) {
  return lastRun !== undefined ? ("idle" as const) : ("never-run" as const);
}

async function rebuildStatus(backup: Backup): Promise<BackupStatus> {
  const repoAccessible = await isAccessibleDir(getBackupDir(backup));
  const sourceStatus = await Promise.all(
    backup.sources.map(async (source) => ({
      source,
      accessible: await isAccessibleDir(source),
    }))
  );
  const lastRun = await checkBranchCommitted(backup);
  const branchSize = await checkBranchBytes(backup);

  const status = {
    backupId: backup.id,
    repoAccessible: repoAccessible,
    sourceStatus,
    readiness: getReadiness(repoAccessible, sourceStatus),
    lastRun,
    branchSize,
    status: statusMap[backup.id]?.status ?? getInitialStatusSummary(lastRun),
  };

  emit("backup-status", status);
  return status;
}

export function setStatus(backup: Backup, status: Partial<BackupStatus>) {
  const newStatus = { ...statusMap[backup.id], ...status };
  statusMap[backup.id] = newStatus;
  emit("backup-status", newStatus);
}
export async function recomputeStatus(backup: Backup) {
  return (statusMap[backup.id] = await rebuildStatus(backup));
}

export async function getStatus(backup: Backup) {
  return (statusMap[backup.id] =
    statusMap[backup.id] ?? (await rebuildStatus(backup)));
}

export async function setRunningStatus(backup: Backup, s: RunningStatus) {
  const currentStatus = await getStatus(backup);
  statusMap[backup.id] = { ...currentStatus, status: s };
  emit("backup-status", statusMap[backup.id]);
}

export async function clearRunningStatus(backup: Backup) {
  const currentStatus = await getStatus(backup);
  statusMap[backup.id] = {
    ...currentStatus,
    status: getInitialStatusSummary(currentStatus.lastRun),
  };
  await recomputeStatus(backup);
}
