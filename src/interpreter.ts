import { invariant, StackUnderflowError } from "./errors";
import { InstructionPointer, reifyInstruction } from "./instructions";
import {
  runtimeTypeNotNil,
  runtimeTypePositiveNumber,
} from "./runtime_type_checks";
import type { VirtualMachine } from "./virtual_machine";

export class Interpreter {
  instructionPointer: InstructionPointer;
  constructor(readonly vm: VirtualMachine) {
    this.instructionPointer = new InstructionPointer(vm.instructionBuffer);
  }

  get byteOffsetOfLastInstructionInCurrentContext() {
    const context = this.vm.contextStack.peek();
    invariant(context !== undefined, StackUnderflowError, "context");
    const closure = context.readVarWithName("closure", runtimeTypeNotNil);
    const instructionRange = closure.readVarWithName(
      "instructionByteRange",
      runtimeTypeNotNil,
    );
    return instructionRange.readVarWithName("end", runtimeTypePositiveNumber)
      .primitiveValue;
  }

  private syncInstructionPointer() {
    const context = this.vm.contextStack.peek();
    invariant(context !== undefined, StackUnderflowError, "context");
    const instructionByteIndex = context.readVarWithName(
      "instructionByteIndex",
      runtimeTypePositiveNumber,
    );
    this.instructionPointer.byteOffset = instructionByteIndex.primitiveValue;
  }

  /**
   * @returns false if the VM is finished
   */
  step() {
    const { vm } = this;
    const context = vm.contextStack.peek();
    invariant(context !== undefined, StackUnderflowError, "context");
    const instructionCode = this.instructionPointer.peek();
    const instruction = reifyInstruction(instructionCode);
    const args = [] as number[];

    instruction.readArgs(this.instructionPointer, args);

    instruction.do(vm, ...args);

    context.setVarWithName(
      "instructionByteIndex",
      vm.asLiteral(this.instructionPointer.byteOffset),
    );

    while (
      this.instructionPointer.byteOffset >=
      this.byteOffsetOfLastInstructionInCurrentContext
    ) {
      if (vm.contextStack.length === 1) {
        return false;
      }
      // finished with current context
      // return stack top to caller
      const poppedEvalStack = vm.evalStack;
      vm.contextStack.pop();

      this.syncInstructionPointer();

      vm.evalStack.stackPush(
        poppedEvalStack.stackTop ?? this.vm.asLiteral(undefined),
      );
    }
    return true;
  }

  run() {
    while (this.step()) {}
  }
}
