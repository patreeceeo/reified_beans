export function raise(
  message: string,
  errorConstructor: ErrorConstructor = Error
): never {
  throw new errorConstructor(message);
}

export function invariant(
  condition: boolean,
  message: string,
  errorConstructor: ErrorConstructor = Error
): void {
  if (!condition) {
    raise(message, errorConstructor);
  }
}
