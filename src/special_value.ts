import { invariant, StackUnderflowError } from "./errors";
import { runtimeTypeNotNil } from "./runtime_type_checks";
import type { VirtualMachine } from "./virtual_machine";
import type { VirtualObject } from "./virtual_objects";

export enum SpecialPushValue {
  Self,
  True,
  False,
  Nil,
  NegativeOne,
  Zero,
  One,
  Two,
}

export enum SpecialReturnValue {
  Self,
  True,
  False,
  Nil,
}

function mapSpecialReturnValueToSpecialPushValue(
  value: SpecialReturnValue,
): SpecialPushValue {
  switch (value) {
    case SpecialReturnValue.Self:
      return SpecialPushValue.Self;
    case SpecialReturnValue.True:
      return SpecialPushValue.True;
    case SpecialReturnValue.False:
      return SpecialPushValue.False;
    case SpecialReturnValue.Nil:
      return SpecialPushValue.Nil;
  }
}

export function reifySpecialPushValue(
  value: SpecialPushValue,
  vm: VirtualMachine,
): VirtualObject {
  switch (value) {
    case SpecialPushValue.Self:
      const context = vm.contextStack.peek();
      invariant(context, StackUnderflowError, "context");
      return context.readNamedVar("receiver", runtimeTypeNotNil);
    case SpecialPushValue.True:
      return vm.asLiteral(true);
    case SpecialPushValue.False:
      return vm.asLiteral(false);
    case SpecialPushValue.Nil:
      return vm.asLiteral(undefined);
    case SpecialPushValue.NegativeOne:
      return vm.asLiteral(-1);
    case SpecialPushValue.Zero:
      return vm.asLiteral(0);
    case SpecialPushValue.One:
      return vm.asLiteral(1);
    case SpecialPushValue.Two:
      return vm.asLiteral(2);
  }
}

export function reifySpecialReturnValue(
  value: SpecialReturnValue,
  vm: VirtualMachine,
): VirtualObject {
  const pushValue = mapSpecialReturnValueToSpecialPushValue(value);
  return reifySpecialPushValue(pushValue, vm);
}
