import { useContext, useEffect } from "preact/hooks";
import { ChannelContext } from "../Channel";

export const useClosed = (handler: () => void) => {
  const channel = useContext(ChannelContext);
  useEffect(() => {
    return channel?.closed(handler);
  }, [channel]);
};
