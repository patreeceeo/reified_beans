/**
 * Utility functions for compiling an Machine from a workspace.
 */
import { VirtualMachine } from "./virtual_machine";
import {
  VirtualObject,
  type AnyLiteralJsValue,
  type AnyPrimitiveJsValue,
} from "./virtual_objects";
import { instruction, type Instruction } from "./instructions";
import { ContextValue } from "./contexts";
import { BindingError, invariant, raise } from "./errors";
import { guid } from "./guid";
import { findArrayDuplicates } from "./array";

const exampleProgramClosure: ClosureDescription = {
  args: [{ id: "block" }, { id: "list" }],
  temps: [{ id: "count" }],
  body: [
    // basic message send
    {
      type: "send",
      receiver: { type: "arg", value: "block" },
      message: "value",
    },

    // message send with arg
    {
      type: "send",
      receiver: { type: "js_primitive", value: 2 },
      message: "*",
      args: [{ type: "temp", value: "count" }],
    },

    // message send with block arg
    {
      type: "send",
      receiver: { type: "js_primitive", value: true },
      message: "ifTrue:",
      args: [
        {
          type: "complex_literal",
          literalType: "BlockClosure",
          value: {
            body: [
              {
                type: "send",
                receiver: { type: "js_primitive", value: 1 },
                message: "+",
                args: [{ type: "js_primitive", value: 2 }],
              },
            ],
          },
        },
      ],
    },

    // message send with multiple args
    {
      type: "send",
      receiver: { type: "arg", value: "list" },
      message: "at:put:",
      args: [
        { type: "js_primitive", value: 2 },
        { type: "js_primitive", value: 3 },
      ],
    },

    // nested expression
    {
      type: "send",
      receiver: {
        type: "send",
        receiver: { type: "temp", value: "count" },
        message: "-",
      },
      message: "+",
      args: [{ type: "js_primitive", value: 2 }],
    },

    // assignment
    {
      type: "send",
      receiver: { type: "temp", value: "count" },
      message: ":=",
      args: [{ type: "js_primitive", value: 0 }],
    },
  ],
};

export interface Identifier {
  id: string;
}

export interface TempExpression {
  type: "temp";
  value: string;
}

export interface ArgExpression {
  type: "arg";
  value: string;
}

export interface SendExpression {
  type: "send";
  receiver: Expression;
  message: string;
  args?: Expression[];
}

interface JsPrimitiveExpression {
  type: "js_primitive";
  value: AnyPrimitiveJsValue;
}

interface ComplexLiteralExpression {
  type: "complex_literal";
  literalType: "BlockClosure";
  value: ClosureDescription;
}

export type Expression =
  | SendExpression
  | TempExpression
  | ArgExpression
  | JsPrimitiveExpression
  | ComplexLiteralExpression;

export type AnyLiteralValue = AnyLiteralJsValue | ClosureDescription;

export interface ClosureDescription {
  args?: Identifier[];
  temps?: Identifier[];
  body?: Expression[];
}

export interface ClassDescription {
  name: string;
  superClass: string;
  ivars: string[];
  classComment: string;
  methods: Record<string, ClosureDescription>;
}

/**
 * Used to map ASTs for literals to the literal table offset that will be used in the compiled code.
 */
type InputLiteralMap = Map<AnyLiteralValue, number>;

export class ClassCompiler {
  constructor(
    readonly description: ClassDescription,
    readonly vm: VirtualMachine,
  ) {}

