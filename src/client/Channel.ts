import { createContext } from "preact";
import { once } from "ramda";
import {
  ClientCommandType,
  ServerMessage,
  ServerMessageType,
} from "../types/commands";

export type Channel = {
  send(command: ClientCommandType): void;
  subscribe<TKey extends ServerMessageType["type"]>(
    type: TKey,
    handler: (message: ServerMessage<TKey>, event: MessageEvent) => void,
    correlation?: string | string[]
  ): () => void;
  closed: (handler: () => void) => () => void;
  opened: (handler: () => void) => () => void;
};

const makeWebsocket = () => {
  const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${wsProtocol}//${location.host}/ws`);
  socket.addEventListener("message", (ev) => {
    console.info("Received", ev.data);
  });
  socket.addEventListener("open", () => {
    console.info("Opened socket");
  });
  socket.addEventListener("close", () => {
    console.info("Closed socket");
  });
  socket.addEventListener("error", (e) => {
    console.error("Socket error", e);
  });
  return socket;
};

const correlationMatches = (
  messageCorrelation: string | undefined,
  correlation: string | string[] | undefined
) => {
  if (!correlation) return true;
  if (!messageCorrelation) return false;

  if (correlation === messageCorrelation) return true;

  return correlation.includes(messageCorrelation);
};

export function makeChannel(): Channel {
  const socketThunk = once(makeWebsocket);

  return {
    send(command) {
      const json = JSON.stringify(command);
      console.info("Sent %s", json);
      socketThunk().send(json);
    },
    subscribe(type, handler, correlation) {
      console.log("Subscribed to %s %s", type, correlation);
      const wrappedHandler = (ev: MessageEvent<any>) => {
        const deserialized = JSON.parse(String(ev.data)) as ServerMessageType;

        if (
          deserialized.type === type &&
          correlationMatches(deserialized.correlation, correlation)
        ) {
          handler(deserialized as Parameters<typeof handler>[0], ev);
        }
      };
      socketThunk().addEventListener("message", wrappedHandler);
      return () => {
        console.log("Unsubscribed from %s %s", type, correlation);
        socketThunk().removeEventListener("message", wrappedHandler);
      };
    },
    opened(handler) {
      socketThunk().addEventListener("open", handler);
      return () => socketThunk().removeEventListener("open", handler);
    },
    closed(handler) {
      socketThunk().addEventListener("close", handler);
      return () => socketThunk().removeEventListener("close", handler);
    },
  };
}

export const ChannelContext = createContext<Channel | undefined>(undefined);
