import fs from "fs";

export function checkEnv(variableName: string) {
  return new Promise<void>((res, rej) => {
    const value = process.env[variableName];
    if (!value) {
      rej(new Error(`${variableName} is not configured!`));
    } else {
      fs.access(value, (e) => {
        if (e) {
          rej(
            new Error(
              `Could not access ${variableName} ${process.env[variableName]}\n${e}`
            )
          );
        } else {
          console.info("Found %s %s", variableName, process.env[variableName]);
          res();
        }
      });
    }
  });
}
