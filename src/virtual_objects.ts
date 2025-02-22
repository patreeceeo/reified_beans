import { BindingError, invariant, raise, RangeError } from "./errors";
import { Dict } from "./generics";
import {
  runtimeTypeAnyJsLiteral,
  type RuntimeType,
} from "./runtime_type_checks";
import type { VirtualMachine } from "./virtual_machine";

export type AnyPrimitiveJsValue = string | number | boolean | undefined;
export type AnyLiteralJsValue = AnyPrimitiveJsValue | AnyLiteralJsValue[];

export class VirtualObject {
  isNil = false;
  isTrue = false;
  isFalse = false;

  private vClassCached?: VirtualObject;
  private vars: VirtualObject[] = [];
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

  get varCount() {
    return this.vars.length;
  }

  get maxIndex() {
    return this.varCount - 1;
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
    const vo = VirtualObject.createObject(vm, classKey);
    vo.isTrue = true;
    return vo;
  }

  static createFalse(vm: VirtualMachine) {
    const classKey = this.getLiteralClassKey(false);
    const vo = VirtualObject.createObject(vm, classKey);
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
        this.vars.push(vm.asLiteral(value));
      }
    } else {
      this._primitiveValue = literalValue;
    }
  }

  checkVarId(id: number) {
    invariant(
      id >= 0 && id < this.namedVarCount,
      RangeError,
      id,
      0,
      this.namedVarCount - 1,
      `an index into my (${this.classKey}) variables`,
    );
  }

  setVar(id: number, value: VirtualObject, checkId = true) {
    checkId && this.checkVarId(id);
    this.vars[id] = value;
  }

  setIndex(index: number, value: VirtualObject) {
    this.setVar(index + this.namedVarCount, value, false);
  }

  readVar(id: number) {
    this.checkVarId(id);
    return this.vars[id] ?? this.vm.vNil;
  }

  readIndex<PrimitiveType = AnyLiteralJsValue>(
    index: number,
    expectedType: RuntimeType<PrimitiveType> = runtimeTypeAnyJsLiteral,
  ) {
    const result = this.vars[index + this.namedVarCount] ?? this.vm.vNil;
    expectedType.check(result, `index ${index}`);
    return result;
  }

  getVarId(name: string): number {
    return this.vClass.ivars.indexOf(name);
  }

  readVarWithName<PrimitiveType = AnyLiteralJsValue>(
    name: string,
    expectedType: RuntimeType<PrimitiveType> = runtimeTypeAnyJsLiteral,
  ) {
    const varId = this.getVarId(name);
    invariant(varId >= 0, BindingError, this.classKey, name);
    const value = this.readVar(varId);
    expectedType.check(value, name);
    return value;
  }

  setVarWithName(name: string, value: VirtualObject) {
    this.setVar(this.getVarId(name), value);
  }

  hasVarWithName(name: string) {
    return this.getVarId(name) >= 0;
  }

  /** (TODO:reflect) implement in interpreted language */
  getMethod(selector: string) {
    return this.vClass.getInstanceMethod(selector);
  }

  getInstanceMethod(selector: string): VirtualObject | undefined {
    if (selector in this.methodDict) {
      return this.methodDict[selector];
    } else {
      const vSuperClass = this.readVarWithName("superClass");
      if (!vSuperClass.isNil) {
        return vSuperClass.getInstanceMethod(selector);
      }
    }
  }

  get stackTop() {
    return this.vars[this.maxIndex];
  }

  get stackDepth() {
    return this.varCount;
  }

  stackPop() {
    return this.vars.pop();
  }

  stackPush(object: VirtualObject) {
    return this.vars.push(object);
  }
}
