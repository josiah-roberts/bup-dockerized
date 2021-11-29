import { Repository, Backup } from "../../types/config";
import {
  spawn,
  SpawnOptionsWithoutStdio,
  ChildProcessWithoutNullStreams,
} from "child_process";

function bup(
  args: string[],
  repo: Repository,
  options?: SpawnOptionsWithoutStdio
) {
  const spawned = spawn("bup", args, {
    ...options,
    env: { BUP_DIR: repo.path, ...options?.env },
  });
  console.info(spawned.spawnargs.join(" "));
  return spawned;
}

function git(
  args: string[],
  repo: Repository,
  options?: SpawnOptionsWithoutStdio
) {
  const spawned = spawn("git", ["--no-pager", ...args], {
    ...options,
    env: { GIT_DIR: repo.path, ...options?.env },
  });
  console.info(spawned.spawnargs.join(" "));
  return spawned;
}

function readProcess(
  operation: ChildProcessWithoutNullStreams,
  exitHandler: (stdout: string[], stderr: string[], code: number | null) => void
) {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const streamHandler = (dataArray: string[]) => (input: any) => {
    const lines: string[] = input.toString().split("\n");
    lines.forEach((l) => console.info(`  ${l}`));
    dataArray.push(...lines);
  };

  operation.stdout.on("data", streamHandler(stdout));
  operation.stderr.on("data", streamHandler(stderr));

  operation.on("exit", (code) => {
    exitHandler(stdout, stderr, code);
  });
}

export function initializeRepository(r: Repository) {
  return new Promise<void>((res, rej) => {
    const init = bup(["init"], r);
    readProcess(init, (stdout, stderr, code) => {
      if (code === 0) res();
      else rej(code);
    });
  });
}

export function index(r: Repository, source: string) {
  return new Promise<void>((res, rej) => {
    const index = bup(["index", "-v", "-v", source], r, {
      env: { BUP_SOURCE: source },
    });
    readProcess(index, (stdout, stderr, code) => {
      if (code === 0) res();
      else rej(code);
    });
  });
}

export function save(r: Repository, b: Backup) {
  return new Promise<void>((res, rej) => {
    const pathPairs = b.sources.map((p, i) => [`BUP_PATH_${i}`, p]);

    const save = bup(
      ["save", "-v", "-v", `--name=${b.name}`, ...pathPairs.map(([, p]) => p)],
      r
    );
    readProcess(save, (stdout, stderr, code) => {
      if (code === 0) res();
      else rej(code);
    });
  });
}

export function rename(r: Repository, oldName: string, newName: string) {
  return new Promise<void>((res, rej) => {
    const mv = git(["branch", "-m", oldName, newName], r);
    readProcess(mv, (stdout, stderr, code) => {
      if (code === 0) res();
      else rej(code);
    });
  });
}

export function checkBranchCommited(r: Repository, b: Backup) {
  return new Promise<Date | undefined>((res, rej) => {
    const branch = git(["log", "-1", "--format=%ct", b.name], r);

    readProcess(branch, (stdout, stderr, code) => {
      const error = stderr.join("\n").trim();
      const output = stdout.join("\n").trim();

      if (code === 0 && !error) {
        res(new Date(Number(output) * 1_000));
      } else if (error.includes("unknown revision")) {
        res(undefined);
      } else {
        rej(error ?? code);
      }
    });
  });
}

export function getBranchRevisions(r: Repository, b: Backup) {
  return new Promise<Date[] | undefined>((res, rej) => {
    const log = git(["log", "--pretty=%aI", b.name], r);
    readProcess(log, (stdout, stderr, code) => {
      const error = stderr.join("\n").trim();

      if (code === 0 && !error) {
        res(stdout.filter((x) => x.length > 0).map((x) => new Date(x.trim())));
      } else if (error.includes("unknown revision")) {
        res(undefined);
      } else {
        rej(error ?? code);
      }
    });
  });
}

export function checkBranchBytes(r: Repository, b: Backup) {
  return new Promise<number | undefined>((res, rej) => {
    const revList = git(
      ["rev-list", "--disk-usage", "--use-bitmap-index", "--objects", b.name],
      r
    );

    readProcess(revList, (stdout, stderr, code) => {
      const error = stderr.join("\n").trim();
      const output = stdout.join("\n").trim();

      if (code === 0 && !error) {
        res(Number(output));
      } else if (error.includes("unknown revision")) {
        res(undefined);
      } else {
        rej(error ?? code);
      }
    });
  });
}
