import { invariant, raise, RangeError, UnknownVMInstruction } from "./errors";
import { Dict } from "./generics";

type Uint2 = 0 | 1 | 2 | 3;
type Uint3 = Uint2 | 4 | 5 | 6 | 7;

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

export enum SpecialPushValue {
  Self,
  True,
  False,
  Nil,
  NegativeOne,
  Zero,
  One,
  Two,
}

export enum SpecialReturnValue {
  Self,
  True,
  False,
  Nil,
}

export enum EvaluationStackType {
  Message,
  Block,
}

export enum PushSource {
  ReceiverVar,
  TempVar,
  LiteralConst,
  LiteralVar,
}

export enum StoreTarget {
  ReceiverVar,
  TempVar,
  LiteralVar = 3,
}

export enum SpecialSelector {
  Plus,
  Minus,
  LessThan,
  GreaterThan,
  LessThanOrEqual,
  GreaterThanOrEqual,
  Equal,
  NotEqual,
  Times,
  Divide,
  Mod,
  At,
  BitShift,
  BitAnd,
  BitOr,
  AtPut,
  Size,
  Next,
  NextPut,
  AtEnd,
  EqualEqual,
  Class,
  BlockCopy,
  Value,
  ValueColon,
  Do,
  New,
  NewColon,
  X,
  Y,
}

export interface Instruction<TArgs extends any[]> {
  readonly type: InstructionType;
  writeWith(writer: InstructionWriter, ...args: TArgs): void;
  explain(...args: TArgs): string;
  readArgs(reader: InstructionReader, target: number[]): TArgs;
}

/**
 * Pop the object from the top of the stack and store in the receiver variable at the given offset
 * @param offset The offset from the start of the receiver variables
 */
export const instPopAndStoreReceiverVar: Instruction<[Uint3]> = {
  type: InstructionType.POP_AND_STORE_RECEIVER_VAR,

  writeWith(writer: InstructionWriter, offset: Uint3) {
    writer.write(this.type + offset);
  },

  explain(offset: Uint3) {
    return `Pop and store receiver var at offset ${offset}`;
  },

  readArgs(reader: InstructionReader, target: number[]): [Uint3] {
    target[0] = reader.read() - this.type;
    return target as [Uint3];
  },
};

/**
 * Pop the object from the top of the stack and store in the temporary variable at the given offset
 * @param offset The offset from the start of the temporary variables
 */
export const instPopAndStoreTempVar: Instruction<[Uint3]> = {
  type: InstructionType.POP_AND_STORE_TEMP_VAR,

  writeWith(writer: InstructionWriter, offset: number) {
    writer.write(this.type + offset);
  },

  explain(offset: number) {
    return `Pop and store temp var at offset ${offset}`;
  },

  readArgs(reader: InstructionReader, target: number[]): [Uint3] {
    target[0] = reader.read() - this.type;
    return target as [Uint3];
  },
};

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
};

/**
 * Return the object on the top of the return Stack
 * @param value Whether to return from a message or Block
 * @see EvaluationStackType
 */
export const instReturnStackTopFrom: Instruction<[EvaluationStackType]> = {
  type: InstructionType.RETURN_STACK_TOP_FROM,

  writeWith(writer: InstructionWriter, value: EvaluationStackType) {
    writer.write(this.type + value);
  },

  explain(value: EvaluationStackType) {
    return `Return stack top from ${EvaluationStackType[value]}`;
  },

  readArgs(reader: InstructionReader, target: number[]): [EvaluationStackType] {
    target[0] = reader.read() - this.type;
    return target as [EvaluationStackType];
  },
};

/**
 * Push an object onto the eval stack
 * @param source The source of the object to push
 * @param offset The offset from the source
 * @see PushSource
 */
export const instPush: Instruction<[PushSource, number]> & {
  readonly bitShift: number;
} = {
  type: InstructionType.PUSH,

  bitShift: 6,

  writeWith(writer: InstructionWriter, source: PushSource, offset: number) {
    writer.write(this.type);
    writer.write(packBits(source, offset, this.bitShift!));
  },

  explain(source: PushSource, offset: number) {
    return `Push from ${PushSource[source]} at offset ${offset}`;
  },

  readArgs(reader: InstructionReader, target: number[]): [PushSource, number] {
    reader.read();
    return unpackBits(
      reader.read(),
      this.bitShift!,
      target as [number, number],
    );
  },
};

/**
 * Store the object on the top of the stack in the indicated location
 * @param target The target of the Store instruction
 * @param offset The offset from the target
 * @see StoreTarget
 */
export const instStore: Instruction<[StoreTarget, number]> & {
  readonly bitShift: number;
} = {
  type: InstructionType.STORE,

  bitShift: 6,

  writeWith(writer: InstructionWriter, target: StoreTarget, offset: number) {
    writer.write(this.type);
    writer.write(packBits(target, offset, this.bitShift!));
  },

  explain(target: StoreTarget, offset: number) {
    return `Store to ${StoreTarget[target]} at offset ${offset}`;
  },

  readArgs(reader: InstructionReader, target: number[]): [StoreTarget, number] {
    reader.read();
    return unpackBits(
      reader.read(),
      this.bitShift!,
      target as [number, number],
    );
  },
};

/**
 * Pop the object from the top of the stack and store in the indicated location
 * @param target The target of the PopAndStore instruction
 * @param offset The offset from the target
 * @see StoreTarget
 */
