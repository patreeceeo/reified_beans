import { invariant, RangeError, TypeError } from "./errors";
import type { AnyLiteralJsValue, VirtualObject } from "./virtual_objects";

// TODO: combine this the Validator?

export interface RuntimeType<T> {
  check(
    vObject: VirtualObject,
    humanFriendlyValueName: string,
  ): asserts vObject is VirtualObject & { readonly primitiveValue: T };
}

export const runtimeTypeAnyJsLiteral: RuntimeType<AnyLiteralJsValue> = {
  check(vObject, humanFriendlyValueName) {
    // Nothing to do because TSC already ensures that vObject.primitiveValue is AnyLiteralJsValue
    void vObject;
    void humanFriendlyValueName;
  },
};

export const runtimeTypeNotNil: RuntimeType<unknown> = {
  check(vObject, humanFriendlyValueName) {
    invariant(!vObject.isNil, TypeError, humanFriendlyValueName, "nil");
  },
};

export const runtimeTypePositiveNumber: RuntimeType<number> = {
  check(vObject, humanFriendlyValueName) {
    const { primitiveValue } = vObject;
    invariant(
      typeof primitiveValue === "number",
      TypeError,
      humanFriendlyValueName,
      String(primitiveValue),
    );
    invariant(
      primitiveValue >= 0,
      RangeError,
      primitiveValue,
      0,
      Number.MAX_SAFE_INTEGER,
      humanFriendlyValueName,
    );
  },
};

export const runtimeTypeString: RuntimeType<string> = {
  check(vObject, humanFriendlyValueName) {
    invariant(
      typeof vObject.primitiveValue === "string",
      TypeError,
      humanFriendlyValueName,
      String(vObject.primitiveValue),
    );
  },
};
