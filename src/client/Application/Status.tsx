import { useCallback, useEffect, useState } from "preact/hooks";
import { Config } from "../../types/config";
import { parseExpression } from "cron-parser";
import {
  addDays,
  format,
  formatDistanceToNow,
  getMilliseconds,
  getMinutes,
  startOfDay,
  subHours,
  getSeconds,
} from "date-fns";
import { useTick } from "../hooks/useTick";

export const Status = ({ config }: { config: Config }) => {
  const tick = useTick(60_000);

  useEffect(() => {
    console.log("Ticked! %s", tick);
  }, [tick]);

  const nextRun = useCallback(
    (cronLine: string) => parseExpression(cronLine).next().toDate(),
    [tick]
  );

  return (
    <div>
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
                  </span>
                  /{backup.name} {backup.cronLine}
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
