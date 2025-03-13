import { describe, expect, test } from "vitest";
import { VirtualMachine } from "../virtual_machine";
import { Interpreter } from "../interpreter";
import { ContextValue } from "../contexts";
import { instruction } from "../instructions";

describe("Standard Class Library", () => {
  describe("False", () => {
    test("ifFalse:", () => {
      const vm = new VirtualMachine();
      const interpreter = new Interpreter(vm);
      const closure = vm.createClosure();
      const receiver = vm.asLiteral(undefined);

      vm.invokeAsMethod(receiver, closure);
      const { evalStack } = vm;

      const blockClosure = vm.createClosure({
        literals: [42],
        instructions: [instruction.push(ContextValue.LiteralConst, 0)],
      });
      evalStack.stackPush(blockClosure);
      evalStack.stackPush(vm.asLiteral(false));

      vm.send("ifFalse:");
      interpreter.run();

      expect(vm.evalStack.stackTop!.primitiveValue).toBe(42);
    });
  });
});
