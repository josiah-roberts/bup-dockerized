import React, { useCallback, useState } from "react";
import { useClosed } from "../hooks/useClosed";
import { useOpened } from "../hooks/useOpened";
import { useCommand } from "../hooks/useCommand";
import { Backup } from "../../types/config";
import { ServerMessage } from "../../types/commands";

export const Form = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [newBackupName, setNewBackupName] = useState<string>("");
  const [newBackupSources, setNewBackupSources] = useState<string>("");

  const [getBackups] = useCommand(
    "get-backups",
    useCallback(
      ({ backups }) => {
        setBackups(backups);
      },
      [setBackups]
    )
  );

  const reloadBackups = useCallback(
    (msg: ServerMessage<"add-backup" | "remove-backup">) => {
      if ("error" in msg) alert(msg.error);
      else getBackups();
    },
    [getBackups]
  );

  const [addBackup] = useCommand("add-backup", reloadBackups);
  const [removeBackup] = useCommand("remove-backup", reloadBackups);

  useOpened(() => {
    getBackups();
  });
  useClosed(() => {
    setTimeout(() => location.reload(), 500);
  });

  return (
    <>
      <div>
        <ul>
          <input
            type="text"
            placeholder="name"
            onChange={(e) => setNewBackupName(e.target.value)}
            value={newBackupName}
          />
          <input
            type="text"
            placeholder="comma-separated sources"
            onChange={(e) => setNewBackupSources(e.target.value)}
            value={newBackupSources}
          />
          <button
            onClick={() =>
              addBackup({
                backup: {
                  name: newBackupName,
                  sources: newBackupSources.split(","),
                  cronLine: "* * * * *",
                  repository: "default",
                },
              })
            }
          >
            Add backup
          </button>
          {backups.map(({ name, sources }) => (
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
