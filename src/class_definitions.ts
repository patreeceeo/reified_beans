/**
* @fileoverview Define some built-in classes.
*
* Much of this may change or be removed as the ability to define classes in the language develops.
*
*
* Idea: Use ZOD to verify the shape of values
*/

import type {ClassValue} from "./class_value";
import {type ReadonlyDict} from "./generics";
import {type MachineOp} from "./machine_ops";
import type {ProcValue} from "./proc_value";

export abstract class ClassDefinition<T> {
  abstract className: string;
  abstract stringifyValue(value: T): string
  abstract methodOpsByName: ReadonlyDict<ReadonlyArray<MachineOp>>;
}

export const theNumberClass = new class extends ClassDefinition<number> {
  className = "Number";

  methodOpsByName = {};

  stringifyValue(value: number) {
    return String(value);
  }
} as ClassDefinition<number>;

export const theTrueClass = new class extends ClassDefinition<true> {
  className = "True";

  methodOpsByName = {
  }

  stringifyValue() {
    return "true";
  }
} as ClassDefinition<true>;

export const theFalseClass = new class extends ClassDefinition<false> {
  className = "False";

  stringifyValue() {
    return "false";
  }

  methodOpsByName = {
  }
} as ClassDefinition<false>;

export const theNilClass = new class extends ClassDefinition<undefined> {
  className = "Nil";

  methodOpsByName = {};

  stringifyValue() {
    return "nil";
  }
} as ClassDefinition<undefined>;

export const theProcClass = new class extends ClassDefinition<Readonly<ProcValue>> {
  className = "Proc";

  methodOpsByName = {};

  stringifyValue(value: Readonly<ProcValue>) {
    return value.toString();
  }
} as ClassDefinition<Readonly<ProcValue>>;

export const theClassClass = new class extends ClassDefinition<Readonly<ClassValue>> {
  className = "Class";

  methodOpsByName = {};

  stringifyValue(value: Readonly<ClassValue>) {
    return value.toString();
  }
} as ClassDefinition<Readonly<ClassValue>>;
