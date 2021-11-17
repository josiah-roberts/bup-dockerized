import React from "preact";
import "./application.css";
import { useEffect, useState } from "preact/hooks";
import { Channel, ChannelContext, makeChannel } from "../Channel";
import { Form } from "./Form";

export const Application = () => {
  const [channel, setChannel] = useState<Channel>();

  useEffect(() => {
    if (!channel) {
      setChannel(makeChannel());
    }
  }, [channel]);

  return (
    <div>
      <h1>Hello dockerized Bois!</h1>
      <ChannelContext.Provider value={channel}>
        <Form />
      </ChannelContext.Provider>
    </div>
  );
};
