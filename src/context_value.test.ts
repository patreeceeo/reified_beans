import { describe, expect, test } from "vitest";
import { ContextValue, loadContextValue } from "./context_value";
import { VirtualMachine } from "./virtual_machine";
import { runtimeTypeNotNil } from "./runtime_type_checks";

describe("ContextValue", () => {
  describe("load", () => {
    const vm = new VirtualMachine();
    const closure = vm.createClosure({
      argCount: 2,
      tempCount: 2,
    });
    vm.initializeClass("TestObject", "Object", ["foo", "bar", "baz"]);
    const receiver = vm.createObject("TestObject");
    const context = vm.createMethodContext(receiver, closure);
    const literals = closure.readVarWithName("literals", runtimeTypeNotNil);
    const argsAndTemps = context.readVarWithName(
      "argsAndTemps",
      runtimeTypeNotNil,
    );

    vm.contextStack.push(context);
    literals.setIndex(3, vm.asLiteral("Object"));
    argsAndTemps.setIndex(3, vm.asLiteral(42));
    receiver.setVar(2, vm.asLiteral(true));

    test(ContextValue[ContextValue.ReceiverVar], () => {
      const result = loadContextValue(ContextValue.ReceiverVar, 2, vm);
      expect(result).toBe(receiver.readVar(2));
    });
    test(ContextValue[ContextValue.TempVar], () => {
      const result = loadContextValue(ContextValue.TempVar, 3, vm);
      expect(result).toBe(argsAndTemps.readIndex(3));
    });
    test(ContextValue[ContextValue.LiteralConst], () => {
      const result = loadContextValue(ContextValue.LiteralConst, 3, vm);
      expect(result).toBe(literals.readIndex(3));
    });
    test(ContextValue[ContextValue.LiteralVar], () => {
      const result = loadContextValue(ContextValue.LiteralVar, 3, vm);
      expect(result).toBe(vm.globalContext.at("Object"));
    });
  });
});
