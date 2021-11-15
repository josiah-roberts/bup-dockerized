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
import { Backup } from "../types/config";

const LeComp = () => {
  const getBackups0 = useCommand("get-backups", ({ backups }) => {
    console.log(0);
    setBackups(backups);
  });
  const getBackups1 = useCommand("get-backups", ({ backups }) => {
    console.log(1);
    setBackups(backups);
  });

  const ls = useCommand("ls");
  const addBackup = useCommand("add-backup");

  const [backups, setBackups] = useState<Backup[]>([]);
  const [lsItems, setLsItems] = useState<string[]>([]);
  const [newBackupName, setNewBackupName] = useState<string>("");
  const [newBackupSources, setNewBackupSources] = useState<string>("");

  useOpened(() => getBackups0());
  useClosed(() => {
    setTimeout(() => location.reload(), 500);
  });

  useSubscription("add-backup", ({ error }) => {
    if (error) alert(error);
    else getBackups0();
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
