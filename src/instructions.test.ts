import { describe, expect, test } from "vitest";
import {
  reifySpecialPushValue,
  reifySpecialReturnValue,
  SpecialPushValue,
  SpecialReturnValue,
} from "./special_value";
import { ContextValue, ContextVariable, loadContextValue } from "./contexts";
import { instruction, type Instruction } from "./instructions";
import { VirtualMachine } from "./virtual_machine";
import {
  runtimeTypeNotNil,
  runtimeTypePositiveNumber,
} from "./runtime_type_checks";
import { jumpRelative } from "./jump";
import { invokeEmptyMethodOnLiteral } from "./test_helpers";
import { raise } from "./errors";

const instructionTests: Record<
  keyof typeof instruction,
  (instruction: Instruction<any>) => void
> = {
  pushSpecialValue: (inst) => {
    const [specialValueId] = inst.args;

    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const context = invokeEmptyMethodOnLiteral(vm, true);

      inst.do(vm);

      const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);
      expect(evalStack.stackTop).toBe(
        reifySpecialPushValue(specialValueId, vm),
      );
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm)).toThrow();
    });
  },
  returnSpecialValue: (inst) => {
    const [specialValueId] = inst.args;

    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const context = invokeEmptyMethodOnLiteral(vm, true);
      invokeEmptyMethodOnLiteral(vm, true);

      inst.do(vm);

      const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);
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
  push: (inst) => {
    const [contextValue, index] = inst.args;

    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        literals: [0, 0, 0, 0],
      });
      vm.initializeClass("TestObject", "Object", ["foo", "bar", "baz"]);
      const context = vm.invokeAsMethod(vm.createObject("TestObject"), closure);
      const literals = closure.readNamedVar("literals", runtimeTypeNotNil);
      const argsAndTemps = context.readNamedVar(
        "argsAndTemps",
        runtimeTypeNotNil,
      );
      const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);

      literals.writeIndexedVar(3, vm.asLiteral("Object"));
      argsAndTemps.writeIndexedVar(3, vm.asLiteral(42));
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
  pushImmediate: (inst) => {
    const [value] = inst.args;

    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);

      inst.do(vm);

      expect(evalStack.stackTop).toBe(vm.asLiteral(value));
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm)).toThrow();
    });
  },
  pushReceiverVariable: (inst) => {
    const [varName] = inst.args;

    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
      });
      vm.initializeClass("TestObject", "Object", ["foo", "bar", "baz"]);
      const receiver = vm.createObject("TestObject");
      const context = vm.invokeAsMethod(receiver, closure);
      const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);

      receiver.writeNamedVar(varName, vm.asLiteral(true));

      inst.do(vm);

      expect(evalStack.stackTop!.id).toBe(receiver.readNamedVar(varName).id);
    });

    test("Fail if the contextStack is empty", () => {
      const vm = new VirtualMachine();
      expect(() => inst.do(vm)).toThrow();
    });
  },
  store: (inst) => {
    const [target, offset, andPop] = inst.args;
    const vm = new VirtualMachine();
    const closure = vm.createClosure({
      tempCount: 4,
      literals: [0, 0, 0, 0],
    });
    vm.initializeClass("TestObject", "Object", ["foo", "bar", "baz"]);
    const vTestObject = vm.createObject("TestObject");
    const context = vm.invokeAsMethod(vTestObject, closure);
    const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);

    const emptyClosure = vm.createClosure();

    const literals = closure.readNamedVar("literals", runtimeTypeNotNil);
    const stackTop = vm.asLiteral("value");

    evalStack.stackPush(stackTop);
    literals.writeIndexedVar(3, vm.asLiteral("Object"));

    const argsAndTemps = context.readNamedVar(
      "argsAndTemps",
      runtimeTypeNotNil,
    );
    argsAndTemps.writeIndexedVar(3, vm.asLiteral(42));

    test("Do it successfully", () => {
      inst.do(vm);
      expect(stackTop).toBe(loadContextValue(target, offset, vm));
      if (andPop) {
        expect(evalStack.stackDepth).toBe(0);
      }
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

      const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);
      evalStack.stackPush(vm.asLiteral("value"));
      expect(() => inst.do(vm)).toThrow();
    });
  },
  storeInReceiverVariable: (inst) => {
    const [varName, andPop] = inst.args;
    const vm = new VirtualMachine();
    const closure = vm.createClosure({
      tempCount: 4,
      literals: [0, 0, 0, 0],
    });
    vm.initializeClass("TestObject", "Object", ["foo", "bar", "baz"]);
    const vTestObject = vm.createObject("TestObject");
    const context = vm.invokeAsMethod(vTestObject, closure);
    const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);

    const emptyClosure = vm.createClosure();

    const stackTop = vm.asLiteral("value");
    evalStack.stackPush(stackTop);

    const receiver = context.readNamedVar("receiver", runtimeTypeNotNil);

    test("Do it successfully", () => {
      inst.do(vm);
      expect(receiver.readNamedVar(varName)).toBe(stackTop);
      if (andPop) {
        expect(evalStack.stackDepth).toBe(0);
      }
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

      const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);
      evalStack.stackPush(vm.asLiteral("value"));
      expect(() => inst.do(vm)).toThrow();
    });
  },
  sendSelector: (inst) => {
    const [selector] = inst.args;

    function createVM() {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
      });
      vm.invokeAsMethod(vm.asLiteral(undefined), closure);

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
      switch (selector) {
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
  pop: (inst) => {
    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);

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
  duplicate: (inst) => {
    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);

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
  jump: (inst) => {
    const [offset] = inst.args;
    test("Do it successfully", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        instructions: new Array(12).fill(null).map(() => instruction.pop()),
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const previousInsturctionByteOffset = context.readNamedVar(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      jumpRelative(context, 5);

      inst.do(vm);

      expect(
        context.readNamedVar("instructionByteIndex", runtimeTypePositiveNumber)
          .primitiveValue,
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
  popAndJumpOnTrue: (inst) => {
    const [offset] = inst.args;
    test("Do it successfully (with jump)", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        instructions: new Array(12).fill(null).map(() => instruction.pop()),
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const previousInsturctionByteOffset = context.readNamedVar(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      jumpRelative(context, 5);
      vm.evalStack.stackPush(vm.asLiteral(true));

      inst.do(vm);

      expect(
        context.readNamedVar("instructionByteIndex", runtimeTypePositiveNumber)
          .primitiveValue,
      ).toBe(previousInsturctionByteOffset + 5 + offset);
    });

    test("Do it successfully (without jump)", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        instructions: new Array(12).fill(null).map(() => instruction.pop()),
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);
      const previousInsturctionByteOffset = context.readNamedVar(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      evalStack.stackPush(vm.asLiteral(false));

      inst.do(vm);

      expect(
        context.readNamedVar("instructionByteIndex", runtimeTypePositiveNumber)
          .primitiveValue,
      ).toBe(previousInsturctionByteOffset);
    });

    test("Fail if the offset is out of bounds", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);

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
  popAndJumpOnFalse: (inst) => {
    const [offset] = inst.args;
    test("Do it successfully (with jump)", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        instructions: new Array(12).fill(null).map(() => instruction.pop()),
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);
      const previousInsturctionByteOffset = context.readNamedVar(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      jumpRelative(context, 5);
      evalStack.stackPush(vm.asLiteral(false));

      inst.do(vm);

      expect(
        context.readNamedVar("instructionByteIndex", runtimeTypePositiveNumber)
          .primitiveValue,
      ).toBe(previousInsturctionByteOffset + 5 + offset);
    });

    test("Do it successfully (without jump)", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
        instructions: new Array(12).fill(null).map(() => instruction.pop()),
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);
      const previousInsturctionByteOffset = context.readNamedVar(
        "instructionByteIndex",
        runtimeTypePositiveNumber,
      ).primitiveValue;

      evalStack.stackPush(vm.asLiteral(true));

      inst.do(vm);

      expect(
        context.readNamedVar("instructionByteIndex", runtimeTypePositiveNumber)
          .primitiveValue,
      ).toBe(previousInsturctionByteOffset);
    });

    test("Fail if the offset is out of bounds", () => {
      const vm = new VirtualMachine();
      const closure = vm.createClosure({
        tempCount: 4,
      });
      const context = vm.invokeAsMethod(vm.asLiteral(undefined), closure);
      const evalStack = context.readNamedVar("evalStack", runtimeTypeNotNil);

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
  noop: () => {},
};

function testInstruction<I extends Instruction<any>>(inst: I) {
  const testDescription = inst.explain();
  if (instructionTests[inst.type]) {
    describe(testDescription, () => {
      instructionTests[inst.type](inst);
    });
  } else {
    raise(Error, `No tests defined for instruction type: ${inst.type}`);
  }
}

describe("Instructions", () => {
  testInstruction(instruction.pushSpecialValue(SpecialPushValue.NegativeOne));
  testInstruction(instruction.returnSpecialValue(SpecialReturnValue.Self));
  testInstruction(instruction.push(ContextValue.ArgOrTempVar, 3));
  testInstruction(instruction.push(ContextValue.LiteralConst, 3));
  testInstruction(instruction.push(ContextValue.LiteralVar, 3));
  testInstruction(instruction.pushImmediate("foo"));
  testInstruction(instruction.pushReceiverVariable("baz"));
  testInstruction(instruction.store(ContextVariable.LiteralVar, 3));
  testInstruction(instruction.store(ContextVariable.TempVar, 3));
  testInstruction(instruction.store(ContextVariable.TempVar, 3, true));
  testInstruction(instruction.storeInReceiverVariable("baz")),
    testInstruction(instruction.storeInReceiverVariable("baz", true)),
    // testInstruction(instruction.popAndStore(ContextVariable.LiteralVar, 3));
    // (TODO:testing) test a non-primitive method
    testInstruction(instruction.sendSelector("+", 1));
  testInstruction(instruction.sendSelector("-", 1));
  testInstruction(instruction.pop());
  testInstruction(instruction.duplicate());
  testInstruction(instruction.jump(5));
  testInstruction(instruction.jump(-5));
  testInstruction(instruction.popAndJumpOnTrue(5));
  testInstruction(instruction.popAndJumpOnTrue(-5));
  testInstruction(instruction.popAndJumpOnFalse(5));
  testInstruction(instruction.popAndJumpOnFalse(-5));
});
