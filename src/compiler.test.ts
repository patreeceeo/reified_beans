import { describe, expect, test } from "vitest";
import { VirtualMachine } from "./virtual_machine";
import {
  ClassCompiler,
  type ClassDescription,
  type Expression,
  type Identifier,
} from "./compiler";
import { instruction } from "./instructions";
import { ContextValue } from "./contexts";

const classDescription: ClassDescription = {
  name: "ExampleClass",
  superClass: "nil",
  ivars: [],
  methods: {},
  classComment: "",
};

describe("compiler", () => {
  describe("compileExpression", () => {
    describe("arg expression", () => {
      test("success", () => {
        const vm = new VirtualMachine();
        const compiler = new ClassCompiler(classDescription, vm);

        const expression: Expression = {
          type: "arg",
          value: "y",
        };

        const args: Identifier[] = [{ id: "x" }, { id: "y" }];
        const temps: Identifier[] = [];

        const result = compiler.compileExpression(expression, args, temps);

        expect(result).toEqual([instruction.push(ContextValue.TempVar, 1)]);
      });
    });

    describe("temp expression", () => {
      test("success", () => {
        const vm = new VirtualMachine();
        const compiler = new ClassCompiler(classDescription, vm);

        const expression: Expression = {
          type: "temp",
          value: "y",
        };

        const args: Identifier[] = [];
        const temps: Identifier[] = [{ id: "x" }, { id: "y" }];

        const result = compiler.compileExpression(expression, args, temps);

        expect(result).toEqual([instruction.push(ContextValue.TempVar, 1)]);
      });
    });
  });
});
