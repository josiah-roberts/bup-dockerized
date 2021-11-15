import { createContext } from "react";
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
    correlation?: string
  ): () => void;
  closed: (handler: () => void) => () => void;
  opened: (handler: () => void) => () => void;
};

export function makeChannel(): Channel {
  const socket = new WebSocket("ws://localhost:8080/ws");
  socket.addEventListener("message", (ev) => {
    console.info("Recieved %s", String(ev.data));
  });

  return {
    send(command) {
      socket.send(JSON.stringify(command));
    },
    subscribe(type, handler, correlation) {
      console.log("Subscribed to %s %s", type, correlation);
      const wrappedHandler = (ev: MessageEvent<any>) => {
        try {
          const deserialized = JSON.parse(String(ev.data)) as ServerMessageType;

          if (deserialized.type !== type) return;
          if (!correlation || correlation === deserialized.correlation) {
            handler(deserialized as Parameters<typeof handler>[0], ev);
          }
        } catch (e) {
          console.log("Threw error deserializing", ev, e);
        }
      };
      socket.addEventListener("message", wrappedHandler);
      return () => socket.removeEventListener("message", wrappedHandler);
    },
    opened(handler) {
      socket.addEventListener("open", handler);
      return () => socket.removeEventListener("open", handler);
    },
    closed(handler) {
      socket.addEventListener("close", handler);
      return () => socket.removeEventListener("close", handler);
    },
  };
}

export const ChannelContext = createContext<Channel | undefined>(undefined);
