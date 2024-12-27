import type {ClassDefinition} from "src/class_definitions";

export abstract class Value {
  abstract classDefinition: ClassDefinition<this>;
}
