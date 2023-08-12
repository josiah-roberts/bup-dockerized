import { Backup } from "../../types/config"
import { index, save } from "./bup-actions"
import { emit } from "./events"
import {
  clearRunningStatus,
  getStatus,
  setRunningStatus,
} from "./status-repository"

export async function run(b: Backup) {
  const status = await getStatus(b)
  if (!status.runnability.runnable) {
    emit(
      "client-error",
      `Cannot run backup. ${status.runnability.reason}` +
        (status.runnability.reason === "sources-inaccessable"
          ? `: ${status.runnability.inacessableSources.join(", ")}`
          : "")
    )
    return
  }

  try {
    await setRunningStatus(b, "indexing")
    for (const source of b.sources) {
      await index(b, source)
    }
    await setRunningStatus(b, "saving")
    await save(b)
  } finally {
    await clearRunningStatus(b)
  }
}
