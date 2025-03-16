import { type CompiledClass } from "src/virtual_objects";
import { dTrue_ifFalse, dTrue_ifTrue } from "./true";
import { instruction } from "src/instructions";
import { SpecialPushValue } from "src/special_value";

const not = {
  instructions: [
    // I've been popped off the stack
    // and now I push true in my place
    instruction.pushSpecialValue(SpecialPushValue.True),
  ],
};

const dFalse: CompiledClass = {
  name: "False",
  superClass: "Boolean",
  ivars: [],
  classComment: "My instances represent logical inaccuracy.",
  methodDict: {
    "ifTrue:": dTrue_ifFalse,
    "ifFalse:": dTrue_ifTrue,
    not,
  },
};

export default dFalse;
