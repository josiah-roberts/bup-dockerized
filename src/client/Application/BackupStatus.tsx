import { parseExpression } from "cron-parser";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { useCallback, useEffect, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import { Backup } from "../../types/config";
import { BackupStatus } from "../../types/status";
import { AsEditable } from "../components/AsEditable";
import { useCommand } from "../hooks/useCommand";
import { useSubscription } from "../hooks/useSubscription";
import { useTick } from "../hooks/useTick";
import filesize from "filesize";

const EditableSpan = AsEditable("span");

const Bar = (props: JSX.IntrinsicElements["span"]) => (
  <span {...props} class="bar" />
);

export const BackupStatusPanel = ({
  backup,
  rootPath,
}: {
  backup: Backup;
  rootPath: string;
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
        setEditName(backup.name);
        setEditCronline(backup.cronLine);
        setAddPath("add source");
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
        // We aren't limiting to correlation,
        // so we need to filter out status changes for other
        // backups
        if (m.status.backupId === backup.id) {
          setStatus(m.status);
        }
      },
      [rn, gs, eb]
    )
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
      <h3 style={{ marginBottom: 0 }}>
        <span class="grey">{rootPath}/</span>
        <EditableSpan
          onSubmit={(value) =>
            editBackup({ backup: { ...backup, name: value } })
          }
          onInput={(value) => setEditName(value)}
          onReset={() => setEditName(backup.name)}
          value={editName}
        />
      </h3>
      {status?.lastRun && !status?.branchSize && (
        <span class="italic small bold grey">Computing size...</span>
      )}
      {status?.lastRun && status.branchSize && (
        <>
          <span class="italic small bold grey">
            {filesize(status.branchSize, { round: 1 })}
          </span>
        </>
      )}
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
        <Bar class="grey" />
        <span class="grey">
          {status?.lastRun ? (
            <>
              <span>ran </span>
              <span
                class="hint"
                title={new Date(status.lastRun).toLocaleString()}
              >
                {formatDistanceToNow(new Date(status.lastRun))} ago
              </span>
            </>
          ) : (
            "never run"
          )}
        </span>
        <Bar class="grey" />
        <span class="grey">running in </span>
        <span
          class="hint"
          style={{ color: "Darkgrey" }}
          title={nextRun(backup.cronLine).toLocaleString()}
        >
          {formatDistanceToNow(nextRun(backup.cronLine))}
        </span>
        <Bar />
        {canRunNow() && (
          <>
            <span>🏃 </span>
            <span class="pointer" onClick={() => runNow({ id: backup.id })}>
              run now
            </span>
          </>
        )}
        {status?.runnability.runnable === false && (
          <span
            class="hint"
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
          <span>
            {status.status === "indexing" ? "🔦" : "💾"} {status.status}
          </span>
        )}
      </div>
    </div>
  );
};
