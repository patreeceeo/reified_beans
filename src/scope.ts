import {getBoxedValue, type BoxedValue} from "./boxed_value";
import { Nil } from "./nil";

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
  private items: { [key: string]: BoxedValue } = Object.create(null);

  constructor(readonly parent: Scope | null = null) {
  }

  get(key: string, defaultValue = getBoxedValue(Nil)): BoxedValue {
    return this.items[key] ?? this.parent?.get(key) ?? defaultValue;
  }

  set(key: string, value: BoxedValue): BoxedValue {
    // Find the scope where the variable is defined
    let scope: Scope = this;
    while (scope.parent && !(key in scope.items)) {
      scope = scope.parent;
    }
    scope.items[key] = value ?? Nil;
    return value;
  }

  has(key: string): boolean {
    return key in this.items || (this.parent?.has(key) ?? false);
  }
}
