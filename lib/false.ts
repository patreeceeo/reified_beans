import { type ClassDescription } from "src/virtual_objects";
import { dTrue_ifTrue } from "./true";

const dFalse: ClassDescription = {
  name: "False",
  superClass: "Boolean",
  ivars: [],
  classComment: "My instances represent logical inaccuracy.",
  methodDict: {
    "ifFalse:": dTrue_ifTrue,
  },
};

export default dFalse;
