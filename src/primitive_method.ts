import type { ClosureContext } from "./contexts";
import { invariant, StackUnderflowError } from "./errors";
import { Dict } from "./generics";
import type { VirtualMachine } from "./virtual_machine";

// export enum SpecialSelectorType {
//   Plus,
//   Minus,
//   LessThan,
//   GreaterThan,
//   LessThanOrEqual,
//   GreaterThanOrEqual,
//   Equal,
//   NotEqual,
//   Times,
//   Divide,
//   Mod,
//   At,
//   BitShift,
//   BitAnd,
//   BitOr,
//   AtPut,
//   Size,
//   Next,
//   NextPut,
//   AtEnd,
//   EqualEqual,
//   Class,
//   BlockCopy,
//   Value,
//   ValueColon,
//   Do,
//   New,
//   NewColon,
//   X,
//   Y,
// }

export interface PrimitiveMethod {
  attempt(vm: VirtualMachine): boolean;
}

export const primitiveMethodDict = Dict<PrimitiveMethod>();

const arithmeticOpArgs = [0, 0] as [number, number];

primitiveMethodDict["+"] = {
  attempt(vm: VirtualMachine): boolean {
    const context = vm.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    if (!loadArithmeticOpArgs(context, arithmeticOpArgs)) {
      return false;
    }
    const [receiver, arg] = arithmeticOpArgs;
    context.evalStack.push(vm.asLiteral(receiver + arg));
    return true;
  },
};

primitiveMethodDict["-"] = {
  attempt(vm: VirtualMachine): boolean {
    const context = vm.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    if (!loadArithmeticOpArgs(context, arithmeticOpArgs)) {
      return false;
    }
    const [receiver, arg] = arithmeticOpArgs;
    context.evalStack.push(vm.asLiteral(receiver - arg));
    return true;
  },
};

function loadArithmeticOpArgs(
  context: ClosureContext,
  target: [number, number],
): boolean {
  const receiver = context.evalStack.pop();
  invariant(receiver, StackUnderflowError, "evaluation");
  const arg = context.evalStack.peek();
  if (
    typeof receiver.primitiveValue !== "number" ||
    arg === undefined ||
    typeof arg.primitiveValue !== "number"
  ) {
    // Bail out, but first restore the receiver to the eval stack
    context.evalStack.push(receiver);
    return false;
  }
  target[0] = receiver.primitiveValue;
  target[1] = arg.primitiveValue;

  // Pop the arg we just used
  context.evalStack.pop();
  return true;
}
