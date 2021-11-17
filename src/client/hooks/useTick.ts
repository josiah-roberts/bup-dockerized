import { useEffect, useState } from "preact/hooks";

const getTicks = () => +new Date();

export const useTick = (mspt: number) => {
  const [tick, doTick] = useState(getTicks());

  useEffect(() => {
    const timeout = setTimeout(() => doTick(getTicks()), mspt);
    return () => clearTimeout(timeout);
  }, [tick, doTick]);

  return tick;
};
