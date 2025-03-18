import { describe, expect, test } from "vitest";
import { VirtualMachine } from "./virtual_machine";

describe("virtual objects", () => {
  describe("mixing named and indexed variables", () => {
    const vm = new VirtualMachine();
    vm.initializeClass("TestObject", "Object", ["foo"]);
    const receiver = vm.createObject("TestObject");

    test("initial values", () => {
      expect(receiver.readNamedVar("foo")).toBe(vm.vNil);
      expect(receiver.readIndexedVar(0)).toBe(vm.vNil);
    });

    test("write and read", () => {
      receiver.writeNamedVar("foo", vm.asLiteral(42));
      receiver.writeIndexedVar(0, vm.asLiteral(100));

      expect(receiver.readNamedVar("foo")).toBe(vm.asLiteral(42));
      expect(receiver.readIndexedVar(0)).toBe(vm.asLiteral(100));
    });
  });
});
