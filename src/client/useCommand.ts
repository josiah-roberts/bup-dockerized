import { useCallback, useContext } from "react";
import { ClientCommandType, ClientCommand } from "../types/commands";
import { ChannelContext } from "./Channel";

type CommandArg<TKey extends ClientCommandType['type']> = {} extends Omit<ClientCommand<TKey>, 'type'> ? [] : [Omit<ClientCommand<TKey>, 'type'>];

export const useCommand = <TKey extends ClientCommandType['type']>(type: TKey) => {
  const channel = useContext(ChannelContext);
  return useCallback((...commandArgs: CommandArg<TKey>) => {
    channel?.send({ ...(commandArgs[0] ?? {}), type } as ClientCommandType);
  }, [channel])
}