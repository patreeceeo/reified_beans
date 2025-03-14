import { instruction, type Instruction } from "./instructions";
import { type AnyLiteralJsValue } from "./virtual_objects";

interface ClosureDescriptionJsFull {
  argCount: number;
  tempCount: number;
  literals: AnyLiteralJsValue[];
  instructions: Instruction<any>[];
}

export type ClosureDescriptionJs = Partial<ClosureDescriptionJsFull>;

export const closureDefaults: ClosureDescriptionJsFull = {
  argCount: 0,
  tempCount: 0,
  literals: [],
  instructions: [instruction.noop()],
};
