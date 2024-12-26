import {invariant, raise} from "./Error";
import {isPrimative} from "./js";
import {MachineStackItem} from "./machine_stack_item";
import {getBoxedValue, type BoxedValue} from "./boxed_value";
import {nilValue} from "./nil_value";
import {theProcClass, type ClassDefinition} from "./class_definitions";
import {ClassValue} from "./class_value";
import type {Machine} from "./machine";
import type {ProcValue} from "./proc_value";

export abstract class MachineOp {
  abstract doIt(machine: Machine): void;
  abstract toString(): string;
}

class PushState extends MachineOp {
  doIt({stack, stateByProcId, argsQueue}: Machine) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    const boxedProc = argsQueue.shift();
    invariant(boxedProc !== undefined && boxedProc.instanceOf("Proc"), "Expected proc");
    const proc = boxedProc.valueOf() as ProcValue;
    invariant(proc.lexicalParentScopeProcId !== undefined, "Proc must have a lexical scope");
    const lexicalScopeState = stateByProcId[proc.lexicalParentScopeProcId];
    invariant(lexicalScopeState !== undefined, "Proc must have a lexical scope");
    const newState = new MachineStackItem(proc.address, lexicalScopeState)
    stateByProcId[boxedProc.valueOf().id] = newState;
    stack.push(newState);
  }
  toString() {
    return `PushState`;
  }
}

/** Pops the current state from the stack and also handles the return value. */
class PopState extends MachineOp {
  doIt({stack, argsQueue}: Machine) {
    const poppedState = stack.pop();
    invariant(poppedState !== undefined, "Stack underflow");
    invariant(argsQueue.length > 0, "No return value");
    const returnValue = argsQueue.shift();
    const nextState = stack.peek();
    invariant(nextState !== undefined, "Stack underflow");
    invariant(argsQueue.length === 0, "Next state already has arguments");
    argsQueue.push(returnValue ?? getBoxedValue(nilValue));
  }
  toString() {
    return "PopState";
  }
}

class PushArg<T> extends MachineOp {
  arg: BoxedValue<T>;
  constructor(
    arg: T,
    type?: ClassDefinition<T>
  ) {
    super();
    this.arg = getBoxedValue(arg, type);
  }
  doIt({stack, argsQueue}: Machine) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    argsQueue.push(this.arg);
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
  doIt({stack, argsQueue}: Machine) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    invariant(argsQueue.length > 0, "No arguments to shift");
    argsQueue.shift();
  }
  toString() {
    return `DiscardArg`;
  }
}

class ClearArgs extends MachineOp {
  doIt({stack, argsQueue}: Machine) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    argsQueue.length = 0;
  }

  toString() {
    return "ClearArgs";
  }
}

class Halt extends MachineOp {
  doIt({stack}: Machine) {
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

  getArg(argsQueue: Machine["argsQueue"]) {
    invariant(argsQueue.length > 0, "No arguments");
    const arg = argsQueue.shift()!.valueOf();
    invariant(isPrimative(arg), "Expected primative");
    return JSON.stringify(arg);
  }

  doIt({stack, argsQueue}: Machine) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    const {arity, op} = this;
    let result: number | boolean;
    if(arity === 1) {
      result = eval(`${op}${this.getArg(argsQueue)};`);
    } else if (arity === 2) {
      const arg1 = this.getArg(argsQueue);
      const arg2 = this.getArg(argsQueue);
      result = eval(`${arg1}${op}${arg2};`);
    } else {
      raise("Invalid arity");
    }
    argsQueue.push(getBoxedValue(result));
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

  doIt({stack, procById, argsQueue}: Machine) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    const receiver = argsQueue.shift();
    invariant(receiver !== undefined, "No receiver");
    const {classDefinition} = receiver;
    const classBoxedValue = state.get<ClassValue>(classDefinition.className);
    invariant(classBoxedValue !== undefined, `${classDefinition.className} is not in scope`);
    const classValue = classBoxedValue.valueOf() as ClassValue;
    const procId = classValue.methodProcIdByName[this.methodName]
    invariant(procId !== undefined, `No method ${this.methodName} on ${classDefinition.className}`);
    const proc = procById[procId];
    invariant(proc !== undefined, `No proc with id ${procId}`);
    argsQueue.push(getBoxedValue(proc, theProcClass));
  }

  toString() {
    return `LookupMethod(${this.methodName})`;
  }
}

class AddToScope<T> extends MachineOp {
  constructor(
    readonly key: string,
    readonly value: BoxedValue<T>
  ) {
    super();
  }
  doIt({stack}: Machine) {
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
