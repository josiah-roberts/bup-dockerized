import { Backup, Repository } from "../../types/config";
import { index, save } from "./bup-actions";
import { clearRunningStatus, setRunningStatus } from "./status-repository";

export async function run(r: Repository, b: Backup) {
  try {
    setRunningStatus(r, b, "indexing");
    for (const source of b.sources) {
      await index(r, source);
    }
    setRunningStatus(r, b, "saving");
    await save(r, b);
  } finally {
    clearRunningStatus(r, b);
  }
}
