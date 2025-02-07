import type { Closure } from "./closures";
import { invariant, RangeError } from "./errors";
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
    return this.namedVarCount + (this.length ?? 0);
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
    readonly length: number | undefined = undefined,
  ) {}

  checkVarId(id: number) {
    invariant(
      id >= 0 && id < this.varCount,
      RangeError,
      id,
      0,
      this.varCount - 1,
      `an index into my variables`,
    );
  }

  setVar(id: number, value: VirtualObject) {
    this.checkVarId(id);
    this.vars[id] = value;
  }

  setIndex(index: number, value: VirtualObject) {
    this.setVar(index + this.namedVarCount, value);
  }

  readVar(id: number) {
    this.checkVarId(id);
    return this.vars[id] ?? this.vm.asLiteral(undefined);
  }

  readIndex(index: number) {
    return this.readVar(index + this.namedVarCount);
  }

  getVarId(name: string): number {
    return this.vClass.ivars.indexOf(name);
  }

  readVarWithName(name: string) {
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
