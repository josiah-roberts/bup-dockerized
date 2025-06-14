import { WebSocket, WebSocketServer } from "ws";
import { Socket } from "net";
import { Duplex } from "stream";
import { IncomingMessage } from "http";
import { ClientCommandType } from "../../types/commands";
import { withCorrelation } from "../utils/correlation";
import {
  MessageContainer,
  messageHandlers,
  send,
} from "../application/message-handlers";
import { getConfig } from "../application/config-repository";
import { addListener, removeListener } from "../application/events";
import { BackupStatus } from "../../types/status";
import { createServer } from "./websocket-server";

export const patchSendWithLogging = (ws: WebSocket) => {
  const baseSend = ws.send.bind(ws);
  ws.send = ((...args: Parameters<typeof ws.send>) => {
    console.info("WS send: %s", args[0]);
    return baseSend(...args);
  }) as typeof ws.send;
};

export const createWsServer = () => {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", function connection(ws) {
    console.info("WS connected");
    patchSendWithLogging(ws);

    const sendConfig = async () => {
      send(ws, "config", { config: await getConfig() });
    };
    const sendStatus = async (status: BackupStatus) => {
      const backup = (await getConfig()).backups.find(
        (x) => x.id === status.backupId
      );
      if (!backup) {
        send(ws, "client-error", {
          error: `Backup with id ${status.backupId} does not exist`,
        });
        return;
      }

      send(ws, "backup-status", { status, id: backup.id });
    };
    const sendClientError = async (e: string) => {
      send(ws, "client-error", { error: e });
    };

    addListener("config", sendConfig);
    addListener("backup-status", sendStatus);
    addListener("client-error", sendClientError);

    ws.on("message", function incoming(message, isBinary) {
      console.info("WS message: %s", message);

      const parsed = JSON.parse(String(message)) as ClientCommandType;

      withCorrelation(parsed.correlation, async () => {
        const handler = messageHandlers[parsed.type] as unknown as (
          incoming: MessageContainer<typeof parsed.type>,
          ws: WebSocket,
          wss: WebSocketServer
        ) => void;
        try {
          await handler(
            { message: parsed, rawMessage: message, isBinary },
            ws,
            wss
          );
        } catch (e) {
          console.error(e);
        }
      });
    });

    ws.on("close", () => {
      removeListener("config", sendConfig);
      removeListener("backup-status", sendStatus);
      removeListener("client-error", sendClientError);
    });
  });

  return wss;
};

export const wsUpgradeHandler =
  (wss: WebSocketServer) =>
  (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (request.url === "/ws") {
      wss.handleUpgrade(request, socket as Socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  };
