export function raise(message: string, ErrorClass = Error): never {
  throw new ErrorClass(message);
}

export function invariant(condition: any, message: string, ErrorClass = Error): asserts condition {
  if (!condition) {
    raise(message, ErrorClass);
  }
}
