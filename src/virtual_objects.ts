import type { Closure } from "./closures";
import { BindingError, invariant, RangeError } from "./errors";
import { Dict } from "./generics";
import type { VirtualMachine } from "./virtual_machine";

export type PrimitiveJsValue = string | number | boolean | undefined;
export type LiteralJsValue = PrimitiveJsValue | LiteralJsValue[];

export class VirtualObject {
  isNil = false;
  isTrue = false;
  isFalse = false;

  // TODO should my instances allow themselves to have both a primativeValue and variables?
  primitiveValue?: number | string;

  private vars: VirtualObject[] = [];

  private vClassCached?: VirtualObject;

  get vClass() {
    if (this.vClassCached === undefined) {
      this.vClassCached = this.vm.globalContext.at(this.classKey);
    }
    return this.vClassCached;
  }

  get namedVarCount() {
    return this.vClass.ivars.length;
  }

  get varCount() {
    return this.vars.length;
  }

  // (TODO:reflect) this should be an instance variable of class objects
  methodDict = Dict<Closure>();

  /**
   * @param classKey The unique name of my class
   * @param ivars The names of the variables of my instances (assuming I'm a class)
   * @param instanceLength For indexable objects, the number of elements in the object
   */
  constructor(
    readonly vm: VirtualMachine,
    readonly classKey: string,
    readonly ivars: string[] = [],
  ) {}

  checkVarId(id: number) {
    invariant(
      id >= 0 && id < this.namedVarCount,
      RangeError,
      id,
      0,
      this.varCount - 1,
      `an index into my variables`,
    );
  }

  setVar(id: number, value: VirtualObject, checkId = true) {
    checkId && this.checkVarId(id);
    this.vars[id] = value;
  }

  setIndex(index: number, value: VirtualObject) {
    this.setVar(index, value, false);
  }

  readVar(id: number, checkId = true) {
    checkId && this.checkVarId(id);
    return this.vars[id] ?? this.vm.asLiteral(undefined);
  }

  readIndex(index: number) {
    return this.readVar(index, false);
  }

  getVarId(name: string): number {
    return this.vClass.ivars.indexOf(name);
  }

  readVarWithName(name: string) {
    const varId = this.getVarId(name);
    invariant(varId >= 0, BindingError, this.classKey, name);
    return this.readVar(this.getVarId(name));
  }

  setVarWithName(name: string, value: VirtualObject) {
    this.setVar(this.getVarId(name), value);
  }

  /** (TODO:reflect) implement in interpreted language */
  getMethod(selector: string) {
    return this.vClass.getInstanceMethod(selector);
  }

  getInstanceMethod(selector: string): Closure | undefined {
    if (selector in this.methodDict) {
      return this.methodDict[selector];
    } else {
      const vSuperClass = this.readVarWithName("superClass");
      if (!vSuperClass.isNil) {
        return vSuperClass.getInstanceMethod(selector);
      }
    }
  }
}
