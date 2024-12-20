/**
 * Utility functions for compiling an Machine from a workspace.
 */
import * as Blockly from 'blockly/core';
import {Queue} from "./generics";
import {MachineOp, newMachineOp} from './machine_ops';
import * as forBlock from './block_compilers';
import {invariant} from './Error';
import {Machine} from './machine';

export interface BlockCompiler {
  (block: Blockly.Block, compiler: Compiler): ReadonlyArray<MachineOp>;
}

export class Compiler {
  blockQueue = Queue<Blockly.Block>();
  ops = [] as MachineOp[];
  forBlock = forBlock;

  constructor(
    readonly workspace: Blockly.Workspace
  ) {}

  compile() {
    this.ops.length = 0;
    const blocks = this.workspace.getTopBlocks(true);
    for (const block of blocks) {
      this.blockQueue.push(block);
      this.processQueue();
    }
    this.ops.push(newMachineOp("Halt"));
    console.log("Compiled machine ops:");
    for(const op of this.ops) {
      console.log(op.toString());
    }
    return new Machine(this.ops);
  }

  queueNextBlock(block: Blockly.Block) {
    const nextBlock = block.getInputTargetBlock('NEXT')!;
    if(nextBlock) {
      this.blockQueue.push(nextBlock);
    } else {
      console.log("No next block for", block.type);
    }
  }

  getBlockCompiler(block: Blockly.Block): BlockCompiler {
    const compiler = this.forBlock[block.type as keyof typeof forBlock];
    invariant(compiler !== undefined, `No compiler for block type ${block.type}`);
    return compiler;
  }

  processQueue() {
    while (this.blockQueue.length > 0) {
      const block = this.blockQueue.shift()!;
      const compiler = this.getBlockCompiler(block);
      const ops = compiler(block, this);
      console.log("compiled block", block.type, "to ops", ops);
      this.ops.push(...ops);
    }
  }
}
