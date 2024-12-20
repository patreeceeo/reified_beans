import type {BlockCompiler} from './compiler';
import {newMachineOp } from './machine_ops';

export const math_number: BlockCompiler = (block, compiler) => {
  compiler.queueNextBlock(block);
  return [
    newMachineOp(
      "PushArg",
      Number(block.getFieldValue('VALUE'))
    )
  ];
}

export const controls_begin_statement: BlockCompiler = (block, compiler) => {
  compiler.queueNextBlock(block);
  return [
    newMachineOp(
      "ClearArgs"
    )
  ]
}

export const number_messages_binary: BlockCompiler = (block, compiler) => {
  const nextBlock = block.getInputTargetBlock('NEXT')!;
  if(nextBlock === null) {
    console.log("No next block for number_messages_binary");
    return [];
  }
  const nextBlockValueField = nextBlock.getField('VALUE');
  if(nextBlockValueField === null) {
    console.log("No value field for next block of number_messages_binary");
    return [];
  }
  compiler.queueNextBlock(nextBlock);
  return [
    newMachineOp(
      "PushArg",
      nextBlockValueField.getValue()
    ),
    newMachineOp(
      "Basic",
      block.getFieldValue('OP'),
      2
    )
  ]
}

