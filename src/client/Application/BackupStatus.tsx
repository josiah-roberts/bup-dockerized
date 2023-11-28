import { parseExpression } from "cron-parser"
import formatDistanceToNow from "date-fns/formatDistanceToNow"
import formatRelative from "date-fns/formatRelative"
import { useCallback, useEffect, useState } from "preact/hooks"
import { JSX } from "preact/jsx-runtime"
import { Backup } from "../../types/config"
import { BackupStatus } from "../../types/status"
import { AsEditable } from "../components/AsEditable"
import { useCommand } from "../hooks/useCommand"
import { useSubscription } from "../hooks/useSubscription"
import { useTick } from "../hooks/useTick"
import filesize from "filesize"

const EditableSpan = AsEditable("span")

const Bar = (props: JSX.IntrinsicElements["span"]) => (
  <span {...props} class="bar" />
)

const title = (txt: string) =>
  txt.length > 0 ? txt[0].toUpperCase() + txt.slice(1) : txt

export const BackupStatusPanel = ({
  backup,
  rootPath,
}: {
  backup: Backup
  rootPath: string
}) => {
  const tick = useTick(10_000)

  const [editName, setEditName] = useState(backup.name)
  const [addPath, setAddPath] = useState("add source")
  const [editExclude, setEditExclude] = useState(backup.exclude)

  const [editCronline, setEditCronline] = useState(backup.cronLine)
  const [status, setStatus] = useState<BackupStatus>()

  const [runNow, rn] = useCommand("run-now")
  const [editBackup, eb] = useCommand("edit-backup")
  const [getStatus, gs] = useCommand("get-backup-status")
  const [removeBackup, rb] = useCommand("remove-backup")
  const [garbageCollect, gc] = useCommand("gc")
  const [prune, p] = useCommand("prune")

  useEffect(() => {
    getStatus({ id: backup.id })
  }, [backup.id])

  useSubscription(
    "client-error",
    useCallback(
      (m) => {
        setEditName(backup.name)
        setEditCronline(backup.cronLine)
        setAddPath("add source")
        alert(m.error)
      },
      [eb]
    ),
    eb
  )

  const nextRun = useCallback(
    (cronLine: string) => parseExpression(cronLine).next().toDate(),
    [tick]
  )

  const canRunNow = () =>
    status?.runnability.runnable &&
    (status?.status === "idle" || status?.status === "never-run")

  const [revisions, setRevisions] = useState<string[]>([])
  const [showRevisions, setShowRevisions] = useState(false)
  const [stat, st] = useCommand("get-revisions")
  const [rm, r] = useCommand("remove-revision")
  const [restore, restoreCorrelation] = useCommand("restore")
  useSubscription(
    "backup-revisions",
    useCallback(
      ({ revisions }) => {
        setRevisions(revisions)
      },
      [setRevisions]
    ),
    [st, r, rn]
  )

  useSubscription(
    "client-error",
    useCallback(
      (m) => {
        alert(m.error)
      },
      [restoreCorrelation]
    ),
    restoreCorrelation
  )

  useSubscription(
    "backup-status",
    useCallback(
      (m) => {
        // We aren't limiting to correlation,
        // so we need to filter out status changes for other
        // backups
        if (m.status.backupId === backup.id) {
          setStatus(m.status)
        }
      },
      [rn, gs, eb]
    )
  )

  const isRunning = ["indexing", "saving"].includes(status?.status ?? "")

  return (
    <>
      <div
        style={{
          position: "relative",
          flex: "1 1 auto",
          flexWrap: "wrap",
          overflow: "hidden",
        }}
        class={"column"}
      >
        <button
          class="right-btn"
          style={{
            top: "-0.25em",
          }}
          onClick={() => {
            const confirmation = confirm(
              `Are you sure you want to remove "${backup.name}"?\n\nThis backup will be disabled, and any executing operations will run to completion.\n\nBackup output at ${rootPath}/${backup.name} will not be removed.`
            )
            if (confirmation) {
              removeBackup({ id: backup.id })
            }
          }}
          title="Remove"
        >
          ❌ <span class="hover-parent-absent">remove</span>
        </button>
        <button
          class="right-btn"
          style={{
            top: "1.3em",
          }}
          onClick={() => {
            if (!showRevisions) {
              setShowRevisions(true)
              stat({ id: backup.id })
            } else setShowRevisions(false)
          }}
          title="Revisions"
        >
          📜 <span class="hover-parent-absent">revisions</span>
        </button>

        <div style={{ flexGrow: 1, maxWidth: "100%" }}>
          <h3 style={{ marginBottom: 0, marginTop: "0.25em" }}>
            <span class="grey">{rootPath}/</span>
            <EditableSpan
              onSubmit={(value) =>
                editBackup({ backup: { ...backup, name: value } })
              }
              onInput={(value) => setEditName(value)}
              onReset={() => setEditName(backup.name)}
              value={editName}
            />
          </h3>
          {status?.lastRun && !status?.branchSize && (
            <span class="italic small bold grey">Computing size...</span>
          )}
          {status?.lastRun && status.branchSize && (
            <>
              <span class="italic small bold grey">
                {filesize(status.branchSize, { round: 1 })}
              </span>
            </>
          )}
          <ul class="sources-list">
            {backup.sources.map((source) => (
              <li key={source}>
                <span class="grey">{source} </span>
                <span
                  class="small pointer"
                  onClick={() =>
                    editBackup({
                      backup: {
                        ...backup,
                        sources: backup.sources.filter((x) => x !== source),
                      },
                    })
                  }
                >
                  remove
                </span>
              </li>
            ))}
            {backup.sources.length === 0 && (
              <li class="grey italic">no sources</li>
            )}
            <li>
              <EditableSpan
                class="small pointer"
                value={addPath}
                onInput={(value) => setAddPath(value)}
                onSubmit={(value) => {
                  editBackup({
                    backup: { ...backup, sources: [...backup.sources, value] },
                  })
                  setAddPath("add source")
                }}
                onReset={() => setAddPath("add source")}
              />
            </li>
            <li style={{ marginTop: "0.5em" }}>
              {backup.exclude && (
                <>
                  <span
                    class="grey hint"
                    title="RegEx matched against entire path"
                  >
                    excluding
                  </span>
                  <span class="grey">: /</span>
                </>
              )}
              <EditableSpan
                style={{
                  textOverflow: "ellipsis",
                  whiteSpace: "wrap",
                  maxWidth: "calc(100% - 10em)",
                  display: "inline-block",
                  overflow: "hidden",
                  verticalAlign: "bottom",
                }}
                title={editExclude}
                class={!backup.exclude ? "small pointer" : "pointer"}
                value={editExclude ?? "add exclusion regex"}
                onInput={(value) => setEditExclude(value)}
                onSubmit={(value) => {
                  try {
                    new RegExp(value)
                    editBackup({
                      backup: { ...backup, exclude: value || undefined },
                    })
                    setEditExclude(value || undefined)
                  } catch {
                    alert("Invalid regular expression!")
                    setEditExclude(backup.exclude)
                  }
                }}
                onReset={() => setEditExclude(backup.exclude)}
              />
              {backup.exclude && <span class="grey">/</span>}
            </li>
          </ul>
        </div>
        <div>
          <EditableSpan
            onSubmit={(value) =>
              editBackup({ backup: { ...backup, cronLine: value } })
            }
            onInput={(value) => setEditCronline(value)}
            onReset={() => setEditCronline(backup.cronLine)}
            value={editCronline}
          />
          <Bar class="grey" />
          <span class="grey">
            {status?.lastRun ? (
              <>
                <span>ran </span>
                <span
                  class="hint"
                  title={new Date(status.lastRun).toLocaleString()}
                >
                  {formatDistanceToNow(new Date(status.lastRun))} ago
                </span>
              </>
            ) : (
              "never run"
            )}
          </span>
          <Bar class="grey" />
          <span class="grey">running in </span>
          <span
            class="hint"
            style={{ color: "Darkgrey" }}
            title={nextRun(backup.cronLine).toLocaleString()}
          >
            {formatDistanceToNow(nextRun(backup.cronLine))}
          </span>
          <Bar />
          {canRunNow() && (
            <>
              <span>🏃 </span>
              <span class="pointer" onClick={() => runNow({ id: backup.id })}>
                run now
              </span>
            </>
          )}
          {status?.status === "working" && (
            <span class="grey">🚧 working...</span>
          )}
          {status?.runnability.runnable === false && (
            <span
              class="hint"
              title={
                "inacessableSources" in status.runnability
                  ? status.runnability.inacessableSources.join(", ")
                  : undefined
              }
            >
              {status.runnability.reason.replace("-", " ")}
            </span>
          )}
          {!canRunNow() &&
            status?.runnability.runnable &&
            status.status !== "working" && (
              <span>
                {status.status === "indexing" ? "🔦" : "💾"} {status.status}
              </span>
            )}
        </div>
        {showRevisions && (
          <>
            <div
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
              }}
            >
              <span
                class="pointer"
                onClick={() => garbageCollect({ id: backup.id })}
              >
                ♻️ <span class="hover-parent-absent">cleanup</span>
              </span>
            </div>
            <div
              style={{
                position: "absolute",
                right: 0,
                bottom: "1.5em",
              }}
            >
              <span
                class="pointer"
                onClick={() => {
                  if (
                    confirm(
                      "This operation will prune older backups\n- Today, keep all\n- Last week, keep daily\n- Last year, keep monthly- Keep yearly forever\n\nDo you want to proceed?"
                    )
                  )
                    prune({ id: backup.id })
                }}
              >
                {"\u2702\uFE0F"}{" "}
                <span class="hover-parent-absent">prune older</span>
              </span>
            </div>
          </>
        )}
      </div>
      {/* disabled/loading until the delete finishes */}
      {showRevisions && (
        <div
          class="column"
          style={{
            borderLeft: "solid 1px #777",
            paddingLeft: "0.75em",
            flex: "0 0 auto",
            maxHeight: "20em",
            overflow: "auto",
            paddingBottom: "0.1em",
          }}
        >
          <div class="grey" style={{ position: "relative", fontSize: "0.9em" }}>
            {revisions.map((r) => (
              <div
                key={r}
                title={new Date(r).toLocaleString()}
                style={{ paddingRight: "2em" }}
              >
                <span class="hint" style={{ marginRight: "1.5em" }}>
                  {title(formatRelative(new Date(r), new Date()))}
                </span>
                {!isRunning && (
                  <div class="right-btn hover-parent-hidden">
                    <span
                      onClick={() => {
                        if (
                          confirm(
                            `Are you sure you want to delete the revision from ${formatRelative(
                              new Date(r),
                              new Date()
                            )} (${r})?`
                          )
                        ) {
                          rm({ id: backup.id, revision: r })
                        }
                      }}
                      title="Delete revision"
                    >
                      🗑️
                    </span>
                    <span
                      onClick={() => {
                        const path = prompt(
                          "Please provide a sub-path that you want to restore, or leave blank to restore the entire backup.",
                          ""
                        )
                        if (path !== null) {
                          restore({ id: backup.id, revision: r, subpath: path })
                        }
                      }}
                      title="Restore revision"
                    >
                      🌥️
                    </span>
                  </div>
                )}
              </div>
            ))}
            {revisions.length === 0 && "No revisions"}
          </div>
        </div>
      )}
    </>
  )
}
