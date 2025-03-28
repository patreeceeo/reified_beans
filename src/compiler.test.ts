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

const superClassDescription: ClassDescription = {
  name: "SuperClass",
  superClass: "nil",
  ivars: ["superIvar"],
  methods: {},
  classComment: "",
};

const classDescription: ClassDescription = {
  name: "ExampleClass",
  superClass: "SuperClass",
  ivars: ["exampleIvar"],
  methods: {
    exampleMethod: {
      body: [
        {
          type: "js_primitive",
          value: 43,
        },
      ],
    },
  },
  classComment: "",
};

const classDescriptionWithIVarsFromSuper: ClassDescription = {
  name: "ExampleClass",
  superClass: "SuperClass",
  ivars: ["superIvar"],
  methods: {},
  classComment: "",
};

const classDescriptionWithDuplicateIVars: ClassDescription = {
  name: "ExampleClass",
  superClass: "SuperClass",
  ivars: ["exampleIvar", "exampleIvar"],
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
        literalType: "BlockClosure",
        value: simpleBlockAST,
      },
      literals: new Map([[simpleBlockAST, 13]]),
    },
    expect: {
      instructions: [instruction.push(ContextValue.LiteralConst, 13)],
    },
  },
};

describe("ClassCompiler", () => {
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
    describe("simple case", () => {
      const vm = new VirtualMachine();
      const compiler = new ClassCompiler(classDescription, vm);
      const body = [
        {
          type: "complex_literal",
          literalType: "BlockClosure",
          value: simpleBlockAST,
        },
        {
          type: "js_primitive",
          value: 1,
        },
      ] as Expression[];
      const closureDescription: ClosureDescription = {
        body,
      };
      const inputLiterals = compiler.computeInputLiterals(body);
      const result = compiler.compileClosure(closureDescription);
      const closureId = result.readNamedVar(
        "closureId",
        runtimeTypeString,
      ).primitiveValue;

      test("the virtual machine has the instructions", () => {
        expect(vm.instructionsByClosureId[closureId]).toEqual(
          compiler.compileClosureBody(body, [], [], inputLiterals),
        );
      });

      test("the closure has the literals", () => {
        const actual = result.readNamedVar("literals");
        const expected = compiler.computeLiteralTable(body);
        expect(actual.shapeEquals(expected)).toBe(true);
      });
    });
  });

  describe("compile", () => {
    const vm = new VirtualMachine();
    new ClassCompiler(superClassDescription, vm).compile();
    const compiler = new ClassCompiler(classDescription, vm);

    test("binds the resulting object in the global scope", () => {
      const compiledClass = compiler.compile();
      expect(vm.globalContext.at(classDescription.name).id).toBe(
        compiledClass.id,
      );
    });

    test("inheriting instance variables from the superclass", () => {
      classDescription.superClass = superClassDescription.name;

      const subClass = compiler.compile();
      expect(subClass.ivars).toEqual(["superIvar", "exampleIvar"]);
    });

    test("instance variable name collision with self", () => {
      expect(() =>
        new ClassCompiler(classDescriptionWithDuplicateIVars, vm).compile(),
      ).toThrow();
    });

    test("instance variable name collision with super", () => {
      expect(() =>
        new ClassCompiler(classDescriptionWithIVarsFromSuper, vm).compile(),
      ).toThrow();
    });

    test("instance methods are compiled", () => {
      const compiledClass = compiler.compile();
      expect(
        compiledClass.methodDict.exampleMethod.shapeEquals(
          compiler.compileClosure(classDescription.methods.exampleMethod),
        ),
      ).toBe(true);
    });
  });
});
