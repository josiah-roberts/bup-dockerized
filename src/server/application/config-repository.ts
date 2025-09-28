import { readFile, writeFile } from "fs/promises"
import { once, sortBy } from "ramda"
import assert from "assert"
import path from "path"
import { Backup, Config } from "../../types/config"
import { addShutdownTask } from "../utils/shutdown"
import { defaultBackupsPath, defaultConfigPath } from "../utils/check-env"

const defaultConfig = (): Config => ({
  backups: [],
  rootPath: getBackupsDir(),
})

export const getConfigDir = () => {
  const configDir = process.env["CONFIG_DIR"] ?? defaultConfigPath
  assert(configDir)
  return configDir
}

export const getBackupsDir = () => {
  const backupsDir = process.env["BACKUPS_DIR"] ?? defaultBackupsPath
  assert(backupsDir)
  return backupsDir
}

export const getBackupDir = (b: Backup) => {
  const prefix = b.prefix || "default"
  const safeName = path.basename(b.name)
  const safePrefix = path.basename(prefix)
  return path.join(getBackupsDir(), safePrefix, safeName)
}
export const getRestoreDir = (b: Backup) => {
  const safeName = path.basename(b.name)
  return path.join(getBackupsDir(), `bup_restore_${safeName}`)
}

let inMemoryConfig: Config | undefined
const loadConfig = once(() =>
  readFile(`${getConfigDir()}/config.json`)
    .then((buffer) => buffer.toString())
    .then<Config>((json) => JSON.parse(json))
    .catch((e) => {
      console.warn(e)
      return defaultConfig()
    })
    .then((config) => setConfig({ ...config, rootPath: getBackupsDir() }))
)

let writing = false
const writeConfig = async () => {
  if (!writing && inMemoryConfig) {
    writing = true
    await writeFile(
      `${getConfigDir()}/config.json`,
      JSON.stringify(inMemoryConfig)
    )
    writing = false
  } else {
    console.warn("Already writing config!")
  }
}

export const getConfig = () => inMemoryConfig ?? loadConfig()
export const setConfig = async (newConfig: Config) => {
  const configToWrite = {
    ...newConfig,
    backups: sortBy((b) => b.name, newConfig.backups),
  }
  inMemoryConfig = configToWrite
  await writeConfig()
  return configToWrite
}

addShutdownTask("write config", async () => {
  await writeConfig()
})
