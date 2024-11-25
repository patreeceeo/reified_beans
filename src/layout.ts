import * as Blockly from 'blockly';

import Split from 'split.js';

export const codeDiv = document.getElementById('generatedCode')?.firstChild!;
export const blocklyDiv = document.getElementById('blocklyDiv')!;
export const blocklyArea = document.getElementById('blocklyArea')!;

export const setupLayout = (ws: Blockly.WorkspaceSvg) => {
  const handleWindowResize = function() {
    // Compute the absolute coordinates and dimensions of blocklyArea.
    let element = blocklyArea;
    let x = 0;
    let y = 0;
    do {
      x += element.offsetLeft;
      y += element.offsetTop;
      element = element.offsetParent as HTMLElement;
    } while (element);
    // Position blocklyDiv over blocklyArea.
    blocklyDiv.style.left = x + 'px';
    blocklyDiv.style.top = y + 'px';
    blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
    blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
    Blockly.svgResize(ws);
  };
  window.addEventListener('resize', handleWindowResize, false);

  setTimeout(handleWindowResize);

  Split(['#sidebar', '#blocklyArea'], {
    onDrag: handleWindowResize,
    gutterSize: 8,
  });
}
