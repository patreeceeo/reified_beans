import { type ClassDescription } from "src/virtual_objects";

const dClosure: ClassDescription = {
  name: "Closure",
  superClass: "Object",
  ivars: [
    "argCount",
    "tempCount",
    "literals",
    "instructionByteRange",
    "localContext",
  ],
  classComment:
    "I am the parent class of all classes that represent closures. Closures are the basic units of executable code. They may declare arguments and temporary variables and a local (lexical) environment, all of which are accessible to the code in the closure. All closures implicitly have access to the global environment.",
  methodDict: {},
};

export default dClosure;
