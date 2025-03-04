import { type ClassDescription } from "src/virtual_objects";

const dContext: ClassDescription = {
  name: "Context",
  superClass: "Object",
  ivars: ["evalStack", "instructionByteIndex", "receiver", "closure"],
  classComment:
    "I am the parent class of all classes that represent the context in which a closure is executed. I hold the closure, the receiver of the message that caused the closure to be executed, a stack used for evaluating expressions, and an index that points to the next byte code to be executed",
  methodDict: {},
};

export default dContext;
