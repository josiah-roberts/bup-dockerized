import { Backup } from "../../types/config"
import {
  spawn,
  SpawnOptionsWithoutStdio,
  ChildProcessWithoutNullStreams,
} from "child_process"
import { getBackupDir } from "./config-repository"
import { rename as fsRename } from "fs/promises"

function bup(args: string[], repo: string, options?: SpawnOptionsWithoutStdio) {
  const spawned = spawn("bup", args, {
    ...options,
    env: { BUP_DIR: repo, ...options?.env },
  })
  console.info(spawned.spawnargs.join(" "))
  return spawned
}

function git(args: string[], repo: string, options?: SpawnOptionsWithoutStdio) {
  const spawned = spawn("git", ["--no-pager", ...args], {
    ...options,
    env: { GIT_DIR: repo, ...options?.env },
  })
  console.info(spawned.spawnargs.join(" "))
  return spawned
}

function du(args: string[], options?: SpawnOptionsWithoutStdio) {
  const spawned = spawn("du", args, {
    ...options,
  })
  console.info(spawned.spawnargs.join(" "))
  return spawned
}

function readProcess(
  operation: ChildProcessWithoutNullStreams,
  exitHandler: (stdout: string[], stderr: string[], code: number | null) => void
) {
  const stdout: string[] = []
  const stderr: string[] = []

  const streamHandler = (dataArray: string[]) => (input: any) => {
    const lines: string[] = input.toString().split("\n")
    lines.forEach((l) => console.info(`  ${l}`))
    dataArray.push(...lines)
  }

  operation.stdout.on("data", streamHandler(stdout))
  operation.stderr.on("data", streamHandler(stderr))

  operation.on("exit", (code) => {
    exitHandler(stdout, stderr, code)
  })
}

export function initializeRepository(r: string) {
  return new Promise<void>((res, rej) => {
    const init = bup(["init"], r)
    readProcess(init, (stdout, stderr, code) => {
      if (code === 0) res()
      else
        rej(new Error(`Failed initialize, code ${code}\n${stderr.join("\n")}`))
    })
  })
}

export function index(b: Backup, source: string) {
  return new Promise<void>((res, rej) => {
    const args = b.exclude
      ? ["index", "-v", "-v", "--exclude-rx", b.exclude, source]
      : ["index", "-v", "-v", source]
    const index = bup(args, getBackupDir(b), {
      env: { BUP_SOURCE: source },
    })
    readProcess(index, (stdout, stderr, code) => {
      if (code === 0) res()
      else rej(new Error(`Failed to index, code ${code}\n${stderr.join("\n")}`))
    })
  })
}

export function save(b: Backup) {
  return new Promise<void>((res, rej) => {
    const pathPairs = b.sources.map((p, i) => [`BUP_PATH_${i}`, p])

    const save = bup(
      ["save", "-v", "-v", `--name=${b.name}`, ...pathPairs.map(([, p]) => p)],
      getBackupDir(b)
    )
    readProcess(save, (stdout, stderr, code) => {
      if (code === 0) res()
      else rej(new Error(`Failed to save, code ${code}\n${stderr.join("\n")}`))
    })
  })
}

/**
 * Renames the backup's branch name, and moves the backup to a new location
 */
export function rename(b: Backup, newName: string) {
  return new Promise<void>((res, rej) => {
    const mv = git(["branch", "-m", b.name, newName], getBackupDir(b))
    readProcess(mv, (stdout, stderr, code) => {
      if (code === 0) res()
      else rej(new Error(`Failed rename, code ${code}\n${stderr.join("\n")}`))
    })
  }).then(() =>
    fsRename(getBackupDir(b), getBackupDir({ ...b, name: newName }))
  )
}

export function checkBranchCommited(b: Backup) {
  return new Promise<Date | undefined>((res, rej) => {
    const branch = git(["log", "-1", "--format=%ct", b.name], getBackupDir(b))

    readProcess(branch, (stdout, stderr, code) => {
      const error = stderr.join("\n").trim()
      const output = stdout.join("\n").trim()

      if (code === 0 && !error) {
        res(new Date(Number(output) * 1_000))
      } else if (error.includes("unknown revision")) {
        res(undefined)
      } else {
        rej(error ?? code)
      }
    })
  })
}

export function getBranchRevisions(b: Backup) {
  return new Promise<Date[]>((res, rej) => {
    const log = git(["log", "--pretty=%aI", b.name], getBackupDir(b))
    readProcess(log, (stdout, stderr, code) => {
      const error = stderr.join("\n").trim()

      if (code === 0 && !error) {
        res(stdout.filter((x) => x.length > 0).map((x) => new Date(x.trim())))
      } else if (error.includes("unknown revision")) {
        res([])
      } else {
        rej(error ?? code)
      }
    })
  })
}

export function checkBranchBytes(b: Backup) {
  return new Promise<number | undefined>((res, rej) => {
    const revList = du(["-sb", getBackupDir(b)])

    readProcess(revList, (stdout, stderr, code) => {
      const error = stderr.join("\n").trim()
      const output = stdout.join("\n").trim()

      if (code === 0 && !error) {
        res(Number(output.match(/[0-9]+/)?.[0]))
      } else if (error.includes("unknown revision")) {
        res(undefined)
      } else {
        rej(error ?? code)
      }
    })
  })
}

export async function removeRevision(b: Backup, rev: Date) {
  await new Promise<void>((res, rej) => {
    const revisionName = `${rev.getUTCFullYear()}-${(rev.getUTCMonth() + 1)
      .toString()
      .padStart(2, "0")}-${rev.getUTCDate().toString().padStart(2, "0")}-${rev
      .getUTCHours()
      .toString()
      .padStart(2, "0")}${rev.getUTCMinutes().toString().padStart(2, "0")}${rev
      .getUTCSeconds()
      .toString()
      .padStart(2, "0")}`
    const rm = bup(
      ["rm", `/${b.name}/${revisionName}`, "--unsafe", "-v"],
      getBackupDir(b)
    )
    readProcess(rm, (stdout, stderr, code) => {
      const error = stderr.join("\n").trim()
      const output = stdout.join("\n").trim()

      if (code === 0) {
        res()
      } else {
        rej(error ?? code)
      }
    })
  })
  await new Promise<void>((res, rej) => {
    const rm = bup(["gc", "--unsafe", "-v"], getBackupDir(b))
    readProcess(rm, (_, stderr, code) => {
      const error = stderr.join("\n").trim()

      if (code === 0) {
        res()
      } else {
        rej(error ?? code)
      }
    })
  })
}
