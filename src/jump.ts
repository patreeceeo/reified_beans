import { invariant, RangeError } from "./errors";
import { runtimeTypePositiveNumber } from "./runtime_type_checks";
import type { VirtualObject } from "./virtual_objects";

export function jumpRelative(
  context: VirtualObject,
  byteOffset: number,
  vm = context.vm,
) {
  const instructionByteIndex = context.readVarWithName(
    "instructionByteIndex",
    runtimeTypePositiveNumber,
  );
  const newIndexPrimitive = instructionByteIndex.primitiveValue + byteOffset;

  invariant(
    newIndexPrimitive >= 0 &&
      newIndexPrimitive <= vm.indexOfLastInstructionInCurrentClosure,
    RangeError,
    newIndexPrimitive,
    0,
    vm.indexOfLastInstructionInCurrentClosure,
    "a valid instruction index",
  );

  context.setVarWithName(
    "instructionByteIndex",
    vm.asLiteral(newIndexPrimitive),
  );
}
