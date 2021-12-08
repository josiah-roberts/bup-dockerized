import { Config } from "../../types/config";
import { BackupStatusPanel } from "./BackupStatus";

export const Status = ({
  config,
}: {
  config: Config;
  onChange?: () => void;
}) => {
  return (
    <div class="card">
      {config.backups.map((backup) => (
        <>
          <BackupStatusPanel
            key={backup.id}
            backup={backup}
            rootPath={config.rootPath}
          />
          <hr />
        </>
      ))}
    </div>
  );
};
