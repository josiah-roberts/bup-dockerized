import { Config } from "../../types/config";
import { BackupStatusPanel } from "./BackupStatus";

export const BackupsList = ({
  config,
}: {
  config: Config;
  onChange?: () => void;
}) => {
  return (
    <div class="card">
      {config.backups.map((backup, i) => (
        <>
          <BackupStatusPanel
            key={backup.id}
            backup={backup}
            rootPath={config.rootPath}
          />
          {i + 1 < config.backups.length && (
            <hr
              style={{
                marginTop: "1em",
                marginBottom: "1em",
                borderColor: "grey",
                borderStyle: "solid",
              }}
            />
          )}
        </>
      ))}
    </div>
  );
};
