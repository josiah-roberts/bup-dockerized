import { useContext, useEffect } from "react";
import { ServerMessageHandler, ServerMessageType } from "../types/ClientCommand";
import { ChannelContext } from "./Channel";

export const useSubscription =
  <TKey extends ServerMessageType['type']>(type: TKey, handler: ServerMessageHandler<TKey>) => {
    const channel = useContext(ChannelContext);
    useEffect(() => {
      if (channel) {
        console.log("Subscribed to %s", type)
        return channel.subscribe(type, handler);
      }
    }, [channel, handler]);
  }