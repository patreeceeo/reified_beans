import { describe, expect, test } from "vitest";
import { VirtualMachine } from "./virtual_machine";
import { runtimeTypeNotNil } from "./runtime_type_checks";
import { Interpreter } from "./interpreter";
import { instPush } from "./instructions";
import { ContextValue } from "./contexts";

describe("Standard Class Library", () => {
  describe("Array", () => {
    test("at:", () => {
      const vm = new VirtualMachine();
      const array = vm.asLiteral([86, 79, 305]);
      const closure = vm.createClosure();
      const receiver = vm.asLiteral(undefined);
      const context = vm.invokeAsMethod(receiver, closure);
      const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);

      evalStack.stackPush(vm.asLiteral(2));
      evalStack.stackPush(array);

      vm.send("at:");

      expect(evalStack.stackTop?.primitiveValue).toEqual(305);
    });
  });

  describe("True", () => {
    test.only("ifTrue:", () => {
      const vm = new VirtualMachine();
      const interpreter = new Interpreter(vm);
      const closure = vm.createClosure();
      const receiver = vm.asLiteral(undefined);

      vm.invokeAsMethod(receiver, closure);
      const { evalStack } = vm;

      const blockClosure = vm.createClosure({
        literals: [42],
        getInstructions(pointer) {
          instPush.writeWith(pointer, ContextValue.LiteralConst, 0);
        },
      });
      evalStack.stackPush(blockClosure);
      evalStack.stackPush(vm.asLiteral(true));

      vm.send("ifTrue:");
      interpreter.run();

      expect(vm.evalStack.stackTop.primitiveValue).toBe(42);
    });
  });
});
