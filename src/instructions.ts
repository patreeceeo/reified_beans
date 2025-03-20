import {
  ContextValue,
  ContextVariable,
  getVarFromContextReceiver,
  loadContextValue,
  setVarInContextReceiver,
  storeContextValue,
} from "./contexts";
import { invariant, StackUnderflowError } from "./errors";
import { jumpRelative } from "./jump";
import { runtimeTypeNotNil } from "./runtime_type_checks";
import {
  reifySpecialPushValue,
  reifySpecialReturnValue,
  SpecialPushValue,
  SpecialReturnValue,
} from "./special_value";
import type { VirtualMachine } from "./virtual_machine";
import type { AnyPrimitiveJsValue } from "./virtual_objects";

export abstract class Instruction<Params extends AnyPrimitiveJsValue[]> {
  abstract type: keyof typeof instruction;
  constructor(readonly args: Params) {}
  abstract explain(): string;
  abstract do(vm: VirtualMachine): void;
}

class PushSpecialValueInstruction extends Instruction<[SpecialPushValue]> {
  type = "pushSpecialValue" as const;
  explain() {
    return `Push special value ${SpecialPushValue[this.args[0]]}`;
  }
  do(vm: VirtualMachine) {
    const object = reifySpecialPushValue(this.args[0], vm);
    const context = vm.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);
    evalStack.stackPush(object);
  }
}

class ReturnSpecialValueInstruction extends Instruction<[SpecialReturnValue]> {
  type = "returnSpecialValue" as const;
  explain() {
    return `Return special value ${SpecialPushValue[this.args[0]]}`;
  }
  do(vm: VirtualMachine) {
    const object = reifySpecialReturnValue(this.args[0], vm);
    vm.contextStack.pop();
    vm.evalStack.stackPush(object);
  }
}

