import { nanoid } from "nanoid";
import { useCallback, useContext, useMemo } from "react";
import {
  ClientCommandType,
  ClientCommand,
  ServerMessageType,
  ServerMessageHandler,
} from "../types/commands";
import { ChannelContext } from "./Channel";
import { useSubscription } from "./useSubscription";

type CommandArg<TKey extends ClientCommandType["type"]> = {} extends Omit<
  ClientCommand<TKey>,
  "type" | "correlation"
>
  ? []
  : [Omit<ClientCommand<TKey>, "type" | "correlation">];

type HookArgs<TKey extends ClientCommandType["type"]> =
  TKey extends ServerMessageType["type"]
    ? [TKey, ServerMessageHandler<TKey>?]
    : [TKey];

export const useCommand = <TKey extends ClientCommandType["type"]>(
  ...[type, replyHandler]: HookArgs<TKey>
): [(...comandArgs: CommandArg<TKey>) => void, string] => {
  const channel = useContext(ChannelContext);
  const correlation = useMemo(() => nanoid(), [type, replyHandler]);

  useSubscription(
    (replyHandler ? type : "noop") as ServerMessageType["type"],
    (replyHandler ?? (() => {})) as ServerMessageHandler<
      ServerMessageType["type"]
    >,
    correlation
  );

  return [
    useCallback(
      (...commandArgs: CommandArg<TKey>) => {
        channel?.send({
          type,
          correlation,
          ...(commandArgs[0] ?? {}),
        } as ClientCommandType);
      },
      [channel]
    ),
    correlation,
  ];
};
