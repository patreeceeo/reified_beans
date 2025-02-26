import { describe, expect, test } from "vitest";
import {
  type Instruction,
  instPushSpecialVal,
  instReturnSpecialVal,
  instPush,
  instStore,
  instPopAndStore,
  instSendLiteralSelectorExt,
  instPop,
  instDuplicate,
  instJump,
  instPopAndJumpOnTrue,
  instPopAndJumpOnFalse,
  reifyInstruction,
  InstructionPointer,
  jumpRelative,
} from "./instructions";
import { VirtualMachine } from "./virtual_machine";
import {
  reifySpecialPushValue,
  reifySpecialReturnValue,
  SpecialPushValue,
  SpecialReturnValue,
} from "./special_value";
import { loadContextValue, ContextValue, ContextVariable } from "./contexts";
import {
  runtimeTypeNotNil,
  runtimeTypePositiveNumber,
} from "./runtime_type_checks";

const array = new ArrayBuffer(4);
const pointer = new InstructionPointer(array, 0, 4);

function fillInstructionBuffer(
  pointer: InstructionPointer,
  byteLength: number,
) {
  for (let i = 0; i < byteLength / 2; i++) {
    instPop.writeWith(pointer);
  }
}

const additionalTests = {
  // [instPopAndStoreReceiverVar.type]: ([receiverVarOffset]: Parameters<typeof instPopAndStoreReceiverVar.explain>) => {
  //   test("Do it successfully", () => {
  //     const vm = new VirtualMachine();
  //     const receiver = vm.asLiteral("receiver");
  //     const context = new ClosureContext(receiver, new Closure(0, 0, 0, vm));
  //     const value = vm.asLiteral("value");
  //     context.evalStack.push(value);
  //     vm.contextStack.push(context);

  //     instPopAndStoreReceiverVar.do(vm, receiverVarOffset);

  //     expect(receiver.getVar(receiverVarOffset)).toBe(value);
  //     expect(context.evalStack.length).toBe(0);
  //   });

  //   test("Fail if the contextStack is empty", () => {
  //     const vm = new VirtualMachine();
  //     expect(() => instPopAndStoreReceiverVar.do(vm, receiverVarOffset)).toThrow();
  //   })

  //   test("Fail if the evalStack is empty", () => {
  //     const vm = new VirtualMachine();
  //     const receiver = vm.asLiteral("receiver");
  //     const context = new ClosureContext(receiver, new Closure(0, 0, 0, vm));
  //     vm.contextStack.push(context);
  //     expect(() => instPopAndStoreReceiverVar.do(vm, receiverVarOffset)).toThrow();
  //   });
  // },

  // [instPopAndStoreTempVar.type]: ([tempVarOffset]: Parameters<typeof instPopAndStore.explain>) => {
  //   test("Do it successfully", () => {
  //     const vm = new VirtualMachine();
  //     const receiver = vm.asLiteral("receiver");
  //     const context = new ClosureContext(receiver, new Closure(0, 4, 0, vm));
  //     const value = vm.asLiteral("value");
  //     context.evalStack.push(value);
  //     vm.contextStack.push(context);
  //     instPopAndStoreTempVar.do(vm, tempVarOffset);
  //     expect(context.argsAndTemps.at(tempVarOffset)).toBe(value);
  //     expect(context.evalStack.length).toBe(0);
  //   });

  //   test("Fail if the contextStack is empty", () => {
  //     const vm = new VirtualMachine();
  //     expect(() => instPopAndStoreTempVar.do(vm, 0)).toThrow();
  //   });

  //   test("Fail if the evalStack is empty", () => {
  //     const vm = new VirtualMachine();
  //     const receiver = vm.asLiteral("receiver");
  //     const context = new ClosureContext(receiver, new Closure(0, 1, 0, vm));
  //     vm.contextStack.push(context);
  //     expect(() => instPopAndStoreTempVar.do(vm, 0)).toThrow();
  //   });
  // },

  [instPushSpecialVal.type]: (
    inst: typeof instPushSpecialVal,
    [specialValueId]: Parameters<typeof instPushSpecialVal.explain>,
  ) => {
    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const receiver = vm.asLiteral(undefined);
      const context = vm.invokeAsMethod(receiver, vm.createClosure());

      inst.do(vm, specialValueId);

      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);
      expect(evalStack.stackTop).toBe(
        reifySpecialPushValue(specialValueId, vm),
      );
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm, specialValueId)).toThrow();
    });
  },

  [instReturnSpecialVal.type]: (
    inst: typeof instReturnSpecialVal,
    [specialValueId]: Parameters<typeof instReturnSpecialVal.explain>,
  ) => {
    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const context1 = vm.invokeAsMethod(
        vm.asLiteral(true),
        vm.createClosure(),
      );
      vm.invokeAsMethod(vm.asLiteral(true), vm.createClosure());

      inst.do(vm, specialValueId);

      const evalStack = context1.readVarWithName(
        "evalStack",
        runtimeTypeNotNil,
      );
      expect(evalStack.stackTop).toBe(
        reifySpecialReturnValue(specialValueId, vm),
      );
      expect(vm.contextStack.length).toBe(1);
      expect(vm.contextStack.peek()).toBe(context1);
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm, specialValueId)).toThrow();
    });

    test("Fail if there's only one context", () => {
      const vm = new VirtualMachine();
      vm.invokeAsMethod(vm.asLiteral(undefined), vm.createClosure());
      expect(() => inst.do(vm, specialValueId)).toThrow();
    });
  },

  [instPush.type]: (
    inst: typeof instPush,
    [source, offset]: Parameters<typeof instPush.explain>,
  ) => {
    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        literals: [0, 0, 0, 0],
      });
      vm.initializeClass("TestObject", "Object", ["foo", "bar", "baz"]);
      const context = vm.invokeAsMethod(vm.createObject("TestObject"), closure);
      const literals = closure.readVarWithName("literals", runtimeTypeNotNil);
      const argsAndTemps = context.readVarWithName(
        "argsAndTemps",
        runtimeTypeNotNil,
      );
      const receiver = context.readVarWithName("receiver", runtimeTypeNotNil);
      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);

      literals.setIndex(3, vm.asLiteral("Object"));
      argsAndTemps.setIndex(3, vm.asLiteral(42));
      receiver.setVar(2, vm.asLiteral(true));
      const value = loadContextValue(source, offset, vm);
      inst.do(vm, source, offset);
      expect(evalStack.stackTop).toBe(value);
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm, source, offset)).toThrow();
    });

    test("Fail if the closure or context is lacking the specified value", () => {
      const vm = new VirtualMachine();
      const emptyClosure = vm.createClosure();

      vm.invokeAsMethod(vm.asLiteral(undefined), emptyClosure);

      expect(() => inst.do(vm, source, offset)).toThrow();
    });
  },

  [instStore.type]: (
    inst: typeof instStore,
    [target, offset]: Parameters<typeof instStore.explain>,
  ) => {
    const vm = new VirtualMachine();
    const closure = vm.createClosure({
      tempCount: 4,
      literals: [0, 0, 0, 0],
    });
    vm.initializeClass("TestObject", "Object", ["foo", "bar", "baz"]);
    const vTestObject = vm.createObject("TestObject");
    const context = vm.invokeAsMethod(vTestObject, closure);
    const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);

    const emptyClosure = vm.createClosure();

    const literals = closure.readVarWithName("literals", runtimeTypeNotNil);

    evalStack.stackPush(vm.asLiteral("value"));
    literals.setIndex(3, vm.asLiteral("Object"));

    const argsAndTemps = context.readVarWithName(
      "argsAndTemps",
      runtimeTypeNotNil,
    );
    argsAndTemps.setIndex(3, vm.asLiteral(42));
    const receiver = context.readVarWithName("receiver", runtimeTypeNotNil);
    receiver.setVar(2, vm.asLiteral(true));

    test("Do it successfully", () => {
      inst.do(vm, target, offset);
      expect(evalStack.stackTop).toBe(loadContextValue(target, offset, vm));
    });

    test("Fail if the contextStack is empty", () => {
      const vmt = new VirtualMachine();
      expect(() => inst.do(vmt, target, offset)).toThrow();
    });

    test("Fail if the evalStack is empty", () => {
      vm.invokeAsMethod(vm.asLiteral(undefined), emptyClosure);
      expect(() => inst.do(vm, target, offset)).toThrow();
    });

    test("Fail if the closure or context is lacking the specified variable", () => {
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), emptyClosure);

      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);
      evalStack.stackPush(vm.asLiteral("value"));
      expect(() => inst.do(vm, target, offset)).toThrow();
    });
  },

  [instPopAndStore.type]: (
    inst: typeof instPopAndStore,
    [target, offset]: Parameters<typeof instPopAndStore.explain>,
  ) => {
    const vm = new VirtualMachine();
    const closure = vm.createClosure({
      tempCount: 4,
      literals: [0, 0, 0, 0],
    });
    vm.initializeClass("TestObject", "Object", ["foo", "bar", "baz"]);
    const receiver = vm.createObject("TestObject");
    const context = vm.invokeAsMethod(receiver, closure);
    const pushedValue = vm.asLiteral("value");
    const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);

    const literals = closure.readVarWithName("literals", runtimeTypeNotNil);

    evalStack.stackPush(pushedValue);
    literals.setIndex(3, vm.asLiteral("Object"));

    const argsAndTemps = context.readVarWithName(
      "argsAndTemps",
      runtimeTypeNotNil,
    );
    argsAndTemps.setIndex(3, vm.asLiteral(42));
    receiver.setVar(2, vm.asLiteral(true));

    test("Do it successfully", () => {
      inst.do(vm, target, offset);
      expect(loadContextValue(target, offset, vm)).toBe(pushedValue);
      expect(evalStack.stackDepth).toBe(0);
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm, target, offset)).toThrow();
    });

    test("Fail if the closure or context is lacking the specified variable", () => {
      const emptyClosure = vm.createClosure();
      const emptyContext = vm.invokeAsMethod(receiver, emptyClosure);

      const evalStack = emptyContext.readVarWithName(
        "evalStack",
        runtimeTypeNotNil,
      );
      evalStack.stackPush(pushedValue);
      vm.contextStack.push(emptyContext);
      expect(() => inst.do(vm, target, offset)).toThrow();
    });
  },

  [instSendLiteralSelectorExt.type]: (
    inst: typeof instSendLiteralSelectorExt,
    [selectorId, numArgs]: Parameters<
      typeof instSendLiteralSelectorExt.explain
    >,
  ) => {
    const vm = new VirtualMachine();
    const closure = vm.createClosure({
      tempCount: 4,
      literals: [0, 0],
    });
    const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
    const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);

    const testSelectors = ["+", "-"];

    const literals = closure.readVarWithName("literals", runtimeTypeNotNil);
    for (const [index, selector] of testSelectors.entries()) {
      literals.setIndex(index, vm.asLiteral(selector));
    }

    test("Do it successfully", () => {
      evalStack.stackPush(vm.asLiteral(2));
      evalStack.stackPush(vm.asLiteral(3));

      inst.do(vm, selectorId, numArgs);

      expect(evalStack.stackDepth).toBe(1);
      const result = evalStack.stackTop!;
      expect(typeof result.primitiveValue).toBe("number");
      const primativeResult = result.primitiveValue as number;
      switch (testSelectors[selectorId]) {
        case "+":
          expect(primativeResult).toBe(5);
          break;
        case "-":
          expect(primativeResult).toBe(1);
          break;
      }
    });

    test("Fail if the number of args is too big", () => {
      evalStack.stackPush(vm.asLiteral(2));
      evalStack.stackPush(vm.asLiteral(3));

      expect(() => inst.do(vm, selectorId, numArgs + 1)).toThrow();
    });

    test("Fail if the number of args is too small", () => {
      evalStack.stackPush(vm.asLiteral(2));
      evalStack.stackPush(vm.asLiteral(3));

      expect(() => inst.do(vm, selectorId, numArgs - 1)).toThrow();
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm, selectorId, numArgs)).toThrow();
    });
  },

  [instPop.type]: (inst: typeof instPop) => {
    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);

      evalStack.stackPush(vm.asLiteral("value"));

      inst.do(vm);

      expect(evalStack.stackDepth).toBe(0);
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm)).toThrow();
    });

    test("Fail if the evalStack is empty", () => {
      const vm = new VirtualMachine();

      vm.invokeAsMethod(vm.asLiteral(undefined), vm.createClosure());

      expect(() => inst.do(vm)).toThrow();
    });
  },

  [instDuplicate.type]: (inst: typeof instDuplicate) => {
    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);

      evalStack.stackPush(vm.asLiteral("value"));

      inst.do(vm);

      expect(evalStack.stackDepth).toBe(2);
      expect(evalStack.stackPop()).toBe(evalStack.stackTop);
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm)).toThrow();
    });

    test("Fail if the evalStack is empty", () => {
      const vm = new VirtualMachine();

      vm.invokeAsMethod(vm.asLiteral(undefined), vm.createClosure());

      expect(() => inst.do(vm)).toThrow();
    });
  },

  [instJump.type]: (
    inst: typeof instJump,
    [offset]: Parameters<typeof instJump.explain>,
  ) => {
    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        getInstructions(pointer) {
          fillInstructionBuffer(pointer, 12);
        },
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const previousInsturctionByteOffset = context.readVarWithName(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      jumpRelative(context, 5);

      inst.do(vm, offset);

      expect(
        context.readVarWithName(
          "instructionByteIndex",
          runtimeTypePositiveNumber,
        ).primitiveValue,
      ).toBe(previousInsturctionByteOffset + 5 + offset);
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm, offset)).toThrow();
    });

    test("Fail if the offset is out of bounds", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
      });

      vm.invokeAsMethod(vm.asLiteral(undefined), closure);

      expect(() => inst.do(vm, offset)).toThrow();
    });
  },

  [instPopAndJumpOnTrue.type]: (
    inst: typeof instPopAndJumpOnTrue,
    [offset]: Parameters<typeof instPopAndJumpOnTrue.explain>,
  ) => {
    test("Do it successfully (with jump)", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        getInstructions(pointer) {
          fillInstructionBuffer(pointer, 12);
        },
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);
      const previousInsturctionByteOffset = context.readVarWithName(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      jumpRelative(context, 5);
      evalStack.stackPush(vm.asLiteral(true));

      inst.do(vm, offset);

      expect(
        context.readVarWithName(
          "instructionByteIndex",
          runtimeTypePositiveNumber,
        ).primitiveValue,
      ).toBe(previousInsturctionByteOffset + 5 + offset);
    });

    test("Do it successfully (without jump)", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        getInstructions(pointer) {
          fillInstructionBuffer(pointer, 12);
        },
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);
      const previousInsturctionByteOffset = context.readVarWithName(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      evalStack.stackPush(vm.asLiteral(false));

      inst.do(vm, offset);

      expect(
        context.readVarWithName(
          "instructionByteIndex",
          runtimeTypePositiveNumber,
        ).primitiveValue,
      ).toBe(previousInsturctionByteOffset);
    });

    test("Fail if the offset is out of bounds", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);

      evalStack.stackPush(vm.asLiteral(true));

      expect(() => inst.do(vm, offset)).toThrow();
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm, offset)).toThrow();
    });

    test("Fail if the evalStack is empty", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        getInstructions(pointer) {
          fillInstructionBuffer(pointer, 12);
        },
      });

      vm.invokeAsMethod(vm.asLiteral(undefined), closure);

      expect(() => inst.do(vm, offset)).toThrow();
    });
  },

  [instPopAndJumpOnFalse.type]: (
    inst: typeof instPopAndJumpOnFalse,
    [offset]: Parameters<typeof instPopAndJumpOnFalse.explain>,
  ) => {
    test("Do it successfully (with jump)", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        getInstructions(pointer) {
          fillInstructionBuffer(pointer, 12);
        },
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);
      const previousInsturctionByteOffset = context.readVarWithName(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      jumpRelative(context, 5);
      evalStack.stackPush(vm.asLiteral(false));

      inst.do(vm, offset);

      expect(
        context.readVarWithName(
          "instructionByteIndex",
          runtimeTypePositiveNumber,
        ).primitiveValue,
      ).toBe(previousInsturctionByteOffset + 5 + offset);
    });

    test("Do it successfully (without jump)", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        getInstructions(pointer) {
          fillInstructionBuffer(pointer, 12);
        },
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);
      const previousInsturctionByteOffset = context.readVarWithName(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      evalStack.stackPush(vm.asLiteral(true));

      inst.do(vm, offset);

      expect(
        context.readVarWithName(
          "instructionByteIndex",
          runtimeTypePositiveNumber,
        ).primitiveValue,
      ).toBe(previousInsturctionByteOffset);
    });

    test("Fail if the offset is out of bounds", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);

      evalStack.stackPush(vm.asLiteral(false));

      expect(() => inst.do(vm, offset)).toThrow();
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm, offset)).toThrow();
    });

    test("Fail if the evalStack is empty", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        getInstructions(pointer) {
          fillInstructionBuffer(pointer, 12);
        },
      });

      vm.invokeAsMethod(vm.asLiteral(undefined), closure);

      expect(() => inst.do(vm, offset)).toThrow();
    });
  },
};

