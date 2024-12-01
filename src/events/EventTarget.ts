// TODO delete?
export function createDocumentEventTarget(target: Element) {
  target.toggleAttribute('event-target', true)
  return new EventTargetWrapper(target);
}

// TODO(perf): minimize the number of DOM event listeners by using event delegation
// Register a single event listener on `target` for each type of event.
class EventTargetWrapper {
  constructor(readonly target: EventTarget) {}

  on<EventType extends Event>(type: string, listener: (event: EventType) => void) {
    this.target.addEventListener(type, listener as any, false);
    return this;
  }
}


