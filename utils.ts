import { Dict } from "./src/generics";

export function getWithDefault<K extends keyof D, D extends Dict<any>>(
  partial: Partial<D>,
  full: D,
  key: K,
): D[K] {
  return partial[key] ?? full[key];
}
