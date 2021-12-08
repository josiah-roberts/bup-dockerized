import { readFile, writeFile } from "fs/promises";
import { once, sortBy } from "ramda";
import assert from "assert";
import { Backup, Config } from "../../types/config";
import { addShutdownTask } from "../utils/shutdown";

const defaultConfig = (): Config => ({
  backups: [],
  rootPath: getBackupsDir(),
});

export const getConfigDir = () => {
  const configDir = process.env["CONFIG_DIR"];
  assert(configDir);
  return configDir;
};

export const getBackupsDir = () => {
  const backupsDir = process.env["BACKUPS_DIR"];
  assert(backupsDir);
  return backupsDir;
};

export const getBackupDir = (b: Backup) => `${getBackupsDir()}/${b.name}`;

let inMemoryConfig: Config;
const loadConfig = once(() =>
  readFile(`${getConfigDir()}/config.json`)
    .then((buffer) => buffer.toString())
    .then<Config>((json) => JSON.parse(json))
    .catch((e) => {
      console.warn(e);
      return defaultConfig();
    })
    .then((config) => setConfig({ ...config, rootPath: getBackupsDir() }))
);

let writing = false;
const writeConfig = async () => {
  if (!writing && inMemoryConfig) {
    writing = true;
    await writeFile(
      `${getConfigDir()}/config.json`,
      JSON.stringify(inMemoryConfig)
    );
    writing = false;
  } else {
    console.warn("Already writing config!");
  }
  return inMemoryConfig;
};

export const getConfig = () => inMemoryConfig ?? loadConfig();
export const setConfig = (newConfig: Config) => {
  const configToWrite = {
    ...newConfig,
    backups: sortBy((b) => b.name, newConfig.backups),
  };
  inMemoryConfig = configToWrite;
  return writeConfig();
};

addShutdownTask("write config", async () => {
  await writeConfig();
});
