import { Backup } from "../../types/config";
import {
  spawn,
  SpawnOptionsWithoutStdio,
  ChildProcessWithoutNullStreams,
} from "child_process";
import { getBackupDir, getRestoreDir } from "./config-repository";
import { rename as fsRename } from "fs/promises";
import { formatDateToRevisionName } from "../utils/format";

function bup(args: string[], repo: string, options?: SpawnOptionsWithoutStdio) {
  const spawned = spawn("bup", args, {
    ...options,
    env: { BUP_DIR: repo, ...options?.env },
  });
  console.info(spawned.spawnargs.join(" "));
  return spawned;
}

function git(args: string[], repo: string, options?: SpawnOptionsWithoutStdio) {
  const spawned = spawn("git", ["--no-pager", ...args], {
    ...options,
    env: { GIT_DIR: repo, ...options?.env },
  });
  console.info(spawned.spawnargs.join(" "));
  return spawned;
}

function du(args: string[], options?: SpawnOptionsWithoutStdio) {
  const spawned = spawn("du", args, {
    ...options,
  });
  console.info(spawned.spawnargs.join(" "));
  return spawned;
}

function readProcess(operation: ChildProcessWithoutNullStreams) {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const streamHandler = (dataArray: string[]) => (input: any) => {
    const lines: string[] = input.toString().split("\n");
    lines.forEach((l) => console.info(`  ${l}`));
    dataArray.push(...lines);
  };

  operation.stdout.on("data", streamHandler(stdout));
  operation.stderr.on("data", streamHandler(stderr));

  return new Promise<{
    stdout: string[];
    stderr: string[];
    code: number | null;
    error?: string;
  }>((res) => {
    operation.on("exit", (code) => {
      res({
        stdout,
        stderr,
        code,
        error: stderr.map((x) => x.trim()).join("") || undefined,
      });
    });
  });
}

export async function initializeRepository(r: string) {
  const init = bup(["init"], r);
  const { stderr, code } = await readProcess(init);
  if (code !== 0) {
    throw new Error(`Failed to initialize, code ${code}\n${stderr.join("\n")}`);
  }
}

export async function index(b: Backup, source: string) {
  const args = b.exclude
    ? ["index", "-v", "-v", "--exclude-rx", b.exclude, source]
    : ["index", "-v", "-v", source];
  const index = bup(args, getBackupDir(b), {
    env: { BUP_SOURCE: source },
  });
  const { stderr, code } = await readProcess(index);
  if (code !== 0) {
    throw new Error(`Failed to index, code ${code}\n${stderr.join("\n")}`);
  }
}

export async function save(b: Backup) {
  const pathPairs = b.sources.map((p, i) => [`BUP_PATH_${i}`, p]);
  const save = bup(
    ["save", "-v", "-v", `--name=${b.name}`, ...pathPairs.map(([, p]) => p)],
    getBackupDir(b)
  );
  const { stderr, code } = await readProcess(save);
  if (code !== 0) {
    throw new Error(`Failed to save, code ${code}\n${stderr.join("\n")}`);
  }
}

/**
 * Renames the backup's branch name, and moves the backup to a new location
 */
export async function rename(b: Backup, newName: string) {
  const mv = git(["branch", "-m", b.name, newName], getBackupDir(b));
  const { stderr, code } = await readProcess(mv);
  if (code === 0) {
    await fsRename(getBackupDir(b), getBackupDir({ ...b, name: newName }));
  } else {
    throw new Error(`Failed to rename, code ${code}\n${stderr.join("\n")}`);
  }
}

export async function checkBranchCommited(b: Backup) {
  const branch = git(["log", "-1", "--format=%ct", b.name], getBackupDir(b));
  const { stdout, code, error } = await readProcess(branch);

  const output = stdout.join("\n").trim();

  if (code === 0 && !error) {
    return new Date(Number(output) * 1_000);
  } else if (error?.includes("unknown revision")) {
    return undefined;
  } else {
    throw new Error(`${error}: ${code}`);
  }
}

export async function getBranchRevisions(b: Backup) {
  const log = git(["log", "--pretty=%aI", b.name], getBackupDir(b));
  const { stdout, stderr, code, error } = await readProcess(log);
  if (code === 0 && !error) {
    return stdout.filter((x) => x.length > 0).map((x) => new Date(x.trim()));
  } else if (error?.includes("unknown revision")) {
    return [];
  } else {
    throw new Error(stderr.join("\n").trim() ?? `code ${code}`);
  }
}

export async function checkBranchBytes(b: Backup) {
  const revList = du(["-sb", getBackupDir(b)]);
  const { stdout, stderr, code, error } = await readProcess(revList);
  if (code === 0 && !error) {
    return Number(
      stdout
        .join("")
        .trim()
        .match(/[0-9]+/)?.[0]
    );
  } else if (error?.includes("unknown revision")) {
    return undefined;
  } else {
    throw new Error(stderr.join("\n").trim() ?? `code ${code}`);
  }
}

export async function removeRevision(b: Backup, rev: Date) {
  const revisionName = formatDateToRevisionName(rev);
  const rm = bup(
    ["rm", `/${b.name}/${revisionName}`, "--unsafe", "-v"],
    getBackupDir(b)
  );
  const { stderr, code } = await readProcess(rm);
  if (code !== 0) {
    throw new Error(
      `Failed to remove revision, code ${code}\n${stderr.join("\n")}`
    );
  }
}

export async function gc(b: Backup) {
  const gcProcess = bup(["gc", "--unsafe", "-v"], getBackupDir(b));
  const { stderr, code } = await readProcess(gcProcess);
  if (code !== 0) {
    throw new Error(`Failed to gc, code ${code}\n${stderr.join("\n")}`);
  }
}

export async function prune(b: Backup) {
  const pruneProcess = bup(
    [
      "prune-older",
      // "--keep-all-for",
      // "1d",
      "--keep-dailies-for",
      "1w",
      "--keep-monthlies-for",
      "1y",
      "--keep-yearlies-for",
      "forever",
      "--unsafe",
    ],
    getBackupDir(b)
  );
  const { stderr, code } = await readProcess(pruneProcess);
  if (code !== 0) {
    throw new Error(`Failed to gc, code ${code}\n${stderr.join("\n")}`);
  }
}

export async function restore(b: Backup, revision: Date, subpath: string) {
  const restore = bup(
    [
      "restore",
      `--outdir=${getRestoreDir(b)}`,
      "-q",
      `/${b.name}/${formatDateToRevisionName(revision)}${
        subpath.startsWith("/") ? subpath : `/${subpath}`
      }`,
    ],
    getBackupDir(b)
  );
  const { stderr, code } = await readProcess(restore);
  return [stderr, code] as const;
}
