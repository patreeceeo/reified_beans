import { Validator } from "./errors";
import { FixedLengthArray } from "./generics";
import type { VirtualMachine } from "./virtual_machine";
import { VirtualObject } from "./virtual_objects";

const literalValidator = new Validator<VirtualObject>(
  "a literal",
  (vObject) => {
    return (
      vObject.isNil ||
      vObject.isTrue ||
      vObject.isFalse ||
      typeof vObject.primitiveValue === "number" ||
      typeof vObject.primitiveValue === "string"
    );
  },
);
/**(TODO:dx) Use builder pattern */

/** (TODO:reflect) Use a VirtualObject instead */
export class Closure {
  literals: FixedLengthArray<VirtualObject>;
  constructor(
    readonly argCount: number,
    readonly tempCount: number,
    readonly literalCount: number,
    readonly vm: VirtualMachine,
    readonly instructionByteOffset = 0,
    readonly instructionByteLength = 0,
  ) {
    this.literals = FixedLengthArray<VirtualObject>(
      literalCount,
      Array,
      literalValidator,
    );
  }
}
