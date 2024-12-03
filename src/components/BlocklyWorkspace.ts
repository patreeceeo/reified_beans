import * as Blockly from 'blockly';
import {blocks} from '../blocks/text';
import {forBlock} from '../generators/javascript';
import {javascriptGenerator} from 'blockly/javascript';
import {load, save} from '../serialization';
import {toolbox} from '../toolbox';
import {BooleanObject, True} from '../BooleanObject';
import {copyOffsetParentTransform} from '../htmlElement';

export class BlocklyWorkspace extends HTMLElement {
  private injectTarget?: HTMLElement;
  private ws?: Blockly.WorkspaceSvg;

  hasMeaningfulChanges = True as BooleanObject;

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

  adjustSize() {
    copyOffsetParentTransform(this, this.injectTarget!);
    Blockly.svgResize(this.ws!);
  }
}