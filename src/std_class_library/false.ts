import { type ClassDescription } from "src/virtual_objects";
import { dTrue_ifFalse, dTrue_ifTrue } from "./true";

const dFalse: ClassDescription = {
  name: "False",
  superClass: "Boolean",
  ivars: [],
  classComment: "My instances represent logical inaccuracy.",
  methodDict: {
    "ifTrue:": dTrue_ifFalse,
    "ifFalse:": dTrue_ifTrue,
  },
};

export default dFalse;
