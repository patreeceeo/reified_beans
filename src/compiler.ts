/**
 * Utility functions for compiling an Machine from a workspace.
 */
import { VirtualMachine } from "./virtual_machine";
import { VirtualObject, type AnyLiteralJsValue } from "./virtual_objects";
import { instruction, type Instruction } from "./instructions";
import { ContextValue } from "./contexts";
import { BindingError, invariant, raise } from "./errors";
import type { Dict } from "./generics";

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
      receiver: { type: "literal_js", value: 2 },
      message: "*",
      args: [{ type: "temp", value: "count" }],
    },

    // message send with block arg
    {
      type: "send",
      receiver: { type: "literal_js", value: true },
      message: "ifTrue:",
      args: [
        {
          type: "literal_block",
          value: {
            body: [
              {
                type: "send",
                receiver: { type: "literal_js", value: 1 },
                message: "+",
                args: [{ type: "literal_js", value: 2 }],
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
        { type: "literal_js", value: 2 },
        { type: "literal_js", value: 3 },
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
      args: [{ type: "literal_js", value: 2 }],
    },

    // assignment
    {
      type: "send",
      receiver: { type: "temp", value: "count" },
      message: ":=",
      args: [{ type: "literal_js", value: 0 }],
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

interface JsLiteralExpression {
  type: "literal_js";
  value: AnyLiteralJsValue;
}

interface BlockLiteralExpression {
  type: "literal_block";
  value: ClosureDescription;
}

export type Expression =
  | SendExpression
  | TempExpression
  | ArgExpression
  | JsLiteralExpression
  | BlockLiteralExpression;

export interface ClosureDescription {
  args?: Identifier[];
  temps?: Identifier[];
  literals?: AnyLiteralJsValue[];
  body?: Expression[];
}

export interface ClassDescription {
  name: string;
  superClass: string;
  ivars: string[];
  classComment: string;
  methods: Record<string, ClosureDescription>;
}

export class ClassCompiler {
  constructor(
    readonly description: ClassDescription,
    readonly vm: VirtualMachine,
  ) {}

  compileExpression(
    expr: Expression,
    args: Identifier[],
    temps: Identifier[],
    literals: Dict<number>,
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
        return [instruction.push(ContextValue.TempVar, argIndex)];
      }
      case "temp": {
        const tempIndex = temps.findIndex((arg) => arg.id === expr.value);
        invariant(
          tempIndex !== -1,
          BindingError,
          this.description.name,
          String(expr.value),
        );
        return [instruction.push(ContextValue.TempVar, tempIndex)];
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
        const literalIndex = literals[expr.message];
        invariant(
          literalIndex !== undefined,
          Error,
          `Unknown message ${expr.message}`,
        );

        return [
          ...sendArgsInstructions,
          ...receiverInstructions,
          instruction.sendLiteralSelectorExtended(
            literals[expr.message],
            sendArgs.length,
          ),
        ];
      }
    }
    raise(Error, `Unknown expression type ${expr.type}`);
  }

  // compile() {
  //   const { description, vm } = this;
  //   const superClass = vm.globalContext.at(superClassName);
  //   const ivars = [...superClass.ivars, ...description.ivars];
  //   const vClass = new VirtualObject(vm, "Class", ivars);
  //   for (const [methodName, closureDescription] of Object.entries(
  //     description.methods,
  //   )) {
  //     const closure = this.compileClosure(closureDescription);
  //     vClass.methodDict[methodName] = closure;
  //   }
  // }

  // compileClosure(description: ClosureDescription) {
  //   const instructions = [] as Instruction<any>[];
  //   for (const expr of description.body) {
  //     instructions.push(this.compileExpression(expr, description));
  //   }
  // }
}
