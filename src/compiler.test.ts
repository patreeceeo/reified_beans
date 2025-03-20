import { describe, expect, test } from "vitest";
import { VirtualMachine } from "./virtual_machine";
import {
  ClassCompiler,
  type ClassDescription,
  type ClosureDescription,
  type Expression,
  type Identifier,
} from "./compiler";
import { Instruction, instruction } from "./instructions";
import { ContextValue } from "./contexts";
import type { Dict } from "./generics";
import type { AnyLiteralJsValue } from "./virtual_objects";
import { runtimeTypeString } from "./runtime_type_checks";

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
    literals?: Map<AnyLiteralJsValue | ClosureDescription, number>;
  };
  expect:
    | {
        instructions: Instruction<any>[];
      }
    | {
        throw: true;
      };
}

const simpleBlockAST: ClosureDescription = {
  body: [
    {
      type: "js_primitive",
      value: 1,
    },
  ],
};

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
  "complex literal": {
    given: {
      expression: {
        type: "complex_literal",
        value: simpleBlockAST,
      },
      literals: new Map([[simpleBlockAST, 13]]),
    },
    expect: {
      instructions: [instruction.push(ContextValue.LiteralConst, 13)],
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

  describe("compileClosure", () => {
    test("simple case", () => {
      const vm = new VirtualMachine();
      const compiler = new ClassCompiler(classDescription, vm);
      const closureDescription: ClosureDescription = {
        body: [
          {
            type: "js_primitive",
            value: 1,
          },
        ],
      };
      const result = compiler.compileClosure(closureDescription);
      const closureId = result.readNamedVar(
        "closureId",
        runtimeTypeString,
      ).primitiveValue;

      expect(vm.instructionsByClosureId[closureId]).toEqual(
        compiler.compileClosureBody(
          closureDescription.body ?? [],
          [],
          [],
          new Map(),
        ),
      );
    });
  });
});
