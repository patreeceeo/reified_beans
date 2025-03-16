import { type CompiledClass } from "src/virtual_objects";

const dBlockContext: CompiledClass = {
  name: "BlockContext",
  superClass: "Context",
  ivars: ["localContext"],
  classComment:
    "I am the parent class of all classes that represent the context in which a block is executed. I reference the local (lexical) context in which the block is declared.",
  methodDict: {},
};

export default dBlockContext;
