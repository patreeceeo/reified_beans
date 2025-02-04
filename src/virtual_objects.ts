import type { Closure } from "./closures";
import { invariant, RangeError } from "./errors";
import { Dict } from "./generics";

export class VirtualObject {
  isNil = false;
  isTrue = false;
  isFalse = false;

  // TODO should my instances allow themselves to have both a primativeValue and variables?
  primitiveValue?: number | string;

  private vars: VirtualObject[] = [];

  // (TODO:reflect) this should be an instance variable of class objects
  methodDict = Dict<Closure>();

  /**
   * @param classKey The unique name of my class
   * @param ivars The names of the variables of my instances (assuming I'm a class)
   */
  constructor(
    readonly classKey: string,
    readonly ivars: string[] = [],
  ) {}

  setVar(id: number, value: VirtualObject) {
    this.vars[id] = value;
  }

  getVar(id: number) {
    invariant(
      id >= 0 && id < this.vars.length,
      RangeError,
      id,
      0,
      this.vars.length - 1,
      `an index into my variables`,
    );
    return this.vars[id];
  }
}
