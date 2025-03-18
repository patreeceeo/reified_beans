import { describe, expect, test } from "vitest";
import { VirtualMachine } from "./virtual_machine";
import {
  ClassCompiler,
  type ClassDescription,
  type Expression,
  type Identifier,
} from "./compiler";
import { Instruction, instruction } from "./instructions";
import { ContextValue } from "./contexts";
import type { Dict } from "./generics";

const classDescription: ClassDescription = {
  name: "ExampleClass",
  superClass: "nil",
  ivars: [],
  methods: {},
  classComment: "",
};

interface CompileExpressionTestCase {
  given: {
    expression: Expression;
    args?: Identifier[];
    temps?: Identifier[];
  };
  expect:
    | {
        instructions: Instruction<any>[];
      }
    | {
        throw: true;
      };
}

const compileExpressionTests: Dict<CompileExpressionTestCase> = {
  "arg success": {
    given: {
      expression: {
        type: "arg",
        value: "y",
      },
      args: [{ id: "x" }, { id: "y" }],
    },
    expect: {
      instructions: [instruction.push(ContextValue.TempVar, 1)],
    },
  },
  "arg fail": {
    given: {
      expression: {
        type: "arg",
        value: "y",
      },
    },
    expect: {
      throw: true,
    },
  },
  "temp success": {
    given: {
      expression: {
        type: "temp",
        value: "y",
      },
      temps: [{ id: "x" }, { id: "y" }],
    },
    expect: {
      instructions: [instruction.push(ContextValue.TempVar, 1)],
    },
  },
  "temp fail": {
    given: {
      expression: {
        type: "temp",
        value: "y",
      },
    },
    expect: {
      throw: true,
    },
  },
};

describe("compiler", () => {
  describe("compileExpression", () => {
    for (const [name, testCase] of Object.entries(compileExpressionTests)) {
      test(name, () => {
        const vm = new VirtualMachine();
        const compiler = new ClassCompiler(classDescription, vm);
        const { given, expect: expectData } = testCase;
        const args = given.args ?? [];
        const temps = given.temps ?? [];

        if ("throw" in expectData) {
          expect(() => {
            compiler.compileExpression(given.expression, args, temps);
          }).toThrow();
        } else {
          const result = compiler.compileExpression(
            given.expression,
            args,
            temps,
          );
          expect(result).toEqual(expectData.instructions);
        }
      });
    }
  });
});
