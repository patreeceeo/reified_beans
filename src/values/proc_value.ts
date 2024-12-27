import {theProcClass} from "src/class_definitions";
import {Value} from "./value";

export type ProcId = number;

let nextId = 0 as ProcId;

export function resetProcId() {
  nextId = 0;
}

export class ProcValue extends Value {
  classDefinition = theProcClass;
  id = nextId++;
  address: VirtualMachineAddress = 0;
  /** The proc that this proc is defined in */
  lexicalParentScopeProcId?: ProcId;

  toString() {
    return `proc@${this.address}`;
  }
}

