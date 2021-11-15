import { Backup } from "./config";

export type ClientCommandType = (
  | {
      type: "bup-help";
    }
  | {
      type: "get-backups";
    }
  | {
      type: "ls";
      path: string;
    }
  | { type: "add-backup"; backup: Backup }
  | { type: "remove-backup"; backupName: string }
) & { correlation: string };
export type ClientCommand<TKey extends ClientCommandType["type"]> = Exclude<
  ClientCommandType,
  { type: Exclude<ClientCommandType["type"], TKey> }
>;

type GetBackupsMessage = {
  type: "get-backups";
  backups: Backup[];
};
type LsMessage = {
  type: "ls";
  items: string[];
};
type AddBackupMessage =
  | {
      type: "add-backup";
      error: string;
    }
  | { type: "add-backup"; backup: Backup };
type RemoveBackupMessage =
  | {
      type: "remove-backup";
      error: string;
    }
  | {
      type: "remove-backup";
    };

export type ServerMessageType = { correlation?: string } & (
  | GetBackupsMessage
  | LsMessage
  | AddBackupMessage
  | RemoveBackupMessage
);
export type ServerMessage<TKey extends ServerMessageType["type"]> = Exclude<
  ServerMessageType,
  { type: Exclude<ServerMessageType["type"], TKey> }
>;

export type ServerMessageHandler<TKey extends ServerMessageType["type"]> = (
  message: ServerMessage<TKey>,
  event: MessageEvent
) => void;
