import { invariant, StackUnderflowError } from "./errors";
import { Dict } from "./generics";
import { runtimeTypeNotNil } from "./runtime_type_checks";
import type { VirtualMachine } from "./virtual_machine";
import type { VirtualObject } from "./virtual_objects";

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
    const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);

    evalStack.stackPush(vm.asLiteral(receiver + arg));
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
    const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);

    evalStack.stackPush(vm.asLiteral(receiver - arg));
    return true;
  },
};

primitiveMethodDict["at:"] = {
  attempt(vm: VirtualMachine): boolean {
    const context = vm.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);
    const receiver = evalStack.stackPop();
    const arg = evalStack.stackPop();

    invariant(receiver, StackUnderflowError, "evaluation");
    invariant(arg, StackUnderflowError, "evaluation");

    if (typeof arg.primitiveValue !== "number") {
      evalStack.stackPush(receiver);
      evalStack.stackPush(arg);
      return false;
    }

    const value = receiver.readIndexedVar(arg.primitiveValue);
    evalStack.stackPush(value);
    return true;
  },
};

primitiveMethodDict["value"] = {
  attempt(vm: VirtualMachine): boolean {
    const { evalStack } = vm;
    const closure = evalStack.stackPop();
    const context = vm.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const receiver = context.readNamedVar("receiver", runtimeTypeNotNil);

    invariant(closure, StackUnderflowError, "evaluation");

    vm.invokeAsMethod(receiver, closure);
    return true;
  },
};

function loadArithmeticOpArgs(
  context: VirtualObject,
  target: [number, number],
): boolean {
  const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);
  const receiver = evalStack.stackPop();
  invariant(receiver, StackUnderflowError, "evaluation");
  const arg = evalStack.stackTop;
  if (
    typeof receiver.primitiveValue !== "number" ||
    arg === undefined ||
    typeof arg.primitiveValue !== "number"
  ) {
    // Bail out, but first restore the receiver to the eval stack
    evalStack.stackPush(receiver);
    return false;
  }
  target[0] = receiver.primitiveValue;
  target[1] = arg.primitiveValue;

  // Pop the arg we just used
  evalStack.stackPop();
  return true;
}
