import { BindingError, invariant, RangeError } from "./errors";
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
  private vNilCached?: VirtualObject;
  private vars: VirtualObject[] = [];
  private _primitiveValue: AnyPrimitiveJsValue = undefined;

  get vClass() {
    if (this.vClassCached === undefined) {
      this.vClassCached = this.vm.globalContext.at(this.classKey);
    }
    return this.vClassCached;
  }

  get vNil() {
    if (this.vNilCached === undefined) {
      this.vNilCached = this.vm.asLiteral(undefined);
    }
    return this.vNilCached;
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
    return this.vars[id] ?? this.vNil;
  }

  readIndex<PrimitiveType = AnyLiteralJsValue>(
    index: number,
    expectedType: RuntimeType<PrimitiveType> = runtimeTypeAnyJsLiteral,
  ) {
    const result = this.vars[index + this.namedVarCount] ?? this.vNil;
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
