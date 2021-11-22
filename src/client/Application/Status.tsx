import { Config } from "../../types/config";
import { BackupStatus } from "./BackupStatus";

export const Status = ({
  config,
}: {
  config: Config;
  onChange?: () => void;
}) => {
  return (
    <div class="card">
      {config.repositories.map((repository) => (
        <div>
          {config.backups
            .filter((x) => x.repository === repository.name)
            .map((backup) => (
              <>
                <BackupStatus
                  key={backup.id}
                  backup={backup}
                  repository={repository}
                />
                <hr />
              </>
            ))}
        </div>
      ))}
    </div>
  );
};
