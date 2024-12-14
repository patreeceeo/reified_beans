import { BooleanObject, False, True } from '../messagePassing/boolean';
import {invariant} from '../errors';

export class Checkbox {
  htmlElement: HTMLInputElement;
  constructor(htmlElement: HTMLInputElement | string) {
    if(typeof htmlElement === 'string') {
      this.htmlElement = document.querySelector(htmlElement) as HTMLInputElement;
    } else {
      this.htmlElement = htmlElement;
    }
    invariant(this.htmlElement.type === 'checkbox', 'Given HTMLElement is not a checkbox');
  }
  get checked(): BooleanObject {
    return this.htmlElement.checked ? True : False;
  }
}
