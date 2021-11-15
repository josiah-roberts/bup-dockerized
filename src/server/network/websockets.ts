import { WebSocket, WebSocketServer } from "ws";
import { Socket } from "net";
import { Duplex } from "stream";
import { IncomingMessage } from "http";
import { ClientCommandType } from "../../types/commands";
import { withCorrelation } from "../utils/correlation";
import {
  MessageContainer,
  messageHandlers,
} from "../application/message-handlers";

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

    ws.on("message", function incoming(message, isBinary) {
      console.info("WS message: %s", message);

      const parsed = JSON.parse(String(message)) as ClientCommandType;

      withCorrelation(parsed.correlation, () => {
        const handler = messageHandlers[parsed.type] as unknown as (
          incoming: MessageContainer<typeof parsed.type>,
          ws: WebSocket,
          wss: WebSocketServer
        ) => void;
        handler({ message: parsed, rawMessage: message, isBinary }, ws, wss);
      });
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
