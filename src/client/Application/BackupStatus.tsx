import { parseExpression } from "cron-parser";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { useCallback, useEffect, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import { Backup, Repository } from "../../types/config";
import { BackupStatus } from "../../types/status";
import { AsEditable } from "../components/AsEditable";
import { useCommand } from "../hooks/useCommand";
import { useSubscription } from "../hooks/useSubscription";
import { useTick } from "../hooks/useTick";

const EditableSpan = AsEditable("span");

const Bar = (props: JSX.IntrinsicElements["span"]) => (
  <span {...props} class="bar" />
);

export const BackupStatusPanel = ({
  backup,
  repository,
}: {
  backup: Backup;
  repository: Repository;
}) => {
  const tick = useTick(60_000);

  const [editName, setEditName] = useState(backup.name);
  const [addPath, setAddPath] = useState("add source");

  const [editCronline, setEditCronline] = useState(backup.cronLine);
  const [status, setStatus] = useState<BackupStatus>();

  const [runNow, rn] = useCommand("run-now");
  const [editBackup, eb] = useCommand("edit-backup");
  const [getStatus, gs] = useCommand("get-backup-status");

  useEffect(() => {
    getStatus({ id: backup.id });
  }, [backup.id]);

  useSubscription(
    "client-error",
    useCallback(
      (m) => {
        console.log("errored", m);
        setEditName(backup.name);
        alert(m.error);
      },
      [eb]
    ),
    eb
  );

  useSubscription(
    "backup-status",
    useCallback(
      (m) => {
        setStatus(m.status);
      },
      [rn, gs, eb]
    ),
    [rn, gs, eb]
  );

  const nextRun = useCallback(
    (cronLine: string) => parseExpression(cronLine).next().toDate(),
    [tick]
  );

  const canRunNow = () =>
    status?.runnability.runnable &&
    (status?.status === "idle" || status?.status === "never-run");

  return (
    <div>
      <h3>
        <span style={{ color: "grey" }}>{repository.path}/</span>
        <EditableSpan
          onSubmit={(value) =>
            editBackup({ backup: { ...backup, name: value } })
          }
          onInput={(value) => setEditName(value)}
          onReset={() => setEditName(backup.name)}
          value={editName}
        />
      </h3>
      <ul class="sources-list">
        {backup.sources.map((source) => (
          <li key={source}>
            {source}{" "}
            <span
              class="small underline pointer"
              onClick={() =>
                editBackup({
                  backup: {
                    ...backup,
                    sources: backup.sources.filter((x) => x !== source),
                  },
                })
              }
            >
              remove
            </span>
          </li>
        ))}
        <li>
          <EditableSpan
            class="small underline pointer"
            value={addPath}
            onInput={(value) => setAddPath(value)}
            onSubmit={(value) => {
              editBackup({
                backup: { ...backup, sources: [...backup.sources, value] },
              });
              setAddPath("add source");
            }}
            onReset={() => setAddPath("add source")}
          />
        </li>
      </ul>
      <div>
        <EditableSpan
          onSubmit={(value) =>
            editBackup({ backup: { ...backup, cronLine: value } })
          }
          onInput={(value) => setEditCronline(value)}
          onReset={() => setEditCronline(backup.cronLine)}
          value={editCronline}
        />
        <Bar style={{ color: "DarkGray" }} />
        <span style={{ color: "DarkGray" }}>
          {status?.lastRun ? (
            <>
              <span>ran </span>
              <span
                class="dot-underline"
                title={new Date(status.lastRun).toLocaleString()}
              >
                {formatDistanceToNow(new Date(status.lastRun))} ago
              </span>
            </>
          ) : (
            "never run"
          )}
        </span>
        <Bar style={{ color: "DarkGray" }} />
        <span style={{ color: "DarkGray" }}>running in </span>
        <span
          class="dot-underline"
          style={{ color: "DarkGray" }}
          title={nextRun(backup.cronLine).toLocaleString()}
        >
          {formatDistanceToNow(nextRun(backup.cronLine))}
        </span>
        <Bar />
        {canRunNow() && (
          <>
            <span>🏃 </span>
            <span
              class="pointer underline"
              style={{ color: "DarkGray" }}
              onClick={() => runNow({ id: backup.id })}
            >
              run now
            </span>
          </>
        )}
        {status?.runnability.runnable === false && (
          <span
            class="dot-underline"
            style={{ color: "DarkGray" }}
            title={
              "inacessableSources" in status.runnability
                ? status.runnability.inacessableSources.join(", ")
                : undefined
            }
          >
            {status.runnability.reason.replace("-", " ")}
          </span>
        )}
        {!canRunNow() && status?.runnability.runnable && (
          <span style={{ color: "DarkGray" }}>
            {status.status === "indexing" ? "🔦" : "💾"} {status.status}
          </span>
        )}
      </div>
    </div>
  );
};
