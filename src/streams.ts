import { Stream } from "./Stream";

export class AnimationFrameStream extends Stream<number> {
  targetDelta: number;
  lastUpdate = 0;
  averageDelta = 0;
  private animationFrame?: number;
  constructor(targetFPS: number) {
    super();
    this.targetDelta = 1000 / targetFPS;
  }
  start() {
    this.update(0);
  }
  private update = (time: number) => {
    if (time - this.lastUpdate >= this.targetDelta - this.averageDelta / 2) {
      this.next(time);
      this.lastUpdate = time;
    }
    this.averageDelta = (this.averageDelta + (time - this.lastUpdate)) / 2;
    this.animationFrame = requestAnimationFrame(this.update);
  };
  stop() {
    super.stop();
    this.lastUpdate = 0;
    cancelAnimationFrame(this.animationFrame!);
  }
}

export class OffsetParentElementStream extends Stream<HTMLElement> {
  constructor(readonly startingElement: HTMLElement) {
    super();
  }
  start() {
    this.next(this.startingElement);
  }
  next(element: HTMLElement) {
    super.next(element);
    if (element.offsetParent) {
      this.next(element.offsetParent as HTMLElement);
    }
  }
}
