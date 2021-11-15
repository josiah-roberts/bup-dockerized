import { RawData, WebSocketServer, WebSocket } from "ws";
import {
  ClientCommand,
  ClientCommandType,
  ServerMessage,
  ServerMessageType,
} from "../../types/commands";
import { spawn, exec } from "child_process";
import { getConfig, setConfig } from "./config-repository";
import { getAnyCorrelation } from "../utils/correlation";
import { DistributiveOmit } from "../../types/util";

export type MessageContainer<T extends ClientCommandType["type"]> = {
  message: ClientCommand<T>;
  rawMessage: RawData;
  isBinary: boolean;
};

function send<T extends ServerMessageType["type"]>(
  ws: WebSocket,
  type: T,
  message: DistributiveOmit<ServerMessage<T>, "type" | "correlation">
) {
  const correlation = getAnyCorrelation();
  ws.send(JSON.stringify({ type, correlation, ...message }, undefined, 2));
}

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
  "get-backups": async ({ message }, ws) => {
    send(ws, "get-backups", {
      backups: (await getConfig()).backups,
    });
  },
  "add-backup": async ({ message }, ws) => {
    const config = await getConfig();
    if (config.backups.some((x) => x.name === message.backup.name)) {
      send(ws, "add-backup", {
        error: `${message.backup.name} already exists`,
      });
    } else {
      await setConfig({
        ...config,
        backups: [...config.backups, message.backup],
      });
      send(ws, "add-backup", { backup: message.backup });
    }
  },
  "remove-backup": async ({ message }, ws) => {
    const config = await getConfig();
    const backup = config.backups.find((x) => x.name === message.backupName);
    if (!backup) {
      send(ws, "remove-backup", {
        error: `${message.backupName} does not exist exists`,
      });
    } else {
      await setConfig({
        ...config,
        backups: config.backups.filter((x) => x !== backup),
      });
      send(ws, "remove-backup", {});
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