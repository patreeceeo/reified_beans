export type StreamObserver<T> = (value: T) => void;

export interface IResourceHandle {
  release(): void;
}

export class Stream<T> {
  private observers: Set<StreamObserver<T>> = new Set();
  subscribe(observer: StreamObserver<T>): IResourceHandle {
    this.observers.add(observer);
    return {
      release: () => {
        this.observers.delete(observer);
      }
    };
  }
  next(value: T): void {
    for(const observer of this.observers) {
      observer(value);
    }
  }
  stop() {
    this.observers.clear();
  }
}
