import { WebSocketServer, WebSocket, RawData } from "ws";
import { getAnyCorrelation, withCorrelation } from "../utils/correlation";
import { DistributiveOmit } from "../../types/util";
import { ServerMessage } from "../../types/commands";
import { z, ZodType } from "zod";
import assert from "node:assert";

type MessageContainer<T> = {
  message: T;
  rawMessage: RawData;
  isBinary: boolean;
};

const patchSendWithLogging = (ws: WebSocket) => {
  const baseSend = ws.send.bind(ws);
  ws.send = ((...args: Parameters<typeof ws.send>) => {
    console.info("WS send: %s", args[0]);
    return baseSend(...args);
  }) as typeof ws.send;
};

function send<
  TServerMessages extends Record<string, { correlation?: string }>,
  T extends keyof TServerMessages
>(
  ws: WebSocket,
  type: T,
  message: DistributiveOmit<TServerMessages[T], "type" | "correlation">
) {
  const correlation = getAnyCorrelation();
  ws.send(JSON.stringify({ type, correlation, ...message }, undefined, 2));
}

const assertNonEmpty = <T>(v: T[]) => {
  assert(v.length > 0);
  return v as [T, ...T[]];
};

const safeParseJson = (str: string) => {
  try {
    return {
      success: JSON.parse(str),
    };
  } catch (e) {
    return {
      error: e,
    };
  }
};

export const createServer = <
  TClientMessages extends Record<string, ZodType>,
  TServerMessages extends Record<string, ZodType>
>(
  clientTypes: TClientMessages,
  serverTypes: TServerMessages,
  messageHandlers: {
    [k in keyof TClientMessages]: (
      incoming: MessageContainer<k>,
      ws: WebSocket,
      wss: WebSocketServer
    ) => void;
  }
) => {
  const clientMessageSchema = z
    .string()
    .transform(safeParseJson)
    .refine((x): x is { success: unknown } => x.success)
    .pipe(
      z.discriminatedUnion(
        "type",
        assertNonEmpty(
          Object.entries(clientTypes).map(([k, v]) =>
            z.object({
              type: z.literal(k),
              correlation: z.string().optional(),
              message: v,
            })
          )
        )
      )
    );

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", function connection(ws) {
    console.info("WS connected");
    patchSendWithLogging(ws);

    ws.on("message", function incoming<
      T extends TClientMessages[keyof TClientMessages]
    >(message: RawData, isBinary: boolean) {
      console.info("WS message: %s", message);
      const parsed = clientMessageSchema.safeParse(String(message));
      if (!parsed.success) {
        // TODO: Force error contract?
        return;
      }

      withCorrelation(parsed.data.correlation, async () => {
        const handler = messageHandlers[parsed.data.type] as unknown as (
          incoming: MessageContainer<T>,
          opts: {
            send: <
              TServerMessages extends Record<string, { correlation?: string }>,
              T extends keyof TServerMessages
            >(
              type: T,
              message: DistributiveOmit<
                TServerMessages[T],
                "type" | "correlation"
              >
            ) => void;
          },
          ws: WebSocket,
          wss: WebSocketServer
        ) => void;
        try {
          handler(
            { message: parsed.data.message, rawMessage: message, isBinary },
            {
              send(type, message) {
                send(ws, type, message);
              },
            },
            ws,
            wss
          );
        } catch (e) {
          console.error(e);
        }
      });
    });
  });

  return wss;
};
