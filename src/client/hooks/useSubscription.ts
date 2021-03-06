import { useContext, useEffect } from "preact/hooks";
import { ServerMessageHandler, ServerMessageType } from "../../types/commands";
import { ChannelContext } from "../Channel";

export const useSubscription = <TKey extends ServerMessageType["type"]>(
  type: TKey,
  handler: ServerMessageHandler<TKey>,
  correlation?: string | string[]
) => {
  const channel = useContext(ChannelContext);
  useEffect(() => {
    if (channel) {
      return channel.subscribe(type, handler, correlation);
    }
  }, [channel, handler]);
};
