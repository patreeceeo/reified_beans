export type Observer<T> = (value: T) => void;

export interface IResourceHandle {
  release(): void;
}

export class Observable<T> {
  private observers: Set<Observer<T>> = new Set();
  subscribe(observer: Observer<T>): IResourceHandle {
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
  release() {
    this.observers.clear();
  }
}
