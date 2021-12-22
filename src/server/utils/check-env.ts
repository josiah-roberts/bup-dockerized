import fs from "fs";

export const defaultConfigPath = "/config";
export const defaultBackupsPath = "/backups";

export function checkEnv(variableName: string, defaultPath: string) {
  return new Promise<void>((res, rej) => {
    const path = process.env[variableName] ?? defaultPath;
    fs.access(path, (e) => {
      if (e) {
        rej(
          new Error(
            `Could not access ${path}. To override, set ${variableName}\n${e}`
          )
        );
      } else {
        console.info("Found %s %s", path);
        res();
      }
    });
  });
}
