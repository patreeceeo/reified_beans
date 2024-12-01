
export function returning<T>(x: T): () => T {
  return () => x;
}
