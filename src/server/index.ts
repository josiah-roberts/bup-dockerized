import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { Socket } from 'net';
import serveHandler from 'serve-handler';
import { spawn } from 'child_process';
import type { ClientCommandType } from '../types/ClientCommand';
import 'source-map-support/register'
import { checkEnv } from './check-env';

const port = 1234 as const;

checkEnv('BACKUPS_DIR');
checkEnv('CONFIG_DIR');

const server = createServer();
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    setTimeout(() => {
      console.log('received: %s', message);

      const parsed = JSON.parse(String(message)) as ClientCommandType;
      console.log(parsed);

      if (parsed.type === 'ping') {
        console.log("DOING IT");
        spawn('ping', ['-c', '5', 'google.com']).stdout.on('data', (data) => {
          ws.send(JSON.stringify({ type: 'ping-text', message: data.toString() }));
        }).on('end', () => {
          ws.send(JSON.stringify({ type: 'ping-text', message: 'That\'s it' }));
        })
      }

      if (parsed.type === 'echo') {
        ws.send(JSON.stringify({ type: 'echo-text', message: parsed.message }));
      }

      if (parsed.type === 'bup-help') {
        const emitter = spawn('bup', ['help']);
        emitter.stdout.on('data', (data) => {
          ws.send(JSON.stringify({ type: 'ping-text', message: data.toString() }));
        }).on('end', () => {
          ws.send(JSON.stringify({ type: 'ping-text', message: 'That\'s bup helpful, yeah' }));
        });
        emitter.stderr.on('data', (e) => console.error(e.toString()));
      }
    }, 3000);
  });

  ws.send(JSON.stringify({ type: 'ping-text', message: 'Welcome to the server' }));
});

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws') {
    wss.handleUpgrade(request, socket as Socket, head, (ws) => {
      wss.emit('connection', ws, request);
    })
  }
}).on('request', async (req, res) => {
  console.log("req")
  serveHandler(req, res, { public: './dist/static', directoryListing: false }).catch(e => console.log(e));
}).listen(port, () => {
  console.log("Server is hosted on *:%s", port);
});
