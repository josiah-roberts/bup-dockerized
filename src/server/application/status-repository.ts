import { readFile, writeFile } from "fs/promises";
import { Backup, Repository } from "../../types/config";
import { lstat } from "fs";
import {
  checkBranchCommited,
  checkBranchBytes,
  getBranchRevisions,
} from "./bup-actions";
import {
  BackupStatus,
  Runnability,
  RunningStatus,
  SizeInfo,
} from "../../types/status";
import { emit } from "./events";
import { once } from "ramda";
import { getConfigDir } from "./config-repository";

let _sizeCache: Map<string, SizeInfo>;
const loadSizeCache = once(() =>
  readFile(`${getConfigDir()}/size-cache.json`)
    .then((buffer) => buffer.toString())
    .then<typeof _sizeCache>((json: string) => {
      const entries: { id: string; asOf: string; bytes: number }[] =
        JSON.parse(json);

      return new Map(
        entries.map(({ id, asOf, bytes }) => [
          id,
          {
            id,
            bytes,
            asOf: new Date(asOf),
          },
        ])
      );
    })
    .catch((e) => {
      console.warn(e);
      return new Map<string, SizeInfo>();
    })
);
const getSizeCache = async () =>
  (_sizeCache = _sizeCache ?? (await loadSizeCache()));

let writingPromise = Promise.resolve();
const writeSizeCache = (cache: typeof _sizeCache) =>
  (writingPromise = writingPromise.then(() => {
    const json = JSON.stringify([...cache.values()]);
    return writeFile(`${getConfigDir()}/size-cache.json`, json);
  }));

export async function updateSizeCache(id: string, sizeInfo: SizeInfo) {
  const sizeCache = await getSizeCache();
  sizeCache.set(id, sizeInfo);
  writeSizeCache(sizeCache); // No need to wait for completion
}

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

const rebuildJobs: { [backupId: string]: Promise<void> | undefined } = {};

async function handleRebuildSize(
  lastRun: Date | undefined,
  repository: Repository,
  backup: Backup
): Promise<SizeInfo | undefined> {
  if (!lastRun) {
    return undefined;
  }

  const cachedSize = (await getSizeCache()).get(backup.id);
  if (
    (!cachedSize || cachedSize.asOf < lastRun) &&
    rebuildJobs[backup.id] === undefined
  ) {
    rebuildJobs[backup.id] = checkBranchBytes(repository, backup)
      .then(async (bytes) => {
        if (bytes !== undefined) {
          await updateSizeCache(backup.id, {
            asOf: new Date(),
            id: backup.id,
            bytes,
          });
          await rebuildStatus(repository, backup);
          rebuildJobs[backup.id] = undefined;
        }
      })
      .catch((e) => console.error(e));
  }

  return cachedSize;
}

async function rebuildStatus(
  repository: Repository,
  backup: Backup
): Promise<BackupStatus> {
  const repoAccessable = await isAccessableDir(repository.path);
  const sourceStatus = await Promise.all(
    backup.sources.map(async (source) => ({
      source,
      accessable: await isAccessableDir(source),
    }))
  );
  const lastRun = await checkBranchCommited(repository, backup);
  const revisions = await getBranchRevisions(repository, backup);
  const branchSize = await handleRebuildSize(lastRun, repository, backup);

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

export async function recomputeStatus(repository: Repository, backup: Backup) {
  return (statusMap[backup.id] = await rebuildStatus(repository, backup));
}

export async function getStatus(repository: Repository, backup: Backup) {
  return (statusMap[backup.id] =
    statusMap[backup.id] ?? (await rebuildStatus(repository, backup)));
}

export async function setRunningStatus(
  repository: Repository,
  backup: Backup,
  s: RunningStatus
) {
  const currentStatus = await getStatus(repository, backup);
  statusMap[backup.id] = { ...currentStatus, status: s };
  emit("backup-status", statusMap[backup.id]);
}

export async function clearRunningStatus(
  repository: Repository,
  backup: Backup
) {
  const currentStatus = await recomputeStatus(repository, backup);
  statusMap[backup.id] = {
    ...currentStatus,
    status: getInitialStatusSummary(currentStatus.revisions),
  };
  emit("backup-status", statusMap[backup.id]);
}
