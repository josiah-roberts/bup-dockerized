import { Backup, Config } from "../../types/config";
import { run } from "./run";
import { CronJob } from "cron";
import { emit } from "./events";
import { getStatus } from "./status-repository";

const tasks: Record<
  string,
  { job: CronJob; donePromise: Promise<void> } | undefined
> = {};

const backupRunner = (b: Backup) => async () => {
  console.info(`Cron schedule fired for for ${b.name}`);

  const executingTask = tasks[b.id];
  if (!executingTask) {
    const error = `Backup was deleted: ${b.name}`;
    console.error(error);
    emit("client-error", error);
    return;
  }
  const status = await getStatus(b);
  if (status.status === "saving" || status.status === "indexing") {
    const error = `Backup is already currently executing: ${b.name}`;
    console.error(error);
    emit("client-error", error);
    return;
  }

  tasks[b.id] = {
    job: executingTask.job,
    donePromise: executingTask.donePromise
      .finally(() => console.info(`Starting scheduled execution for ${b.name}`))
      .finally(() => run(b))
      .finally(() =>
        console.info(`Finished scheduled execution for ${b.name}`)
      ),
  };
};

export function maintainRunners(config: Config) {
  for (const b of config.backups) {
    const existingTask = tasks[b.id];
    if (existingTask) {
      const stopOnDone = existingTask.donePromise.finally(() => {
        console.info(
          `Stopping and garbage-collecting existing cron handler for ${b.name}`
        );
        existingTask.job.stop();
      });
      console.info(`Rebuilding cron handler for ${b.name}`);
      const newJob = new CronJob(b.cronLine, backupRunner(b));
      tasks[b.id] = {
        donePromise: stopOnDone,
        job: newJob,
      };
      newJob.start();
    } else {
      console.info(`Adding first time cron handler for ${b.name}`);
      const newJob = new CronJob(b.cronLine, backupRunner(b));
      tasks[b.id] = {
        donePromise: Promise.resolve(),
        job: newJob,
      };
      newJob.start();
    }
  }

  for (const [id, task] of Object.entries(tasks)) {
    if (id && task && !config.backups.some((b) => b.id === id)) {
      console.info(`Stopping backup because it has been removed ${id}`);
      task.job.stop();
    }
  }
}
