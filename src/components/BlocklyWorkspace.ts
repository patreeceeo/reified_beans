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
  variables: Blockly.VariableModel[];
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
          variables: block.getVarModels(),
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
