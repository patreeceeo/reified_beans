import { invariant, StackUnderflowError } from "./errors";
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
    const instructionIndex = context.readVarWithName(
      "instructionByteIndex",
      runtimeTypePositiveNumber,
    );
    this.vm.instructionPointer = instructionIndex.primitiveValue;
  }

  /**
   * @returns false if the VM is finished
   */
  step() {
    const { vm } = this;
    const context = vm.contextStack.peek();
    invariant(context !== undefined, StackUnderflowError, "context");
    const instruction = vm.instructions[vm.instructionPointer];

    console.log(vm.instructionPointer, ":", instruction.explain());

    // Increment instruction pointer before executing instruction
    // so that the instruction can jump to the next instruction if needed
    vm.instructionPointer += 1;

    instruction.do(vm);

    const ip = vm.instructionPointer;

    context.setVarWithName("instructionByteIndex", vm.asLiteral(ip));

    while (ip >= this.byteOffsetOfLastInstructionInCurrentContext) {
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
