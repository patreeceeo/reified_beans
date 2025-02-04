import { anyValidator, invariant, RangeError, Validator } from "./errors";

export type Stack<T> = Pick<Array<T>, "push" | "pop" | "length"> & {
  peek: () => T | undefined;
  // verifyIntegrity: () => void;
};

export function Stack<T>(...stack: T[]) {
  (stack as any).peek = function () {
    return this.at(-1);
  };
  // (stack as any).verifyIntegrity = verifyIntegrity;
  return stack as unknown as Stack<T>;
}

export type Queue<T> = Pick<
  Array<T>,
  "push" | "shift" | "unshift" | "length"
> & {
  peek: () => T | undefined;
  // verifyIntegrity: () => void
};

export function Queue<T>(...queue: T[]) {
  (queue as any).peek = function () {
    return this.at(0);
  };
  // (queue as any).verifyIntegrity = verifyIntegrity;
  return queue as unknown as Queue<T>;
}

/** Verify that there are no empty slots in the array */
// function verifyIntegrity<T>(this: T[]): void {
// for(let i = 0; i < this.length; i++) {
//   invariant(this[i] !== undefined, "Empty slot in array");
// }
// }

// TODO make dict like that of python? probably still faster than Map?
export type Dict<T> = Record<string, T>;

export function Dict<T>() {
  return Object.create(null) as Dict<T>;
}

export type ReadonlyDict<T> = Readonly<Record<string, T>>;

export interface FixedLengthArray<T> {
  length: number;
  at(index: number): T;
  put(index: number, value: T): void;
}

type ArrayLikeConstructor<T> = new (length: number) => ArrayLike<T>;

export function FixedLengthArray<
  T,
  ArrayClass extends ArrayLikeConstructor<T> = ArrayLikeConstructor<T>,
>(
  length: number,
  arrayClass: ArrayClass,
  validator = anyValidator as Validator<T>,
): FixedLengthArray<T> {
  return Object.assign(new arrayClass(length), {
    at(this: T[], index: number) {
      invariant(
        index >= 0 && index < this.length,
        RangeError,
        index,
        0,
        this.length - 1,
      );
      return this[index];
    },
    put(this: T[], index: number, value: T) {
      validator.validate(value);
      invariant(
        index >= 0 && index < this.length,
        RangeError,
        index,
        0,
        this.length - 1,
      );
      this[index] = value;
    },
  }) as FixedLengthArray<T>;
}