function testPeekInstruction<TArgs extends any[], I extends Instruction<TArgs>>(
  instruction: I,
  args: TArgs,
) {
  pointer.reset();
  instruction.writeWith(pointer, ...args);
  pointer.reset();
  const result = reifyInstruction(pointer.peek());
  expect(result).toBe(instruction);
}

function testReadInstructionArgs<
  TArgs extends any[],
  I extends Instruction<TArgs>,
>(instruction: I, args: TArgs) {
  pointer.reset();
  instruction.writeWith(pointer, ...args);
  pointer.reset();
  const readArgsTarget = [] as any[];
  expect(instruction.readArgs(pointer, readArgsTarget)).toEqual(args);
}

function testInstruction<TArgs extends any[], I extends Instruction<TArgs>>(
  instruction: I,
  args: TArgs,
) {
  const testDescription = instruction.explain(...args);
  describe(testDescription, () => {
    test("Peek Instruction", () => {
      testPeekInstruction(instruction, args);
    });
    test("Read Instruction Args", () => {
      testReadInstructionArgs(instruction, args);
    });
    if (additionalTests[instruction.type]) {
      additionalTests[instruction.type](instruction as any, args as any);
    }
  });
}

describe("Instructions", () => {
  // testInstruction(instPopAndStoreReceiverVar, [3]);
  // testInstruction(instPopAndStoreTempVar, [3]);
  testInstruction(instPushSpecialVal, [SpecialPushValue.NegativeOne]);
  testInstruction(instReturnSpecialVal, [SpecialReturnValue.Self]);
  // testInstruction(instReturnStackTopFrom, [StackTarget.ReceiverVar, 3]);
  testInstruction(instPush, [ContextValue.ReceiverVar, 2]);
  testInstruction(instPush, [ContextValue.TempVar, 3]);
  testInstruction(instPush, [ContextValue.LiteralConst, 3]);
  testInstruction(instPush, [ContextValue.LiteralVar, 3]);
  testInstruction(instStore, [ContextVariable.ReceiverVar, 2]);
  testInstruction(instStore, [ContextVariable.LiteralVar, 3]);
  testInstruction(instStore, [ContextVariable.TempVar, 3]);
  testInstruction(instPopAndStore, [ContextVariable.LiteralVar, 3]);
  // (TODO:testing) test a non-primitive method
  testInstruction(instSendLiteralSelectorExt, [0, 1]);
  testInstruction(instSendLiteralSelectorExt, [1, 1]);
  // testInstruction(instSuperSendLiteralSelectorExt, [12, 4]);
  testInstruction(instPop, []);
  testInstruction(instDuplicate, []);
  testInstruction(instJump, [5]);
  testInstruction(instJump, [-5]);
  testInstruction(instPopAndJumpOnTrue, [5]);
  testInstruction(instPopAndJumpOnTrue, [-5]);
  testInstruction(instPopAndJumpOnFalse, [5]);
  testInstruction(instPopAndJumpOnFalse, [-5]);
});
