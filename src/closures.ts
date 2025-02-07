import { Validator } from "./errors";
import { FixedLengthArray } from "./generics";
import type { InstructionPointer } from "./instructions";
import type { VirtualMachine } from "./virtual_machine";
import { VirtualObject, type LiteralJsValue } from "./virtual_objects";

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

export interface ClosureDescriptionJs {
  argCount: number;
  tempCount: number;
  literals: LiteralJsValue[];
  getInstructions?: (pointer: InstructionPointer) => void;
}

/**
 * Most of this time, this should not be used directly.
 * Use VirtualMachine#createClosure instead.
 * (TODO:reflect) Use a VirtualObject instead */
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
