import {type ClassDefinition, theOrderedCollectionClass} from "src/class_definitions";
import {Value} from "./value";
import type {ValueBox} from "src/value_box";

export class OrderedCollectionValue extends Value {
  classDefinition = theOrderedCollectionClass as ClassDefinition<this>;

  items = [] as ValueBox<any>[];

  toString() {
    return `an OrderedCollection (${this.items.map(item => item.valueOf()).join(", ")})`;
  }
}
