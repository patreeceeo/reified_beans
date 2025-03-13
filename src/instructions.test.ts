import { describe, expect, test } from "vitest";
import {
  reifySpecialPushValue,
  reifySpecialReturnValue,
  SpecialPushValue,
  SpecialReturnValue,
} from "./special_value";
import { ContextValue, ContextVariable, loadContextValue } from "./contexts";
import { instruction, type Instruction } from "./instructions";
import type { Dict } from "./generics";
import { VirtualMachine } from "./virtual_machine";
import {
  runtimeTypeNotNil,
  runtimeTypePositiveNumber,
} from "./runtime_type_checks";
import { jumpRelative } from "./jump";
import { invokeEmptyMethodOnLiteral } from "./test_helpers";

const instructionTests: Dict<(instruction: Instruction<any>) => void> = {
  PushSpecialValueInstruction: (inst) => {
    const [specialValueId] = inst.args;

    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const context = invokeEmptyMethodOnLiteral(vm, true);

      inst.do(vm);

      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);
      expect(evalStack.stackTop).toBe(
        reifySpecialPushValue(specialValueId, vm),
      );
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm)).toThrow();
    });
  },
  ReturnSpecialValueInstruction: (inst) => {
    const [specialValueId] = inst.args;

    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const context = invokeEmptyMethodOnLiteral(vm, true);
      invokeEmptyMethodOnLiteral(vm, true);

      inst.do(vm);

      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);
      expect(evalStack.stackTop).toBe(
        reifySpecialReturnValue(specialValueId, vm),
      );
      expect(vm.contextStack.length).toBe(1);
      expect(vm.contextStack.peek()).toBe(context);
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm)).toThrow();
    });
  },
  PushInstruction: (inst) => {
    const [contextValue, index] = inst.args;

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
      const value = loadContextValue(contextValue, index, vm);

      inst.do(vm);

      expect(evalStack.stackTop).toBe(value);
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm)).toThrow();
    });

    test("Fail if the closure or context is lacking the specified value", () => {
      const vm = new VirtualMachine();
      const emptyClosure = vm.createClosure();

      vm.invokeAsMethod(vm.asLiteral(undefined), emptyClosure);

      expect(() => inst.do(vm)).toThrow();
    });
  },
  StoreInstruction: (inst) => {
    const [target, offset] = inst.args;
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
      inst.do(vm);
      expect(evalStack.stackTop).toBe(loadContextValue(target, offset, vm));
    });

    test("Fail if the contextStack is empty", () => {
      const vmt = new VirtualMachine();
      expect(() => inst.do(vmt)).toThrow();
    });

    test("Fail if the evalStack is empty", () => {
      vm.invokeAsMethod(vm.asLiteral(undefined), emptyClosure);
      expect(() => inst.do(vm)).toThrow();
    });

    test("Fail if the closure or context is lacking the specified variable", () => {
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), emptyClosure);

      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);
      evalStack.stackPush(vm.asLiteral("value"));
      expect(() => inst.do(vm)).toThrow();
    });
  },
  PopAndStoreInstruction: (inst) => {
    const [target, offset] = inst.args;
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
      inst.do(vm);
      expect(loadContextValue(target, offset, vm)).toBe(pushedValue);
      expect(evalStack.stackDepth).toBe(0);
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm)).toThrow();
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
      expect(() => inst.do(vm)).toThrow();
    });
  },
  SendLiteralSelectorExtendedInstruction: (inst) => {
    const [selectorId] = inst.args;
    const testSelectors = ["+", "-"];

    function createVM() {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        literals: [0, 0],
      });
      vm.invokeAsMethod(vm.asLiteral(undefined), closure);

      const literals = closure.readVarWithName("literals", runtimeTypeNotNil);
      for (const [index, selector] of testSelectors.entries()) {
        literals.setIndex(index, vm.asLiteral(selector));
      }
      return vm;
    }

    test("Do it successfully", () => {
      const vm = createVM();
      vm.evalStack.stackPush(vm.asLiteral(2));
      vm.evalStack.stackPush(vm.asLiteral(3));

      inst.do(vm);

      expect(vm.evalStack.stackDepth).toBe(1);
      const result = vm.evalStack.stackTop!;
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
      const vm = createVM();
      vm.evalStack.stackPush(vm.asLiteral(2));

      expect(() => inst.do(vm)).toThrow();
    });

    // TODO test that it verifies that the method consumed the correct number of arguments

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm)).toThrow();
    });
  },
  PopInstruction: (inst) => {
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

      invokeEmptyMethodOnLiteral(vm, undefined);

      expect(() => inst.do(vm)).toThrow();
    });
  },
  DuplicateInstruction: (inst) => {
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
  JumpInstruction: (inst) => {
    const [offset] = inst.args;
    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        instructions: new Array(12).fill(null).map(() => instruction.pop()),
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const previousInsturctionByteOffset = context.readVarWithName(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      jumpRelative(context, 5);

      inst.do(vm);

      expect(
        context.readVarWithName(
          "instructionByteIndex",
          runtimeTypePositiveNumber,
        ).primitiveValue,
      ).toBe(previousInsturctionByteOffset + 5 + offset);
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm)).toThrow();
    });

    test("Fail if the offset is out of bounds", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
      });

      vm.invokeAsMethod(vm.asLiteral(undefined), closure);

      expect(() => inst.do(vm)).toThrow();
    });
  },
  PopAndJumpOnTrueInstruction: (inst) => {
    const [offset] = inst.args;
    test("Do it successfully (with jump)", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        instructions: new Array(12).fill(null).map(() => instruction.pop()),
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const previousInsturctionByteOffset = context.readVarWithName(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      jumpRelative(context, 5);
      vm.evalStack.stackPush(vm.asLiteral(true));

      inst.do(vm);

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
        instructions: new Array(12).fill(null).map(() => instruction.pop()),
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);
      const previousInsturctionByteOffset = context.readVarWithName(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      evalStack.stackPush(vm.asLiteral(false));

      inst.do(vm);

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

      expect(() => inst.do(vm)).toThrow();
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm)).toThrow();
    });

    test("Fail if the evalStack is empty", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        instructions: new Array(12).fill(null).map(() => instruction.pop()),
      });

      vm.invokeAsMethod(vm.asLiteral(undefined), closure);

      expect(() => inst.do(vm)).toThrow();
    });
  },
  PopAndJumpOnFalseInstruction: (inst) => {
    const [offset] = inst.args;
    test("Do it successfully (with jump)", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        instructions: new Array(12).fill(null).map(() => instruction.pop()),
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);
      const previousInsturctionByteOffset = context.readVarWithName(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      jumpRelative(context, 5);
      evalStack.stackPush(vm.asLiteral(false));

      inst.do(vm);

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
        instructions: new Array(12).fill(null).map(() => instruction.pop()),
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);
      const previousInsturctionByteOffset = context.readVarWithName(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      evalStack.stackPush(vm.asLiteral(true));

      inst.do(vm);

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

      expect(() => inst.do(vm)).toThrow();
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm)).toThrow();
    });

    test("Fail if the evalStack is empty", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        instructions: new Array(12).fill(null).map(() => instruction.pop()),
      });

      vm.invokeAsMethod(vm.asLiteral(undefined), closure);

      expect(() => inst.do(vm)).toThrow();
    });
  },
};

