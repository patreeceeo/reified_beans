import {False, True} from "./messagePassing/boolean";

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

export function getInterpreter(): IJSInterpreterConstructor | undefined {
  return (globalThis as any).Interpreter
}

export function interpreterLoaded(maxWaitMs: number = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if(hasInterpreter()) {
        clearInterval(interval);
        resolve();
      } else if(Date.now() - startTime > maxWaitMs) {
        clearInterval(interval);
        reject(new Error("Interpreter not loaded in time"));
      }
    }, 100);
  });
}

