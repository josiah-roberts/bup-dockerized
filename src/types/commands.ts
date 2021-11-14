export type ClientCommandType = {
  type: 'ping'
} | {
  type: 'bup-help'
} | {
  type: 'echo',
  message: string,
}
export type ClientCommand<TKey extends ClientCommandType['type']> = Exclude<ClientCommandType, { type: Exclude<ClientCommandType['type'], TKey> }>;

export type ServerMessageType = {
  type: 'ping',
  message: string,
} | {
  type: 'echo',
  message: string,
}
export type ServerMessage<TKey extends ServerMessageType['type']> = Exclude<ServerMessageType, { type: Exclude<ServerMessageType['type'], TKey> }>;

export type ServerMessageHandler<TKey extends ServerMessageType['type']> = (message: ServerMessage<TKey>, event: MessageEvent) => void;