import * as Blockly from "blockly";

const SIZE = 17;
const WEIGHT = 4;

export class VariableValueIcon
  extends Blockly.icons.Icon
  implements Blockly.IHasBubble
{
  static TYPE = new Blockly.icons.IconType<VariableValueIcon>("variable_value");

  bubbleText = "";
  constructor(block: Blockly.Block) {
    super(block);
  }

  getType(): Blockly.icons.IconType<VariableValueIcon> {
    return VariableValueIcon.TYPE;
  }

  initView(): void {
    if (this.svgRoot) return; // Already initialized

    // The pointer event listener was not working so I'm adding it myself - Patrick 2024-12-05
    super.initView(() => {});

    (this.svgRoot as any as Element).addEventListener("pointerdown", () => {
      this.toggleBubble();
    });

    const { dom, Svg } = Blockly.utils;

    dom.createSvgElement(
      Svg.CIRCLE,
      { class: "blocklyIconShape", r: "8", cx: "8", cy: "8" },
      this.svgRoot,
    );
    dom.createSvgElement(
      Svg.PATH,
      {
        class: "blocklyIconSymbol",
        d:
          // Draw an equals sign.
          "m 4,6 8,0 0,1 -8,0 0,-1 z" + "M 4,9 z m 8,0 0,1 -8,0 0,-1 z",
      },
      this.svgRoot,
    );
  }

  dispose() {
    super.dispose();
    this.myBubble?.dispose();
  }

  getSize() {
    return new Blockly.utils.Size(SIZE, SIZE);
  }

  getWeight() {
    return WEIGHT;
  }

  private myBubble: Blockly.bubbles.TextBubble | null = null;
  private bubbleWillBecomeVisible = false;

  bubbleIsVisible() {
    return !!this.myBubble;
  }

  async setBubbleVisible(visible: boolean) {
    // State is already correct.
    if (this.bubbleWillBecomeVisible === visible) return;
    this.bubbleWillBecomeVisible = visible;

    // Wait for queued renders to finish so that the icon will be correctly
    // positioned before displaying the bubble.
    await Blockly.renderManagement.finishQueuedRenders();

    if (visible) {
      this.myBubble = new Blockly.bubbles.TextBubble(
        this.bubbleText,
        this.sourceBlock.workspace as Blockly.WorkspaceSvg,
        this.getAnchorLocation(),
        this.getOwnerRect(),
      );
    } else {
      this.myBubble?.dispose();
    }
  }

  async toggleBubble() {
    await this.setBubbleVisible(!this.bubbleWillBecomeVisible);
  }

  // Implement helper methods for getting the anchor location and bounds.

  // Returns the location of the middle of this icon in workspace coordinates.
  getAnchorLocation() {
    const size = this.getSize();
    const midIcon = new Blockly.utils.Coordinate(
      size.width / 2,
      size.height / 2,
    );
    return Blockly.utils.Coordinate.sum(this.workspaceLocation, midIcon);
  }

  // Returns the rect the bubble should avoid overlapping, i.e. the block this
  // icon is appended to.
  getOwnerRect() {
    const bbox = (this.sourceBlock as Blockly.BlockSvg).getSvgRoot().getBBox();
    return new Blockly.utils.Rect(
      bbox.y,
      bbox.y + bbox.height,
      bbox.x,
      bbox.x + bbox.width,
    );
  }

  onLocationChange(blockOrigin: Blockly.utils.Coordinate) {
    super.onLocationChange(blockOrigin);
    this.myBubble?.setAnchorLocation(this.getAnchorLocation());
  }
}

Blockly.icons.registry.register(VariableValueIcon.TYPE, VariableValueIcon);
