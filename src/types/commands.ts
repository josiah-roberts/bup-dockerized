import { Backup, Config } from "./config";

export type ClientCommandType = (
  | {
      type: "bup-help";
    }
  | {
      type: "get-config";
    }
  | {
      type: "ls";
      path: string;
    }
  | { type: "add-backup"; backup: Backup }
  | { type: "remove-backup"; id: string }
  | { type: "edit-backup"; backup: Backup }
) & { correlation: string };
export type ClientCommand<TKey extends ClientCommandType["type"]> = Exclude<
  ClientCommandType,
  { type: Exclude<ClientCommandType["type"], TKey> }
>;

type SimpleResponse<T extends string, TSuccess extends {} = {}> = {
  type: T;
} & (TSuccess | { error: string });

type GetConfigMessage = {
  type: "get-config";
  config: Config;
};
type LsMessage = {
  type: "ls";
  items: string[];
};

type AddBackupMessage = SimpleResponse<"add-backup", { backup: Backup }>;
type RemoveBackupMessage = SimpleResponse<"remove-backup">;
type EditBackupMessage = SimpleResponse<"edit-backup">;

export type ServerMessageType = { correlation?: string } & (
  | GetConfigMessage
  | LsMessage
  | AddBackupMessage
  | RemoveBackupMessage
  | EditBackupMessage
);
export type ServerMessage<TKey extends ServerMessageType["type"]> = Exclude<
  ServerMessageType,
  { type: Exclude<ServerMessageType["type"], TKey> }
>;

export type ServerMessageHandler<TKey extends ServerMessageType["type"]> = (
  message: ServerMessage<TKey>,
  event: MessageEvent
) => void;
