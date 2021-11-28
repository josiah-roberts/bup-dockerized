import { EventEmitter } from "events";
import { Backup } from "../../types/config";

const emitter = new EventEmitter();
type Events = {
  config: void;
  "backup-status": string;
};
type EventType = keyof Events;
type Event<T extends EventType> = Events[T];

export function addListener<T extends EventType>(
  event: T,
  handler: (data: Event<T>) => void
) {
  emitter.addListener(event, handler);
}

export function removeListener<T extends EventType>(
  event: T,
  handler: (data: Event<T>) => void
) {
  emitter.removeListener(event, handler);
}

type EventArgs<T extends EventType> = void extends Event<T>
  ? [T]
  : [T, Event<T>];
export function emit<T extends EventType>(...[event, data]: EventArgs<T>) {
  emitter.emit(event, data);
}