  compileExpression(
    expr: Expression,
    args: Identifier[],
    temps: Identifier[],
    literals: InputLiteralMap,
  ): Instruction<any>[] {
    switch (expr.type) {
      case "arg": {
        const argIndex = args.findIndex((arg) => arg.id === expr.value);
        invariant(
          argIndex !== -1,
          BindingError,
          this.description.name,
          String(expr.value),
        );
        return [instruction.push(ContextValue.ArgOrTempVar, argIndex)];
      }
      case "temp": {
        const tempIndex = temps.findIndex((arg) => arg.id === expr.value);
        invariant(
          tempIndex !== -1,
          BindingError,
          this.description.name,
          String(expr.value),
        );
        return [instruction.push(ContextValue.ArgOrTempVar, tempIndex)];
      }
      case "send": {
        const receiverInstructions = this.compileExpression(
          expr.receiver,
          args,
          temps,
          literals,
        );
        const sendArgs = expr.args ?? [];
        const sendArgsInstructions = sendArgs.flatMap((arg) =>
          this.compileExpression(arg, args, temps, literals),
        );

        return [
          ...sendArgsInstructions,
          ...receiverInstructions,
          instruction.sendSelector(expr.message, sendArgs.length),
        ];
      }
      case "js_primitive": {
        return [instruction.pushImmediate(expr.value)];
      }

      case "complex_literal": {
        const offset = literals.get(expr.value);
        invariant(
          offset !== undefined,
          Error,
          `Literal block has not been added to literals map`,
        );
        return [instruction.push(ContextValue.LiteralConst, offset)];
      }
    }
  }

  compileClosureBody(
    body: Expression[],
    args: Identifier[],
    temps: Identifier[],
    literals: Map<AnyLiteralValue, number>,
  ): Instruction<any>[] {
    const bodyInstructions =
      body.flatMap((expr) =>
        this.compileExpression(expr, args, temps, literals),
      ) ?? [];

    return bodyInstructions;
  }

  compileClosure(description: ClosureDescription) {
    const closure = new VirtualObject(this.vm, "Closure");

    const closureId = guid();

    const body = description.body ?? [];

    const inputLiterals = this.computeInputLiterals(body);
    const literalTable = this.computeLiteralTable(body);

    this.vm.instructionsByClosureId[closureId] = this.compileClosureBody(
      body,
      description.args ?? [],
      description.temps ?? [],
      inputLiterals,
    );
    closure.writeNamedVar("closureId", this.vm.asLiteral(closureId));
    closure.writeNamedVar("literals", literalTable);

    return closure;
  }

  // TODO test
  computeInputLiterals(exprs: Expression[]): Map<AnyLiteralValue, number> {
    const literals = new Map<AnyLiteralValue, number>();
    for (const expr of exprs) {
      if (expr.type === "complex_literal") {
        invariant(!literals.has(expr.value), Error, "Duplicate literal");
        literals.set(expr.value, literals.size);
      }
    }
    return literals;
  }

  // TODO test
  computeLiteralTable(exprs: Expression[]): VirtualObject {
    const literals = new VirtualObject(this.vm, "Array");
    for (const expr of exprs) {
      if (expr.type === "complex_literal") {
        if (expr.literalType === "BlockClosure") {
          literals.stackPush(this.compileClosure(expr.value));
        }
      }
    }
    return literals;
  }

  computeMergedInstanceVars(): string[] {
    const { vm, description } = this;

    const duplicatesInClass = findArrayDuplicates(description.ivars);
    invariant(
      duplicatesInClass.length === 0,
      Error,
      `Class ${description.name} declares ${duplicatesInClass.join(", ")} as instance variables more than once`,
    );

    const superClass = vm.globalContext.at(description.superClass);
    const merged = [...superClass.ivars, ...description.ivars];

    const duplicatesFromSuperclass = findArrayDuplicates(merged);
    invariant(
      duplicatesFromSuperclass.length === 0,
      Error,
      `Name collision: Class ${description.name} locally declares AND inherits ${duplicatesFromSuperclass.join(", ")} as instance variables`,
    );

    return merged;
  }

  /**
   * We could design the language such that classes are created with class expressions and assigned to a variable like
   * any other value in the language. This would mean less special syntax to learn while allowing for the possiblity of
   * supporting anonymous classes, nested classes, and other advanced features.
   *
   * However, for now we will keep the class definition syntax as it is. The compiler will create a class object
   * and assign it to the class variable in the global context.
   */
  compile() {
    const { vm, description } = this;

    const vo = new VirtualObject(vm, "Class", this.computeMergedInstanceVars());

    // Bind the class to its name
    vm.globalContext.put(description.name, vo);

    // Inherit and compile methods
    for (const [selector, closureDescription] of Object.entries(
      description.methods,
    )) {
      const closure = this.compileClosure(closureDescription);
      vo.methodDict[selector] = closure;
    }

    return vo;
  }
}
