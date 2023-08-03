import { parseExpression } from "cron-parser"
import formatDistanceToNow from "date-fns/formatDistanceToNow"
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

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

const formatDate = (d: Date) => {
  return `${months[d.getMonth()]} ${d.getDate()}${
    d.getFullYear() !== new Date().getFullYear() ? `, ${d.getFullYear()}` : ""
  }`
}

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
  useSubscription(
    "backup-revisions",
    ({ revisions }) => {
      setRevisions(revisions)
      setShowRevisions(true)
    },
    [st, r]
  )

  return (
    <>
      <div
        style={{
          position: "relative",
          width: showRevisions ? undefined : "100%",
        }}
        class={"column"}
      >
        <button
          class="unset"
          style={{
            position: "absolute",
            top: "-0.25em",
            cursor: "pointer",
            fontSize: "2em",
            right: 0,
          }}
          onClick={() => {
            const confirmation = confirm(
              `Are you sure you want to remove "${backup.name}"?\n\nThis backup will be disabled, and any executing operations will run to completion.\n\nBackup output at ${rootPath}/${backup.name} will not be removed.`
            )
            if (confirmation) {
              removeBackup({ id: backup.id })
            }
          }}
        >
          ×
        </button>
        <button
          class="unset"
          style={{
            position: "absolute",
            top: "1.3em",
            cursor: "pointer",
            fontSize: "1.5em",
            right: "0.1em",
          }}
          onClick={() => {
            if (!showRevisions) stat({ id: backup.id })
            else setShowRevisions(false)
          }}
        >
          ?
        </button>
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
              class={!backup.exclude ? "small pointer" : ""}
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
          {!canRunNow() && status?.runnability.runnable && (
            <span>
              {status.status === "indexing" ? "🔦" : "💾"} {status.status}
            </span>
          )}
        </div>
      </div>
      {showRevisions && (
        <div class="column" style={{ maxWidth: "12em" }}>
          {revisions.map((r) => (
            <div
              key={r}
              onClick={() => {
                console.info(r)
                rm({ id: backup.id, revision: r })
              }}
              title={new Date(r).toLocaleString()}
            >
              {formatDate(new Date(r))}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
