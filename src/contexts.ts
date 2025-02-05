import { VirtualObject } from "./virtual_objects";
import { Dict, FixedLengthArray, Stack } from "./generics";
import { invariant, BindingError } from "./errors";
import type { Closure } from "./closures";
import { InstructionPointer } from "./instructions";

export class GlobalContext {
  dict = Dict<VirtualObject>();

  at(key: string): VirtualObject {
    let vObject = this.dict[key];
    invariant(vObject !== undefined, BindingError, key);
    return vObject;
  }

  put(key: string, value: VirtualObject) {
    this.dict[key] = value;
  }
}

/** (TODO:reflect) Use a VirtualObject instead */
export class ClosureContext {
  argsAndTemps: FixedLengthArray<VirtualObject>;
  evalStack = Stack<VirtualObject>();
  instructionPointer: InstructionPointer;
  constructor(
    readonly receiver: VirtualObject,
    readonly closure: Closure,
    readonly sender?: ClosureContext,
  ) {
    this.instructionPointer = new InstructionPointer(
      closure.vm.instructionBuffer,
      closure.instructionByteOffset,
      closure.instructionByteLength,
    );
    this.argsAndTemps = FixedLengthArray(
      closure.argCount + closure.tempCount,
      Array,
    );
  }
}
