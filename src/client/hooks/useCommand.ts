import { nanoid } from "nanoid";
import { useCallback, useContext, useMemo } from "preact/hooks";
import { ClientCommandType, ClientCommand } from "../../types/commands";
import { DistributiveOmit } from "../../types/util";
import { ChannelContext } from "../Channel";

type CommandArg<TKey extends ClientCommandType["type"]> =
  {} extends DistributiveOmit<ClientCommand<TKey>, "type" | "correlation">
    ? []
    : [DistributiveOmit<ClientCommand<TKey>, "type" | "correlation">];

export const useCommand = <TKey extends ClientCommandType["type"]>(
  type: TKey
): [(...commandArgs: CommandArg<TKey>) => void, string] => {
  const channel = useContext(ChannelContext);
  const correlation = useMemo(() => nanoid(), [type]);

  return [
    useCallback(
      (...commandArgs: CommandArg<TKey>) => {
        channel?.send({
          type,
          correlation,
          ...(commandArgs[0] ?? {}),
        } as ClientCommandType);
      },
      [channel, type, correlation]
    ),
    correlation,
  ];
};
