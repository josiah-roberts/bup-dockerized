import { AsyncLocalStorage } from "async_hooks";

const asyncLocalStorage = new AsyncLocalStorage<{ correlation?: string }>();

export function getAnyCorrelation() {
  return asyncLocalStorage.getStore()?.correlation;
}

export function withCorrelation<T>(
  correlation: string | undefined,
  f: () => T
) {
  return asyncLocalStorage.run({ correlation }, f);
}
