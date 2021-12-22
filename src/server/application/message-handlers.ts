import { RawData, WebSocketServer, WebSocket } from "ws";
import {
  ClientCommand,
  ClientCommandType,
  ServerMessage,
  ServerMessageType,
} from "../../types/commands";
import { spawn, exec } from "child_process";
import { getBackupDir, getConfig, setConfig } from "./config-repository";
import { getAnyCorrelation } from "../utils/correlation";
import { DistributiveOmit } from "../../types/util";
import { isEmpty } from "ramda";
import { parseExpression } from "cron-parser";
import { initializeRepository, rename } from "./bup-actions";
import { emit } from "./events";
import { getStatus, recomputeStatus } from "./status-repository";
import { run } from "./run";

export type MessageContainer<T extends ClientCommandType["type"]> = {
  message: ClientCommand<T>;
  rawMessage: RawData;
  isBinary: boolean;
};

export function send<T extends ServerMessageType["type"]>(
  ws: WebSocket,
  type: T,
  message: DistributiveOmit<ServerMessage<T>, "type" | "correlation">
) {
  const correlation = getAnyCorrelation();
  ws.send(JSON.stringify({ type, correlation, ...message }, undefined, 2));
}

function cronIsValid(cronLine: string) {
  const itemCount = cronLine.split(" ").length;
  if (itemCount < 5 || itemCount > 6) return false;

  try {
    parseExpression(cronLine);
    return true;
  } catch {
    return false;
  }
}

function clientError(error: string, ws: WebSocket) {
  send(ws, "client-error", {
    error,
  });
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
  "get-config": async (_, ws) => {
    send(ws, "config", { config: await getConfig() });
  },
  "get-backup-status": async (m, ws) => {
    const config = await getConfig();
    const backup = config.backups.find((x) => x.id === m.message.id);
    if (!backup) {
      clientError(`Backup with id ${m.message.id} does not exist`, ws);
      return;
    }

    emit("backup-status", await getStatus(backup));
  },
  "add-backup": async ({ message }, ws) => {
    if (isEmpty(message.backup.name)) {
      send(ws, "client-error", {
        error: `Missing required info`,
      });
      return;
    }

    if (!cronIsValid(message.backup.cronLine)) {
      send(ws, "client-error", {
        error: `Invalid cron line`,
      });
      return;
    }

    const config = await getConfig();
    if (config.backups.some((x) => x.name === message.backup.name)) {
      send(ws, "client-error", {
        error: `${message.backup.name} already exists`,
      });
      return;
    }

    await setConfig({
      ...config,
      backups: [...config.backups, message.backup],
    });

    await initializeRepository(getBackupDir(message.backup));

    emit("config");
  },
  "remove-backup": async ({ message }, ws) => {
    const config = await getConfig();
    const backup = config.backups.find((x) => x.id === message.id);
    if (!backup) {
      clientError(`Backup with id ${message.id} does not exist`, ws);
      return;
    }

    await setConfig({
      ...config,
      backups: config.backups.filter((x) => x !== backup),
    });

    emit("config");
  },
  "edit-backup": async ({ message }, ws) => {
    const config = await getConfig();
    const backup = config.backups.find((x) => x.id === message.backup.id);
    if (!backup) {
      clientError(`Backup with id ${message.backup.id} does not exist`, ws);
      return;
    }

    if (
      config.backups.some(
        (x) => x.name === message.backup.name && x.id !== message.backup.id
      )
    ) {
      clientError(`Backup with name ${message.backup.name} already exists`, ws);
      return;
    }

    if (!cronIsValid(message.backup.cronLine)) {
      send(ws, "client-error", {
        error: `Invalid cron line`,
      });
      return;
    }

    if (message.backup.name !== backup.name) {
      await rename(backup, message.backup.name);
    }

    await setConfig({
      ...config,
      backups: config.backups
        .filter((x) => x.id !== message.backup.id)
        .concat(message.backup),
    });

    await recomputeStatus(message.backup);
    emit("config");
  },
  "run-now": async ({ message }, ws) => {
    const config = await getConfig();
    const backup = config.backups.find((x) => x.id === message.id);
    if (!backup) return;

    await run(backup);
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
