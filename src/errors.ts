export function raise<
  ErrorClassType extends new (...args: Args) => any,
  Args extends any[],
>(ErrorClass: ErrorClassType, ...args: Args): never {
  throw new ErrorClass(...args);
}

export function invariant<
  ErrorClassType extends new (...args: Args) => any,
  Args extends any[],
>(
  condition: any,
  ErrorClass: ErrorClassType,
  ...args: Args
): asserts condition {
  if (!condition) {
    raise(ErrorClass, ...args);
  }
}

export class BindingError extends Error {
  searchPath: string[] = [];
  constructor(readonly key: string) {
    super(`I don't know about anything called ${key}.`);
  }
}

export class RangeError extends Error {
  constructor(
    readonly num: number,
    readonly min: number,
    readonly max: number,
    readonly humanFriendlyValueName = "a number",
  ) {
    super(
      `I expected ${humanFriendlyValueName} between ${min} and ${max}, got ${num}`,
    );
  }
}

export class TypeError extends Error {
  constructor(
    readonly expected: string,
    readonly got: string,
  ) {
    super(`I expected a(n) ${expected}, got a(n) ${got}`);
  }
}

export class Validator<T> {
  constructor(
    readonly valueDescription: string,
    readonly isValid: (value: T) => boolean,
  ) {}
  validate(value: T) {
    invariant(
      this.isValid(value),
      ValidationError,
      this.valueDescription,
      String(value),
    );
  }
}

export const anyValidator = new Validator("anything", () => true);

export class ValidationError extends Error {
  constructor(
    readonly valueDescription: string,
    readonly valueString: string,
  ) {
    super(`I expected ${valueDescription}, got ${valueString}`);
  }
}

export class NotImplementedError extends Error {
  constructor(
    readonly classKey: string,
    readonly message: string,
  ) {
    super(`${classKey} instances do not understand #${message}`);
  }
}

export class UnknownVMInstruction extends Error {
  constructor(readonly instruction: number) {
    super(`The VM does not understand ${instruction} as an instruction`);
  }
}

export class StackUnderflowError extends Error {
  constructor(stackName: string) {
    super(`The ${stackName} stack has 0 elements, expected at least 1`);
  }
}

export class ArgumentCountError extends Error {
  constructor(
    readonly expected: number,
    readonly got: number,
  ) {
    super(`Expected ${expected} arguments, got ${got}`);
  }
}
