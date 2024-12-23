/**
* @fileoverview Define some built-in classes.
*
* Much of this may change or be removed as the ability to define classes in the language develops.
*/

import type {ClassValue} from "./class_value";
import {type ReadonlyDict} from "./generics";
import {type MachineOp} from "./machine_ops";

export abstract class ClassDefinition {
  abstract className: string;
  abstract stringifyValue(value: any): string
  abstract methodOpsByName: ReadonlyDict<ReadonlyArray<MachineOp>>;
}

export const theNumberClass = new class extends ClassDefinition {
  className = "Number";

  methodOpsByName = {};

  stringifyValue(value: any) {
    return String(value);
  }
}

export const theTrueClass = new class extends ClassDefinition {
  className = "True";

  methodOpsByName = {
  }

  stringifyValue() {
    return "true";
  }

}

export const theFalseClass = new class extends ClassDefinition {
  className = "False";

  stringifyValue() {
    return "false";
  }

  methodOpsByName = {
  }
}

export const theNilClass = new class extends ClassDefinition {
  className = "Nil";

  methodOpsByName = {};

  stringifyValue() {
    return "nil";
  }
}

export const theProcClass = new class extends ClassDefinition {
  className = "Proc";

  methodOpsByName = {};

  stringifyValue(value: string) {
    return `proc@${value}`;
  }
}

export const theClassClass = new class extends ClassDefinition {
  className = "Class";

  methodOpsByName = {};

  stringifyValue(value: ClassValue) {
    return value.toString();
  }

}
