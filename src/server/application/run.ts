import { Backup, Repository } from "../../types/config";
import { index, save } from "./bup-actions";
import { emit } from "./events";
import {
  clearRunningStatus,
  getStatus,
  setRunningStatus,
} from "./status-repository";

export async function run(r: Repository, b: Backup) {
  const status = await getStatus(r, b);
  if (!status.runnability.runnable) {
    emit(
      "client-error",
      `Cannot run backup. ${status.runnability.reason}` +
        (status.runnability.reason === "sources-inaccessable"
          ? `: ${status.runnability.inacessableSources.join(", ")}`
          : "")
    );
    return;
  }

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
