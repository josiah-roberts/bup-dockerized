import { useCallback, useState } from "preact/hooks";
import { useClosed } from "../hooks/useClosed";
import { useOpened } from "../hooks/useOpened";
import { useCommand } from "../hooks/useCommand";
import { Config } from "../../types/config";
import { ServerMessage } from "../../types/commands";
import { useSubscription } from "../hooks/useSubscription";
import { AddNewBackup } from "./AddNewBackup";
import { GlobalCleanup } from "./GlobalCleanup";
import { BackupStatusPanel } from "./BackupStatus";

export const Application = () => {
  const [config, setConfig] = useState<Config>();

  const handleConfig = useCallback(
    ({ config }: ServerMessage<"config">) => {
      setConfig(config);
    },
    [setConfig]
  );

  const [getConfig] = useCommand("get-config");
  useSubscription("config", handleConfig);

  useOpened(() => {
    getConfig();
  });

  useClosed(() => {
    setTimeout(() => location.reload(), 500);
  });

  return (
    <>
      <div class="card row">
        <AddNewBackup />
        {!!config?.backups.length && <GlobalCleanup />}
      </div>
      {!!config?.backups.length &&
        config.backups.map((backup, i) => (
          <BackupStatusPanel
            key={backup.id}
            backup={backup}
            rootPath={config.rootPath}
          />
        ))}
    </>
  );
};
