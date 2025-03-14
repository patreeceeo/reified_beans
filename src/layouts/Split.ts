import Split from "split.js";

export class SplitLayout extends HTMLElement {
  split?: Split.Instance;
  changed = false;
  connectedCallback() {
    const options = JSON.parse(this.dataset.options!);
    const config = {
      gutterSize: 8,
      ...options,
      onDrag: this.onDrag,
    };
    Split(
      [this.children[0] as HTMLElement, this.children[1] as HTMLElement],
      config,
    );
  }
  onDrag = () => {
    this.changed = true;
  };
}
