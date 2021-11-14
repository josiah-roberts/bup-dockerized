import { RawData, WebSocketServer, WebSocket } from "ws";
import { ClientCommand, ClientCommandType } from "../types/commands";
import { spawn } from "child_process";

export type MessageContainer<T extends ClientCommandType["type"]> = {
  message: ClientCommand<T>;
  rawMessage: RawData;
  isBinary: boolean;
};

export const messageHandlers: {
  [k in ClientCommandType["type"]]: (
    incoming: MessageContainer<k>,
    ws: WebSocket,
    wss: WebSocketServer
  ) => void;
} = {
  ping: (_, ws) => {
    ws.send(JSON.stringify({ type: "ping", message: "Pinging google..." }));
    spawn("ping", ["-c", "5", "google.com"])
      .stdout.on("data", (data) => {
        if (String(data).includes("bytes from")) {
          ws.send(JSON.stringify({ type: "ping", message: "Got a response" }));
        } else {
          ws.send(
            JSON.stringify({
              type: "ping",
              message: data.toString(),
            })
          );
        }
      })
      .on("end", () => {
        ws.send(JSON.stringify({ type: "ping", message: "That's it" }));
      });
  },
  echo: ({ message }, ws) => {
    ws.send(JSON.stringify({ type: "echo", message: message.message }));
  },
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
};
