import * as Blockly from 'blockly';

import Split from 'split.js';

const showGeneratedCodeInput = document.querySelector('#showGeneratedCode input') as HTMLInputElement;
export const codeDiv = document.getElementById('generatedCode')!;
export const blocklyDiv = document.getElementById('blocklyDiv')!;
export const blocklyArea = document.getElementById('blocklyArea')!;

const gutterSize = 8;

const handleWindowResize = function(ws: Blockly.WorkspaceSvg) {
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

export const setupLayout = (ws: Blockly.WorkspaceSvg) => {
  const _handleWindowResize = () => handleWindowResize(ws);
  window.addEventListener('resize', _handleWindowResize, false);

  setTimeout(_handleWindowResize);

  setTimeout(() => {
    showGeneratedCodeInput.addEventListener('change', () => {
      const {style} = blocklyDiv;
      if(showGeneratedCodeInput.checked) {
        style.display = 'none';
        ws.render();
      } else {
        style.display = 'block';
      }
    })
  });

  Split(['#sidebar', '#workspace'], {
    onDrag: _handleWindowResize,
    gutterSize,
  });
}

export const layoutBlocklyOptions: Partial<Blockly.BlocklyOptions> = {
  toolboxPosition:  'end'
}
