// Need to use JS interpreter to be able to remember the state of the variables
// But if ultimately using Blockly, I don't need to parse the code to know when an assignment has happened.
// While we're on that topic, it seems inefficient to have Blocly generate JS code only to parse it again.
// I wonder if I can modify Blockly and the JS interpreter to communicate directly via syntax tree...
import * as Blockly from 'blockly';
import {blocks} from './blocks/text';
import {forBlock} from './generators/javascript';
import {javascriptGenerator} from 'blockly/javascript';
import {save, load} from './serialization';
import {toolbox} from './toolbox';
import {blocklyDiv, codeDiv, setupLayout} from "./layout";

const ws = Blockly.inject(blocklyDiv, {toolbox});

setupLayout(ws);

// Register the blocks and generator with Blockly
Blockly.common.defineBlocks(blocks);
Object.assign(javascriptGenerator.forBlock, forBlock);

// This function resets the code and output divs, shows the
// generated code from the workspace, and evals the code.
// In a real application, you probably shouldn't use `eval`.
const runCode = () => {
  let code = javascriptGenerator.workspaceToCode(ws as Blockly.Workspace);
  codeDiv.textContent = code;

  // Idea: Use javascriptGenerator.STATEMENT_SUFFIX to capture the state of variables at each line
  const scope = {};

  for(const v of ws.getAllVariables()) {
    code += `;scope['${v.name}'] = ${v.name}`
  }

  eval(code);

  console.log(scope);
};

if (ws) {
  // Load the initial state from storage and run the code.
  load(ws);
  runCode();

  // Every time the workspace changes state, save the changes to storage.
  ws.addChangeListener((e: Blockly.Events.Abstract) => {
    // UI events are things like scrolling, zooming, etc.
    // No need to save after one of these.
    if (e.isUiEvent) return;
    save(ws);
  });

  // Whenever the workspace changes meaningfully, run the code again.
  ws.addChangeListener((e: Blockly.Events.Abstract) => {
    // Don't run the code when the workspace finishes loading; we're
    // already running it once when the application starts.
    // Don't run the code during drags; we might have invalid state.
    if (
      e.isUiEvent ||
      e.type == Blockly.Events.FINISHED_LOADING ||
      ws.isDragging()
    ) {
      return;
    }
    runCode();
  });
}

