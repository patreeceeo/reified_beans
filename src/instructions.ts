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
  writeWith(writer: InstructionPointer, ...args: TArgs): void;
  explain(...args: TArgs): string;
  readArgs(reader: InstructionPointer, target: number[]): TArgs;
  do(machine: VirtualMachine, ...args: TArgs): void;
}

/**
 * Pop the object from the top of the stack and store in the receiver variable at the given 0-based offset
 * @param offset The offset from the start of the receiver variables
 *
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

  writeWith(writer, value) {
    writer.write(this.type + value);
  },

  explain(value) {
    return `Push special value ${SpecialPushValue[value]}`;
  },

  readArgs(reader, target): [SpecialPushValue] {
    target[0] = reader.read() - this.type;
    return target as [SpecialPushValue];
  },

  do(machine, value) {
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

  writeWith(writer, value) {
    writer.write(this.type + value);
  },

  explain(value) {
    return `Return special value ${SpecialReturnValue[value]}`;
  },

  readArgs(reader, target): [SpecialReturnValue] {
    target[0] = reader.read() - this.type;
    return target as [SpecialReturnValue];
  },

  do(machine, value) {
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

  writeWith(writer, source, offset) {
    writer.write(this.type);
    writer.write(packBits(source, offset, this.bitShift));
  },

  explain(source: ContextValue, offset: number) {
    return `Push from ${ContextValue[source]} at offset ${offset}`;
  },

  readArgs(reader, target): [ContextValue, number] {
    reader.read();
    return unpackBits(reader.read(), this.bitShift, target as [number, number]);
  },

  do(machine, source, offset) {
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

  writeWith(writer, target, offset) {
    writer.write(this.type);
    writer.write(packBits(target, offset, this.bitShift!));
  },

  explain(target: ContextVariable, offset: number) {
    return `Store to ${ContextVariable[target]} at offset ${offset}`;
  },

  readArgs(reader, target): [ContextVariable, number] {
    reader.read();
    return unpackBits(
      reader.read(),
      this.bitShift!,
      target as [number, number],
    );
  },

  do(machine, target, offset) {
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

  writeWith(writer, target, offset: number) {
    writer.write(this.type);
    writer.write(packBits(target, offset, this.bitShift!));
  },

  explain(target: ContextVariable, offset: number) {
    return `Pop and store to ${ContextVariable[target]} at offset ${offset}`;
  },

  readArgs(reader, target): [ContextVariable, number] {
    reader.read();
    return unpackBits(
      reader.read(),
      this.bitShift!,
      target as [number, number],
    );
  },

  do(machine, target, offset) {
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

  writeWith(writer, selector, numArgs) {
    writer.write(this.type);
    writer.write(packBits(selector, numArgs, this.bitShift));
  },

  explain(selector: number, numArgs: number) {
    return `Send literal selector ${selector} with ${numArgs} args`;
  },

  readArgs(reader, target): [number, number] {
    reader.read();
    return unpackBits(reader.read(), this.bitShift, target as [number, number]);
  },

  do(machine, selectorIndex, numArgs) {
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

  writeWith(writer) {
    writer.write(this.type);
  },

  explain() {
    return `Pop`;
  },

  readArgs(reader, target): [] {
    reader.read();
    return target as [];
  },

  do(machine) {
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

  writeWith(writer) {
    writer.write(this.type);
  },

  explain() {
    return `Duplicate`;
  },

  readArgs(reader, target: number[]): [] {
    reader.read();
    return target as [];
  },

  do(machine) {
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

  writeWith(writer, offset) {
    writer.write(this.type);
    writer.write(offset);
  },

  explain(offset: number) {
    return `Jump ${offset}`;
  },

  readArgs(reader, target): [number] {
    reader.read();
    target[0] = reader.read();
    return target as [number];
  },

  do(machine, offset) {
    const context = machine.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    context.instructionPointer.jumpRelative(offset);
  },
};

/**
 * If the object on the top of the Stack is True, pop it and jump the given number of bytes.
 * Otherwise, continue to the next instruction.
 * @param offset The number of bytes to jump, can be negative.
 */
export const instPopAndJumpOnTrue: Instruction<[number]> = {
  type: InstructionType.POP_AND_JUMP_ON_TRUE,

  writeWith(writer, offset: number) {
    writer.write(this.type);
    writer.write(offset);
  },

  explain(offset: number) {
    return `Pop and jump ${offset} on True`;
  },

  readArgs(reader, target): [number] {
    reader.read();
    target[0] = reader.read();
    return target as [number];
  },

  do(machine, offset) {
    const context = machine.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const { evalStack } = context;
    const object = evalStack.pop();
    invariant(object, StackUnderflowError, "evaluation");
    if (object.isTrue) {
      context.instructionPointer.jumpRelative(offset);
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

  writeWith(writer, offset) {
    writer.write(this.type);
    writer.write(offset);
  },

  explain(offset) {
    return `Pop and jump ${offset} on False`;
  },

  readArgs(reader, target): [number] {
    reader.read();
    target[0] = reader.read();
    return target as [number];
  },

  do(machine, offset) {
    const context = machine.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    const { evalStack } = context;
    const object = evalStack.pop();
    invariant(object, StackUnderflowError, "evaluation");
    if (object.isFalse) {
      context.instructionPointer.jumpRelative(offset);
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

export function reifyInstruction(code: number): Instruction<any> {
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
 * My instances read/write VM instructions to an Int16Array.
 * (TODO:optmem) (TODO:optspeed) Each type of instruction uses only the number of bytes it needs
 */
export class InstructionPointer {
  byteOffset = 0;

  get finished() {
    return this.byteOffset >= this.byteOffsetLimit;
  }

  private view: DataView;

  constructor(
    buffer: ArrayBuffer,
    byteOffsetInBuffer: number,
    readonly byteOffsetLimit: number,
  ) {
    this.view = new DataView(buffer, byteOffsetInBuffer, byteOffsetLimit);
  }

  peek(): number {
    return this.view.getInt16(this.byteOffset, true);
  }

  read(): number {
    const code = this.peek();
    this.byteOffset += 2;
    return code;
  }

  write(twoBytes: number) {
    invariant(
      twoBytes >= SIGNED_TWO_BYTE_MIN && twoBytes <= SIGNED_TWO_BYTE_MAX,
      RangeError,
      twoBytes,
      SIGNED_TWO_BYTE_MIN,
      SIGNED_TWO_BYTE_MAX,
      "a signed two byte value",
    );
    this.view.setInt16(this.byteOffset, twoBytes, true);
    this.byteOffset += 2;
  }

  reset() {
    this.byteOffset = 0;
  }

  jumpRelative(byteCount: number) {
    this.byteOffset += byteCount;
    invariant(
      this.byteOffset >= 0 && this.byteOffset <= this.byteOffsetLimit,
      RangeError,
      0,
      this.byteOffsetLimit,
      this.byteOffset,
      "a valid byte offset",
    );
  }
}
