/**
 * Utility functions for compiling an Machine from a workspace.
 */
import * as Blockly from 'blockly/core';
import {Dict, Queue, Stack} from "./generics";
import {MachineOp, newMachineOp} from './machine_ops';
import * as forBlock from './block_compilers';
import {invariant} from './Error';
import {Machine} from './machine';
import {ClassValue} from './class_value';
import {getBoxedValue} from './boxed_value';
import {stdlib, loadStdlib} from './stdlib';
import {theClassClass, type ClassDefinition} from './class_definitions';

export interface BlockCompiler {
  (block: Blockly.Block, compiler: Compiler): void;
}



export class Compiler {
  blockQueue = Queue<Blockly.Block>();
  forBlock = forBlock;
  opsByProc = Dict<MachineOp[]>();
  procStack = Stack<string>();

  constructor(
    readonly workspace: Blockly.Workspace
  ) {
  }

  compile() {
    this.clearProcs();
    const globalProcId = this.newProc();
    this.pushProc(globalProcId);

    // include stdlib
    loadStdlib();
    for(const classDef of stdlib) {
      this.processClass(classDef);
    }

    const blocks = this.workspace.getTopBlocks(true);
    for (const block of blocks) {
      this.compileBlock(block);
    }
    this.addOpsToCurrentProc(newMachineOp("Halt"));

    const ops = [];
    const procAddressBook = Dict<VirtualMachineAddress>();
    for(const procId in this.opsByProc) {
      procAddressBook[procId] = ops.length;
      ops.push(...this.opsByProc[procId]);
    }

    return new Machine(ops, procAddressBook);
  }

  compileBlock(block: Blockly.Block) {
    this.blockQueue.push(block);
    this.processBlockQueue();
  }

  clearProcs() {
    this.opsByProc = {};
  }

  newProc(): string {
    const procId = Blockly.utils.idGenerator.genUid();
    this.opsByProc[procId] = [];
    return procId;
  }

  pushProc(procId: string): void {
    this.procStack.push(procId);
  }

  popProc() {
    this.procStack.pop();
  }

  addOpsToCurrentProc(...ops: MachineOp[]) {
    const {procStack: procedureStack, opsByProc: opsByProcedure} = this;
    const proc = procedureStack.peek();
    invariant(proc !== undefined, "No proc on the stack");
    const opsForProc = opsByProcedure[proc];
    invariant(opsForProc !== undefined, "No ops array for proc");
    opsForProc.push(...ops);
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

  processBlockQueue() {
    while (this.blockQueue.length > 0) {
      const block = this.blockQueue.shift()!;
      const compiler = this.getBlockCompiler(block);
      compiler(block, this);
    }
  }

  /** Add ops to a new proc and return the procId */
  addOpsToNewProc(ops: readonly MachineOp[]) {
    const procId = this.newProc();
    this.pushProc(procId);
    this.addOpsToCurrentProc(...ops);
    this.popProc();
    return procId;
  }

  /** Add the class def's methods to new procs and also instruct the machine to
  * add the class value to its scope */
  processClass(classDef: ClassDefinition) {
    const procIds = {} as Record<string, string>;
    for(const [methodName, methodOps] of Object.entries(classDef.methodOpsByName)) {
      const procId = this.addOpsToNewProc(methodOps);
      procIds[methodName] = procId;
    }
    const classValue = new ClassValue(procIds);
    this.addOpsToCurrentProc(newMachineOp("AddToScope", classDef.className, getBoxedValue(classValue, theClassClass)));
  }
}
