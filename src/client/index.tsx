import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import ReactDOM from "react-dom";
import { makeChannel, Channel, ChannelContext } from "./Channel";
import "./index.css";
import { useClosed } from "./useClosed";
import { useOpened } from "./useOpened";
import { useCommand } from "./useCommand";
import { useSubscription } from "./useSubscription";
import { BackupDefinition } from "../types/backup-definition";

const LeComp = () => {
  const getBackups = useCommand("get-backups");
  const ls = useCommand("ls");
  const addBackup = useCommand("add-backup");

  const [backups, setBackups] = useState<BackupDefinition[]>([]);
  const [lsItems, setLsItems] = useState<string[]>([]);
  const [newBackupName, setNewBackupName] = useState<string>("");
  const [newBackupSources, setNewBackupSources] = useState<string>("");

  useOpened(() => getBackups());
  useClosed(() => {
    setTimeout(() => location.reload(), 500);
  });

  useSubscription("get-backups", ({ backups }) => {
    setBackups(backups);
  });
  useSubscription("add-backup", ({ error }) => {
    if (error) alert(error);
    else getBackups();
  });
  useSubscription("ls", ({ items }) => {
    setLsItems(items);
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
                definition: {
                  name: newBackupName,
                  sources: newBackupSources.split(","),
                },
              })
            }
          >
            Add backup
          </button>
          {backups.map(({ name, sources }) => (
            <li key={name}>
              {name}: {sources.join(" ")}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <button onClick={() => ls({ path: "/" })}>Start a new LS</button>
        <ul>
          {lsItems.map((item) => (
            <li
              style={{ cursor: "pointer" }}
              onClick={() => ls({ path: item })}
            >
              {item}
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
