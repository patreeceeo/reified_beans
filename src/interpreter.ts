import { invariant, StackUnderflowError } from "./errors";
import { reifyInstruction } from "./instructions";
import {
  runtimeTypeNotNil,
  runtimeTypePositiveNumber,
} from "./runtime_type_checks";
import type { VirtualMachine } from "./virtual_machine";

export class Interpreter {
  constructor(readonly vm: VirtualMachine) {}

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
    this.vm.instructionPointer.byteOffset = instructionByteIndex.primitiveValue;
  }

  /**
   * @returns false if the VM is finished
   */
  step() {
    const { vm } = this;
    const { instructionPointer } = vm;
    const context = vm.contextStack.peek();
    invariant(context !== undefined, StackUnderflowError, "context");
    const instructionCode = instructionPointer.peek();
    const instruction = reifyInstruction(instructionCode);
    const args = [] as number[];
    const offset = instructionPointer.byteOffset;

    instruction.readArgs(instructionPointer, args);

    console.log(offset, ":", instruction.explain(...args));
    instruction.do(vm, ...args);

    context.setVarWithName(
      "instructionByteIndex",
      vm.asLiteral(instructionPointer.byteOffset),
    );

    while (
      instructionPointer.byteOffset >=
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
