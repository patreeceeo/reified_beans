/**
 * Utility functions for compiling an Machine from a workspace.
 */
import * as Blockly from 'blockly/core';
import {Dict, Queue, Stack} from "./generics";
import {MachineOp, newMachineOp} from './machine_ops';
import * as forBlock from './block_compilers';
import {invariant} from './Error';
import {Machine} from './machine';
import {ClassValue} from './values/class_value';
import {getBoxedValue} from './value_box';
import {stdlib, loadStdlib} from './stdlib';
import {type ClassDefinition} from './class_definitions';
import {ProcValue, resetProcId, type ProcId} from './values/proc_value';

export interface BlockCompiler {
  (block: Blockly.Block, compiler: Compiler): void;
}

export class Compiler {
  messageBlockQueue = Queue<Blockly.Block>();
  statementBlockStack = Stack<Blockly.Block>();
  forBlock = forBlock;
  opsByProc = Dict<MachineOp[]>();
  procStack = Stack<ProcId>();
  procById = Dict<ProcValue>();
  statementPostfixOps = [] as MachineOp[];

  constructor(
    readonly workspace: Blockly.Workspace
  ) {}

  reset() {
    this.messageBlockQueue = Queue<Blockly.Block>();
    this.statementBlockStack = Stack<Blockly.Block>();
    this.opsByProc = Dict<MachineOp[]>();
    this.procStack = Stack<ProcId>();
    this.procById = Dict<ProcValue>();
    resetProcId()
  }

  compile() {
    this.reset();
    const globalProc = this.newProc();
    this.pushProc(globalProc.id);

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
    for(const procId in this.opsByProc) {
      const proc = this.procById[procId];
      invariant(proc !== undefined, "No proc with id");
      proc.address = ops.length;
      Object.freeze(proc);

      ops.push(...this.opsByProc[procId]);
    }

    const machine = new Machine(ops, this.procById);
    return machine;
  }


  newProc(): ProcValue {
    const proc = new ProcValue();
    this.opsByProc[proc.id] = [];
    this.procById[proc.id] = proc;
    return proc;
  }

  pushProc(procId: ProcId): void {
    this.procStack.push(procId);
  }

  popProc() {
    invariant(this.procStack.length > 0, "No proc to pop");
    const id = this.procStack.pop()!;
    const proc = this.procById[id];
    invariant(proc !== undefined, "No proc with id");
    proc.lexicalParentScopeProcId = this.procStack.peek();
  }

  addOpsToCurrentProc(...ops: MachineOp[]) {
    const {procStack, opsByProc} = this;
    const proc = procStack.peek();
    invariant(proc !== undefined, "No proc on the stack");
    const opsForProc = opsByProc[proc];
    invariant(opsForProc !== undefined, "No ops array for proc");
    opsForProc.push(...ops);
  }

  queueNextMessageBlock(block: Blockly.Block) {
    const nextBlock = block.getInputTargetBlock('NEXT')!;
    if(nextBlock) {
      this.messageBlockQueue.push(nextBlock);
    } else {
      console.log("No next block for", block.type);
    }
  }

  compileBlock(block: Blockly.Block) {
    this.messageBlockQueue.push(block);
    this.process();
  }

  pushNextStatementBlock(block: Blockly.Block) {
    const nextStatementBlock = block.getNextBlock();
    if(nextStatementBlock) {
      this.statementBlockStack.push(nextStatementBlock);
    }
  }

  getBlockCompiler(block: Blockly.Block): BlockCompiler {
    const compiler = this.forBlock[block.type as keyof typeof forBlock];
    invariant(compiler !== undefined, `No compiler for block type ${block.type}`);
    return compiler;
  }

  process() {
    let block: Blockly.Block | undefined;
    while(true) {

      if(this.messageBlockQueue.length > 0) {
        block = this.messageBlockQueue.shift()!;
      } else {

        // Whether or not there's a next statement, need to finish the current statement.
        this.addOpsToCurrentProc(...this.statementPostfixOps);
        this.statementPostfixOps.length = 0;

        if(this.statementBlockStack.length > 0) {
          block = this.statementBlockStack.pop()!;
        } else {

          // No more blocks to process
          break;
        }
      }

      const compiler = this.getBlockCompiler(block);
      compiler(block, this);
    }
  }

  popStateOp = newMachineOp("PopState");
  /** Add ops to a new proc and return the procId */
  compileMethod(ops: readonly MachineOp[]) {
    const proc = this.newProc();
    this.pushProc(proc.id);
    this.addOpsToCurrentProc(...ops, this.popStateOp);
    this.popProc();
    return proc;
  }

  /** Add the class def's methods to new procs and also instruct the machine to
  * add the class value to its scope */
  processClass(classDef: ClassDefinition<unknown>) {
    const procIds = {} as Record<string, ProcId>;
    for(const [methodName, methodOps] of Object.entries(classDef.methodOpsByName)) {
      const proc = this.compileMethod(methodOps);
      procIds[methodName] = proc.id;
    }
    const classValue = new ClassValue(procIds, classDef.instantiate);
    const classBoxedValue = getBoxedValue(classValue);
    this.addOpsToCurrentProc(newMachineOp("AddToScope", classDef.className, classBoxedValue));
  }
}
