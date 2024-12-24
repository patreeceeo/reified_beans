import type {MachineOp} from "./machine_ops";
import {MachineStackItem} from "./machine_stack_item";
import {Dict, Stack, type ReadonlyDict} from "./generics";
import {invariant} from "./Error";
import {NilValue} from "./nil_value";
import {getBoxedValue, type BoxedValue} from "./boxed_value";

export class Machine {
  stack = Stack<MachineStackItem>();
  result: BoxedValue = getBoxedValue(NilValue);
  constructor(
    readonly ops = [] as ReadonlyArray<MachineOp>,
    readonly addressBook: ReadonlyDict<VirtualMachineAddress> = Dict<VirtualMachineAddress>()
  ) {
    this.reset();
  }

  run() {
    let state = this.stack.peek();
    if(this.ops.length === 0) {
      return undefined;
    }
    do {
      invariant(state !== undefined, "Machine stack is empty");
      state.args.verifyIntegrity();
      const op = this.ops[state.pc++];
      op.doIt(this.stack, this.addressBook);
      this.stack.verifyIntegrity();
      state = this.stack.peek()!;
    } while(!state.halted);

    return this.result = state.args.shift() ?? getBoxedValue(NilValue);
  }

  reset() {
    this.stack.length = 0;
    const state = new MachineStackItem()
    this.stack.push(state);
  }
}
