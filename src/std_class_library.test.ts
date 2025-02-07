import { describe, expect, test } from "vitest";
import { VirtualMachine } from "./virtual_machine";
import { ClosureContext } from "./contexts";

describe("Standard Class Library", () => {
  describe("Array", () => {
    test.only("at:", () => {
      const vm = new VirtualMachine();
      const array = vm.asLiteral([86, 79, 305]);
      const closure = vm.createClosure();
      const receiver = vm.asLiteral(undefined);
      const context = new ClosureContext(receiver, closure);

      vm.contextStack.push(context);
      context.evalStack.push(vm.asLiteral(2));
      context.evalStack.push(array);

      vm.send("at:");

      expect(context.evalStack.peek()?.primitiveValue).toEqual(305);
    });
  });
});
