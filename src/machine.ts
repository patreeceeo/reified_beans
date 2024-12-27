import type {MachineOp} from "./machine_ops";
import {MachineStackItem} from "./machine_stack_item";
import {Dict, Queue, Stack } from "./generics";
import {invariant} from "./Error";
import {nilValue} from "./values/nil_value";
import {getBoxedValue, type ValueBox} from "./value_box";
import type {ProcValue} from "./values/proc_value";

export class Machine {
  stack = Stack<MachineStackItem>();
  stateByProcId = Dict<MachineStackItem>();
  result: ValueBox<any> = getBoxedValue(nilValue);
  argsQueue = Queue<ValueBox<any>>();
  constructor(
    readonly ops = [] as ReadonlyArray<MachineOp>,
    readonly procById: Dict<Readonly<ProcValue>>
  ) {
    this.reboot();
  }

  run() {
    const {ops, argsQueue, stack} = this;
    let state = this.stack.peek();
    if(this.ops.length === 0) {
      return nilValue;
    }
    do {
      invariant(state !== undefined, "Machine stack is empty");
      argsQueue.verifyIntegrity();
      const op = ops[state.pc++];
      op.doIt(this);
      stack.verifyIntegrity();
      state = stack.peek()!;
    } while(!state.halted);

    const boxedResult = argsQueue.shift() ?? getBoxedValue(nilValue);
    return this.result = boxedResult.valueOf();
  }

  reboot() {
    this.stack.length = 0;
    this.argsQueue.length = 0;
    const state = new MachineStackItem()
    this.stack.push(state);
    this.stateByProcId = {
      [this.procById[0].id]: state
    };
  }
}
