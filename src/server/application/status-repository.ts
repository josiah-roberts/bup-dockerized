import { Backup } from "../../types/config"
import { lstat } from "fs"
import { checkBranchCommited, checkBranchBytes } from "./bup-actions"
import { BackupStatus, Runnability, RunningStatus } from "../../types/status"
import { emit } from "./events"
import { getBackupDir } from "./config-repository"

const statusMap: { [id: string]: BackupStatus } = {}

function getRunnability(
  repoAccessable: boolean,
  sourcesStatus: Array<{ source: string; accessable: boolean }>
): Runnability {
  if (!repoAccessable) {
    return { runnable: false, reason: "repo-inaccessable" }
  }

  const inacessableSources = sourcesStatus
    .filter((x) => !x.accessable)
    .map((x) => x.source)

  if (inacessableSources.length > 0) {
    return {
      runnable: false,
      reason: "sources-inaccessable",
      inacessableSources: inacessableSources,
    }
  }

  return { runnable: true }
}

function isAccessableDir(path: string) {
  return new Promise<boolean>((res) => {
    lstat(path, (e, stats) => {
      if (e) {
        console.error(e)
        res(false)
      } else {
        res(stats.isDirectory())
      }
    })
  })
}

function getInitialStatusSummary(lastRun: Date | undefined) {
  return lastRun !== undefined ? ("idle" as const) : ("never-run" as const)
}

async function rebuildStatus(backup: Backup): Promise<BackupStatus> {
  const repoAccessable = await isAccessableDir(getBackupDir(backup))
  const sourceStatus = await Promise.all(
    backup.sources.map(async (source) => ({
      source,
      accessable: await isAccessableDir(source),
    }))
  )
  const lastRun = await checkBranchCommited(backup)
  const branchSize = await checkBranchBytes(backup)

  const status = {
    backupId: backup.id,
    repoAccessable,
    sourceStatus,
    runnability: getRunnability(repoAccessable, sourceStatus),
    lastRun,
    branchSize,
    status: statusMap[backup.id]?.status ?? getInitialStatusSummary(lastRun),
  }

  emit("backup-status", status)
  return status
}

export function setStatus(backup: Backup, status: Partial<BackupStatus>) {
  const newStatus = { ...statusMap[backup.id], ...status }
  statusMap[backup.id] = newStatus
  emit("backup-status", newStatus)
}
export async function recomputeStatus(backup: Backup) {
  return (statusMap[backup.id] = await rebuildStatus(backup))
}

export async function getStatus(backup: Backup) {
  return (statusMap[backup.id] =
    statusMap[backup.id] ?? (await rebuildStatus(backup)))
}

export async function setRunningStatus(backup: Backup, s: RunningStatus) {
  const currentStatus = await getStatus(backup)
  statusMap[backup.id] = { ...currentStatus, status: s }
  emit("backup-status", statusMap[backup.id])
}

export async function clearRunningStatus(backup: Backup) {
  const currentStatus = await getStatus(backup)
  statusMap[backup.id] = {
    ...currentStatus,
    status: getInitialStatusSummary(currentStatus.lastRun),
  }
  await recomputeStatus(backup)
}
