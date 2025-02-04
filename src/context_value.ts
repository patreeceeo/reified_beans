import { invariant, StackUnderflowError, TypeError } from "./errors";
import type { VirtualMachine } from "./virtual_machine";
import { type VirtualObject } from "./virtual_objects";

export enum ContextValue {
  ReceiverVar,
  TempVar,
  LiteralVar,
  LiteralConst,
}

export const ContextVariable = {
  ReceiverVar: ContextValue.ReceiverVar,
  TempVar: ContextValue.TempVar,
  LiteralVar: ContextValue.LiteralVar,
} as const;

export type ContextVariable =
  (typeof ContextVariable)[keyof typeof ContextVariable];

export function loadContextValue(
  value: ContextValue | ContextVariable,
  offset: number,
  vm: VirtualMachine,
): VirtualObject {
  const context = vm.contextStack.peek();
  invariant(context !== undefined, StackUnderflowError, "context");
  switch (value) {
    case ContextVariable.ReceiverVar:
    case ContextValue.ReceiverVar: {
      return context.receiver.getVar(offset);
    }
    case ContextVariable.TempVar:
    case ContextValue.TempVar: {
      return context.argsAndTemps.at(offset);
    }
    case ContextValue.LiteralConst:
      return context.closure.literals.at(offset);
    case ContextVariable.LiteralVar:
    case ContextValue.LiteralVar:
      // (TODO:robustness) (TODO:fidelity) use an instance of Association?
      const vStrClassKey = context.closure.literals.at(offset);
      invariant(
        typeof vStrClassKey.primitiveValue === "string",
        TypeError,
        `a string`,
        String(vStrClassKey.primitiveValue),
      );
      return vm.globalContext.at(vStrClassKey.primitiveValue);
  }
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
      context.receiver.setVar(offset, vObject);
      return;
    }
    case ContextVariable.TempVar: {
      context.argsAndTemps.put(offset, vObject);
      return;
    }
    case ContextVariable.LiteralVar:
      const key = context.closure.literals.at(offset).primitiveValue;
      invariant(typeof key === "string", TypeError, `a string`, String(key));
      vm.globalContext.put(key, vObject);
  }
}
