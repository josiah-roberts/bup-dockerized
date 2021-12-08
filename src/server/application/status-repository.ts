import { readFile, writeFile } from "fs/promises";
import { Backup } from "../../types/config";
import { lstat } from "fs";
import {
  checkBranchCommited,
  checkBranchBytes,
  getBranchRevisions,
} from "./bup-actions";
import { BackupStatus, Runnability, RunningStatus } from "../../types/status";
import { emit } from "./events";
import { once } from "ramda";
import { getBackupDir, getConfigDir } from "./config-repository";

const statusMap: { [id: string]: BackupStatus } = {};

function getRunnability(
  repoAccessable: boolean,
  sourcesStatus: Array<{ source: string; accessable: boolean }>
): Runnability {
  if (!repoAccessable) {
    return { runnable: false, reason: "repo-inaccessable" };
  }

  const inacessableSources = sourcesStatus
    .filter((x) => !x.accessable)
    .map((x) => x.source);

  if (inacessableSources.length > 0) {
    return {
      runnable: false,
      reason: "sources-inaccessable",
      inacessableSources: inacessableSources,
    };
  }

  return { runnable: true };
}

function isAccessableDir(path: string) {
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

function getInitialStatusSummary(revisions: Date[] | undefined) {
  return revisions?.length ?? 0 > 0
    ? ("idle" as const)
    : ("never-run" as const);
}

async function rebuildStatus(backup: Backup): Promise<BackupStatus> {
  const repoAccessable = await isAccessableDir(getBackupDir(backup));
  const sourceStatus = await Promise.all(
    backup.sources.map(async (source) => ({
      source,
      accessable: await isAccessableDir(source),
    }))
  );
  const lastRun = await checkBranchCommited(backup);
  const revisions = await getBranchRevisions(backup);
  const branchSize = await checkBranchBytes(backup);

  const status = {
    backupId: backup.id,
    repoAccessable,
    sourceStatus,
    runnability: getRunnability(repoAccessable, sourceStatus),
    lastRun,
    branchSize,
    revisions,
    status: statusMap[backup.id]?.status ?? getInitialStatusSummary(revisions),
  };

  emit("backup-status", status);
  return status;
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
  const currentStatus = await recomputeStatus(backup);
  statusMap[backup.id] = {
    ...currentStatus,
    status: getInitialStatusSummary(currentStatus.revisions),
  };
  emit("backup-status", statusMap[backup.id]);
}
