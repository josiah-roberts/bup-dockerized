import { createServer } from "http";
import "source-map-support/register";
import {
  checkEnv,
  defaultBackupsPath,
  defaultConfigPath,
} from "./utils/check-env";
import { createWsServer, wsUpgradeHandler } from "./network/websockets";
import { staticHandler } from "./network/static";
import { getBackupDir, getConfig } from "./application/config-repository";
import { getStatus } from "./application/status-repository";
import { initializeRepository } from "./application/bup-actions";
import { maintainRunners } from "./application/cron";
import { addListener } from "./application/events";

const port = 80 as const;

console.info("\n### Starting application... ###\n");

checkEnv("BACKUPS_DIR", defaultBackupsPath)
  .then(() => checkEnv("CONFIG_DIR", defaultConfigPath))
  .then(() => getConfig())
  .then(async (config) => {
    console.info("\n### Determining backup status... ###\n");
    console.info(`Found ${config.backups.length} backups`);

    for (const b of config.backups) {
      await initializeRepository(getBackupDir(b));
      const status = await getStatus(b);
      console.info('Found status for backup "%s":', b.name);
      console.info(status);
    }
    return config;
  })
  .then((config) => {
    maintainRunners(config);
    addListener("config", async () => {
      maintainRunners(await getConfig());
    });
  })
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
