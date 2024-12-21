import {invariant} from "./Error";

export type Stack<T> = Pick<Array<T>, "push" | "pop" | "length"> & { "peek": () => T | undefined, "verifyIntegrity": () => void };

export function Stack<T>(...stack: T[]) {
  (stack as any).peek = function() {
    return this.at(-1);
  };
  (stack as any).verifyIntegrity = verifyIntegrity;
  return stack as unknown as Stack<T>;
}

export type Queue<T> = Pick<Array<T>, "push" | "shift" | "length"> & { "verifyIntegrity": () => void };

export function Queue<T>(...queue: T[]) {
  (queue as any).verifyIntegrity = verifyIntegrity;
  return queue as unknown as Queue<T>;
}

/** Verify that there are no empty slots in the array */
function verifyIntegrity<T>(this: T[]): void {
  for(let i = 0; i < this.length; i++) {
    invariant(this[i] !== undefined, "Empty slot in array");
  }
}

