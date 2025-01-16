import * as Blockly from 'blockly';
import {load, save} from 'src/serialization';
import {toolbox} from 'src/toolbox';
import {copyOffsetParentTransform} from '../htmlElement';
import basicBlocks from 'src/blocks/basic';
import functionBlocks from 'src/blocks/functions';
import {Compiler} from 'src/compiler';
import {
  ContinuousToolbox,
  ContinuousFlyout,
  ContinuousMetrics,
} from "@blockly/continuous-toolbox";
import {unregisterProcedureBlocks} from 'src/procedures';
import {WorkspaceAnalyzer} from 'src/workspace_analyzer';
import {ScopeItemDropdownExtension} from 'src/extensions/scope_item_dropdown_extension';


Blockly.Extensions.register('scope_item_dropdown_extension', ScopeItemDropdownExtension);

export class BlocklyWorkspace extends HTMLElement {
  private injectTarget?: HTMLElement;
  private ws?: Blockly.WorkspaceSvg;
  private compiler?: Compiler;

  hasMeaningfulChanges = true;

  connectedCallback() {
    this.injectTarget = this.querySelector('.injectTarget') as HTMLElement;

    // We're overriding the default procedures blocks
    unregisterProcedureBlocks();
    // Register the blocks and generator with Blockly
    // This needs to happen before injecting Blockly
    Blockly.common.defineBlocks(basicBlocks);
    Blockly.common.defineBlocks(functionBlocks);

    const ws = this.ws = Blockly.inject(this.injectTarget, {
      plugins: {
        toolbox: ContinuousToolbox,
        flyoutsVerticalToolbox: ContinuousFlyout,
        metricsManager: ContinuousMetrics,
      },
      toolboxPosition: 'end', toolbox});

    load(ws);

    ws.addChangeListener((e: Blockly.Events.Abstract) => {
      // UI events are things like scrolling, zooming, etc.
      // No need to save after one of these.
      if (!e.isUiEvent) {
        save(ws!);
        if(e.type != Blockly.Events.FINISHED_LOADING && !ws.isDragging()) {
          this.hasMeaningfulChanges = true;
          this.addCustomIcons();
        }
      }
    });

    ws.addChangeListener((e: Blockly.Events.SelectedJson) => {
      // Listen for block selected events
      if (e.type === Blockly.Events.SELECTED && e.newElementId) {
        console.log("selected", ws.getBlockById(e.newElementId));
      }
    });

    this.adjustSize();
    this.addCustomIcons();


    this.compiler = new Compiler(ws);
  }

  compileWorkspace = () => {
    return this.compiler!.compile();
  };

  adjustSize() {
    copyOffsetParentTransform(this, this.injectTarget!);
    Blockly.svgResize(this.ws!);
  }

  getAllVariables() {
    return this.ws!.getAllVariables();
  }

  private async addCustomIcons() {
    // const workspace = this.ws!;
    // const scope = new Scope();
    // const statementBlocks = getStatementBlocksForWorkspace(workspace);
    // await interpreterLoaded();
    // const Interpreter = getInterpreter()!;
    // const myInterpreter = new Interpreter('');
    // for(const block of statementBlocks) {
    //   let icon: VariableValueIcon;
    //   if(!block.hasIcon(VariableValueIcon.TYPE)) {
    //     icon = new VariableValueIcon(block);
    //     block.addIcon(icon);
    //   } else {
    //     icon = block.getIcon(VariableValueIcon.TYPE) as VariableValueIcon;
    //   }
    //   const code = getCodeForBlock(block, workspace);
      // myInterpreter.appendCode(code);
      // myInterpreter.run();
      // const stack = myInterpreter.getStateStack();
      // const state = stack[stack.length - 1];
      // evaluate(code, scope)
      // for(const {name} of getVariablesForBlock(block)) {
        // const varVal = state.scope.object.properties[name];
        // const varVal = scope.get(name);
        // icon.bubbleText += `${name} = ${varVal}\n`;
      // }
    // }
  }
}



