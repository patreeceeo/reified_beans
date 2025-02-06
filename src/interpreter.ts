import { invariant, StackUnderflowError } from "./errors";
import { reifyInstruction } from "./instructions";
import type { VirtualMachine } from "./virtual_machine";

export class Interpreter {
  constructor(readonly vm: VirtualMachine) {}

  step() {
    const context = this.vm.contextStack.peek();
    invariant(context !== undefined, StackUnderflowError, "context");
    const instructionCode = context.instructionPointer.peek();
    const instruction = reifyInstruction(instructionCode);
    instruction.do(this.vm);
    return !context.instructionPointer.finished;
  }

  run() {
    while (this.step()) {}
  }
}
