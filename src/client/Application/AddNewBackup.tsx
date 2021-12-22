import { nanoid } from "nanoid";
import { useCommand } from "../hooks/useCommand";
import { useSubscription } from "../hooks/useSubscription";

export const AddNewBackup = () => {
  const [addBackup, ab] = useCommand("add-backup");
  useSubscription("client-error", ({ error }) => alert(error), [ab]);

  return (
    <div class="card" style={{ paddingTop: "0.8em" }}>
      <button
        class="unset"
        style={{ cursor: "pointer", fontWeight: "bold" }}
        onClick={() => {
          const name = prompt("Backup name:");
          if (name) {
            addBackup({
              backup: {
                name,
                sources: [],
                cronLine: "0 0 * * *",
                id: nanoid(),
              },
            });
          }
        }}
      >
        Add a backup...
      </button>
    </div>
  );
};
