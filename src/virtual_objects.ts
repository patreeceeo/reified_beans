import type { CompiledClosureDescription } from "./closures";
import { invariant, raise } from "./errors";
import { Dict } from "./generics";
import {
  runtimeTypeAnyJsLiteral,
  type RuntimeType,
} from "./runtime_type_checks";
import type { VirtualMachine } from "./virtual_machine";

export type AnyPrimitiveJsValue = string | number | boolean | undefined;
export type AnyLiteralJsValue = AnyPrimitiveJsValue | AnyLiteralJsValue[];

let id = 0;

export class VirtualObject {
  readonly id = id++;
  isNil = false;
  isTrue = false;
  isFalse = false;

  private vClassCached?: VirtualObject;
  private namedVars = Dict<VirtualObject>();
  private indexedVars: VirtualObject[] = [];
  private _primitiveValue: AnyPrimitiveJsValue = undefined;

  get vClass() {
    if (this.vClassCached === undefined) {
      this.vClassCached = this.vm.globalContext.at(this.classKey);
    }
    return this.vClassCached;
  }

  get primitiveValue() {
    return this._primitiveValue;
  }

  get namedVarCount() {
    return this.vClass.ivars.length;
  }

  get maxIndex() {
    return this.indexedVars.length - 1;
  }

  // (TODO:reflect) this should be an instance variable of class objects
  methodDict = Dict<VirtualObject>();

  static createNil(vm: VirtualMachine) {
    const classKey = this.getLiteralClassKey(undefined);
    const vo = VirtualObject.createObject(vm, classKey);
    vo.isNil = true;
    return vo;
  }

  static createTrue(vm: VirtualMachine) {
    const classKey = this.getLiteralClassKey(true);
    const vo = VirtualObject.createObject(vm, classKey, true);
    vo.isTrue = true;
    return vo;
  }

  static createFalse(vm: VirtualMachine) {
    const classKey = this.getLiteralClassKey(false);
    const vo = VirtualObject.createObject(vm, classKey, false);
    vo.isFalse = true;
    return vo;
  }

  static createObject(
    vm: VirtualMachine,
    classKey: string,
    literalValue?: AnyLiteralJsValue,
  ) {
    return new VirtualObject(vm, classKey, [], literalValue);
  }

  /**
   * As part of bootstrapping the VM, we define some classes, including the class Class itself
   * and all of its superclasses. This method stubs out a class object with the given superclass,
   * but does not set the class's superClass instance variable, because that's not possible until
   * the class Class is defined, so the superClass must be set later.
   */
  static stubClassObject(
    vm: VirtualMachine,
    superClassName: string,
    addlIvars: string[],
  ) {
    const superClass = vm.globalContext.at(superClassName);
    const ivars = [...superClass.ivars, ...addlIvars];
    return new VirtualObject(vm, "Class", ivars);
  }

  static getLiteralClassKey(value: AnyLiteralJsValue) {
    if (value === true) {
      return "True";
    } else if (value === false) {
      return "False";
    } else {
      switch (typeof value) {
        case "string":
          return "String";
        case "number":
          return "Number";
        case "undefined":
          return "UndefinedObject";
        case "object":
          invariant(Array.isArray(value), TypeError, "Array", String(value));
          return "Array";
        default:
          raise(
            TypeError,
            "string | number | boolean | undefined",
            typeof value,
          );
      }
    }
  }

  /**
   * @param classKey The unique name of my class
   * @param ivars The names of the variables of my instances (assuming I'm a class)
   * @param instanceLength For indexable objects, the number of elements in the object
   */
  constructor(
    readonly vm: VirtualMachine,
    readonly classKey: string,
    readonly ivars: string[] = [],
    literalValue: AnyLiteralJsValue = undefined,
  ) {
    if (Array.isArray(literalValue)) {
      for (const value of literalValue) {
        this.indexedVars.push(vm.asLiteral(value));
      }
    } else {
      this._primitiveValue = literalValue;
    }
  }

  writeIndexedVar(index: number, value: VirtualObject) {
    this.indexedVars[index] = value;
  }

  readIndexedVar<PrimitiveType = AnyLiteralJsValue>(
    index: number,
    expectedType: RuntimeType<PrimitiveType> = runtimeTypeAnyJsLiteral,
  ) {
    const result = this.indexedVars[index] ?? this.vm.vNil;
    expectedType.check(result, `index ${index}`);
    return result;
  }

  readNamedVar<PrimitiveType = AnyLiteralJsValue>(
    name: string,
    expectedType: RuntimeType<PrimitiveType> = runtimeTypeAnyJsLiteral,
  ) {
    const value = this.namedVars[name] ?? this.vm.vNil;
    expectedType.check(value, name);
    return value;
  }

  writeNamedVar(name: string, value: VirtualObject) {
    this.namedVars[name] = value;
  }

  hasVarWithName(name: string) {
    return name in this.namedVars;
  }

  /** (TODO:reflect) implement in interpreted language */
  getMethod(selector: string) {
    return this.vClass.getInstanceMethod(selector);
  }

  getInstanceMethod(selector: string): VirtualObject | undefined {
    if (selector in this.methodDict) {
      return this.methodDict[selector];
    } else {
      const vSuperClass = this.readNamedVar("superClass");
      if (!vSuperClass.isNil) {
        return vSuperClass.getInstanceMethod(selector);
      }
    }
  }

  get stackTop(): VirtualObject | undefined {
    return this.indexedVars[this.stackDepth - 1];
  }

  get stackDepth() {
    return this.indexedVars.length;
  }

  stackPop() {
    return this.indexedVars.pop();
  }

  stackPush(object: VirtualObject) {
    return this.indexedVars.push(object);
  }

  looseEquals(other: VirtualObject) {
    if (this.classKey !== other.classKey) {
      return false;
    }

    if (this.isNil !== other.isNil) {
      return false;
    }

    if (this.isTrue !== other.isTrue) {
      return false;
    }

    if (this.isFalse !== other.isFalse) {
      return false;
    }

    if (this.primitiveValue !== other.primitiveValue) {
      return false;
    }

    if (this.namedVarCount !== other.namedVarCount) {
      return false;
    }

    if (this.maxIndex !== other.maxIndex) {
      return false;
    }

    return true;
  }

  shapeEquals(other: VirtualObject) {
    if (!this.looseEquals(other)) {
      return false;
    }

    const varNames = Object.keys(this.namedVars);

    for (const key of varNames) {
      const value = this.readNamedVar(key);
      if (value.classKey !== other.readNamedVar(key).classKey) {
        return false;
      }
    }
    for (let i = 0; i <= this.maxIndex; i++) {
      const value = this.readIndexedVar(i);
      if (value.classKey !== other.readIndexedVar(i).classKey) {
        return false;
      }
    }
    return true;
  }
}

export interface CompiledClass {
  name: string;
  superClass: string;
  ivars: string[];
  classComment: string;
  methodDict: Record<string, CompiledClosureDescription>;
}
