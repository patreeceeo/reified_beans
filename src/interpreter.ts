import { invariant, StackUnderflowError } from "./errors";
import {
  getNextInstructionCodeByteOffset,
  peekInstructionCodeFromDataView,
  reifyInstruction,
} from "./instructions";
import {
  runtimeTypeNotNil,
  runtimeTypePositiveNumber,
} from "./runtime_type_checks";
import type { VirtualMachine } from "./virtual_machine";

export class Interpreter {
  instructionView: DataView;
  constructor(readonly vm: VirtualMachine) {
    this.instructionView = new DataView(vm.instructionBuffer);
  }

  /**
   * @returns false if the VM is finished
   */
  step() {
    const { vm } = this;
    const context = vm.contextStack.peek();
    invariant(context !== undefined, StackUnderflowError, "context");
    const instructionIndex = context.readVarWithName(
      "instructionByteIndex",
      runtimeTypePositiveNumber,
    );
    const closure = context.readVarWithName("closure", runtimeTypeNotNil);
    const instructionRange = closure.readVarWithName(
      "instructionByteRange",
      runtimeTypeNotNil,
    );
    const instructionEnd = instructionRange.readVarWithName(
      "end",
      runtimeTypePositiveNumber,
    );
    const instructionCode = peekInstructionCodeFromDataView(
      this.instructionView,
      instructionIndex.primitiveValue,
    );
    const instruction = reifyInstruction(instructionCode);

    instruction.do(vm);

    const nextInstructionIndex = getNextInstructionCodeByteOffset(
      instructionIndex.primitiveValue,
    );
    context.setVarWithName(
      "instructionByteIndex",
      vm.asLiteral(nextInstructionIndex),
    );

    const finished =
      instructionIndex.primitiveValue >= instructionEnd.primitiveValue;

    if (finished) {
      // finished with current context
      // return stack top to caller
      const poppedContext = this.vm.contextStack.pop()!;
      const poppedEvalStack = poppedContext.readVarWithName(
        "evalStack",
        runtimeTypeNotNil,
      );
      if (vm.contextStack.length === 0) {
        return false;
      }
      const newContext = this.vm.contextStack.peek()!;
      const newEvalStack = newContext.readVarWithName(
        "evalStack",
        runtimeTypeNotNil,
      );
      newEvalStack.stackPush(
        poppedEvalStack.stackTop ?? this.vm.asLiteral(undefined),
      );
    }
  }

  run() {
    while (this.step()) {}
  }
}
