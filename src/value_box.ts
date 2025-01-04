import {theFalseClass, theNilClass, theNumberClass, theStringClass, theTrueClass, type ClassDefinition} from "./class_definitions";
import {nilValue, type NilValue} from "./values/nil_value";
import type {Value} from "./values/value";

export type ValueBoxValue = Value | number | boolean | string | NilValue;

class _ValueBox<T extends ValueBoxValue> {
  constructor(private value: T, readonly classDefinition: ClassDefinition<T>) {
    map.set(value, this);
  }

  valueOf() {
    return this.value;
  }

  toString() {
    return this.classDefinition.stringifyValue(this.value);
  }

  instanceOf(className: string) {
    return this.classDefinition.className === className;
  }
}

export type ValueBox<T extends ValueBoxValue> = _ValueBox<T>;

const map = new Map<ValueBoxValue, _ValueBox<ValueBoxValue>>();
map.set(nilValue, new _ValueBox(nilValue, theNilClass));
map.set(true, new _ValueBox(true, theTrueClass));
map.set(false, new _ValueBox(false, theFalseClass));


export function getBoxedValue<T extends ValueBoxValue>(value: T): ValueBox<T> {
  return map.get(value) as ValueBox<T> ?? new _ValueBox(value, inferClassDefinition(value));
}

function inferClassDefinition<T extends ValueBoxValue>(value: T): ClassDefinition<T> {
  const typeofValue = typeof value;
  switch(typeofValue) {
    case "string":
      return theStringClass as ClassDefinition<T>;
    case "number":
      return theNumberClass as ClassDefinition<T>;
    case "object":
      if(isValueObject(value)) {
        return value.classDefinition as ClassDefinition<T>;
      }
  }
  console.warn("Value of unknown type:", value);
  return theNilClass as ClassDefinition<T>;
}

function isValueObject(value: any): value is {classDefinition: ClassDefinition<any>} {
  return "classDefinition" in value;
}
