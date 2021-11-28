import { Backup, Repository } from "../../types/config";
import { lstat } from "fs";
import { checkBranchCommited, checkBranchBytes } from "./bup-actions";

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

export async function determineStatus(repository: Repository, backup: Backup) {
  const sourceStatus = await Promise.all(
    backup.sources.map(async (source) => ({
      source,
      accessable: await isAccessableDir(source),
    }))
  );
  const branchStatus = await checkBranchCommited(repository, backup);
  const branchSize = await checkBranchBytes(repository, backup);
  console.log({ sourceStatus, branchStatus, branchSize });
}
