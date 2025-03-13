import { describe, expect, test } from "vitest";
import { VirtualMachine } from "../virtual_machine";
import { runtimeTypeNotNil } from "../runtime_type_checks";

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
});
