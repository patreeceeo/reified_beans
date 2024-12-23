import type {ReadonlyDict} from "./generics";

/** Represents parts of the class that are created at runtime */
export class ClassValue {
  /** used to look up the procId for a method by its name */
  constructor(readonly methodProcIdByName: ReadonlyDict<string>) {}
  toString() {
    const methodsJSON = JSON.stringify(this.methodProcIdByName, null, 2);
    return `a class with methods ${methodsJSON}`;
  }
}
