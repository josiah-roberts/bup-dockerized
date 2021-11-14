import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { Socket } from "net";
import serveHandler from "serve-handler";
import type { ClientCommand, ClientCommandType } from "../types/commands";
import "source-map-support/register";
import { checkEnv } from "./check-env";
import { MessageContainer, messageHandlers } from "./message-handlers";

const port = 80 as const;

console.info("\nStarting application...");

checkEnv("BACKUPS_DIR")
  .then(() => checkEnv("CONFIG_DIR"))
  .then(() => {
    console.info("\nStarting servers...");
    const server = createServer();
    const wss = new WebSocketServer({ noServer: true });

    wss.on("connection", function connection(ws) {
      console.info("WS connected");

      const baseSend = ws.send.bind(ws);
      ws.send = ((...args: Parameters<typeof ws.send>) => {
        console.info("WS send: %s", args[0]);
        return baseSend(...args);
      }) as typeof ws.send;

      ws.on("message", function incoming(message, isBinary) {
        console.info("WS message: %s", message);

        const parsed = JSON.parse(String(message)) as ClientCommandType;
        const handler = messageHandlers[parsed.type] as unknown as (
          incoming: MessageContainer<typeof parsed.type>,
          ws: WebSocket,
          wss: WebSocketServer
        ) => void;
        handler({ message: parsed, rawMessage: message, isBinary }, ws, wss);
      });

      ws.send(
        JSON.stringify({ type: "ping", message: "Welcome to the server" })
      );
    });

    server
      .on("upgrade", (request, socket, head) => {
        if (request.url === "/ws") {
          wss.handleUpgrade(request, socket as Socket, head, (ws) => {
            wss.emit("connection", ws, request);
          });
        }
      })
      .on("request", async (req, res) => {
        serveHandler(req, res, {
          public: "./dist/static",
          directoryListing: false,
        })
          .then(() => console.info("%s static %s", res.statusCode, req.url))
          .catch((e) => console.error(e));
      })
      .listen(port, () => {
        console.log("HTTP + WS server is hosted on *:%s\n", port);
      });
  });
