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
import type { AnyLiteralJsValue } from "./virtual_objects";

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
    literals?: Map<AnyLiteralJsValue, number>;
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
      instructions: [instruction.push(ContextValue.ArgOrTempVar, 1)],
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
      instructions: [instruction.push(ContextValue.ArgOrTempVar, 1)],
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
  "send success (no args)": {
    given: {
      expression: {
        type: "send",
        receiver: { type: "arg", value: "x" },
        message: "foo",
      },
      args: [{ id: "x" }],
    },
    expect: {
      instructions: [
        instruction.push(ContextValue.ArgOrTempVar, 0),
        instruction.sendSelector("foo", 0),
      ],
    },
  },
  "send success (with args)": {
    given: {
      expression: {
        type: "send",
        receiver: { type: "arg", value: "x" },
        message: "foo",
        args: [
          { type: "arg", value: "y" },
          { type: "arg", value: "x" },
        ],
      },
      args: [{ id: "x" }, { id: "y" }],
    },
    expect: {
      instructions: [
        instruction.push(ContextValue.ArgOrTempVar, 1),
        instruction.push(ContextValue.ArgOrTempVar, 0),
        instruction.push(ContextValue.ArgOrTempVar, 0),
        instruction.sendSelector("foo", 2),
      ],
    },
  },
  "JS number": {
    given: {
      expression: {
        type: "js_primitive",
        value: 42,
      },
    },
    expect: {
      instructions: [instruction.pushImmediate(42)],
    },
  },
  "JS string": {
    given: {
      expression: {
        type: "js_primitive",
        value: "hello",
      },
    },
    expect: {
      instructions: [instruction.pushImmediate("hello")],
    },
  },
  "JS boolean": {
    given: {
      expression: {
        type: "js_primitive",
        value: true,
      },
    },
    expect: {
      instructions: [instruction.pushImmediate(true)],
    },
  },
  "JS undefined": {
    given: {
      expression: {
        type: "js_primitive",
        value: undefined,
      },
    },
    expect: {
      instructions: [instruction.pushImmediate(undefined)],
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
        const literals = given.literals ?? new Map();

        if ("throw" in expectData) {
          expect(() => {
            compiler.compileExpression(given.expression, args, temps, literals);
          }).toThrow();
        } else {
          const result = compiler.compileExpression(
            given.expression,
            args,
            temps,
            literals,
          );
          expect(result).toEqual(expectData.instructions);
        }
      });
    }
  });
});
