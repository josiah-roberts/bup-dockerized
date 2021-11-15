import { RawData, WebSocketServer, WebSocket } from "ws";
import {
  ClientCommand,
  ClientCommandType,
  ServerMessage,
  ServerMessageType,
} from "../types/commands";
import { spawn, exec } from "child_process";
import { BackupDefinition } from "../types/backup-definition";

export type MessageContainer<T extends ClientCommandType["type"]> = {
  message: ClientCommand<T>;
  rawMessage: RawData;
  isBinary: boolean;
};

function send<T extends ServerMessageType["type"]>(
  ws: WebSocket,
  type: T,
  message: Omit<ServerMessage<T>, "type">
) {
  ws.send(JSON.stringify({ type, ...message }, undefined, 2));
}

const backups: BackupDefinition[] = [];

export const messageHandlers: {
  [k in ClientCommandType["type"]]: (
    incoming: MessageContainer<k>,
    ws: WebSocket,
    wss: WebSocketServer
  ) => void;
} = {
  "bup-help": (_, ws) => {
    const emitter = spawn("bup", ["help"]);
    emitter.stdout
      .on("data", (data) => {
        ws.send(JSON.stringify({ type: "ping", message: data.toString() }));
      })
      .on("end", () => {
        ws.send(
          JSON.stringify({ type: "ping", message: "That's bup helpful, yeah" })
        );
      });
    emitter.stderr.on("data", (data) => {
      ws.send(JSON.stringify({ type: "ping", message: data.toString() }));
    });
  },
  "get-backups": (_, ws) => {
    send(ws, "get-backups", { backups });
  },
  "add-backup": ({ message }, ws) => {
    if (backups.some((x) => x.name === message.definition.name)) {
      send(ws, "add-backup", {
        error: `${message.definition.name} already exists`,
      });
    } else {
      backups.push(message.definition);
      send(ws, "add-backup", {});
    }
  },
  ls: ({ message }, ws) => {
    exec(
      `ls -1 $LS_PATH`,
      { env: { LS_PATH: message.path } },
      (e, stdout, stderr) => {
        if (!e && !stderr) {
          send(ws, "ls", {
            items: stdout
              .split("\n")
              .map((i) => `${message.path === "/" ? "" : message.path}/${i}`),
          });
        } else {
          console.error(e, stderr);
        }
      }
    );
  },
};
