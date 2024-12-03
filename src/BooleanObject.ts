export abstract class BooleanObject {
  abstract if<T = void>(lambaTrue: () => T, lambdaFalse: () => T): T;
}
class TrueClass extends BooleanObject {
  if<T>(lamba: () => T) {
    return lamba();
  }
}
class FalseClass extends BooleanObject {
  if<T>(_lambaTrue: () => T, lamba: () => T) {
    return lamba();
  }
}

export const True = new TrueClass() as BooleanObject;
export const False = new FalseClass() as BooleanObject;
