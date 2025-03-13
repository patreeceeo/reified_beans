import type { Instruction } from "./instructions";
import { type AnyLiteralJsValue } from "./virtual_objects";

export interface ClosureDescriptionJs {
  argCount?: number;
  tempCount?: number;
  literals?: AnyLiteralJsValue[];
  instructions?: Instruction<any>[];
}
