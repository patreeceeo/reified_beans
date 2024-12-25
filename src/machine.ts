import type {MachineOp} from "./machine_ops";
import {MachineStackItem} from "./machine_stack_item";
import {Dict, Stack } from "./generics";
import {invariant} from "./Error";
import {nilValue} from "./nil_value";
import {getBoxedValue, type BoxedValue} from "./boxed_value";
import type {ProcValue} from "./proc_value";

export class Machine {
  stack = Stack<MachineStackItem>();
  stateByProcId = Dict<MachineStackItem>();
  result: BoxedValue<any> = getBoxedValue(nilValue);
  constructor(
    readonly ops = [] as ReadonlyArray<MachineOp>,
    readonly procById: Dict<Readonly<ProcValue>>
  ) {
    this.reboot();
  }

  run() {
    let state = this.stack.peek();
    if(this.ops.length === 0) {
      return nilValue;
    }
    do {
      invariant(state !== undefined, "Machine stack is empty");
      state.args.verifyIntegrity();
      const op = this.ops[state.pc++];
      op.doIt(this);
      this.stack.verifyIntegrity();
      state = this.stack.peek()!;
    } while(!state.halted);

    const boxedResult = state.args.shift() ?? getBoxedValue(nilValue);
    return this.result = boxedResult.valueOf();
  }

  reboot() {
    this.stack.length = 0;
    const state = new MachineStackItem()
    this.stack.push(state);
    this.stateByProcId = {
      [this.procById[0].id]: state
    };
  }
}