function testInstruction<I extends Instruction<any>>(instruction: I) {
  const testDescription = instruction.explain();
  if (instructionTests[instruction.constructor.name]) {
    describe(testDescription, () => {
      instructionTests[instruction.constructor.name](instruction);
    });
  } else {
    // TODO throw an error
  }
}

describe("Instructions", () => {
  testInstruction(instruction.pushSpecialValue(SpecialPushValue.NegativeOne));
  testInstruction(instruction.returnSpecialValue(SpecialReturnValue.Self));
  testInstruction(instruction.push(ContextValue.ReceiverVar, 2));
  testInstruction(instruction.push(ContextValue.TempVar, 3));
  testInstruction(instruction.push(ContextValue.LiteralConst, 3));
  testInstruction(instruction.push(ContextValue.LiteralVar, 3));
  testInstruction(instruction.store(ContextVariable.ReceiverVar, 2));
  testInstruction(instruction.store(ContextVariable.LiteralVar, 3));
  testInstruction(instruction.store(ContextVariable.TempVar, 3));
  testInstruction(instruction.popAndStore(ContextVariable.LiteralVar, 3));
  // (TODO:testing) test a non-primitive method
  testInstruction(instruction.sendLiteralSelectorExtended(0, 1));
  testInstruction(instruction.sendLiteralSelectorExtended(1, 1));
  testInstruction(instruction.pop());
  testInstruction(instruction.duplicate());
  testInstruction(instruction.jump(5));
  testInstruction(instruction.jump(-5));
  testInstruction(instruction.popAndJumpOnTrue(5));
  testInstruction(instruction.popAndJumpOnTrue(-5));
  testInstruction(instruction.popAndJumpOnFalse(5));
  testInstruction(instruction.popAndJumpOnFalse(-5));
});
