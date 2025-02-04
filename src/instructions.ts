import {
  ArgumentCountError,
  invariant,
  raise,
  RangeError,
  StackUnderflowError,
  UnknownVMInstruction,
} from "./errors";
import { Dict } from "./generics";
import {
  ContextValue,
  ContextVariable,
  loadContextValue,
  storeContextValue,
} from "./context_value";
import {
  reifySpecialPushValue,
  reifySpecialReturnValue,
  SpecialPushValue,
  SpecialReturnValue,
} from "./special_value";
import type { VirtualMachine } from "./virtual_machine";

const enum InstructionType {
  POP_AND_STORE_RECEIVER_VAR = 96,
  POP_AND_STORE_TEMP_VAR = 104,
  PUSH_SPECIAL_VAL = 112,
  RETURN_SPECIAL_VAL = 120,
  RETURN_STACK_TOP_FROM = 124,
  PUSH = 128,
  STORE = 129,
  POP_AND_STORE = 130,
  SEND_SPECIAL_SELECTOR = 131,
  SEND_LITERAL_SELECTOR_EXT = 132,
  SUPER_SEND_SPECIAL_SELECTOR = 133,
  SUPER_SEND_LITERAL_SELECTOR_EXT = 134,
  POP = 135,
  DUPLICATE = 136,
  JUMP = 160,
  POP_AND_JUMP_ON_TRUE = 168,
  POP_AND_JUMP_ON_FALSE = 172,
}

export enum EvaluationStackType {
  Message,
  Block,
}

export interface Instruction<TArgs extends any[]> {
  readonly type: InstructionType;
  writeWith(writer: InstructionWriter, ...args: TArgs): void;
  explain(...args: TArgs): string;
  readArgs(reader: InstructionReader, target: number[]): TArgs;
  do(machine: VirtualMachine, ...args: TArgs): void;
}

/**
 * Pop the object from the top of the stack and store in the receiver variable at the given 0-based offset
 * @param offset The offset from the start of the receiver variables
 *
 * (TODO:simplify) Do we need to have this _and_ instPopAndStore?
 */
// export const instPopAndStoreReceiverVar: Instruction<[Uint3]> = {
//   type: InstructionType.POP_AND_STORE_RECEIVER_VAR,

//   writeWith(writer: InstructionWriter, offset: Uint3) {
//     writer.write(this.type + offset);
//   },

//   explain(offset: Uint3) {
//     return `Pop and store receiver var at offset ${offset}`;
//   },

//   readArgs(reader: InstructionReader, target: number[]): [Uint3] {
//     target[0] = reader.read() - this.type;
//     return target as [Uint3];
//   },

//   do(machine: VirtualMachine, offset: Uint3) {
//     const context = machine.contextStack.peek()
//     invariant(context, StackUnderflowError, "context")
//     const {evalStack, receiver} = context
//     const object = evalStack.pop()
//     invariant(object, StackUnderflowError, "evaluation")
//     receiver.setVar(offset, object)
//   },
// };

/**
 * Pop the object from the top of the stack and store in the temporary variable at the given 0-based offset
 * @param offset The offset from the start of the temporary variables
 *
 * (TODO:simplify) Do we need to have this _and_ instPopAndStore?
 */
// export const instPopAndStoreTempVar: Instruction<[Uint3]> = {
//   type: InstructionType.POP_AND_STORE_TEMP_VAR,

//   writeWith(writer: InstructionWriter, offset: number) {
//     writer.write(this.type + offset);
//   },

//   explain(offset: number) {
//     return `Pop and store temp var at offset ${offset}`;
//   },

//   readArgs(reader: InstructionReader, target: number[]): [Uint3] {
//     target[0] = reader.read() - this.type;
//     return target as [Uint3];
//   },

//   do(machine: VirtualMachine, offset: Uint3) {
//     const context = machine.contextStack.peek()
//     invariant(context, StackUnderflowError, "context")
//     const object = context.evalStack.pop()
//     invariant(object, StackUnderflowError, "evaluation")
//     context.argsAndTemps.put(offset, object)
//   },
// };

/**
 * Push a special value onto the eval Stack
 * @param value The special value to Push
 * @see SpecialPushValue
 */
