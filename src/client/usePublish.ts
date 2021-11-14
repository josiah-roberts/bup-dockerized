import { useCallback, useContext } from "react";
import { ClientCommandType, ClientCommand } from "../types/ClientCommand";
import { ChannelContext } from "./Channel";

type CommandArg<TKey extends ClientCommandType['type']> = {} extends Omit<ClientCommand<TKey>, 'type'> ? [] : [Omit<ClientCommand<TKey>, 'type'>];

export const usePublish = <TKey extends ClientCommandType['type']>(type: TKey) => {
  const channel = useContext(ChannelContext);
  return useCallback((...commandArgs: CommandArg<TKey>) => {
    channel?.send({ ...(commandArgs[0] ?? {}), type } as ClientCommandType);
  }, [channel])
}