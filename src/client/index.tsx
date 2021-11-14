import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { makeChannel, Channel } from './Channel';
import './index.css'

const LeComp = ({ channel }: { channel: Channel }) => {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    channel.opened(() => {
      channel.send({ type: 'ping' });
    });
    channel.subscribe('ping-text', (e) => {
      setMessages(existing => [...existing, e.message]);
      if (e.message === "That's it") {
        channel.send({ type: 'echo', message: 'Please send this back to me' });
      }
    });
    channel.subscribe('echo-text', (e) => {
      setMessages(existing => [...existing, `ECHO: ${e.message}`]);
    });
  }, [channel, setMessages])
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
    <h1>Hello Bois!</h1>
    {channel && <LeComp channel={channel} />}
  </div>
}

ReactDOM.render(<Application />,
  document.getElementById('app-root'),
)