export const instPushSpecialVal: Instruction<[SpecialPushValue]> = {
  type: InstructionType.PUSH_SPECIAL_VAL,

  writeWith(writer: InstructionWriter, value: SpecialPushValue) {
    writer.write(this.type + value);
  },

  explain(value: SpecialPushValue) {
    return `Push special value ${SpecialPushValue[value]}`;
  },

  readArgs(reader: InstructionReader, target: number[]): [SpecialPushValue] {
    target[0] = reader.read() - this.type;
    return target as [SpecialPushValue];
  },

  do(machine: VirtualMachine, value: SpecialPushValue) {
    const object = reifySpecialPushValue(value, machine);
    const context = machine.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    context.evalStack.push(object);
  },
};

/**
 * Return a special Value
 * @param value The special value to return
 * @see SpecialReturnValue
 */
export const instReturnSpecialVal: Instruction<[SpecialReturnValue]> = {
  type: InstructionType.RETURN_SPECIAL_VAL,

  writeWith(writer: InstructionWriter, value: SpecialReturnValue) {
    writer.write(this.type + value);
  },

  explain(value: SpecialReturnValue) {
    return `Return special value ${SpecialReturnValue[value]}`;
  },

  readArgs(reader: InstructionReader, target: number[]): [SpecialReturnValue] {
    target[0] = reader.read() - this.type;
    return target as [SpecialReturnValue];
  },

  do(machine: VirtualMachine, value: SpecialReturnValue) {
    const object = reifySpecialReturnValue(value, machine);
    machine.contextStack.pop();
    const context = machine.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    context.evalStack.push(object);
  },
};

/**
 * Return the object on the top of the return Stack
 * @param value Whether to return from a message or Block
 * @see EvaluationStackType
 */
// (TODO:language) Do we want explicit return statements?
// export const instReturnStackTopFrom: Instruction<[EvaluationStackType]> = {
//   type: InstructionType.RETURN_STACK_TOP_FROM,

//   writeWith(writer: InstructionWriter, value: EvaluationStackType) {
//     writer.write(this.type + value);
//   },

//   explain(value: EvaluationStackType) {
//     return `Return stack top from ${EvaluationStackType[value]}`;
//   },

//   readArgs(reader: InstructionReader, target: number[]): [EvaluationStackType] {
//     target[0] = reader.read() - this.type;
//     return target as [EvaluationStackType];
//   },
// };

/**
 * Push an object onto the eval stack
 * @param source The source of the object to push
 * @param offset The offset from the source
 * @see ContextValue
 */
export const instPush: Instruction<[ContextValue, number]> & {
  readonly bitShift: number;
} = {
  type: InstructionType.PUSH,

  bitShift: 6,

  writeWith(writer: InstructionWriter, source: ContextValue, offset: number) {
    writer.write(this.type);
    writer.write(packBits(source, offset, this.bitShift));
  },

  explain(source: ContextValue, offset: number) {
    return `Push from ${ContextValue[source]} at offset ${offset}`;
  },

  readArgs(
    reader: InstructionReader,
    target: number[],
  ): [ContextValue, number] {
    reader.read();
    return unpackBits(reader.read(), this.bitShift, target as [number, number]);
  },

  do(machine: VirtualMachine, source: ContextValue, offset: number) {
    const object = loadContextValue(source, offset, machine);
    const context = machine.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    context.evalStack.push(object);
  },
};

/**
 * Store the object on the top of the stack in the indicated location
 * @param target The target of the Store instruction
 * @param offset The offset from the target
 * @see ContextVariable
 */
export const instStore: Instruction<[ContextVariable, number]> & {
  readonly bitShift: number;
} = {
  type: InstructionType.STORE,

  bitShift: 6,

  writeWith(
    writer: InstructionWriter,
    target: ContextVariable,
    offset: number,
  ) {
    writer.write(this.type);
    writer.write(packBits(target, offset, this.bitShift!));
  },

  explain(target: ContextVariable, offset: number) {
    return `Store to ${ContextVariable[target]} at offset ${offset}`;
  },

  readArgs(
    reader: InstructionReader,
    target: number[],
  ): [ContextVariable, number] {
    reader.read();
    return unpackBits(
      reader.read(),
      this.bitShift!,
      target as [number, number],
    );
  },

  do(machine: VirtualMachine, target: ContextVariable, offset: number) {
    const context = machine.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const object = context.evalStack.peek();
    invariant(object, StackUnderflowError, "evaluation");
    storeContextValue(target, offset, machine, object);
  },
};

/**
 * Pop the object from the top of the stack and store in the indicated location
 * @param target The target of the PopAndStore instruction
 * @param offset The offset from the target
 * @see ContextVariable
 */
