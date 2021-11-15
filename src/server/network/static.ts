import serveHandler from "serve-handler";
import { IncomingMessage, ServerResponse } from "http";

export const staticHandler = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    await serveHandler(req, res, {
      public: "./dist/static",
      directoryListing: false,
    });
    console.info("%s static %s", res.statusCode, req.url);
  } catch (e) {
    console.error(e);
  }
};
