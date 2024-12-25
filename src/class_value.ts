import type {ReadonlyDict} from "./generics";
import type {ProcId} from "./proc_value";

/** Represents parts of the class that are created at runtime */
export class ClassValue {
  /** used to look up the procId for a method by its name */
  constructor(readonly methodProcIdByName: ReadonlyDict<ProcId>) {}
  toString() {
    const methodsJSON = JSON.stringify(this.methodProcIdByName, null, 2);
    return `a class with methods ${methodsJSON}`;
  }
}
