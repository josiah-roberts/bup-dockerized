import { Backup } from "./config";

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
  | { type: "add-backup"; backup: Backup };
export type ClientCommand<TKey extends ClientCommandType["type"]> = Exclude<
  ClientCommandType,
  { type: Exclude<ClientCommandType["type"], TKey> }
>;

export type ServerMessageType =
  | {
      type: "get-backups";
      backups: Backup[];
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
  message: ServerMessage<TKey> & { correlation?: string },
  event: MessageEvent
) => void;
