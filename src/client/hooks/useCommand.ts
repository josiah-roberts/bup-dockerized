import { nanoid } from "nanoid";
import { useCallback, useContext, useMemo, useState } from "preact/hooks";
import {
  ClientCommandType,
  ClientCommand,
  ServerMessageType,
  ServerMessageHandler,
  ServerMessage,
} from "../../types/commands";
import { DistributiveOmit } from "../../types/util";
import { ChannelContext } from "../Channel";
import { useSubscription } from "./useSubscription";

type CommandArg<TKey extends ClientCommandType["type"]> =
  {} extends DistributiveOmit<ClientCommand<TKey>, "type" | "correlation">
    ? []
    : [DistributiveOmit<ClientCommand<TKey>, "type" | "correlation">];

type HookArgs<TKey extends ClientCommandType["type"]> =
  TKey extends ServerMessageType["type"]
    ? [TKey, ServerMessageHandler<TKey>?]
    : [TKey];

export const useCommand = <TKey extends ClientCommandType["type"]>(
  ...[type, replyHandler]: HookArgs<TKey>
): [
  (
    ...comandArgs: CommandArg<TKey>
  ) => Promise<
    TKey extends ServerMessageType["type"] ? ServerMessage<TKey> : never
  >,
  string
] => {
  const channel = useContext(ChannelContext);
  const correlation = useMemo(() => nanoid(), [type, replyHandler]);

  const [[resolvePromise, rejectPromise] = [], setResolvePromise] =
    useState<
      [
        (
          msg: TKey extends ServerMessageType["type"]
            ? ServerMessage<TKey>
            : never
        ) => void,
        (error: unknown) => void
      ]
    >();

  useSubscription(
    (replyHandler ? type : "noop") as ServerMessageType["type"],
    (msg, event) => {
      if ("error" in msg) {
        rejectPromise?.(msg);
      } else {
        resolvePromise?.(msg as any);
      }
      replyHandler?.(msg as any, event);
    },
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

        return new Promise<
          TKey extends ServerMessageType["type"] ? ServerMessage<TKey> : never
        >((res, rej) => {
          setResolvePromise([res, rej]);
        });
      },
      [channel, type, correlation]
    ),
    correlation,
  ];
};
