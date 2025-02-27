import { ContextValue } from "src/contexts";
import {
  instPush,
  instPushSpecialVal,
  instSendLiteralSelectorExt,
  type InstructionPointer,
} from "src/instructions";
import { SpecialPushValue } from "src/special_value";
import { type ClassDescription } from "src/virtual_objects";

export const dTrue_ifTrue = {
  argCount: 1,
  tempCount: 0,
  literals: ["value"],
  getInstructions: (pointer: InstructionPointer) => {
    // send #value to the first argument
    // the block takes zero arguments
    instPushSpecialVal.writeWith(pointer, SpecialPushValue.Zero);
    // push the block onto the evaluation stack
    instPush.writeWith(pointer, ContextValue.TempVar, 0);
    // actually send the message
    instSendLiteralSelectorExt.writeWith(pointer, 0, 1);
  },
};

const dTrue: ClassDescription = {
  name: "True",
  superClass: "Boolean",
  ivars: [],
  classComment: "My instances represent logical accuracy.",
  methodDict: {
    "ifTrue:": dTrue_ifTrue,
  },
};

export default dTrue;
