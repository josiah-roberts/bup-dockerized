import { Config } from "../../types/config";
import { BackupStatusPanel } from "./BackupStatus";

export const BackupsList = ({
  config,
}: {
  config: Config;
  onChange?: () => void;
}) => {
  return (
    <>
      {config.backups.map((backup, i) => (
        <>
          <div class="card">
            <BackupStatusPanel
              key={backup.id}
              backup={backup}
              rootPath={config.rootPath}
            />
          </div>
        </>
      ))}
    </>
  );
};