export const instPopAndStore: Instruction<[ContextVariable, number]> & {
  readonly bitShift: number;
} = {
  type: InstructionType.POP_AND_STORE,

  bitShift: 6,

  writeWith(
    writer: InstructionWriter,
    target: ContextVariable,
    offset: number,
  ) {
    writer.write(this.type);
    writer.write(packBits(target, offset, this.bitShift!));
  },

  explain(target: ContextVariable, offset: number) {
    return `Pop and store to ${ContextVariable[target]} at offset ${offset}`;
  },

  readArgs(
    reader: InstructionReader,
    target: number[],
  ): [ContextVariable, number] {
    reader.read();
    return unpackBits(
      reader.read(),
      this.bitShift!,
      target as [number, number],
    );
  },

  do(machine: VirtualMachine, target: ContextVariable, offset: number) {
    const context = machine.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const object = context.evalStack.pop();
    invariant(object, StackUnderflowError, "evaluation");
    storeContextValue(target, offset, machine, object);
  },
};

/**
 * Send a message using a special selector with the given number of arguments.
 * The receiver is taken off the stack, followed by the arguments.
 * @param selector The special selector to Send
 * @param numArgs The number of arguments to the Message
 * @see SpecialSelectorType
 * (TODO:performance) implement special selector send instructions
 */
// export const instSendSpecialSelector: Instruction<[SpecialSelectorType, number]> & {
//   readonly bitShift: number;
// } = {
//   type: InstructionType.SEND_SPECIAL_SELECTOR,

//   bitShift: 3,

//   writeWith(
//     writer: InstructionWriter,
//     selector: SpecialSelectorType,
//     numArgs: number,
//   ) {
//     writer.write(this.type);
//     writer.write(packBits(selector, numArgs, this.bitShift));
//   },

//   explain(selector: SpecialSelectorType, numArgs: number) {
//     return `Send special selector ${SpecialSelectorType[selector]} with ${numArgs} args`;
//   },

//   readArgs(
//     reader: InstructionReader,
//     target: number[],
//   ): [SpecialSelectorType, number] {
//     reader.read();
//     return unpackBits(reader.read(), this.bitShift, target as [number, number]);
//   },

//   do(machine: VirtualMachine, selector: SpecialSelectorType, numArgs: number) {
//     const context = machine.contextStack.peek()
//     invariant(context, StackUnderflowError, "context")
//     const {evalStack} = context
//     const args = evalStack.popN(numArgs)
//     const receiver = evalStack.pop()
//     invariant(receiver, StackUnderflowError, "evaluation")
//     const result = receiver.perform(machine, selector, args)
//     evalStack.push(result)
//   }
// };

/**
 * Send a message using a literal selector with the given number of arguments.
 * The receiver is taken off the stack, followed by the arguments.
 * @param selector The index of the literal selector found in the method's literal array
 * @param numArgs The number of arguments to the message
 */
export const instSendLiteralSelectorExt: Instruction<[number, number]> & {
  readonly bitShift: number;
} = {
  type: InstructionType.SEND_LITERAL_SELECTOR_EXT,

  bitShift: 7,

  writeWith(writer: InstructionWriter, selector: number, numArgs: number) {
    writer.write(this.type);
    writer.write(packBits(selector, numArgs, this.bitShift));
  },

  explain(selector: number, numArgs: number) {
    return `Send literal selector ${selector} with ${numArgs} args`;
  },

  readArgs(reader: InstructionReader, target: number[]): [number, number] {
    reader.read();
    return unpackBits(reader.read(), this.bitShift, target as [number, number]);
  },

  do(machine: VirtualMachine, selectorIndex: number, numArgs: number) {
    const context = machine.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const { evalStack } = context;
    const evalStackDepthInitial = evalStack.length;
    invariant(
      evalStackDepthInitial >= numArgs + 1,
      StackUnderflowError,
      "evaluation",
    );
    const { primitiveValue } = context.closure.literals.at(selectorIndex);
    invariant(
      typeof primitiveValue === "string",
      TypeError,
      `a string`,
      String(primitiveValue),
    );
    machine.send(primitiveValue);
    invariant(
      evalStack.length === evalStackDepthInitial - numArgs,
      ArgumentCountError,
      numArgs,
      evalStackDepthInitial - evalStack.length,
    );
  },
};

/**
 * Send a message to the superclass using a special selector with the given number of arguments.
 * @param selector The special selector to Send
 * @param numArgs The number of arguments to the Message
 * @see SpecialSelectorType
 *
 */
// export const instSuperSendSpecialSelector: Instruction<
//   [SpecialSelectorType, number]
// > & { readonly bitShift: number } = {
//   type: InstructionType.SUPER_SEND_SPECIAL_SELECTOR,

