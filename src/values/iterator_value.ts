import {type ClassDefinition, theIteratorClass} from "src/class_definitions";
import {Value} from "./value";

/** The most light-weight way to return multiple values from a function:
* push N values into the args queue, then push an iterator of length N.
* The iterator can then be used to iterate over the results or create
* an array, set... any other kind of collection containing the results.
*/
export class IteratorValue extends Value {
  classDefinition = theIteratorClass as ClassDefinition<this>;

  index = 0;
  constructor(public length: number = 0) {
    super();
  }

  toString() {
    return `an iterator of length ${this.length}`;
  }
}
