import { useEffect, useState } from "preact/hooks";
import { Channel, ChannelContext, makeChannel } from "../Channel";
import { Application } from "./Application";

export const WrappedApplication = () => {
  const [channel, setChannel] = useState<Channel>();

  useEffect(() => {
    if (!channel) {
      setChannel(makeChannel());
    }
  }, [channel]);

  return (
    <div class="application" id="application">
      <h1 class="card">Bup Console</h1>
      <ChannelContext.Provider value={channel}>
        <Application />
      </ChannelContext.Provider>
    </div>
  );
};
