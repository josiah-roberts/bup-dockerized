import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { makeChannel, Channel, ChannelContext } from './Channel';
import './index.css'
import { useClosed } from './useClosed';
import { useOpened } from './useOpened';
import { usePublish } from './usePublish';
import { useSubscription } from './useSubscription';


const LeComp = () => {
  const ping = usePublish('ping');
  const echo = usePublish('echo');
  const bupHelp = usePublish('bup-help');

  const [messages, setMessages] = useState<string[]>([]);


  useClosed(() => setMessages(m => [...m, 'yo it closed, fuck']));

  useOpened(() => ping());

  useSubscription('ping-text', useCallback((e) => {
    setMessages(existing => [...existing, e.message]);
    if (e.message === "That's it") {
      echo({ message: 'Please send this back to me' });
    }
  }, [setMessages, echo]));
  useSubscription('echo-text', useCallback((e) => {
    setMessages(existing => [...existing, `ECHO: ${e.message}`]);
    bupHelp();
  }, [setMessages, bupHelp]))

  return <div>
    {messages.map(m => <li key={m}>{m}</li>)}
  </div>
};

const Application = () => {
  const [channel, setChannel] = useState<Channel>();

  useEffect(() => {
    if (!channel) {
      setChannel(makeChannel());
    }
  }, [channel]);

  return <div>
    <h1>Hello dockerized Bois!</h1>
    <ChannelContext.Provider value={channel}>
      <LeComp />
    </ChannelContext.Provider>
  </div>
}

ReactDOM.render(<Application />,
  document.getElementById('app-root'),
)