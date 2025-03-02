import { ContextValue, loadContextValue } from "./contexts";
import { invariant, StackUnderflowError } from "./errors";
import { runtimeTypeNotNil } from "./runtime_type_checks";
import {
  reifySpecialPushValue,
  reifySpecialReturnValue,
  SpecialPushValue,
  SpecialReturnValue,
} from "./special_value";
import type { VirtualMachine } from "./virtual_machine";

abstract class NewInstruction<Params extends number[]> {
  constructor(readonly args: Params) {}
  abstract explain(): string;
  abstract do(vm: VirtualMachine): void;
}

class PushSpecialValueInstruction extends NewInstruction<[SpecialPushValue]> {
  explain() {
    return `Push special value ${SpecialPushValue[this.args[0]]}`;
  }
  do(vm: VirtualMachine) {
    const object = reifySpecialPushValue(this.args[0], vm);
    const context = vm.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);
    evalStack.stackPush(object);
  }
}

class ReturnSpecialValueInstruction extends NewInstruction<
  [SpecialReturnValue]
> {
  explain() {
    return `Return special value ${SpecialPushValue[this.args[0]]}`;
  }
  do(vm: VirtualMachine) {
    const object = reifySpecialReturnValue(this.args[0], vm);
    vm.contextStack.pop();
    vm.evalStack.stackPush(object);
  }
}

class PushInstruction extends NewInstruction<[ContextValue, number]> {
  explain() {
    const [source, offset] = this.args;
    return `Push from ${ContextValue[source]} at offset ${offset}`;
  }
  do(vm: VirtualMachine) {
    const [source, offset] = this.args;
    const object = loadContextValue(source, offset, vm);
    vm.evalStack.stackPush(object);
  }
}

export const instruction = {
  pushSpecialValue(
    value: SpecialPushValue,
  ): NewInstruction<[SpecialPushValue]> {
    return new PushSpecialValueInstruction([value]);
  },
  returnSpecialValue(
    value: SpecialReturnValue,
  ): NewInstruction<[SpecialReturnValue]> {
    return new ReturnSpecialValueInstruction([value]);
  },
};
