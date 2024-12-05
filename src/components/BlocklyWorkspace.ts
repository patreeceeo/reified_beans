import * as Blockly from 'blockly';
import {blocks} from 'src/blocks/text';
import {forBlock} from 'src/generators/javascript';
import {javascriptGenerator} from 'blockly/javascript';
import {load, save} from 'src/serialization';
import {toolbox} from 'src/toolbox';
import {True} from 'src/BooleanObject';
import {copyOffsetParentTransform} from '../htmlElement';

interface StatementBlockInfo {
  code: string;
  variables: Set<Blockly.VariableModel>;
  id: string;
}

export class BlocklyWorkspace extends HTMLElement {
  private injectTarget?: HTMLElement;
  private ws?: Blockly.WorkspaceSvg;

  hasMeaningfulChanges = True;

  connectedCallback() {
    this.injectTarget = this.querySelector('.injectTarget') as HTMLElement;
    const ws = this.ws = Blockly.inject(this.injectTarget, {toolboxPosition: 'end', toolbox});

    // Register the blocks and generator with Blockly
    Blockly.common.defineBlocks(blocks);
    Object.assign(javascriptGenerator.forBlock, forBlock);

    load(ws);

    ws.addChangeListener((e: Blockly.Events.Abstract) => {
      // UI events are things like scrolling, zooming, etc.
      // No need to save after one of these.
      if (!e.isUiEvent) {
        save(ws!);
        if(e.type != Blockly.Events.FINISHED_LOADING && !ws.isDragging()) {
          this.hasMeaningfulChanges = True;
        }
      }
    });

    this.adjustSize();
  }

  generateCode = () => {
    return javascriptGenerator.workspaceToCode(this.ws);
  };


  generateStatementBlockInfo(): StatementBlockInfo[] {
    const workspace = this.ws!;
    const output = [];
    javascriptGenerator.init(workspace);
    const blocks = getStatementBlocksForWorkspace(workspace);
    for (let i = 0, block; (block = blocks[i]); i++) {
      // Pass true for opt_thisOnly so we only generate code for this block and not also the attached blocks.
      let code = javascriptGenerator.blockToCode(block, true);
      if (Array.isArray(code)) {
        // Value blocks return tuples of code and operator order.
        // Top-level blocks don't care about operator order.
        code = code[0];
      }
      if (code) {
        if (block.outputConnection) {
          // This block is a naked value.  Ask the language's code generator if
          // it wants to append a semicolon, or something.
          code = javascriptGenerator.scrubNakedValue(code);
          if (javascriptGenerator.STATEMENT_PREFIX && !block.suppressPrefixSuffix) {
            code = javascriptGenerator.injectId(javascriptGenerator.STATEMENT_PREFIX, block) + code;
          }
          if (javascriptGenerator.STATEMENT_SUFFIX && !block.suppressPrefixSuffix) {
            code = code + javascriptGenerator.injectId(javascriptGenerator.STATEMENT_SUFFIX, block);
          }
        }
        output.push({
          code,
          variables: getVariablesForBlock(block),
          id: block.id
        });
      }
    }
    return output;
  }

  adjustSize() {
    copyOffsetParentTransform(this, this.injectTarget!);
    Blockly.svgResize(this.ws!);
  }

  getAllVariables() {
    return this.ws!.getAllVariables();
  }
}

/**
* Given a Blockly block, return the flattened array of statement blocks it contains, assuming that the block itself is a statement block.
*/
function getStatementBlocksForBlock(block: Blockly.Block, target: Blockly.Block[] = []): Blockly.Block[] {
  target.push(block);
  const children = block.getChildren(true);
  if(children.length > 0) {
    const lastChild = children[children.length - 1];
    if(lastChild.type !== 'math_number') {
      getStatementBlocksForBlock(lastChild, target);
    }
  }
  return target;
}

/**
* Given a Blockly.Workspace, return the flattened array of statement blocks it contains.
*/
function getStatementBlocksForWorkspace(ws: Blockly.Workspace): Blockly.Block[] {
  return ws.getTopBlocks(true).flatMap(b => getStatementBlocksForBlock(b));
}

/**
* Given a Blockly block, return the set of all variables it contains, including those in nested blocks. This is a bit tricky because:
* A.) the getVarModels method only returns the variables defined in the block itself, not those in nested blocks
* B.) the getChildren method returns not just the nested blocks but also the next statement block, which we don't want to include.
*/
function getVariablesForBlock(block: Blockly.Block, recursive = true, target = new Set<Blockly.VariableModel>()): Set<Blockly.VariableModel> {
  for(const varModel of block.getVarModels()) {
    target.add(varModel);
  }
  for(const child of getNestedBlocks(block, recursive)) {
    for(const varModel of child.getVarModels()) {
      target.add(varModel);
    }
  }
  return target;
}

/**
* In Blockly, a block's children include the next statement block, which is not a nested block. This function returns only the nested blocks,
* closer to how the uninitiated might expect getChildren to work.
*/
function getNestedBlocks(block: Blockly.Block, recursive = true, parentStatements = 0, target = [] as Blockly.Block[]): Blockly.Block[] {
  let children = block.getChildren(true);
  if(parentStatements === 0) {
    // If the parent block doesn't contain any statements, remove the last child, which is the next statement block, and therefore not nested.
    // This has not been tested with blocks where statementInputCount is greater than 1.
    children = children.slice(0, -1);
  }
  for(const child of children) {
    target.push(child);
    if(recursive) {
      getNestedBlocks(child, true, block.statementInputCount + parentStatements, target);
    }
  }
  return target;
}
