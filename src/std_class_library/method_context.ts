import { type ClassDescription } from "src/virtual_objects";

const dMethodContext: ClassDescription = {
  name: "MethodContext",
  superClass: "Context",
  ivars: ["argsAndTemps"],
  classComment:
    "I am the parent class of all classes that represent the context in which a method is executed. I hold the arguments and temporary variables of an invokation of a method.",
  methodDict: {},
};

export default dMethodContext;