//   bitShift: 3,

//   writeWith(
//     writer: InstructionWriter,
//     selector: SpecialSelectorType,
//     numArgs: number,
//   ) {
//     writer.write(this.type);
//     writer.write(packBits(selector, numArgs, this.bitShift));
//   },

//   explain(selector: SpecialSelectorType, numArgs: number) {
//     return `Super send special selector ${SpecialSelectorType[selector]} with ${numArgs} args`;
//   },

//   readArgs(
//     reader: InstructionReader,
//     target: number[],
//   ): [SpecialSelectorType, number] {
//     reader.read();
//     return unpackBits(reader.read(), this.bitShift, target as [number, number]);
//   },
// };

/**
 * Send a message to the superclass using a literal selector with the given number of arguments.
 * @param selector The index of the literal selector found in the method's literal array
 * @param numArgs The number of arguments to the message
 *
 * TODO: implement super send instructions
 */
// export const instSuperSendLiteralSelectorExt: Instruction<[number, number]> & {
//   readonly bitShift: 7;
// } = {
//   type: InstructionType.SUPER_SEND_LITERAL_SELECTOR_EXT,

//   bitShift: 7,

//   writeWith(writer: InstructionWriter, selector: number, numArgs: number) {
//     writer.write(this.type);
//     writer.write(packBits(selector, numArgs, this.bitShift));
//   },

//   explain(selector: number, numArgs: number) {
//     return `Super send literal selector ${selector} with ${numArgs} args`;
//   },

//   readArgs(reader: InstructionReader, target: number[]): [number, number] {
//     reader.read();
//     return unpackBits(reader.read(), this.bitShift, target as [number, number]);
//   },
// };

/**
 * Pop the object from the top of the Stack
 */
export const instPop: Instruction<[]> = {
  type: InstructionType.POP,

  writeWith(writer: InstructionWriter) {
    writer.write(this.type);
  },

  explain() {
    return `Pop`;
  },

  readArgs(reader: InstructionReader, target: number[]): [] {
    reader.read();
    return target as [];
  },

  do(machine: VirtualMachine) {
    const context = machine.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    invariant(context.evalStack.length > 0, StackUnderflowError, "evaluation");
    context.evalStack.pop();
  },
};

/**
 * Duplicate the object on the top of the Stack
 */
export const instDuplicate: Instruction<[]> = {
  type: InstructionType.DUPLICATE,

  writeWith(writer: InstructionWriter) {
    writer.write(this.type);
  },

  explain() {
    return `Duplicate`;
  },

  readArgs(reader: InstructionReader, target: number[]): [] {
    reader.read();
    return target as [];
  },

  do(machine: VirtualMachine) {
    const context = machine.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const { evalStack } = context;
    const object = evalStack.peek();
    invariant(object, StackUnderflowError, "evaluation");
    evalStack.push(object);
  },
};

/**
 * Jump the given number of bytes, unconditionally.
 */
export const instJump: Instruction<[number]> = {
  type: InstructionType.JUMP,

  writeWith(writer: InstructionWriter, offset: number) {
    writer.write(this.type);
    writer.write(offset);
  },

  explain(offset: number) {
    return `Jump ${offset}`;
  },

  readArgs(reader: InstructionReader, target: number[]): [number] {
    reader.read();
    target[0] = reader.read();
    return target as [number];
  },

  do(machine: VirtualMachine, offset: number) {
    const context = machine.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    context.pc += offset;
    invariant(
      context.pc >= 0 && context.pc < context.closure.instructionByteLength,
      RangeError,
      context.pc,
      0,
      context.closure.instructionByteLength,
    );
  },
};

/**
 * If the object on the top of the Stack is True, pop it and jump the given number of bytes.
 * Otherwise, continue to the next instruction.
 * @param offset The number of bytes to jump, can be negative.
 */
export const instPopAndJumpOnTrue: Instruction<[number]> = {
  type: InstructionType.POP_AND_JUMP_ON_TRUE,

  writeWith(writer: InstructionWriter, offset: number) {
    writer.write(this.type);
    writer.write(offset);
  },

  explain(offset: number) {
    return `Pop and jump ${offset} on True`;
  },

  readArgs(reader: InstructionReader, target: number[]): [number] {
    reader.read();
    target[0] = reader.read();
    return target as [number];
  },

  do(machine: VirtualMachine, offset: number) {
    const context = machine.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const { evalStack } = context;
    const object = evalStack.pop();
    invariant(object, StackUnderflowError, "evaluation");
    if (object.isTrue) {
      context.pc += offset;
      invariant(
        context.pc >= 0 && context.pc < context.closure.instructionByteLength,
        RangeError,
        context.pc,
        0,
        context.closure.instructionByteLength,
      );
    }
  },
};

