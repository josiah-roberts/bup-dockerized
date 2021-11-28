import { Repository, Backup } from "../../types/config";
import { spawn, SpawnOptionsWithoutStdio } from "child_process";

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
  const spawned = spawn("git", args, {
    ...options,
    env: { GIT_DIR: repo.path, ...options?.env },
  });
  console.info(spawned.spawnargs.join(" "));
  return spawned;
}

export function initializeRepository(r: Repository) {
  return new Promise<void>((res, rej) => {
    const init = bup(["init"], r);
    init.stdout.on("data", (data) => {
      console.info(data.toString());
    });
    init.stderr.on("data", (data) => {
      console.info(data.toString());
    });
    init.on("exit", (code) => {
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
    index.stdout.on("data", (data) => {
      console.info(data.toString());
    });
    index.stderr.on("data", (data) => {
      console.info(data.toString());
    });
    index.on("exit", (code) => {
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

    save.stdout.on("data", (data) => {
      console.info(data.toString());
    });
    save.stderr.on("data", (data) => {
      console.info(data.toString());
    });
    save.on("exit", (code) => {
      if (code === 0) res();
      else rej(code);
    });
  });
}

export function rename(r: Repository, oldName: string, newName: string) {
  return new Promise<void>((res, rej) => {
    const mv = git(["branch", "-m", oldName, newName], r);

    mv.stdout.on("data", (data) => {
      console.info(data.toString());
    });
    mv.stderr.on("data", (data) => {
      console.info(data.toString());
    });
    mv.on("exit", (code) => {
      if (code === 0) res();
      else rej(code);
    });
  });
}

export function checkBranchCommited(r: Repository, b: Backup) {
  return new Promise<Date | void>((res, rej) => {
    const branch = git(["log", "-1", "--format=%ct", b.name], r);

    const stdout: string[] = [];
    const stderr: string[] = [];
    branch.stdout.on("data", (data) => stdout.push(data.toString()));
    branch.stderr.on("data", (data) => stderr.push(data.toString()));

    branch.on("exit", (code) => {
      const error = stderr.join("\n").trim();
      const output = stdout.join("\n").trim();

      if (code === 0 && !error) {
        res(new Date(Number(output) * 1_000));
      } else if (error.includes("unknown revision")) {
        res();
      } else {
        rej(error ?? code);
      }
    });
  });
}

export function checkBranchBytes(r: Repository, b: Backup) {
  return new Promise<number | void>((res, rej) => {
    const revList = git(["rev-list", "--disk-usage", "--objects", b.name], r);

    const stdout: string[] = [];
    const stderr: string[] = [];
    revList.stdout.on("data", (data) => stdout.push(data.toString()));
    revList.stderr.on("data", (data) => stderr.push(data.toString()));

    revList.on("exit", (code) => {
      const error = stderr.join("\n").trim();
      const output = stdout.join("\n").trim();

      if (code === 0 && !error) {
        res(Number(output));
      } else if (error.includes("unknown revision")) {
        res();
      } else {
        rej(error ?? code);
      }
    });
  });
}

export async function run(r: Repository, b: Backup) {
  for (const source of b.sources) {
    await index(r, source);
  }
  await save(r, b);
}
