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
