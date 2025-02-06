import { describe, expect, test } from "vitest";
import { ContextValue, loadContextValue } from "./context_value";
import { VirtualMachine } from "./virtual_machine";
import { Closure } from "./closures";
import { ClosureContext } from "./contexts";

describe("ContextValue", () => {
  describe("load", () => {
    const vm = new VirtualMachine();
    const closure = new Closure(4, 4, 4, new VirtualMachine());
    vm.initializeClass("TestObject", "Object", ["foo", "bar", "baz"]);
    const receiver = vm.createObject("TestObject");
    const context = new ClosureContext(receiver, closure);

    vm.contextStack.push(context);
    closure.literals.put(3, vm.asLiteral("Object"));
    context.argsAndTemps.put(3, vm.asLiteral(42));
    context.receiver.setVar(2, vm.asLiteral(true));

    test(ContextValue[ContextValue.ReceiverVar], () => {
      const result = loadContextValue(ContextValue.ReceiverVar, 2, vm);
      expect(result).toBe(context.receiver.readVar(2));
    });
    test(ContextValue[ContextValue.TempVar], () => {
      const result = loadContextValue(ContextValue.TempVar, 3, vm);
      expect(result).toBe(context.argsAndTemps.at(3));
    });
    test(ContextValue[ContextValue.LiteralConst], () => {
      const result = loadContextValue(ContextValue.LiteralConst, 3, vm);
      expect(result).toBe(closure.literals.at(3));
    });
    test(ContextValue[ContextValue.LiteralVar], () => {
      const result = loadContextValue(ContextValue.LiteralVar, 3, vm);
      expect(result).toBe(vm.globalContext.at("Object"));
    });
  });
});
