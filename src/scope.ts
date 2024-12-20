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
  private items: { [key: string]: any } = Object.create(null);

  static new(parent: Scope | null = null) {
    return new Scope(parent);
  }

  // lastValue: any;

  constructor(readonly parent: Scope | null = null) {
  }

  get(key: string, defaultValue: any = Nil): any {
    return this.items[key] ?? this.parent?.get(key) ?? defaultValue;
  }

  // declare(key: string): Nil {
  //   this.set(key, Nil);
  // }

  set(key: string, value: any): any {
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

  fork() {
    return new Scope(this);
  }

  // onPop: () => void = () => {};
}
