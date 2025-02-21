import type { InstructionPointer } from "./instructions";
import { type AnyLiteralJsValue } from "./virtual_objects";

export interface ClosureDescriptionJs {
  argCount?: number;
  tempCount?: number;
  literals?: AnyLiteralJsValue[];
  getInstructions?: (pointer: InstructionPointer) => void;
}
