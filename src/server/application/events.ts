import { EventEmitter } from "events";

const emitter = new EventEmitter();

export function addListener(event: "config", handler: () => void) {
  emitter.addListener("config", handler);
}

export function removeListener(event: "config", handler: () => void) {
  emitter.removeListener(event, handler);
}

export function emit(event: "config") {
  emitter.emit("config");
}
