import { VirtualObject } from "./virtual_objects";
import { Dict } from "./generics";
import {
  invariant,
  BindingError,
  RangeError,
  StackUnderflowError,
  TypeError,
} from "./errors";
import {
  runtimeTypeNotNil,
  runtimeTypePositiveNumber,
  runtimeTypeString,
  type RuntimeType,
} from "./runtime_type_checks";
import type { VirtualMachine } from "./virtual_machine";

export class GlobalContext {
  dict = Dict<VirtualObject>();

  at(key: string): VirtualObject {
    let vObject = this.dict[key];
    invariant(vObject !== undefined, BindingError, "GlobalContext", key);
    return vObject;
  }

  put(key: string, value: VirtualObject) {
    this.dict[key] = value;
  }

  get keys() {
    return Object.keys(this.dict);
  }
}

/*
 * Closure contexts are implemented as virtual objects to support reflection. The below functions
 * encapsulate how to load and store values in these contexts.
 */

export enum ContextValue {
  ReceiverVar,
  TempVar,
  LiteralVar,
  LiteralConst,
}

export enum ContextVariable {
  ReceiverVar,
  TempVar,
  LiteralVar,
}

export function loadContextValue(
  value: ContextValue | ContextVariable,
  offset: number,
  vm: VirtualMachine,
): VirtualObject {
  const context = vm.contextStack.peek();
  invariant(context !== undefined, StackUnderflowError, "context");
  switch (value) {
    case ContextVariable.ReceiverVar:
      return getVarFromContextReceiver(context, offset);
    case ContextValue.ReceiverVar:
      return getVarFromContextReceiver(context, offset);
    case ContextVariable.TempVar:
    case ContextValue.TempVar:
      validateTempVarOffset(offset, context);
      return context
        .readNamedVar("argsAndTemps", runtimeTypeNotNil)
        .readIndexedVar(offset);
    case ContextValue.LiteralConst:
      return readLiteral(context, offset);
    case ContextVariable.LiteralVar:
      return handleLiteralVar(offset, vm, context);
    case ContextValue.LiteralVar:
      return handleLiteralVar(offset, vm, context);
  }
}

export function getVarFromContextReceiver(
  context: VirtualObject,
  offset: number,
) {
  return context.readNamedVar("receiver", runtimeTypeNotNil).readVar(offset);
}

function readLiteral<PrimitiveType>(
  context: VirtualObject,
  offset: number,
  expectedType: RuntimeType<PrimitiveType> = runtimeTypeNotNil,
) {
  return context
    .readNamedVar("closure")
    .readNamedVar("literals", runtimeTypeNotNil)
    .readIndexedVar(offset, expectedType);
}

function handleLiteralVar(
  offset: number,
  vm: VirtualMachine,
  context: VirtualObject,
): VirtualObject {
  // (TODO:robustness) (TODO:fidelity) use an instance of Association?
  const vStrClassKey = readLiteral(context, offset, runtimeTypeString);
  return vm.globalContext.at(vStrClassKey.primitiveValue);
}

function validateTempVarOffset(offset: number, context: VirtualObject): void {
  const closure = context.readNamedVar("closure", runtimeTypeNotNil);
  const argCount = closure.readNamedVar(
    "argCount",
    runtimeTypePositiveNumber,
  ).primitiveValue;
  const tempCount = closure.readNamedVar(
    "tempCount",
    runtimeTypePositiveNumber,
  ).primitiveValue;
  const argAndTempCount = argCount + tempCount;
  invariant(
    offset >= 0 && offset < argAndTempCount,
    RangeError,
    offset,
    0,
    argAndTempCount,
    "temp index",
  );
}

export function storeContextValue(
  target: ContextVariable,
  offset: number,
  vm: VirtualMachine,
  vObject: VirtualObject,
): void {
  const context = vm.contextStack.peek();
  invariant(context !== undefined, StackUnderflowError, "context");
  switch (target) {
    case ContextVariable.ReceiverVar: {
      context
        .readNamedVar("receiver", runtimeTypeNotNil)
        .setVar(offset, vObject);
      return;
    }
    case ContextVariable.TempVar: {
      validateTempVarOffset(offset, context);
      context
        .readNamedVar("argsAndTemps", runtimeTypeNotNil)
        .writeIndexedVar(offset, vObject);
      return;
    }
    case ContextVariable.LiteralVar:
      const key = readLiteral(context, offset).primitiveValue;
      invariant(typeof key === "string", TypeError, `a string`, String(key));
      vm.globalContext.put(key, vObject);
  }
}
