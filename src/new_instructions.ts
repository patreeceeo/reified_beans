import {
  ContextValue,
  ContextVariable,
  loadContextValue,
  storeContextValue,
} from "./contexts";
import { invariant, StackUnderflowError } from "./errors";
import { jumpRelative } from "./jump";
import { runtimeTypeNotNil, runtimeTypeString } from "./runtime_type_checks";
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

/**
 * Push a special value onto the eval Stack
 * @param value The special value to Push
 * @see SpecialPushValue
 */
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

/**
 * Return a special Value
 * @param value The special value to return
 * @see SpecialReturnValue
 */
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

/**
 * Push an object onto the eval stack
 * @param source The source of the object to push
 * @param offset The offset from the source
 * @see ContextValue
 */
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

/**
 * Store the object on the top of the stack in the indicated location
 * @param target The target of the Store instruction
 * @param offset The offset from the target
 * @see ContextVariable
 */
class StoreInstruction extends NewInstruction<[ContextVariable, number]> {
  explain() {
    const [source, offset] = this.args;
    return `Store to ${ContextValue[source]} at offset ${offset}`;
  }
  do(vm: VirtualMachine) {
    const [source, offset] = this.args;
    const object = vm.evalStack.stackTop;
    invariant(object, StackUnderflowError, "evaluation");
    storeContextValue(source, offset, vm, object);
  }
}

/**
 * Pop the object from the top of the stack and store in the indicated location
 * @param target The target of the PopAndStore instruction
 * @param offset The offset from the target
 * @see ContextVariable
 */
class PopAndStoreInstruction extends NewInstruction<[ContextVariable, number]> {
  explain() {
    const [source, offset] = this.args;
    return `Pop and store to ${ContextValue[source]} at offset ${offset}`;
  }
  do(vm: VirtualMachine) {
    const [source, offset] = this.args;
    const object = vm.evalStack.stackPop();
    invariant(object, StackUnderflowError, "evaluation");
    storeContextValue(source, offset, vm, object);
  }
}

/**
 * Send a message using a literal selector with the given number of arguments.
 * The receiver is taken off the stack, followed by the arguments.
 * @param selector The index of the literal selector found in the method's literal array
 * @param numArgs The number of arguments to the message
 */
class SendLiteralSelectorExtendedInstruction extends NewInstruction<
  [number, number]
> {
  explain() {
    const [selectorIndex, argumentCount] = this.args;
    return `Send literal selector ${selectorIndex} with ${argumentCount} arguments`;
  }
  do(vm: VirtualMachine) {
    const [selectorIndex, numArgs] = this.args;
    const context = vm.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const initialStackDepth = vm.evalStack.stackDepth;
    invariant(
      initialStackDepth >= numArgs + 1,
      StackUnderflowError,
      "evaluation",
    );

    const closure = context.readVarWithName("closure", runtimeTypeNotNil);
    // (TODO:optimize) add a global selector table to the VM
    const literals = closure.readVarWithName("literals", runtimeTypeNotNil);
    const { primitiveValue } = literals.readIndex(
      selectorIndex,
      runtimeTypeString,
    );
    vm.send(primitiveValue);
  }
}

/**
 * Pop the object from the top of the Stack
 */
class PopInstruction extends NewInstruction<[]> {
  explain() {
    return "Pop";
  }
  do(vm: VirtualMachine) {
    vm.evalStack.stackPop();
  }
}

/**
 * Duplicate the object on the top of the Stack
 */
class DuplicateInstruction extends NewInstruction<[]> {
  explain() {
    return "Duplicate";
  }
  do(vm: VirtualMachine) {
    const object = vm.evalStack.stackTop;
    invariant(object, StackUnderflowError, "evaluation");
    vm.evalStack.stackPush(object);
  }
}

/**
 * Jump the given number of bytes, unconditionally.
 */
class JumpInstruction extends NewInstruction<[number]> {
  explain() {
    return `Jump to ${this.args[0]}`;
  }
  do(vm: VirtualMachine) {
    const context = vm.contextStack.peek();
    const [offset] = this.args;
    invariant(context, StackUnderflowError, "context");
    jumpRelative(context, offset, vm);
  }
}

/**
 * If the object on the top of the Stack is True, pop it and jump the given number of bytes.
 * Otherwise, continue to the next instruction.
 * @param offset The number of instructions to jump, can be negative.
 */
class PopAndJumpOnTrueInstruction extends NewInstruction<[number]> {
  explain() {
    return `Pop and jump on true to ${this.args[0]}`;
  }
  do(vm: VirtualMachine) {
    const context = vm.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const [offset] = this.args;
    const condition = vm.evalStack.stackTop;
    invariant(condition, StackUnderflowError, "evaluation");
    if (condition.isTrue) {
      vm.evalStack.stackPop();
      jumpRelative(context, offset, vm);
    }
  }
}

/**
 * If the object on the top of the Stack is False, pop it and jump the given number of bytes.
 * Otherwise, continue to the next instruction.
 * @param offset The number of bytes to jump, can be negative.
 */
class PopAndJumpOnFalseInstruction extends NewInstruction<[number]> {
  explain() {
    return `Pop and jump on false to ${this.args[0]}`;
  }
  do(vm: VirtualMachine) {
    const context = vm.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const [offset] = this.args;
    const condition = vm.evalStack.stackTop;
    invariant(condition, StackUnderflowError, "evaluation");
    if (condition.isFalse) {
      vm.evalStack.stackPop();
      jumpRelative(context, offset, vm);
    }
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
  push(
    source: ContextValue,
    offset: number,
  ): NewInstruction<[ContextValue, number]> {
    return new PushInstruction([source, offset]);
  },
  store(
    source: ContextVariable,
    offset: number,
  ): NewInstruction<[ContextVariable, number]> {
    return new StoreInstruction([source, offset]);
  },
  popAndStore(
    source: ContextVariable,
    offset: number,
  ): NewInstruction<[ContextVariable, number]> {
    return new PopAndStoreInstruction([source, offset]);
  },
  sendLiteralSelectorExtended(
    selectorIndex: number,
    argumentCount: number,
  ): NewInstruction<[number, number]> {
    return new SendLiteralSelectorExtendedInstruction([
      selectorIndex,
      argumentCount,
    ]);
  },
  pop(): NewInstruction<[]> {
    return new PopInstruction([]);
  },
  duplicate(): NewInstruction<[]> {
    return new DuplicateInstruction([]);
  },
  jump(byteOffset: number): NewInstruction<[number]> {
    return new JumpInstruction([byteOffset]);
  },
  popAndJumpOnTrue(byteOffset: number): NewInstruction<[number]> {
    return new PopAndJumpOnTrueInstruction([byteOffset]);
  },
  popAndJumpOnFalse(byteOffset: number): NewInstruction<[number]> {
    return new PopAndJumpOnFalseInstruction([byteOffset]);
  },
};
