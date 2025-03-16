import { type CompiledClass } from "src/virtual_objects";

const dUndefinedObject: CompiledClass = {
  name: "UndefinedObject",
  superClass: "Object",
  ivars: [],
  classComment:
    "I am the parent class of all classes that represent undefined values.",
  methodDict: {},
};

export default dUndefinedObject;
