export type ClientCommand = {
  type: 'ping'
} | {
  type: 'bup-help'
} | {
  type: 'echo',
  message: string,
}

export type ServerMessageType = {
  type: 'ping-text',
  message: string,
} | {
  type: 'echo-text',
  message: string,
}
export type ServerMessage<TKey extends ServerMessageType['type']> = Exclude<ServerMessageType, { type: Exclude<ServerMessageType['type'], TKey> }>;