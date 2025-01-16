import {invariant, raise} from "./Error";
import {isPrimative} from "./js";
import {MachineStackItem} from "./machine_stack_item";
import {getBoxedValue, type ValueBox, type ValueBoxValue} from "./value_box";
import {nilValue} from "./values/nil_value";
import {ClassValue} from "./values/class_value";
import type {Machine} from "./machine";
import type {ProcId, ProcValue} from "./values/proc_value";
import type {ClassDefinition} from "./class_definitions";

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
    const returnValue = argsQueue.peek() ?? getBoxedValue(nilValue);
    const nextState = stack.peek();
    invariant(nextState !== undefined, "Stack underflow");
    argsQueue.push(returnValue);
  }
  toString() {
    return "PopState";
  }
}

class PushArg extends MachineOp {
  arg: ValueBox<ValueBoxValue>;
  constructor(
    arg: ValueBoxValue,
  ) {
    super();
    this.arg = getBoxedValue(arg);
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

class ShiftArg extends MachineOp {
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
    readonly methodName: string,
  ) {
    super();
  }

  /** Walk up the class heirarchy to find the class which implements the method */
  findImplementingClass(receiver: ValueBox<any>, methodName: string): ClassDefinition<any> | undefined {
    let {classDefinition} = receiver;
    while(classDefinition.superClass !== undefined && !classDefinition.hasMethodImplementation(methodName)) {
      classDefinition = classDefinition.superClass
    }
    return classDefinition;
  }

  getMethodProcId(receiver: ValueBox<any>, methodName: string, state: MachineStackItem): ProcId {
    const implementingClass = this.findImplementingClass(receiver, methodName);
    invariant(implementingClass !== undefined, `No class implements ${methodName}`);
    const classBoxedValue = state.get<ClassValue<any>>(implementingClass.className);
    invariant(classBoxedValue !== undefined, `${implementingClass.className} is not in scope`);
    const classValue = classBoxedValue.valueOf() as ClassValue<any>;
    const procId = classValue.methodProcIdByName[methodName];
    invariant(procId !== undefined, `${receiver.classDefinition.className} does not understand "${methodName}"`);
    return procId;
  }

  doIt({stack, procById, argsQueue}: Machine) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    const receiver = argsQueue.peek();
    invariant(receiver !== undefined, `No receiver for method ${this.methodName}`);
    const procId = this.getMethodProcId(receiver, this.methodName, state);
    const proc = procById[procId];
    invariant(proc !== undefined, `No proc with id ${procId}`);
    argsQueue.unshift(getBoxedValue(proc));
  }

  toString() {
    return `LookupMethod(${this.methodName})`;
  }
}

class AddToScope extends MachineOp {
  constructor(
    readonly key: string,
    readonly value?: ValueBox<ValueBoxValue>
  ) {
    super();
  }
  doIt({stack, argsQueue }: Machine) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    const value = this.value ?? argsQueue.peek();
    invariant(value !== undefined, "No value to add to scope");
    state.set(this.key, value);
  }
  toString() {
    return this.value ? `AddToScope(${this.key}, ${this.value})` : `AddToScope(${this.key})`;
  }
}

class GetFromScope extends MachineOp {
  constructor(
    readonly key: string
  ) {
    super();
  }
  doIt({stack, argsQueue}: Machine) {
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    const value = state.get(this.key);
    invariant(value !== undefined, `No value for ${this.key} in scope`);
    argsQueue.push(value);
  }
  toString() {
    return `GetFromScope(${this.key})`;
  }
}

class ReplaceWithNativeMethodAnswer extends MachineOp {
  constructor(
    readonly methodName: string,
    readonly replaceArg = false
  ) {
    super();
  }

  doIt({stack, argsQueue}: Machine) {
    const {methodName} = this;
    const state = stack.peek();
    invariant(state !== undefined, "Machine stack is empty");
    const boxedReceiver = argsQueue.peek();
    invariant(boxedReceiver !== undefined, "No receiver");
    const value = boxedReceiver.valueOf();
    invariant(value !== undefined && methodName in value, `native method ${methodName} not defined`)
    const method = value[methodName] as Function;
    invariant(method !== undefined, `No method "${methodName}" on ${value}`);
    const result = method.apply(value, argsQueue);
    argsQueue.shift();
    argsQueue.unshift(getBoxedValue(result));
  }

  toString() {
    return `ReplaceWithNativeMethodAnswer(${this.methodName})`;
  }
}

class Debug extends MachineOp {
  doIt(machine: Machine) {
    debugger;
  }
  toString() {
    return "Debug";
  }
}

const MachineOps = {
  Basic,
  ReplaceWithNativeMethodAnswer,
  PushState,
  PopState,
  PushArg,
  ShiftArg,
  ClearArgs,
  LookupMethod,
  AddToScope,
  GetFromScope,
  Halt,
  Debug,
};

export function newMachineOp<OpName extends keyof typeof MachineOps>(opName: OpName, ...args: ConstructorParameters<typeof MachineOps[OpName]>) {
  return new (MachineOps[opName] as any)(...args);
}
