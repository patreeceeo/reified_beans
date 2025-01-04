import {invariant} from "./Error";
import {Dict} from "./generics";
import {getBoxedValue, type ValueBox, type ValueBoxValue} from "./value_box";
import { nilValue, type NilValue } from "./values/nil_value";

/**
* A tree structure that represents a scope in a running program. Each scope has a parent scope, which is the scope that encloses it. The root scope has no parent.
*
* Ideas/questions to consider:
* - How to handle declaring variables? Should it be implicit?
* - How/whether to handle type checking? The value a variable is declared with could be used to declare its type.
* - How to handle variable shadowing? Should it be allowed?
* - Use a specialized class for non-nested scopes or vice-versa?
*/
export class Scope {
  private items = Dict<ValueBox<any>>();
  private permissions = Dict<number>();

  constructor(readonly parent: Scope | null = null) {
  }

  get<T extends ValueBoxValue = NilValue>(key: string, defaultValue = getBoxedValue(nilValue)): ValueBox<T> {
    return this.items[key] as ValueBox<T> ?? this.parent?.get(key) ?? defaultValue;
  }

  set<T extends ValueBoxValue>(key: string, value: ValueBox<T>, permission = Scope.ALLOW_WRITE): ValueBox<T> {
    // Find the scope where the variable is defined
    let scope: Scope = this;
    while (scope.parent && !(key in scope.items)) {
      scope = scope.parent;
    }
    return scope.setLocal(key, value, permission);
  }

  setLocal<T extends ValueBoxValue>(key: string, value: ValueBox<T>, permission = Scope.ALLOW_WRITE): ValueBox<T> {
    invariant(!(key in this.permissions) || this.permissions[key] & Scope.ALLOW_WRITE, `Cannot write to ${key}`);
    this.items[key] = value ?? nilValue;
    this.permissions[key] = permission;
    return value;
  }

  has(key: string): boolean {
    return key in this.items || (this.parent?.has(key) ?? false);
  }

  // TODO keep?
  static ALLOW_READ = 0;
  static ALLOW_WRITE = 1;
}
