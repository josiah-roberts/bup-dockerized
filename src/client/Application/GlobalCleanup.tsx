import { useCommand } from "../hooks/useCommand";
import { pruneConfirm } from "../shared-copy";

export function GlobalCleanup() {
  const [prune, p] = useCommand("prune");
  const [garbageCollect, gc] = useCommand("gc");

  return (
    <div class="row">
      <div>
        <span
          class="pointer"
          onClick={() => {
            if (confirm(pruneConfirm)) prune({ all: true });
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
