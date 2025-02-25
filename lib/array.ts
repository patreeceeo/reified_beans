import { type ClassDescription } from "src/virtual_objects";
import type { ClosureDescriptionJs } from "src/closures";
import {
  instSendLiteralSelectorExt,
  type InstructionPointer,
} from "src/instructions";

const dArray_at: ClosureDescriptionJs = {
  argCount: 1,
  tempCount: 0,
  literals: ["at:"],
  getInstructions: (pointer: InstructionPointer) => {
    instSendLiteralSelectorExt.writeWith(pointer, 0, 1);
  },
};

const dArray: ClassDescription = {
  name: "Array",
  superClass: "Object",
  ivars: [],
  classComment: "",
  methodDict: {
    "at:": dArray_at,
  },
};

export default dArray;
