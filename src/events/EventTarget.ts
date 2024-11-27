
export function createDocumentEventTarget(target: Element) {
  target.toggleAttribute('event-target', true)
  return new EventTargetWrapper(target);
}

class EventTargetWrapper {
  constructor(readonly target: EventTarget) {}

  on<EventType extends Event>(type: string, listener: (event: EventType) => void) {
    this.target.addEventListener(type, listener as any, false);
    return this;
  }
}


