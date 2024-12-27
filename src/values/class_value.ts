import type {ReadonlyDict} from "src/generics";
import type {ProcId} from "./proc_value";
import {Value} from "./value";
import {theClassClass} from "src/class_definitions";

/** Represents parts of the class that are created at runtime */
export class ClassValue extends Value {
  classDefinition = theClassClass;
  /** used to look up the procId for a method by its name */
  constructor(readonly methodProcIdByName: ReadonlyDict<ProcId>) {
    super();
  }
  toString() {
    const methodsJSON = JSON.stringify(this.methodProcIdByName, null, 2);
    return `a class with methods ${methodsJSON}`;
  }
  instantiate() {
    return Object.create(null);
  }
}
