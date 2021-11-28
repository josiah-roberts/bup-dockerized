import { Backup, Config } from "./config";
import { BackupStatus } from "./status";

export type ClientCommandType = (
  | {
      type: "bup-help";
    }
  | {
      type: "get-config";
    }
  | {
      type: "get-backup-status";
      id: string;
    }
  | {
      type: "ls";
      path: string;
    }
  | { type: "add-backup"; backup: Backup }
  | { type: "remove-backup"; id: string }
  | { type: "edit-backup"; backup: Backup }
  | { type: "run-now"; id: string }
) & { correlation: string };
export type ClientCommand<TKey extends ClientCommandType["type"]> = Exclude<
  ClientCommandType,
  { type: Exclude<ClientCommandType["type"], TKey> }
>;

type ConfigMessage = {
  type: "config";
  config: Config;
};
type BackupStatusMessage = {
  type: "backup-status";
  backup: Backup;
  status: BackupStatus;
};
type LsMessage = {
  type: "ls";
  items: string[];
};

type ClientErrorMessage = { type: "client-error"; error: string };

export type ServerMessageType = { correlation?: string } & (
  | ConfigMessage
  | LsMessage
  | ClientErrorMessage
  | BackupStatusMessage
);
export type ServerMessage<TKey extends ServerMessageType["type"]> = Exclude<
  ServerMessageType,
  { type: Exclude<ServerMessageType["type"], TKey> }
>;

export type ServerMessageHandler<TKey extends ServerMessageType["type"]> = (
  message: ServerMessage<TKey>,
  event: MessageEvent
) => void;
