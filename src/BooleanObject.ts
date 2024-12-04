export abstract class BooleanObject {
  abstract if<T = void>(lambaTrue: () => T, lambdaFalse: () => T): T;
  abstract and(other: BooleanObject): BooleanObject;
}
class TrueClass extends BooleanObject {
  if<T>(lamba: () => T) {
    return lamba();
  }
  and(other: BooleanObject) {
    return other;
  }
}
class FalseClass extends BooleanObject {
  if<T>(_lambaTrue: () => T, lamba: () => T) {
    return lamba();
  }
  and(_other: BooleanObject) {
    return this;
  }
}

export const True = new TrueClass() as BooleanObject;
export const False = new FalseClass() as BooleanObject;

