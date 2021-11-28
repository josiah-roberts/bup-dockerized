import { createServer } from "http";
import "source-map-support/register";
import { checkEnv } from "./utils/check-env";
import { createWsServer, wsUpgradeHandler } from "./network/websockets";
import { staticHandler } from "./network/static";
import { getConfig } from "./application/config-repository";
import { initializeRepository } from "./application/bup-actions";
import assert from "assert";
import { getStatus } from "./application/status-repository";

const port = 80 as const;

console.info("\n### Starting application... ###\n");

checkEnv("BACKUPS_DIR")
  .then(() => checkEnv("CONFIG_DIR"))
  .then(() => getConfig())
  .then(async (config) => {
    console.info("\n### Initializing repositories... ###\n");
    for (const r of config.repositories) {
      await initializeRepository(r);
    }
    return config;
  })
  .then(async (config) => {
    console.info("\n### Determining backup status... ###\n");
    console.info(`Found ${config.backups.length} backups`);

    for (const b of config.backups) {
      const repository = config.repositories.find(
        (x) => x.name === b.repository
      );
      assert(repository);
      const status = await getStatus(repository, b);
      console.info('Found status for backup "%s":', b.name);
      console.info(status);
    }
    return config;
  })
  .then((config) => {
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
