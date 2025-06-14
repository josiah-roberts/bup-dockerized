import { useCommand } from "../hooks/useCommand";

export function GlobalCleanup() {
  const [prune, p] = useCommand("prune");
  const [garbageCollect, gc] = useCommand("gc");

  return (
    <div class="row">
      <div>
        <span
          class="pointer"
          onClick={() => {
            if (
              confirm(
                "This operation will prune older backups\n- Today, keep all\n- Last week, keep daily\n- Last year, keep monthly- Keep yearly forever\n\nDo you want to proceed?"
              )
            )
              prune({ all: true });
          }}
        >
          <span class="hover-parent-absent">prune older</span> {"\u2702\uFE0F"}
        </span>
      </div>
      <div>
        <span class="pointer" onClick={() => garbageCollect({ all: true })}>
          <span class="hover-parent-absent">cleanup</span> ♻️
        </span>
      </div>
    </div>
  );
}
