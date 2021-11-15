import { nanoid } from "nanoid";
import { useCallback, useContext } from "react";
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
  "type"
>
  ? []
  : [Omit<ClientCommand<TKey>, "type">];

type HookArgs<TKey extends ClientCommandType["type"]> =
  TKey extends ServerMessageType["type"]
    ? [TKey, ServerMessageHandler<TKey>?]
    : [TKey];

export const useCommand = <TKey extends ClientCommandType["type"]>(
  ...[type, replyHandler]: HookArgs<TKey>
) => {
  const channel = useContext(ChannelContext);
  const correlation = replyHandler ? nanoid() : undefined;

  useSubscription(
    (replyHandler ? type : "noop") as ServerMessageType["type"],
    (message, event) => {
      if (message.correlation && message.correlation === correlation) {
        (replyHandler as any)?.(message, event);
      }
    }
  );

  return useCallback(
    (...commandArgs: CommandArg<TKey>) => {
      channel?.send({
        type,
        correlation,
        ...(commandArgs[0] ?? {}),
      } as ClientCommandType);
    },
    [channel]
  );
};
