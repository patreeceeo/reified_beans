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

// Register the blocks and generator with Blockly
Blockly.common.defineBlocks(blocks);
Object.assign(javascriptGenerator.forBlock, forBlock);

// Set up UI elements and inject Blockly
const codeDiv = document.getElementById('generatedCode')?.firstChild;
const outputDiv = document.getElementById('output');
const blocklyDiv = document.getElementById('blocklyDiv');

if (!blocklyDiv) {
  throw new Error(`div with id 'blocklyDiv' not found`);
}
const ws = Blockly.inject(blocklyDiv, {toolbox});

// This function resets the code and output divs, shows the
// generated code from the workspace, and evals the code.
// In a real application, you probably shouldn't use `eval`.
const runCode = () => {
  const code = javascriptGenerator.workspaceToCode(ws as Blockly.Workspace);
  if (codeDiv) codeDiv.textContent = code;

  if (outputDiv) outputDiv.innerHTML = '';

  eval(code);
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


// const elInput = document.getElementById('input')! as HTMLTextAreaElement;
// const elOutput = document.getElementById('output')! as HTMLTextAreaElement;

// // Regular expression to match JavaScript variable assignments
// const re = /(\w+)\s*=\s*.*/g;

// let lastLineCount = 0;

// elInput.addEventListener('input', () => {
//   const text = elInput.value;
//   // console.log(text);

//   const lines = text.split('\n');

//   // If the number of lines has not changed, do not recompute the output
//   if (lines.length === lastLineCount) {
//     return;
//   }

//   // Output will show the value of each variable
//   let output = "";

//   // For each variable assignment in the line, create a script string to get the assigned values via eval
//   for (const line of lines) {
//     let match;
//     // Match all variable assignments and get the variable names
//     while ((match = re.exec(line)) !== null) {
//       const variable = match[1];
//       const value = eval(`${line}; ${variable}`);
//       output += `${variable}: ${value},`;
//     }
//     output += "\n";
//   }

//   elOutput.value = output;
//   lastLineCount = lines.length;
// });
