import {invariant, raise} from "./Error";
import {isPrimative} from "./js";
import {MachineStackItem} from "./machine_stack_item";
import {Stack as StackGeneric, type ReadonlyDict} from "./generics";
import {getBoxedValue, type BoxedValue} from "./boxed_value";
import {NilValue} from "./nil_value";
import {theProcClass, type ClassDefinition} from "./class_definitions";
import type {ClassValue} from "./class_value";

type Stack = StackGeneric<MachineStackItem>;

export abstract class MachineOp {
  abstract doIt(stack: Stack, addressBook: ReadonlyDict<VirtualMachineAddress>): void;
  abstract toString(): string;
}

class PushState extends MachineOp {
  doIt(stack: Stack, addressBook: ReadonlyDict<VirtualMachineAddress>) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    const proc = state.args.shift();
    invariant(proc !== undefined && proc.instanceOf("Proc"), "Expected proc");
    const procId = proc.valueOf();
    invariant(procId in addressBook, `No address for proc ${proc.valueOf()}`);
    const address = addressBook[procId];
    const parentState = stack.peek();
    invariant(parentState !== undefined, "Closure must have a parent state");
    const newState = new MachineStackItem(address.valueOf(), parentState)
    while(state.args.length > 0) {
      newState.args.push(state.args.shift()!);
    }
    stack.push(newState);
  }
  toString() {
    return `PushState`;
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
    nextState.args.push(returnValue ?? getBoxedValue(NilValue));
  }
  toString() {
    return "PopState";
  }
}

class PushArg extends MachineOp {
  arg: BoxedValue;
  constructor(
    arg: any,
    type?: ClassDefinition
  ) {
    super();
    this.arg = getBoxedValue(arg, type);
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
    return `DiscardArg`;
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
    invariant(state.args.length > 0, "No arguments");
    const arg = state.args.shift()!.valueOf();
    invariant(isPrimative(arg), "Expected primative");
    return JSON.stringify(arg);
  }

  doIt(stack: Stack) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    const {arity, op} = this;
    let result: number | boolean;
    if(arity === 1) {
      result = eval(`${op}${this.getArg(state)};`);
    } else if (arity === 2) {
      const arg1 = this.getArg(state);
      const arg2 = this.getArg(state);
      result = eval(`${arg1}${op}${arg2};`);
    } else {
      raise("Invalid arity");
    }
    state.args.push(getBoxedValue(result));
  }
  toString() {
    return `Basic(${this.op}, ${this.arity})`;
  }
}

class LookupMethod extends MachineOp {
  constructor(
    readonly methodName: string
  ) {
    super();
  }

  doIt(stack: Stack) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    const receiver = state.args.shift();
    invariant(receiver !== undefined, "No receiver");
    const {classDefinition} = receiver;
    const classBoxedValue = state.get(classDefinition.className);
    invariant(classBoxedValue !== undefined, `${classDefinition.className} is not in scope`);
    const classValue = classBoxedValue.valueOf() as ClassValue;
    const procId = classValue.methodProcIdByName[this.methodName]
    invariant(procId !== undefined, `No method ${this.methodName} on ${classDefinition.className}`);
    state.args.push(getBoxedValue(classValue.methodProcIdByName[this.methodName], theProcClass));
  }

  toString() {
    return `LookupMethod(${this.methodName})`;
  }
}

class AddToScope extends MachineOp {
  constructor(
    readonly key: string,
    readonly value: BoxedValue
  ) {
    super();
  }
  doIt(stack: Stack) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    state.set(this.key, this.value);
  }
  toString() {
    return `AddToScope(${this.key}, ${this.value})`;
  }
}

const MachineOps = {
  Basic,
  PushState,
  PopState,
  PushArg,
  DiscardArg,
  ClearArgs,
  LookupMethod,
  AddToScope,
  Halt,
};

export function newMachineOp<OpName extends keyof typeof MachineOps>(opName: OpName, ...args: ConstructorParameters<typeof MachineOps[OpName]>) {
  return new (MachineOps[opName] as any)(...args);
}
