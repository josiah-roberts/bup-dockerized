import { useCallback, useState } from "preact/hooks";
import { useClosed } from "../hooks/useClosed";
import { useOpened } from "../hooks/useOpened";
import { useCommand } from "../hooks/useCommand";
import { Config } from "../../types/config";
import { ServerMessage } from "../../types/commands";
import { BackupsList } from "./BackupsList";
import { useSubscription } from "../hooks/useSubscription";
import { AddNewBackup } from "./AddNewBackup";

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
      <AddNewBackup />
      {config && config.backups.length > 0 && <BackupsList config={config} />}
    </>
  );
};
