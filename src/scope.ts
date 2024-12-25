import {getBoxedValue, type BoxedValue} from "./boxed_value";
import { nilValue, type NilValue } from "./nil_value";

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
  private items: { [key: string]: BoxedValue<unknown> } = Object.create(null);

  constructor(readonly parent: Scope | null = null) {
  }

  get<T = NilValue>(key: string, defaultValue = getBoxedValue(nilValue)): BoxedValue<T> {
    return this.items[key] as BoxedValue<T> ?? this.parent?.get(key) ?? defaultValue;
  }

  set<T>(key: string, value: BoxedValue<T>): BoxedValue<T> {
    // Find the scope where the variable is defined
    let scope: Scope = this;
    while (scope.parent && !(key in scope.items)) {
      scope = scope.parent;
    }
    scope.items[key] = value ?? nilValue;
    return value;
  }

  has(key: string): boolean {
    return key in this.items || (this.parent?.has(key) ?? false);
  }
}
