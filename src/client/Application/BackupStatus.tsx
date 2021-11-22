import { parseExpression } from "cron-parser";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { useCallback, useState } from "preact/hooks";
import { Backup, Repository } from "../../types/config";
import { AsEditable } from "../components/AsEditable";
import { useCommand } from "../hooks/useCommand";
import { useSubscription } from "../hooks/useSubscription";
import { useTick } from "../hooks/useTick";

const EditableSpan = AsEditable("span");

export const BackupStatus = ({
  backup,
  repository,
}: {
  backup: Backup;
  repository: Repository;
}) => {
  const tick = useTick(60_000);

  const [editName, setEditName] = useState(backup.name);
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
          class="underline"
          onSubmit={(value) =>
            editBackup({ backup: { ...backup, name: value } })
          }
          onInput={(value) => setEditName(value)}
          onReset={() => setEditName(backup.name)}
          value={editName}
        />{" "}
        {backup.cronLine}
      </h3>
      <div>
        {backup.lastRun
          ? `last ran ${formatDistanceToNow(new Date(backup.lastRun))} ago`
          : "never run"}
        {" >"} running in {formatDistanceToNow(nextRun(backup.cronLine))}
      </div>
      <div></div>
      <ul>
        {backup.sources.map((source) => (
          <li key={source}>{source}</li>
        ))}
      </ul>
    </div>
  );
};
