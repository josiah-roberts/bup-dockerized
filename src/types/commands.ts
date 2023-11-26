import { Backup, Config } from "./config"
import { BackupStatus } from "./status"

export type ClientCommandType = (
  | {
      type: "bup-help"
    }
  | {
      type: "get-config"
    }
  | {
      type: "get-backup-status"
      id: string
    }
  | { type: "add-backup"; backup: Backup }
  | { type: "remove-backup"; id: string }
  | { type: "edit-backup"; backup: Backup }
  | { type: "run-now"; id: string }
  | { type: "get-revisions"; id: string }
  | { type: "remove-revision"; id: string; revision: string }
  | { type: "gc"; id: string }
  | { type: "prune"; id: string }
  | { type: "restore"; id: string; revision: string; subpath?: string }
) & { correlation: string }
export type ClientCommand<TKey extends ClientCommandType["type"]> = Exclude<
  ClientCommandType,
  { type: Exclude<ClientCommandType["type"], TKey> }
>

type ConfigMessage = {
  type: "config"
  config: Config
}
type BackupStatusMessage = {
  type: "backup-status"
  status: BackupStatus
}
type LsMessage = {
  type: "backup-revisions"
  revisions: string[]
}

type ClientErrorMessage = { type: "client-error"; error: string }

export type ServerMessageType = { correlation?: string } & (
  | ConfigMessage
  | LsMessage
  | ClientErrorMessage
  | BackupStatusMessage
)
export type ServerMessage<TKey extends ServerMessageType["type"]> = Exclude<
  ServerMessageType,
  { type: Exclude<ServerMessageType["type"], TKey> }
>

export type ServerMessageHandler<TKey extends ServerMessageType["type"]> = (
  message: ServerMessage<TKey>,
  event: MessageEvent
) => void
