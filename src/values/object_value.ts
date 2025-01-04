import {ClassDefinition, theObjectClass } from "src/class_definitions";
import {Value} from "./value";

export class ObjectValue extends Value {
  classDefinition = theObjectClass as ClassDefinition<this>;
}
