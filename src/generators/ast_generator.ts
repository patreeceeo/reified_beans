/**
 * Utility functions for generating an abstract syntax tree (AST) from a Blockly workspace.
 */
import * as Blockly from 'blockly/core';
import {ProgramTree, AbstractSyntaxTree, StatementTree} from 'src/ast';
import {invariant, raise} from 'src/Error';
import {forBlock} from './block_generators';



/**
 * Class that translates the blocks into a syntax tree.
 */
export class ASTGenerator {
  /**
   * A dictionary of block generator functions, keyed by block type.
   * Each block generator function takes two parameters:
   *
   * - the Block to generate code for, and
   * - the calling CodeGenerator (or subclass) instance, so the
   *   function can call methods defined below (e.g. blockToCode) or
   *   on the relevant subclass (e.g. JavascripGenerator),
   *
   * and returns:
   *
   * - a [code, precedence] tuple (for value/expression blocks), or
   * - a string containing the generated code (for statement blocks), or
   * - null if no code should be emitted for block.
   */
  forBlock = forBlock;

  isInitialized = false;

  /** A database of variable and procedure names. */
  nameDB_?: Blockly.Names = undefined;

  name_ = 'ASTGenerator';

  RESERVED_WORDS_ = 'nil,true,false,self,super,this';

  workspace?: Blockly.Workspace;
  init(workspace: Blockly.Workspace) {
    this.workspace = workspace;
    if (!this.nameDB_) {
      this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_);
    } else {
      this.nameDB_.reset();
    }
    this.nameDB_.setVariableMap(workspace.getVariableMap());
    this.nameDB_.populateVariables(workspace);
    this.isInitialized = true;
  }

  /**
   * Generate code for all blocks in the workspace to the specified language.
   *
   * @param workspace Workspace to generate code from.
   * @returns Generated code.
   */
  workspaceToTree(workspace: Blockly.Workspace): AbstractSyntaxTree {
    const tree = new ProgramTree();
    this.init(workspace);
    const blocks = workspace.getTopBlocks(true);
    for (let i = 0, block; (block = blocks[i]); i++) {
      let child = this.blockToTree(block);
      if (child && StatementTree.isValid(child)) {
        tree.addStatement(child);
      } else {
        console.warn('Top-level blocks must be a statement block.');
      }
    }
    return tree;
  }

  /**
   * Generate code for the specified block (and attached blocks).
   * The generator must be initialized before calling this function.
   *
   * @param block The block to generate code for.
   * @param opt_thisOnly True to generate code for only this statement.
   * @returns For statement blocks, the generated code.
   *     For value blocks, an array containing the generated code and an
   * operator order value.  Returns '' if block is null.
   * TODO maybe this should return an array of trees instead of a single tree?
   */
  blockToTree(
    block: Blockly.Block | null,
    opt_thisOnly?: boolean,
  ): AbstractSyntaxTree | null {
    if (this.isInitialized === false) {
      console.warn(
        `${this.name_}#init was not called before blockToCode was called.`,
      );
    }
    if (!block) {
      return null;
    }
    if (!block.isEnabled()) {
      // Skip past this block if it is disabled.
      return opt_thisOnly ? null : this.blockToTree(block.getNextBlock());
    }
    if (block.isInsertionMarker()) {
      // Skip past insertion markers.
      return opt_thisOnly ? null : this.blockToTree(block.getChildren(false)[0]);
    }

    // Look up block generator function in dictionary - but fall back
    // to looking up on this if not found, for backwards compatibility.
    const func = this.forBlock[block.type];
    invariant(typeof func === 'function', `${this.name_} generator does not know how to generate code for block type "${block.type}".`);
    let tree = func.call(null, block, this);
    if (tree === null) {
      // Block has handled code generation itself.
      return null;
    } else if (AbstractSyntaxTree.isValid(tree)) {
      return tree;
    }
    raise(`Invalid tree generated: ${tree}`, SyntaxError);
  }

  /**
   * Generate code representing the specified value input.
   *
   * @param block The block containing the input.
   * @param name The name of the input.
   * @returns Generated tree or null if no blocks are connected.
   * @throws ReferenceError if the specified input does not exist.
   */
  valueToTree(block: Blockly.Block, name: string, opt_required = true): AbstractSyntaxTree | null {
    const targetBlock = block.getInputTargetBlock(name);
    invariant(targetBlock || !opt_required, `Input "${name}" doesn't exist on "${block.type}"`, ReferenceError);
    return this.blockToTree(targetBlock);
  }

  /**
   * Generate a code string representing the blocks attached to the named
   * statement input. Indent the code.
   * This is mainly used in generators. When trying to generate code to evaluate
   * look at using workspaceToCode or blockToCode.
   *
   * @param block The block containing the input.
   * @param name The name of the input.
   * @returns Generated trees
   * @throws ReferenceError if the specified input does not exist.
   */
  statementsToForest(block: Blockly.Block, name: string): StatementTree[] {
    const targetBlock = block.getInputTargetBlock(name);
    invariant(targetBlock || block.getInput(name), `Input "${name}" doesn't exist on "${block.type}"`, ReferenceError);
    const forest = [];
    let currentBlock = targetBlock;
    while (currentBlock) {
      const tree = this.blockToTree(currentBlock);
      if (tree && StatementTree.isValid(tree)) {
        forest.push(tree);
      } else {
        console.warn(`Block "${currentBlock.type}" is either not a statement block or did not generate a tree.`);
      }
      currentBlock = currentBlock.getNextBlock();
    }
    return forest;
  }

  /**
   * Add one or more words to the list of reserved words for this language.
   *
   * @param words Comma-separated list of words to add to the list.
   *     No spaces.  Duplicates are ok.
   */
  addReservedWords(words: string) {
    this.RESERVED_WORDS_ += words + ',';
  }

  /**
   * Gets a unique, legal name for a user-defined variable.
   * Before calling this method, the `nameDB_` property of the class
   * must have been initialized already. This is typically done in
   * the `init` function of the code generator class.
   *
   * @param nameOrId The ID of the variable to get a name for,
   *    or the proposed name for a variable not associated with an id.
   * @returns A unique, legal name for the variable.
   */
  getVariableName(nameOrId: string): string {
    return this.getName(nameOrId, Blockly.Names.NameType.VARIABLE);
  }

  /**
   * Gets a unique, legal name for a user-defined procedure.
   * Before calling this method, the `nameDB_` property of the class
   * must have been initialized already. This is typically done in
   * the `init` function of the code generator class.
   *
   * @param name The proposed name for a procedure.
   * @returns A unique, legal name for the procedure.
   */
  getProcedureName(name: string): string {
    return this.getName(name, Blockly.Names.NameType.PROCEDURE);
  }

  private getName(nameOrId: string, type: Blockly.Names.NameType): string {
    invariant(this.nameDB_, 'Name database is not defined. You must call `init` first.');
    return this.nameDB_.getName(nameOrId, type);
  }

  getVariable(id: string): Blockly.VariableModel {
    invariant(this.workspace, 'Workspace is not defined. You must call `init` first.');
    const variable = this.workspace.getVariableById(id)
    invariant(variable, `Variable "${id}" not found.`, ReferenceError);
    return variable;
  }

  declareVariable(name: string): Blockly.VariableModel {
    invariant(this.workspace, 'Workspace not defined. You must call `init` first.');
    return new Blockly.VariableModel(this.workspace, name);
  }
}

