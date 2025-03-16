import { instruction, type Instruction } from "./instructions";
import { type AnyLiteralJsValue } from "./virtual_objects";

interface CompiledClosure {
  argCount: number;
  tempCount: number;
  literals: AnyLiteralJsValue[];
  instructions: Instruction<any>[];
}

export type CompiledClosureDescription = Partial<CompiledClosure>;

export const closureDefaults: CompiledClosure = {
  argCount: 0,
  tempCount: 0,
  literals: [],
  instructions: [instruction.noop()],
};
