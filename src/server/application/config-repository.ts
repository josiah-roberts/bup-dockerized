import { readFile, writeFile } from "fs/promises";
import { once, sortBy } from "ramda";
import assert from "assert";
import { Config } from "../../types/config";
import { addShutdownTask } from "../utils/shutdown";

const defaultConfig = (): Config => ({
  repositories: [
    {
      name: "default",
      status: "un-initialized",
      path: `${process.env["BACKUPS_DIR"]}/default`,
    },
  ],
  backups: [],
});

const getConfigDir = () => {
  const configDir = process.env["CONFIG_DIR"];
  assert(configDir);
  return configDir;
};

let inMemoryConfig: Config;
const loadConfig = once(() =>
  readFile(`${getConfigDir()}/config.json`)
    .then((buffer) => buffer.toString())
    .then<Config>((json) => JSON.parse(json))
    .catch((e) => {
      console.warn(e);
      return defaultConfig();
    })
    .then((config) => {
      inMemoryConfig = config;
      return config;
    })
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
};

export const getConfig = async () => inMemoryConfig ?? loadConfig();
export const setConfig = async (newConfig: Config) => {
  const configToWrite = {
    ...newConfig,
    backups: sortBy((b) => b.repository + b.name, newConfig.backups),
  };
  inMemoryConfig = configToWrite;
  await writeConfig();
};

addShutdownTask("write config", writeConfig);
