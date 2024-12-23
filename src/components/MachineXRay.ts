import {renderEls, newEl} from "src/htmlElement";
import type {Machine} from "src/machine";
import type {MachineOp} from "src/machine_ops";

export class MachineXRay extends HTMLElement {
  static findElement() {
    return document.querySelector('machine-x-ray') as MachineXRay;
  }
  connectedCallback() {
  }

  machine?: Machine;

  render() {
    const machine = this.machine;
    if(!machine) return;

    renderEls(this, {
      '.ops': {
        'h1': 'Ops:',
        'ul': {
          'li': machine.ops.map(this.renderOp)
        }
      },
      '.result': {
        'h1': `Result: ${machine.result}`
      }
    })
  }

  renderOp = (op: MachineOp, i: number) => {
    return newEl('.op', `${i}: ${op.toString()}`);
  }
}

customElements.define('machine-x-ray', MachineXRay);
