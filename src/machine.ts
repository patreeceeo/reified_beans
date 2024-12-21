import type {MachineOp} from "./machine_ops";
import {MachineStackItem} from "./machine_stack_item";
import {Stack} from "./generics";
import {invariant} from "./Error";
import {Nil} from "./nil";

export class Machine {
  stack = Stack<MachineStackItem>();
  result: any = Nil;
  constructor(
    readonly ops = [] as ReadonlyArray<MachineOp>,
    readonly addressMap: Readonly<Record<string, VirtualMachineAddress>> = {}
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
      op.doIt(this.stack);
      this.stack.verifyIntegrity();
      state = this.stack.peek()!;
    } while(!state.halted);

    return this.result = state.args.shift() ?? Nil;
  }

  reset() {
    this.stack.length = 0;
    this.stack.push(new MachineStackItem());
  }
}
