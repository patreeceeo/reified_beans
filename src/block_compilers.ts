import {theProcClass} from './class_definitions';
import type {BlockCompiler} from './compiler';
import {newMachineOp } from './machine_ops';

export const math_number: BlockCompiler = (block, compiler) => {
  compiler.queueNextBlock(block);
  compiler.addOpsToCurrentProc(
    newMachineOp(
      "PushArg",
      Number(block.getFieldValue('VALUE'))
    )
  )
}

export const controls_begin_statement: BlockCompiler = (block, compiler) => {
  compiler.queueNextBlock(block);
  compiler.addOpsToCurrentProc(
    newMachineOp(
      "ClearArgs"
    )
  )
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
  compiler.addOpsToCurrentProc(
    newMachineOp(
      "PushArg",
      nextBlockValueField.getValue()
    ),
    newMachineOp(
      "Basic",
      block.getFieldValue('OP'),
      2
    )
  )
}

export const boolean_messages_ifTrue_ifFalse: BlockCompiler = (block, compiler) => {
  const ifTrue = block.getInputTargetBlock('IF_TRUE');
  const ifFalse = block.getInputTargetBlock('IF_FALSE');

  // Need to have at least one branch
  if(!ifTrue && !ifFalse) {
    return;
  }

  const methodNameParts = [];

  if(ifTrue) {
    methodNameParts.push("ifTrue");
  }

  if(ifFalse) {
    methodNameParts.push("ifFalse");
  }

  compiler.addOpsToCurrentProc(
    // the receiver (next arg) should be a boolean, look up the method on it
    newMachineOp("LookupMethod", methodNameParts.join("_")),
  )

  if(ifTrue) {
    // this block should be an expression that evaluates to a proc
    compiler.compileBlock(ifTrue);
  }

  if(ifFalse) {
    // this block should be an expression that evaluates to a proc
    compiler.compileBlock(ifFalse);
  }

  compiler.addOpsToCurrentProc(
    // the lookup method op will have unshifted the method's proc id into the args
    // push state to shift the proc from args and call it
    newMachineOp("PushState"),
  );
}

export const procedures_defreturn: BlockCompiler = (block, compiler) => {
  const proc = compiler.newProc();
  const stack = block.getInputTargetBlock('STACK');
  if(stack) {
    compiler.pushProc(proc.id);
    compiler.compileBlock(stack);
    compiler.addOpsToCurrentProc(
      newMachineOp(
        "PopState",
      )
    );
    compiler.popProc();
  }
  compiler.addOpsToCurrentProc(
    newMachineOp(
      "PushArg",
      proc,
      theProcClass
    )
  )
}
