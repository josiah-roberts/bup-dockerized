import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { makeChannel, Channel, ChannelContext } from "./Channel";
import "./index.css";
import { useClosed } from "./useClosed";
import { useOpened } from "./useOpened";
import { useCommand } from "./useCommand";
import { Backup } from "../types/config";
import { ServerMessage } from "../types/commands";

const LeComp = () => {
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

const Application = () => {
  const [channel, setChannel] = useState<Channel>();

  useEffect(() => {
    if (!channel) {
      setChannel(makeChannel());
    }
  }, [channel]);

  return (
    <div>
      <h1>Hello dockerized Bois!</h1>
      <ChannelContext.Provider value={channel}>
        <LeComp />
      </ChannelContext.Provider>
    </div>
  );
};

ReactDOM.render(<Application />, document.getElementById("app-root"));
