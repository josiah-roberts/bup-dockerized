import { parseExpression } from "cron-parser";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { useCallback, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import { Backup, Repository } from "../../types/config";
import { AsEditable } from "../components/AsEditable";
import { useCommand } from "../hooks/useCommand";
import { useSubscription } from "../hooks/useSubscription";
import { useTick } from "../hooks/useTick";

const EditableSpan = AsEditable("span");

const Bar = (props: JSX.IntrinsicElements["span"]) => (
  <span {...props} class="bar" />
);

export const BackupStatus = ({
  backup,
  repository,
}: {
  backup: Backup;
  repository: Repository;
}) => {
  const tick = useTick(60_000);

  const [editName, setEditName] = useState(backup.name);
  const [editCronline, setEditCronline] = useState(backup.cronLine);

  const [runNow] = useCommand("run-now");
  const [getConfig] = useCommand("get-config");
  const [editBackup, eb] = useCommand("edit-backup");

  useSubscription(
    "edit-backup",
    useCallback(
      (m) => {
        if ("error" in m) {
          console.log("errored", m);
          setEditName(backup.name);
          alert(m.error);
        } else {
          console.log("Did not error", m);
        }
        getConfig();
      },
      [getConfig]
    ),
    eb
  );

  const nextRun = useCallback(
    (cronLine: string) => parseExpression(cronLine).next().toDate(),
    [tick]
  );

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
        <button onClick={() => runNow({ id: backup.id })}>Run now</button>
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
          {backup.lastRun ? (
            <>
              <span>ran </span>
              <span
                class="dot-underline"
                title={new Date(backup.lastRun).toLocaleString()}
              >
                {formatDistanceToNow(new Date(backup.lastRun))} ago
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
      </div>
    </div>
  );
};
