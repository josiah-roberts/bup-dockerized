import { Backup } from "../../types/config";
import { index, save } from "./bup-actions";
import { emit } from "./events";
import {
  clearRunningStatus,
  getStatus,
  setRunningStatus,
} from "./status-repository";

export async function run(b: Exclude<Backup, { type: "monitoring" }>) {
  const status = await getStatus(b);
  if (!status.readiness.runnable) {
    emit(
      "client-error",
      `Cannot run backup. ${status.readiness.reason}` +
        (status.readiness.reason === "sources-inaccessible"
          ? `: ${status.readiness.inaccessibleSources.join(", ")}`
          : "")
    );
    return;
  }

  try {
    await setRunningStatus(b, "indexing");
    for (const source of b.sources) {
      await index(b, source);
    }
    await setRunningStatus(b, "saving");
    await save(b);
  } finally {
    await clearRunningStatus(b);
  }
}
