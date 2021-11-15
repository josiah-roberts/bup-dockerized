import { BackupDefinition } from "./backup-definition";

export type ClientCommandType =
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
  | { type: "add-backup"; definition: BackupDefinition };
export type ClientCommand<TKey extends ClientCommandType["type"]> = Exclude<
  ClientCommandType,
  { type: Exclude<ClientCommandType["type"], TKey> }
>;

export type ServerMessageType =
  | {
      type: "get-backups";
      backups: BackupDefinition[];
    }
  | {
      type: "ls";
      items: string[];
    }
  | {
      type: "add-backup";
      error?: string;
    };
export type ServerMessage<TKey extends ServerMessageType["type"]> = Exclude<
  ServerMessageType,
  { type: Exclude<ServerMessageType["type"], TKey> }
>;

export type ServerMessageHandler<TKey extends ServerMessageType["type"]> = (
  message: ServerMessage<TKey>,
  event: MessageEvent
) => void;
