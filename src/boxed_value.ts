import {theFalseClass, theNilClass, theNumberClass, theTrueClass, type ClassDefinition} from "./class_definitions";
import {NilValue} from "./nil_value";

class BoxedValueClass {
  constructor(private value: any, readonly classDefinition = BoxedValueClass.getClassDefinition(value)) {
    map.set(value, this);
  }

  static getClassDefinition(value: any): ClassDefinition {
    const typeofValue = typeof value;
    // TODO remove some branches by precomputing boxed values for true, false, nil and storing them in the map
    if(typeofValue === "number") {
      return theNumberClass;
    } else if(typeofValue === "boolean") {
      if(value) {
        return theTrueClass;
      } else {
        return theFalseClass;
      }
    } else {
      if(value !== NilValue) {
        console.warn("Unknown type", typeofValue);
      }
      return theNilClass;
    }
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

export type BoxedValue = BoxedValueClass;

const map = new Map<any, BoxedValueClass>();

// TODO allow TSC to check the type of value by using type parameters
export function getBoxedValue(value: any, type = BoxedValueClass.getClassDefinition(value)) {
  return map.get(value) ?? new BoxedValueClass(value, type);
}
