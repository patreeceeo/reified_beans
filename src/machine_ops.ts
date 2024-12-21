import {invariant, raise} from "./Error";
import {isPrimative} from "./js";
import {MachineStackItem} from "./machine_stack_item";
import {Stack as StackGeneric} from "./generics";

type Stack = StackGeneric<MachineStackItem>;

export abstract class MachineOp {
  abstract doIt(stack: Stack): void;
  abstract toString(): string;
}

class PushState extends MachineOp {
  constructor(
    readonly address: VirtualMachineAddress,
    readonly isClosure = false
  ) {
    super();
  }
  doIt(stack: Stack) {
    const {isClosure} = this;
    if(isClosure) {
      const parentState = stack.peek();
      invariant(parentState !== undefined, "Closure must have a parent state");
      stack.push(new MachineStackItem(parentState, this.address));
    } else {
      stack.push(new MachineStackItem(undefined, this.address));
    }
  }
  toString() {
    return `PushState(${this.address}, ${this.isClosure})`;
  }
}

/** Pops the current state from the stack and also handles the return value. */
class PopState extends MachineOp {
  doIt(stack: Stack) {
    const poppedState = stack.pop();
    invariant(poppedState !== undefined, "Stack underflow");
    invariant(poppedState.args.length > 0, "No return value");
    const returnValue = poppedState.args.shift();
    const nextState = stack.peek();
    invariant(nextState !== undefined, "Stack underflow");
    invariant(nextState.args.length === 0, "Next state already has arguments");
    nextState.args.push(returnValue);
  }
  toString() {
    return "PopState";
  }
}

class PushArg extends MachineOp {
  constructor(
    readonly arg: any
  ) {
    super();
  }
  doIt(stack: Stack) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    state.args.push(this.arg);
  }
  toString() {
    return `PushArg(${this.arg})`;
  }
}

class DiscardArg extends MachineOp {
  constructor(
    readonly arg: any
  ) {
    super();
  }
  doIt(stack: Stack) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    invariant(state.args.length > 0, "No arguments to shift");
    state.args.shift();
  }
  toString() {
    return `DiscardArg(${this.arg})`;
  }
}

class ClearArgs extends MachineOp {
  doIt(stack: Stack) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    state.args.length = 0;
  }

  toString() {
    return "ClearArgs";
  }
}

class Halt extends MachineOp {
  doIt(stack: Stack) {
    invariant(stack.length === 1, "Tried to halt with more than one state on the stack");
    const state = stack.peek()!;
    state.halted = true;
  }

  toString() {
    return "Halt";
  }
}

class Basic extends MachineOp {
  constructor(
    readonly op: string,
    readonly arity: number
  ) {
    super();
  }

  getArg(state: MachineStackItem) {
    const arg = state.args.shift();
    invariant(isPrimative(arg), "Expected primative");
    return JSON.stringify(arg);
  }

  doIt(stack: Stack) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    const {arity, op} = this;
    let result: any;
    if(arity === 1) {
      result = eval(`${op}${this.getArg(state)};`);
    } else if (arity === 2) {
      const arg1 = this.getArg(state);
      const arg2 = this.getArg(state);
      result = eval(`${arg1}${op}${arg2};`);
    } else {
      raise("Invalid arity");
    }
    state.args.push(result);
  }
  toString() {
    return `Basic(${this.op}, ${this.arity})`;
  }
}

const MachineOps = {
  PushState,
  PopState,
  PushArg,
  DiscardArg,
  ClearArgs,
  Halt,
  Basic,
};

export function newMachineOp<OpName extends keyof typeof MachineOps>(opName: OpName, ...args: ConstructorParameters<typeof MachineOps[OpName]>) {
  return new (MachineOps[opName] as any)(...args);
}
