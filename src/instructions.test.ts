import { describe, expect, test } from "vitest";
import {
  type Instruction,
  InstructionWriter,
  InstructionReader,
  peekInstruction,
  instPopAndStoreReceiverVar,
  instPopAndStoreTempVar,
  instPushSpecialVal,
  SpecialPushValue,
  instReturnSpecialVal,
  SpecialReturnValue,
  instReturnStackTopFrom,
  EvaluationStackType,
  instPush,
  PushSource,
  instStore,
  StoreTarget,
  instPopAndStore,
  instSendSpecialSelector,
  SpecialSelector,
  instSendLiteralSelectorExt,
  instSuperSendSpecialSelector,
  instSuperSendLiteralSelectorExt,
  instPop,
  instDuplicate,
  instJump,
  instPopAndJumpOnTrue,
  instPopAndJumpOnFalse,
} from "./instructions";

const array = new Int16Array(3);
const writer = new InstructionWriter(array);
const reader = new InstructionReader(array);

function testPeekInstruction<TArgs extends any[], I extends Instruction<TArgs>>(
  instruction: I,
  args: TArgs,
) {
  writer.reset();
  reader.reset();
  instruction.writeWith(writer, ...args);
  const result = peekInstruction(reader);
  expect(result).toBe(instruction);
}

function testReadInstructionArgs<
  TArgs extends any[],
  I extends Instruction<TArgs>,
>(instruction: I, args: TArgs) {
  writer.reset();
  reader.reset();
  instruction.writeWith(writer, ...args);
  const readArgs = [] as any[];
  expect(instruction.readArgs(reader, readArgs)).toEqual(args);
}

function testInstruction<TArgs extends any[], I extends Instruction<TArgs>>(
  instruction: I,
  args: TArgs,
) {
  const testDescription = instruction.explain(...args);
  describe(testDescription, () => {
    test("Peek Instruction", () => {
      testPeekInstruction(instruction, args);
    });
    test("Read Instruction Args", () => {
      testReadInstructionArgs(instruction, args);
    });
  });
}

describe("Instructions", () => {
  testInstruction(instPopAndStoreReceiverVar, [3]);
  testInstruction(instPopAndStoreTempVar, [3]);
  testInstruction(instPushSpecialVal, [SpecialPushValue.NegativeOne]);
  testInstruction(instReturnSpecialVal, [SpecialReturnValue.Self]);
  testInstruction(instReturnStackTopFrom, [EvaluationStackType.Block]);
  testInstruction(instPush, [PushSource.ReceiverVar, 3]);
  testInstruction(instStore, [StoreTarget.ReceiverVar, 3]);
  testInstruction(instPopAndStore, [StoreTarget.LiteralVar, 3]);
  testInstruction(instSendSpecialSelector, [SpecialSelector.NextPut, 3]);
  testInstruction(instSendLiteralSelectorExt, [12, 4]);
  testInstruction(instSuperSendSpecialSelector, [SpecialSelector.NextPut, 3]);
  testInstruction(instSuperSendLiteralSelectorExt, [12, 4]);
  testInstruction(instPop, []);
  testInstruction(instDuplicate, []);
  testInstruction(instJump, [5]);
  testInstruction(instJump, [-5]);
  testInstruction(instPopAndJumpOnTrue, [5]);
  testInstruction(instPopAndJumpOnTrue, [-5]);
  testInstruction(instPopAndJumpOnFalse, [5]);
  testInstruction(instPopAndJumpOnFalse, [-5]);
});
