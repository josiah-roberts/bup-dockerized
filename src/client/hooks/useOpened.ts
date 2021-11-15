import { useContext, useEffect } from "react";
import { ChannelContext } from "../Channel";

export const useOpened = (handler: () => void) => {
  const channel = useContext(ChannelContext);
  useEffect(() => {
    return channel?.opened(handler);
  }, [channel]);
};
