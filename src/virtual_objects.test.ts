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

  describe("deep equality", () => {
    test("two objects with the same primitive value are equal", () => {
      const vm = new VirtualMachine();
      const num1 = vm.asLiteral(42);
      const num2 = vm.asLiteral(42);

      expect(num1.deepEquals(num2)).toBe(true);
    });

    test("two objects with the different primitive values are not equal", () => {
      const vm = new VirtualMachine();
      const num1 = vm.asLiteral(42);
      const num2 = vm.asLiteral(23);

      expect(num1.deepEquals(num2)).toBe(false);
    });

    test("two objects of the same class with the same vars are equal", () => {
      const vm = new VirtualMachine();
      vm.initializeClass("TestObject", "Object", ["foo"]);
      const obj1 = vm.createObject("TestObject");
      const obj2 = vm.createObject("TestObject");

      obj1.writeNamedVar("foo", vm.asLiteral(42));
      obj2.writeNamedVar("foo", vm.asLiteral(42));

      expect(obj1.deepEquals(obj2)).toBe(true);
    });

    test("two objects of the same class with the different vars are not equal", () => {
      const vm = new VirtualMachine();
      vm.initializeClass("TestObject", "Object", ["foo"]);
      const obj1 = vm.createObject("TestObject");
      const obj2 = vm.createObject("TestObject");

      obj1.writeNamedVar("foo", vm.asLiteral(42));
      obj2.writeNamedVar("foo", vm.asLiteral(23));

      expect(obj1.deepEquals(obj2)).toBe(false);
    });

    test("two objects with the same vars but different classes are not equal", () => {
      const vm = new VirtualMachine();
      vm.initializeClass("TestObjectA", "Object", ["foo"]);
      vm.initializeClass("TestObjectB", "Object", ["foo"]);
      const obj1 = vm.createObject("TestObjectA");
      const obj2 = vm.createObject("TestObjectB");

      obj1.writeNamedVar("foo", vm.asLiteral(42));
      obj2.writeNamedVar("foo", vm.asLiteral(42));

      expect(obj1.deepEquals(obj2)).toBe(false);
    });
  });
});
