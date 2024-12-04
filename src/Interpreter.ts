import {False, True} from "./BooleanObject";

interface Interpreter {
  run(): boolean;
  step(): boolean;
  appendCode(code: string): void;
  value: any;
  getStateStack(): Interpreter.State[];
}
namespace Interpreter {
  export interface State {
    done: boolean;
    node: {
      type: 'VariableDeclaration' | 'BlockStatement' | 'ForStatement' | 'WhileStatement' | 'DoWhileStatement';
    }
    scope: Interpreter.Scope;
  }

  export interface Scope {
    object: Interpreter.Object;
  }

  export interface Object {
    properties: {
      [key: string]: any;
    }
  }
}


type IJSInterpreterConstructor = new (code: string) => Interpreter;

export function hasInterpreter() {
  return "Interpreter" in globalThis ? True : False;
}

export function getInterpreter(): IJSInterpreterConstructor {
  return (globalThis as any).Interpreter
}