export const instPopAndStore: Instruction<[StoreTarget, number]> & {
  readonly bitShift: number;
} = {
  type: InstructionType.POP_AND_STORE,

  bitShift: 6,

  writeWith(writer: InstructionWriter, target: StoreTarget, offset: number) {
    writer.write(this.type);
    writer.write(packBits(target, offset, this.bitShift!));
  },

  explain(target: StoreTarget, offset: number) {
    return `Pop and store to ${StoreTarget[target]} at offset ${offset}`;
  },

  readArgs(reader: InstructionReader, target: number[]): [StoreTarget, number] {
    reader.read();
    return unpackBits(
      reader.read(),
      this.bitShift!,
      target as [number, number],
    );
  },
};

/**
 * Send a message using a special selector with the given number of arguments.
 * The arguments are taken from the stack, followed by the receiver.
 * @param selector The special selector to Send
 * @param numArgs The number of arguments to the Message
 * @see SpecialSelector
 */
export const instSendSpecialSelector: Instruction<[SpecialSelector, number]> & {
  readonly bitShift: number;
} = {
  type: InstructionType.SEND_SPECIAL_SELECTOR,

  bitShift: 3,

  writeWith(
    writer: InstructionWriter,
    selector: SpecialSelector,
    numArgs: number,
  ) {
    writer.write(this.type);
    writer.write(packBits(selector, numArgs, this.bitShift));
  },

  explain(selector: SpecialSelector, numArgs: number) {
    return `Send special selector ${SpecialSelector[selector]} with ${numArgs} args`;
  },

  readArgs(
    reader: InstructionReader,
    target: number[],
  ): [SpecialSelector, number] {
    reader.read();
    return unpackBits(reader.read(), this.bitShift, target as [number, number]);
  },
};

/**
 * Send a message using a literal selector with the given number of arguments.
 * The arguments are taken from the stack, followed by the receiver.
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
};

/**
 * Send a message to the superclass using a special selector with the given number of arguments.
 * @param selector The special selector to Send
 * @param numArgs The number of arguments to the Message
 * @see SpecialSelector
 */
export const instSuperSendSpecialSelector: Instruction<
  [SpecialSelector, number]
> & { readonly bitShift: number } = {
  type: InstructionType.SUPER_SEND_SPECIAL_SELECTOR,

  bitShift: 3,

  writeWith(
    writer: InstructionWriter,
    selector: SpecialSelector,
    numArgs: number,
  ) {
    writer.write(this.type);
    writer.write(packBits(selector, numArgs, this.bitShift));
  },

  explain(selector: SpecialSelector, numArgs: number) {
    return `Super send special selector ${SpecialSelector[selector]} with ${numArgs} args`;
  },

  readArgs(
    reader: InstructionReader,
    target: number[],
  ): [SpecialSelector, number] {
    reader.read();
    return unpackBits(reader.read(), this.bitShift, target as [number, number]);
  },
};

/**
 * Send a message to the superclass using a literal selector with the given number of arguments.
 * The arguments are taken from the stack, followed by the receiver.
 * @param selector The index of the literal selector found in the method's literal array
 * @param numArgs The number of arguments to the message
 */
export const instSuperSendLiteralSelectorExt: Instruction<[number, number]> & {
  readonly bitShift: 7;
} = {
  type: InstructionType.SUPER_SEND_LITERAL_SELECTOR_EXT,

  bitShift: 7,

  writeWith(writer: InstructionWriter, selector: number, numArgs: number) {
    writer.write(this.type);
    writer.write(packBits(selector, numArgs, this.bitShift));
  },

  explain(selector: number, numArgs: number) {
    return `Super send literal selector ${selector} with ${numArgs} args`;
  },

  readArgs(reader: InstructionReader, target: number[]): [number, number] {
    reader.read();
    return unpackBits(reader.read(), this.bitShift, target as [number, number]);
  },
};

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
};

const instructionList: Instruction<any>[] = [
  instPopAndStoreReceiverVar,
  instPopAndStoreTempVar,
  instPushSpecialVal,
  instReturnSpecialVal,
  instReturnStackTopFrom,
  instPush,
  instStore,
  instPopAndStore,
  instSendSpecialSelector,
  instSendLiteralSelectorExt,
  instSuperSendSpecialSelector,
  instSuperSendLiteralSelectorExt,
  instPop,
  instDuplicate,
  instJump,
  instPopAndJumpOnTrue,
  instPopAndJumpOnFalse,
];

// sort in descending order of type
instructionList.sort((a, b) => b.type - a.type);

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

  for (const inst of instructionList) {
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
 */
export class InstructionWriter {
  private index = 0;
  finished = false;
  constructor(private target: Int16Array) {}

  write(twoBytes: number) {
    invariant(
      !this.finished,
      RangeError,
      this.index,
      0,
      this.target.length - 1,
      "an instruction index",
    );
    invariant(
      twoBytes >= SIGNED_TWO_BYTE_MIN && twoBytes <= SIGNED_TWO_BYTE_MAX,
      RangeError,
      twoBytes,
      SIGNED_TWO_BYTE_MIN,
      SIGNED_TWO_BYTE_MAX,
      "a signed two byte value",
    );
    this.target[this.index++] = twoBytes;
    this.finished = this.index === this.target.length;
  }

  reset() {
    this.index = 0;
    this.finished = false;
  }
}

/**
 * My instances read VM instructions from a typed array.
 */
export class InstructionReader {
  private index = 0;
  finished = false;
  constructor(private source: Int16Array) {}

  getAndSkip(n: number): number {
    invariant(
      !this.finished,
      RangeError,
      this.index,
      0,
      this.source.length - 1,
      "an instruction index",
    );
    const res = this.source[this.index];
    this.index += n;
    this.finished = this.index >= this.source.length;
    return res;
  }

  read(): number {
    return this.getAndSkip(1);
  }

  peek(): number {
    return this.getAndSkip(0);
  }

  reset() {
    this.index = 0;
    this.finished = false;
  }
}
