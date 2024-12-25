import {theFalseClass, theNilClass, theNumberClass, theTrueClass, type ClassDefinition} from "./class_definitions";
import {nilValue} from "./nil_value";

class BoxedValueClass<T> {
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

export type BoxedValue<T> = BoxedValueClass<T>;

const map = new Map<any, BoxedValueClass<unknown>>();
map.set(nilValue, new BoxedValueClass(nilValue, theNilClass));
map.set(true, new BoxedValueClass(true, theTrueClass));
map.set(false, new BoxedValueClass(false, theFalseClass));

export function getBoxedValue<T>(value: T, type?: ClassDefinition<T>): BoxedValue<T> {
  return map.get(value) as BoxedValue<T> | undefined ?? new BoxedValueClass(value, type ?? inferClassDef(value));
}

function inferClassDef<T>(value: T): ClassDefinition<T> {
  const typeofValue = typeof value;
  if(typeofValue === "number") {
    return theNumberClass as ClassDefinition<T>;
  } else {
    console.warn("Value of unknown type:", value);
    return theNilClass as ClassDefinition<T>;
  }
}