/**
 * If the object on the top of the Stack is False, pop it and jump the given number of bytes.
 * Otherwise, continue to the next instruction.
 * @param offset The number of bytes to jump, can be negative.
 */
export const instPopAndJumpOnFalse: Instruction<[number]> = {
  type: InstructionType.POP_AND_JUMP_ON_FALSE,

  writeWith(writer: InstructionWriter, offset: number) {
    writer.write(this.type);
    writer.write(offset);
  },

  explain(offset: number) {
    return `Pop and jump ${offset} on False`;
  },

  readArgs(reader: InstructionReader, target: number[]): [number] {
    reader.read();
    target[0] = reader.read();
    return target as [number];
  },

  do(machine: VirtualMachine, offset: number) {
    const context = machine.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const { evalStack } = context;
    const object = evalStack.pop();
    invariant(object, StackUnderflowError, "evaluation");
    if (object.isFalse) {
      context.pc += offset;
      invariant(
        context.pc >= 0 && context.pc < context.closure.instructionByteLength,
        RangeError,
        context.pc,
        0,
        context.closure.instructionByteLength,
      );
    }
  },
};

const instructionTypes: Instruction<any>[] = [
  // instPopAndStoreReceiverVar,
  // instPopAndStoreTempVar,
  instPushSpecialVal,
  instReturnSpecialVal,
  // instReturnStackTopFrom,
  instPush,
  instStore,
  instPopAndStore,
  // instSendSpecialSelector,
  instSendLiteralSelectorExt,
  // instSuperSendSpecialSelector,
  // instSuperSendLiteralSelectorExt,
  instPop,
  instDuplicate,
  instJump,
  instPopAndJumpOnTrue,
  instPopAndJumpOnFalse,
];

// sort in descending order of type
instructionTypes.sort((a, b) => b.type - a.type);

const instructionCodeCache = Dict<Instruction<any>>();

function packBits(num1: number, num2: number, num2Bits: number): number {
  invariant(
    num2 < 1 << num2Bits,
    RangeError,
    0,
    1 << (num2Bits - 1),
    num2,
    `a ${num2Bits}-bit number`,
  );
  return (num1 << num2Bits) | num2;
}

function unpackBits(
  packed: number,
  num2Bits: number,
  target: [number, number] = [0, 0],
): [number, number] {
  target[0] = packed >> num2Bits;
  target[1] = packed & ((1 << num2Bits) - 1);
  return target;
}

export function peekInstruction(reader: InstructionReader): Instruction<any> {
  const code = reader.peek();

  const cached = instructionCodeCache[code];

  if (cached) {
    return cached;
  }

  for (const inst of instructionTypes) {
    if (inst.type <= code) {
      instructionCodeCache[code] = inst;
      return inst;
    }
  }
  raise(UnknownVMInstruction, code);
}

const SIGNED_TWO_BYTE_MIN = -1 << 15;
const SIGNED_TWO_BYTE_MAX = (1 << 15) - 1;

/**
 * My instances write VM instructions to an Int16Array.
 * (TODO:optmem) (TODO:optspeed) Each type of instruction uses only the number of bytes it needs
 */
export class InstructionWriter {
  private index = 0;
  get finished() {
    return this.index >= this.view.byteLength;
  }
  constructor(private view: DataView) {}

  write(twoBytes: number) {
    invariant(
      twoBytes >= SIGNED_TWO_BYTE_MIN && twoBytes <= SIGNED_TWO_BYTE_MAX,
      RangeError,
      twoBytes,
      SIGNED_TWO_BYTE_MIN,
      SIGNED_TWO_BYTE_MAX,
      "a signed two byte value",
    );
    this.view.setInt16(this.index, twoBytes, true);
    this.index += 2;
  }

  reset() {
    this.index = 0;
  }
}

/**
 * My instances read VM instructions from a typed array.
 */
export class InstructionReader {
  private index = 0;
  get finished() {
    return this.index >= this.view.byteLength;
  }

  constructor(private view: DataView) {}

  getAndSkip(n: number): number {
    const res = this.view.getInt16(this.index, true);
    this.index += n;
    return res;
  }

  read(): number {
    return this.getAndSkip(2);
  }

  peek(): number {
    return this.getAndSkip(0);
  }

  reset() {
    this.index = 0;
  }
}
