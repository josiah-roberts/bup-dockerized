import { useCallback, useState } from "preact/hooks";
import { useClosed } from "../hooks/useClosed";
import { useOpened } from "../hooks/useOpened";
import { useCommand } from "../hooks/useCommand";
import { Backup, Config } from "../../types/config";
import { ServerMessage } from "../../types/commands";
import { Status } from "./Status";
import { Editable } from "../components/Editable";
import { AsEditable } from "../components/AsEditable";
import { nanoid } from "nanoid";
import { useSubscription } from "../hooks/useSubscription";

const EditableA = AsEditable("a");

export const Form = () => {
  const [config, setConfig] = useState<Config>();
  const [newBackupName, setNewBackupName] = useState<string>("");
  const [newBackupSources, setNewBackupSources] = useState<string>("");
  const [newBackupCronLine, setNewBackupCronLine] = useState<string>("");

  const [getConfig] = useCommand("get-config");
  useSubscription(
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

  const [addBackup, ab] = useCommand("add-backup");
  useSubscription("add-backup", reloadBackups, ab);

  const [removeBackup, rb] = useCommand("remove-backup");
  useSubscription("remove-backup", reloadBackups, rb);

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
        {/* <p>
          <EditableA onSubmit={() => Promise.resolve()}>sadf</EditableA>
        </p>
        <p>
          <EditableA
            onSubmit={(v) =>
              new Promise<void>((res, rej) =>
                setTimeout(
                  () =>
                    v === "more tacos"
                      ? res()
                      : rej(new Error("need more tacos")),
                  1000
                )
              )
            }
          >
            tacos
          </EditableA>
        </p> */}
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
