/**
* @fileoverview Define some built-in classes.
*
* Much of this may change or be removed as the ability to define classes in the language develops.
*
*
* Idea: Use ZOD to verify the shape of values
*/

import type {ClassValue} from "./values/class_value";
import {type ReadonlyDict} from "./generics";
import {type MachineOp} from "./machine_ops";
import type {ObjectValue} from "./values/object_value";
import type {ProcValue} from "./values/proc_value";

export abstract class ClassDefinition<T> {
  abstract extends?: ClassDefinition<any>;
  abstract className: string;
  abstract stringifyValue(value: T): string
  abstract methodOpsByName: ReadonlyDict<ReadonlyArray<MachineOp>>;
}

export const theObjectClass = new class extends ClassDefinition<ObjectValue> {
  extends = undefined;
  className = "Object";

  methodOpsByName = {};

  stringifyValue(value: ObjectValue) {
    return value.toString();
  }
}

export const theClassClass = new class extends ClassDefinition<Readonly<ClassValue>> {
  extends = theObjectClass;
  className = "Class";

  methodOpsByName = {};

  stringifyValue(value: Readonly<ClassValue>) {
    return value.toString();
  }
} as ClassDefinition<Readonly<ClassValue>>;

export const theProcClass = new class extends ClassDefinition<Readonly<ProcValue>> {
  extends = theObjectClass;
  className = "Proc";

  methodOpsByName = {};

  stringifyValue(value: Readonly<ProcValue>) {
    return value.toString();
  }
} as ClassDefinition<Readonly<ProcValue>>;

export const theNilClass = new class extends ClassDefinition<undefined> {
  extends = theObjectClass;
  className = "Nil";

  methodOpsByName = {};

  stringifyValue() {
    return "nil";
  }
} as ClassDefinition<undefined>;

export const theNumberClass = new class extends ClassDefinition<number> {
  extends = theObjectClass;
  className = "Number";

  methodOpsByName = {};

  stringifyValue(value: number) {
    return String(value);
  }
} as ClassDefinition<number>;

const theBooleanClass = new class extends ClassDefinition<boolean> {
  extends = theObjectClass;
  className = "Boolean";

  methodOpsByName = {};

  stringifyValue(value: boolean) {
    return String(value);
  }
}

export const theTrueClass = new class extends ClassDefinition<true> {
  extends = theBooleanClass;
  className = "True";

  methodOpsByName = {
  }

  stringifyValue() {
    return "true";
  }
} as ClassDefinition<true>;

export const theFalseClass = new class extends ClassDefinition<false> {
  extends = theBooleanClass;
  className = "False";

  stringifyValue() {
    return "false";
  }

  methodOpsByName = {
  }
} as ClassDefinition<false>;

