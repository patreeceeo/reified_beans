
export type Stack<T> = Pick<Array<T>, "push" | "pop" | "length"> & { "peek": () => T | undefined };

export function Stack<T>(...stack: T[]) {
  (stack as any).peek = function() {
    return this.at(-1);
  }
  return stack as unknown as Stack<T>;
}

export type Queue<T> = Pick<Array<T>, "push" | "shift" | "length">;

export function Queue<T>(...queue: T[]) {
  return queue as unknown as Queue<T>;
}
