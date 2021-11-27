import { createServer } from "http";
import "source-map-support/register";
import { checkEnv } from "./utils/check-env";
import { createWsServer, wsUpgradeHandler } from "./network/websockets";
import { staticHandler } from "./network/static";
import { getConfig } from "./application/config-repository";
import { initializeRepository, save } from "./application/bup-actions";

const port = 80 as const;

console.info("\nStarting application...");

checkEnv("BACKUPS_DIR")
  .then(() => checkEnv("CONFIG_DIR"))
  .then(() => getConfig())
  .then((config) =>
    Promise.all(
      config.repositories.map(async (r) => {
        if (r.status === "un-initialized") await initializeRepository(r);
      })
    )
  )
  .then(() => {
    console.info("\nStarting servers...");
    const server = createServer();
    const wss = createWsServer();

    server
      .on("upgrade", wsUpgradeHandler(wss))
      .on("request", staticHandler)
      .listen(port, () => {
        console.log("HTTP + WS server is hosted on *:%s\n", port);
      });
  });