class PushInstruction extends Instruction<[ContextValue, number]> {
  type = "push" as const;
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

class PushImmediateInstruction extends Instruction<[AnyPrimitiveJsValue]> {
  type = "pushImmediate" as const;
  explain() {
    return `Push immediate value ${this.args[0]} on to the evaluation stack`;
  }
  do(vm: VirtualMachine) {
    vm.evalStack.stackPush(vm.asLiteral(this.args[0]));
  }
}

class PushReceiverVariableInstruction extends Instruction<[string]> {
  type = "pushReceiverVariable" as const;
  explain() {
    return `Push receiver variable onto the evaluation stack`;
  }
  do(vm: VirtualMachine) {
    const [varName] = this.args;
    const context = vm.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const object = getVarFromContextReceiver(context, varName);
    vm.evalStack.stackPush(object);
  }
}

class StoreInstruction extends Instruction<[ContextVariable, number, boolean]> {
  type = "store" as const;
  explain() {
    const [source, offset, andPop] = this.args;
    return `${andPop ? "Pop and store" : "Store"} in ${ContextVariable[source]} at offset ${offset}`;
  }
  do(vm: VirtualMachine) {
    const [source, offset, andPop] = this.args;
    const object = andPop ? vm.evalStack.stackPop() : vm.evalStack.stackTop;
    invariant(object, StackUnderflowError, "evaluation");
    storeContextValue(source, offset, vm, object);
  }
}

class StoreInReceiverVariableInstruction extends Instruction<
  [string, boolean]
> {
  type = "storeInReceiverVariable" as const;
  explain() {
    const [varName, andPop] = this.args;
    return `${andPop ? "Pop and store" : "Store"} in receiver variable ${varName}`;
  }
  do(vm: VirtualMachine) {
    const { contextStack, evalStack } = vm;
    const [varName, andPop] = this.args;
    const context = contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const object = andPop ? evalStack.stackPop() : evalStack.stackTop;
    invariant(object, StackUnderflowError, "evaluation");
    setVarInContextReceiver(context, varName, object);
  }
}

class SendSelectorInstruction extends Instruction<[string, number]> {
  type = "sendSelector" as const;
  explain() {
    const [selector, argumentCount] = this.args;
    return `Send #${selector} with ${argumentCount} arguments`;
  }
  do(vm: VirtualMachine) {
    const [selector, numArgs] = this.args;
    const context = vm.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const initialStackDepth = vm.evalStack.stackDepth;
    invariant(
      initialStackDepth >= numArgs + 1,
      StackUnderflowError,
      "evaluation",
    );

    vm.send(selector);
  }
}

class PopInstruction extends Instruction<[]> {
  type = "pop" as const;
  explain() {
    return "Pop evaluation stack";
  }
  do(vm: VirtualMachine) {
    invariant(vm.evalStack.stackDepth > 0, StackUnderflowError, "evaluation");
    vm.evalStack.stackPop();
  }
}

class DuplicateInstruction extends Instruction<[]> {
  type = "duplicate" as const;
  explain() {
    return "Duplicate top of evaluation stack";
  }
  do(vm: VirtualMachine) {
    const object = vm.evalStack.stackTop;
    invariant(object, StackUnderflowError, "evaluation");
    vm.evalStack.stackPush(object);
  }
}

class JumpInstruction extends Instruction<[number]> {
  type = "jump" as const;
  explain() {
    return `Jump to instruction at index ${this.args[0]}`;
  }
  do(vm: VirtualMachine) {
    const context = vm.contextStack.peek();
    const [offset] = this.args;
    invariant(context, StackUnderflowError, "context");
    jumpRelative(context, offset, vm);
  }
}

class PopAndJumpOnTrueInstruction extends Instruction<[number]> {
  type = "popAndJumpOnTrue" as const;
  explain() {
    return `Pop and jump on true to instruction at index ${this.args[0]}`;
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

class PopAndJumpOnFalseInstruction extends Instruction<[number]> {
  type = "popAndJumpOnFalse" as const;
  explain() {
    return `Pop and jump on false to instruction at index ${this.args[0]}`;
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

class NoopInstruction extends Instruction<[]> {
  type = "noop" as const;
  explain() {
    return "No operation";
  }
  do(_vm: VirtualMachine) {}
}

export const instruction = {
  /**
   * Push a special value onto the eval stack
   *
   * TODO deprecate in favor of pushImmediate?
   * @param value The special value to Push
   * @see SpecialPushValue
   */
  pushSpecialValue(value: SpecialPushValue): Instruction<[SpecialPushValue]> {
    return new PushSpecialValueInstruction([value]);
  },

  /**
   * Return a special Value
   * @param value The special value to return
   * @see SpecialReturnValue
   */
  returnSpecialValue(
    value: SpecialReturnValue,
  ): Instruction<[SpecialReturnValue]> {
    return new ReturnSpecialValueInstruction([value]);
  },

  /**
   * Push an object onto the eval stack
   *
   * TODO deprecate in favor of instructions that push objects from specific sources?
   * The motivation would be to allow instructions to use object variable names directly instead of using an index.
   * Then the instruction could be more explicit about what it's doing and the virtual object implementation could be simplified.
   *
   * @param source The source of the object to push
   * @param offset The offset from the source
   * @see ContextValue
   */
  push(
    source: ContextValue,
    offset: number,
  ): Instruction<[ContextValue, number]> {
    return new PushInstruction([source, offset]);
  },

  /**
   * Push an immediate value onto the eval stack.
   *
   * This is an optimization both in terms of runtime and developer cycles. It saves the runtime from having to pull a number or string out of the literals array and it saves the developer from having to make sure the desired string or number is in the literals array.
   * @param value The value to push
   */
  pushImmediate(
    value: AnyPrimitiveJsValue,
  ): Instruction<[AnyPrimitiveJsValue]> {
    return new PushImmediateInstruction([value]);
  },

  pushReceiverVariable(varName: string) {
    return new PushReceiverVariableInstruction([varName]);
  },

  /**
   * Store the object on the top of the stack in the indicated location
   * @param target The target of the Store instruction
   * @param offset The offset from the target
   * @see ContextVariable
   */
  store(source: ContextVariable, offset: number, andPop = false) {
    return new StoreInstruction([source, offset, andPop]);
  },

  /**
   * Store the object on the top of the stack in the indicated variable in the receiver
   * @param varName The name of the variable in the receiver
   */
  storeInReceiverVariable(varName: string, andPop = false) {
    return new StoreInReceiverVariableInstruction([varName, andPop]);
  },

  /**
   * Send a message using a selector with the given number of arguments.
   * The receiver is taken off the stack, followed by the arguments.
   * @param selector The index of the literal selector found in the method's literal array
   * @param numArgs The number of arguments to the message
   */
  sendSelector(
    selector: string,
    argumentCount: number,
  ): Instruction<[string, number]> {
    return new SendSelectorInstruction([selector, argumentCount]);
  },

  /**
   * Pop the object from the top of the Stack
   */
  pop(): Instruction<[]> {
    return new PopInstruction([]);
  },

  /**
   * Duplicate the object on the top of the Stack
   */
  duplicate(): Instruction<[]> {
    return new DuplicateInstruction([]);
  },

  /**
   * Jump the given number of bytes, unconditionally.
   */
  jump(byteOffset: number): Instruction<[number]> {
    return new JumpInstruction([byteOffset]);
  },

  /**
   * If the object on the top of the Stack is True, pop it and jump the given number of bytes.
   * Otherwise, continue to the next instruction.
   * @param offset The number of instructions to jump, can be negative.
   */
  popAndJumpOnTrue(byteOffset: number): Instruction<[number]> {
    return new PopAndJumpOnTrueInstruction([byteOffset]);
  },

  /**
   * If the object on the top of the Stack is False, pop it and jump the given number of bytes.
   * Otherwise, continue to the next instruction.
   * @param offset The number of bytes to jump, can be negative.
   */
  popAndJumpOnFalse(byteOffset: number): Instruction<[number]> {
    return new PopAndJumpOnFalseInstruction([byteOffset]);
  },

  /**
   * No operation, does nothing.
   */
  noop(): Instruction<[]> {
    return new NoopInstruction([]);
  },
};
