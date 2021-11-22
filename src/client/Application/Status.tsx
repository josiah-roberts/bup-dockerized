import { useCallback, useEffect, useState } from "preact/hooks";
import { Config } from "../../types/config";
import { parseExpression } from "cron-parser";
import {
  addDays,
  format,
  formatDistanceToNow,
  getMinutes,
  startOfDay,
  subHours,
  getSeconds,
} from "date-fns";
import { useTick } from "../hooks/useTick";
import { Editable } from "../components/Editable";
import { AsEditable } from "../components/AsEditable";
import { useCommand } from "../hooks/useCommand";

const EditableSpan = AsEditable("span");

export const Status = ({
  config,
  onChange,
}: {
  config: Config;
  onChange?: () => void;
}) => {
  const tick = useTick(60_000);

  const [editBackup] = useCommand("edit-backup", onChange);

  useEffect(() => {
    console.log("Ticked! %s", tick);
  }, [tick]);

  const nextRun = useCallback(
    (cronLine: string) => parseExpression(cronLine).next().toDate(),
    [tick]
  );

  return (
    <div class="card">
      {config.repositories.map((repository) => (
        <div>
          {config.backups
            .filter((x) => x.repository === repository.name)
            .map((backup) => (
              <div>
                <h3>
                  <span style={{ color: "grey" }}>
                    {
                      config.repositories.find(
                        (x) => x.name === backup.repository
                      )?.path
                    }
                    /
                  </span>
                  <EditableSpan
                    onSubmit={(value, old) =>
                      editBackup({ backup: { ...backup, name: value } })
                    }
                  >
                    {backup.name}
                  </EditableSpan>{" "}
                  {backup.cronLine}
                </h3>
                <div>
                  {backup.lastRun
                    ? `last ran ${formatDistanceToNow(
                        new Date(backup.lastRun)
                      )} ago`
                    : "never run"}
                  {" >"} running in{" "}
                  {formatDistanceToNow(nextRun(backup.cronLine))}
                </div>
                <div></div>
                <ul>
                  {backup.sources.map((source) => (
                    <li>{source}</li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
};
