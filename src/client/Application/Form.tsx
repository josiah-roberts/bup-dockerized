import { useCallback, useState } from "preact/hooks";
import { useClosed } from "../hooks/useClosed";
import { useOpened } from "../hooks/useOpened";
import { useCommand } from "../hooks/useCommand";
import { Config } from "../../types/config";
import { ServerMessage } from "../../types/commands";
import { Status } from "./Status";
import { nanoid } from "nanoid";
import { useSubscription } from "../hooks/useSubscription";
import { AsEditable } from "../components/AsEditable";

const EditableH2 = AsEditable("h2");

export const Form = () => {
  const [config, setConfig] = useState<Config>();

  const handleConfig = useCallback(
    ({ config }: ServerMessage<"config">) => {
      setConfig(config);
    },
    [setConfig]
  );

  const [getConfig, gc] = useCommand("get-config");

  const [addBackup, ab] = useCommand("add-backup");

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
      {config && config.backups.length > 0 && <Status config={config} />}
      <div class="card">
        <button
          style={{ all: "unset", cursor: "pointer", fontWeight: "bold" }}
          onClick={() => {
            const name = prompt("Backup name:");
            if (name) {
              addBackup({
                backup: {
                  name,
                  sources: [],
                  cronLine: "0 * * * *",
                  id: nanoid(),
                },
              });
            }
          }}
        >
          Add a backup...
        </button>
      </div>
    </>
  );
};
