import {False, True} from "./BooleanObject";

interface Interpreter {
  run(): boolean;
  step(): boolean;
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

export function stepLine(myInterpreter: Interpreter) {
  const stack = myInterpreter.getStateStack();
  let more = true;
  while (more) {
    more = myInterpreter.step();
    if (isLine(stack)) {
      break;
    }
  }
  return more;
}

let oldStack_ = [] as Interpreter.State[];
// Is the current stack at the beginning of a new line?
function isLine(stack: Interpreter.State[]) {
  var state = stack[stack.length - 1];
  var node = state.node;
  var type = node.type;
  // console.log("state", state);

  if (type !== 'VariableDeclaration' &&
      !type.endsWith('Statement')) {
    // Current node is not a statement.
    return false;
  }

  if (type === 'BlockStatement') {
    // Not a 'line' by most definitions.
    return false;
  }

  if (type === 'VariableDeclaration' &&
      stack[stack.length - 2].node.type === 'ForStatement') {
    // This 'var' is not a line: for (var i = 0; ...)
    return false;
  }

  if (oldStack_[oldStack_.length - 1] === state) {
    // Never repeat the same statement multiple times.
    // Typically a statement is stepped into and out of.
    return false;
  }

  if (oldStack_.indexOf(state) !== -1 && type !== 'ForStatement' &&
      type !== 'WhileStatement' && type !== 'DoWhileStatement') {
    // Don't revisit a statement on the stack (e.g. 'if') when exiting.
    // The exception is loops.
    return false;
  }

  oldStack_ = stack.slice();
  return true;
}
