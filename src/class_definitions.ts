/**
* @fileoverview Define some built-in classes.
*
* Much of this may change or be removed as the ability to define classes in the language develops.
*
*
* Idea: Use ZOD to verify the shape of values
*/

import {ClassValue} from "./values/class_value";
import {Dict} from "./generics";
import {type MachineOp} from "./machine_ops";
import {ObjectValue} from "./values/object_value";
import {ProcValue} from "./values/proc_value";
import {nilValue} from "./values/nil_value";
import {IteratorValue} from "./values/iterator_value";

export abstract class ClassDefinition<T> {
  abstract superClass?: ClassDefinition<any>;
  abstract className: string;
  abstract stringifyValue(value: T): string
  abstract instantiate(...args: any[]): T;
  methodOpsByName: Dict<readonly MachineOp[]> = {};
  setMethodImplementation(name: string, ops: ReadonlyArray<MachineOp>) {
    this.methodOpsByName[name] = ops;
  }
  hasMethodImplementation(name: string) {
    return this.methodOpsByName[name] !== undefined;
  }
}

export const theObjectClass = new class extends ClassDefinition<ObjectValue> {
  superClass = undefined;
  className = "Object";

  stringifyValue(value: ObjectValue) {
    return value.toString();
  }

  instantiate = () => {
    return new ObjectValue();
  }
}

export const theClassClass = new class extends ClassDefinition<Readonly<ClassValue<unknown>>> {
  superClass = theObjectClass;
  className = "Class";

  stringifyValue(value: Readonly<ClassValue<unknown>>) {
    return value.toString();
  }

  instantiate = () => {
    return new ClassValue({}, () => {});
  }
} as ClassDefinition<Readonly<ClassValue<unknown>>>;

export const theProcClass = new class extends ClassDefinition<Readonly<ProcValue>> {
  superClass = theObjectClass;
  className = "Proc";

  stringifyValue(value: Readonly<ProcValue>) {
    return value.toString();
  }

  instantiate = () => {
    return new ProcValue();
  }
} as ClassDefinition<Readonly<ProcValue>>;

export const theNilClass = new class extends ClassDefinition<undefined> {
  superClass = theObjectClass;
  className = "Nil";

  stringifyValue() {
    return "nil";
  }

  instantiate = () => nilValue;

} as ClassDefinition<undefined>;

export const theNumberClass = new class extends ClassDefinition<number> {
  superClass = theObjectClass;
  className = "Number";

  stringifyValue(value: number) {
    return String(value);
  }

  instantiate = () => 0;
} as ClassDefinition<number>;

const theBooleanClass = new class extends ClassDefinition<boolean> {
  superClass = theObjectClass;
  className = "Boolean";

  stringifyValue(value: boolean) {
    return String(value);
  }

  instantiate = () => false;
}

export const theTrueClass = new class extends ClassDefinition<true> {
  superClass = theBooleanClass;
  className = "True";

  stringifyValue() {
    return "true";
  }

  instantiate = () => true as const;
} as ClassDefinition<true>;

export const theFalseClass = new class extends ClassDefinition<false> {
  superClass = theBooleanClass;
  className = "False";

  stringifyValue() {
    return "false";
  }

  instantiate = () => false as const;
} as ClassDefinition<false>;

export const theIteratorClass = new class extends ClassDefinition<IteratorValue> {
  superClass = theObjectClass;
  className = "Iterator";

  stringifyValue(value: IteratorValue) {
    return value.toString();
  }

  instantiate = () => new IteratorValue();
}
