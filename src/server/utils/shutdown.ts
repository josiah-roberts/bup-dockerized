const listeners: Array<[string, () => Promise<void>]> = [];

export const addShutdownTask = (name: string, l: () => Promise<void>) =>
  listeners.push([name, l]);

const shutdown = async () => {
  for (const [name, listener] of listeners) {
    console.info(`Running shutdown task "${name}"`);
    await listener();
  }
  process.exit();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
