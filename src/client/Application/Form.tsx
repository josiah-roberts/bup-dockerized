import React from "preact";
import { useCallback, useState } from "preact/hooks";
import { useClosed } from "../hooks/useClosed";
import { useOpened } from "../hooks/useOpened";
import { useCommand } from "../hooks/useCommand";
import { Backup, Config } from "../../types/config";
import { ServerMessage } from "../../types/commands";
import { Status } from "./Status";

export const Form = () => {
  const [config, setConfig] = useState<Config>();
  const [newBackupName, setNewBackupName] = useState<string>("");
  const [newBackupSources, setNewBackupSources] = useState<string>("");
  const [newBackupCronLine, setNewBackupCronLine] = useState<string>("");

  const [getConfig] = useCommand(
    "get-config",
    useCallback(
      ({ config }: ServerMessage<"get-config">) => {
        setConfig(config);
      },
      [setConfig]
    )
  );

  const reloadBackups = useCallback(
    (msg: ServerMessage<"add-backup" | "remove-backup">) => {
      if ("error" in msg) alert(msg.error);
      else getConfig();
    },
    [getConfig]
  );

  const [addBackup] = useCommand("add-backup", reloadBackups);
  const [removeBackup] = useCommand("remove-backup", reloadBackups);

  useOpened(() => {
    getConfig();
  });
  useClosed(() => {
    setTimeout(() => location.reload(), 500);
  });

  return (
    <>
      {config && <Status config={config} />}
      <div>
        <input
          type="text"
          placeholder="name"
          onChange={(e) => setNewBackupName(e.currentTarget.value)}
          value={newBackupName}
        />
        <input
          type="text"
          placeholder="comma-separated sources"
          onChange={(e) => setNewBackupSources(e.currentTarget.value)}
          value={newBackupSources}
        />
        <input
          type="text"
          placeholder="cron line"
          onChange={(e) => setNewBackupCronLine(e.currentTarget.value)}
          value={newBackupCronLine}
        />
        <button
          onClick={() =>
            addBackup({
              backup: {
                name: newBackupName,
                sources: newBackupSources.split(","),
                cronLine: newBackupCronLine,
                repository: "default",
                lastRun: undefined,
              },
            })
          }
        >
          Add backup
        </button>
        <ul>
          {config?.backups.map(({ name, sources }) => (
            <li key={name}>
              {name}: {sources.join(" ")}
              <button
                type="button"
                onClick={() => removeBackup({ backupName: name })}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};
