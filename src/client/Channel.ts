import { ClientCommand, ServerMessage, ServerMessageType } from "../types/ClientCommand";

export type Channel = {
  send(command: ClientCommand): void,
  subscribe<TKey extends ServerMessageType['type']>(type: TKey, handler: (message: ServerMessage<TKey>, event: MessageEvent) => void): void;
  closed: (handler: () => void) => void,
  opened: (handler: () => void) => void,
}

export function makeChannel(): Channel {
  const socket = new WebSocket('ws://localhost:1234/ws');
  return {
    send(command) {
      socket.send(JSON.stringify(command));
    },
    subscribe(key, handler) {
      socket.addEventListener('message', (ev) => {
        const deserialized = JSON.parse(String(ev.data)) as ServerMessageType;
        if (deserialized.type === key) {
          handler(deserialized as Parameters<typeof handler>[0], ev);
        }
      });
    },
    opened(handler) {
      socket.addEventListener('open', handler);
    },
    closed(handler) {
      socket.addEventListener('close', handler)
    }
  }
}