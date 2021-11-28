import { useCallback, useState } from "preact/hooks";
import { useClosed } from "../hooks/useClosed";
import { useOpened } from "../hooks/useOpened";
import { useCommand } from "../hooks/useCommand";
import { Config } from "../../types/config";
import { ServerMessage } from "../../types/commands";
import { Status } from "./Status";
import { nanoid } from "nanoid";
import { useSubscription } from "../hooks/useSubscription";

export const Form = () => {
  const [config, setConfig] = useState<Config>();
  const [newBackupName, setNewBackupName] = useState<string>("");
  const [newBackupSources, setNewBackupSources] = useState<string>("");
  const [newBackupCronLine, setNewBackupCronLine] = useState<string>("");

  const handleConfig = useCallback(
    ({ config }: ServerMessage<"config">) => {
      setConfig(config);
    },
    [setConfig]
  );

  const [getConfig, gc] = useCommand("get-config");

  const [addBackup, ab] = useCommand("add-backup");
  const [removeBackup, rb] = useCommand("remove-backup");

  useSubscription("client-error", ({ error }) => alert(error), [ab]);

  useSubscription("config", handleConfig);

  useOpened(() => {
    getConfig();
  });

  useClosed(() => {
    setTimeout(() => location.reload(), 500);
  });

  return (
    <>
      {config && <Status config={config} />}
      <div class="card">
        <input
          type="text"
          placeholder="name"
          onInput={(e) => setNewBackupName(e.currentTarget.value)}
          value={newBackupName}
        />
        <input
          type="text"
          placeholder="comma-separated sources"
          onInput={(e) => setNewBackupSources(e.currentTarget.value)}
          value={newBackupSources}
        />
        <input
          type="text"
          placeholder="cron line"
          onInput={(e) => setNewBackupCronLine(e.currentTarget.value)}
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
                id: nanoid(),
              },
            })
          }
        >
          Add backup
        </button>
        <ul>
          {config?.backups.map(({ name, id, sources }) => (
            <li key={name}>
              {name}: {sources.join(" ")}
              <button type="button" onClick={() => removeBackup({ id })}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};
