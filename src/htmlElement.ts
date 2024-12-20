import {OffsetParentElementStream} from "./streams";

export function copyOffsetParentTransform(src: HTMLElement, dest: HTMLElement) {
  const stream = new OffsetParentElementStream(src);
  let x = 0;
  let y = 0;
  stream.subscribe(element => {
    x += element.offsetLeft;
    y += element.offsetTop;
  });
  stream.start();
  const destStyle = dest.style;
  destStyle.left = x + "px";
  destStyle.top = y + "px";
  destStyle.width = src.offsetWidth + "px";
  destStyle.height = src.offsetHeight + "px";
}

const tagNameRegex = /^(\w\-)+/;
const classNameRegex = /\.(\w\-)+/g;
const idRegex = /#(\w\-)+/;
const attrsRegex = /\[(\w\-)+="[^"]+"\]/g;
const sliceFirst = (s: string) => s.slice(1);

function parseSelector(selector: string) {
  const tagName = selector.match(tagNameRegex)?.[0] || 'div';
  const classNames = selector.match(classNameRegex)?.map(sliceFirst) || [];
  const id = selector.match(idRegex)?.[0]?.slice(1);
  const attrs = {} as Record<string, string>;
  for(const attr of selector.match(attrsRegex) || []) {
    const [key, value] = attr.slice(1, -1).split('=');
    attrs[key] = value;
  }
  return {tagName, classNames, id, attrs};
}

// TODO just use React
/** Create an element matching selector and append it to parent */
export const newEl = (selector: string, children: string | HTMLElement | HTMLElement[] = '') => {
  const {tagName, classNames, id, attrs} = parseSelector(selector);
  const elem = document.createElement(tagName);
  if(id) elem.id = id;
  for(const className of classNames) {
    elem.classList.add(className);
  }
  for(const [key, value] of Object.entries(attrs)) {
    elem.setAttribute(key, value.toString());
  }
  if(typeof children === 'string') {
    elem.textContent = children;
  } else if(Array.isArray(children)) {
    appendEls(elem, ...children);
  } else {
    elem.appendChild(children);
  }
  return elem;
}

export const appendEls = (parent: HTMLElement, ...children: HTMLElement[]) => {
  for(const child of children) {
    parent.appendChild(child);
  }
}

type HTMLChildren = HTMLElement | HTMLElement[] | string;

function isHTMLElement (el: any): el is HTMLElement {
  return el instanceof HTMLElement;
}

function isHTMLChildren(children: any): children is HTMLChildren {
  return typeof children === 'string' || isHTMLElement(children) || Array.isArray(children) && children.every(isHTMLElement);
}

interface RecursiveEls {
  [selector: string]: HTMLChildren | RecursiveEls;
}

export function renderEls(parent: HTMLElement, els: RecursiveEls): void {
  parent.innerHTML = '';
  for(const [selector, children] of Object.entries(els)) {
    const isRecusive = !isHTMLChildren(children);
    const el = isRecusive ? newEl(selector) : newEl(selector, children);
    if(isRecusive) {
      renderEls(el, children as RecursiveEls);
    }
    appendEls(parent, el);
  }
}
