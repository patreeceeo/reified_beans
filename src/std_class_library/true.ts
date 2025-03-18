import { ContextValue } from "src/contexts";
import { instruction } from "src/instructions";
import { SpecialPushValue } from "src/special_value";
import { type CompiledClass } from "src/virtual_objects";

export const dTrue_ifTrue = {
  argCount: 1,
  instructions: [
    // The following instructions send the #value message to the first argument of this method,
    // which is expected to be a block closure.

    // Provide the first argument to the #value message, the number of arguments the block is expected to take
    instruction.pushSpecialValue(SpecialPushValue.Zero),

    // push the block (first arg) onto the evaluation stack
    instruction.push(ContextValue.TempVar, 0),
    // actually send the message
    instruction.sendSelector("value", 1),
  ],
};

export const dTrue_ifFalse = {
  argCount: 1,
  tempCount: 0,
  literals: [],
  instructions: [instruction.noop()],
};

const not = {
  instructions: [
    // I've been popped off the stack
    // and now I push false in my place
    instruction.pushSpecialValue(SpecialPushValue.False),
  ],
};

const dTrue: CompiledClass = {
  name: "True",
  superClass: "Boolean",
  ivars: [],
  classComment: "My instances represent logical accuracy.",
  methodDict: {
    "ifTrue:": dTrue_ifTrue,
    "ifFalse:": dTrue_ifFalse,
    not,
  },
};

export default dTrue;
