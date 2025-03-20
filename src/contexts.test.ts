import { describe, expect, test } from "vitest";
import { ContextValue, loadContextValue } from "./contexts";
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
    const literals = closure.readNamedVar("literals", runtimeTypeNotNil);
    const argsAndTemps = context.readNamedVar(
      "argsAndTemps",
      runtimeTypeNotNil,
    );

    vm.contextStack.push(context);
    literals.writeIndexedVar(3, vm.asLiteral("Object"));
    argsAndTemps.writeIndexedVar(3, vm.asLiteral(42));

    test(ContextValue[ContextValue.ArgOrTempVar], () => {
      const result = loadContextValue(ContextValue.ArgOrTempVar, 3, vm);
      expect(result).toBe(argsAndTemps.readIndexedVar(3));
    });
    test(ContextValue[ContextValue.LiteralConst], () => {
      const result = loadContextValue(ContextValue.LiteralConst, 3, vm);
      expect(result).toBe(literals.readIndexedVar(3));
    });
    test(ContextValue[ContextValue.LiteralVar], () => {
      const result = loadContextValue(ContextValue.LiteralVar, 3, vm);
      expect(result).toBe(vm.globalContext.at("Object"));
    });
  });
});
