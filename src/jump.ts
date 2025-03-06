import { invariant, RangeError } from "./errors";
import {
  runtimeTypeNotNil,
  runtimeTypePositiveNumber,
} from "./runtime_type_checks";
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
  const closure = context.readVarWithName("closure", runtimeTypeNotNil);
  const instructionRange = closure.readVarWithName(
    "instructionByteRange",
    runtimeTypeNotNil,
  );
  const min = instructionRange.readVarWithName(
    "start",
    runtimeTypePositiveNumber,
  ).primitiveValue;
  const max = instructionRange.readVarWithName(
    "end",
    runtimeTypePositiveNumber,
  ).primitiveValue;
  const newIndexPrimitive = instructionByteIndex.primitiveValue + byteOffset;

  invariant(
    newIndexPrimitive >= min && newIndexPrimitive <= max,
    RangeError,
    newIndexPrimitive,
    min,
    max,
    "a valid instruction index",
  );

  context.setVarWithName(
    "instructionByteIndex",
    vm.asLiteral(newIndexPrimitive),
  );
}
