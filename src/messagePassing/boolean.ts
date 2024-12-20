
/** @deprecated */
export abstract class BooleanObject {
  abstract if<T = void>(lambaTrue: () => T, lambdaFalse: () => T): T;
  abstract and(other: BooleanObject): BooleanObject;
}
class TrueClassOld extends BooleanObject {
  if<T>(lamba: () => T) {
    return lamba();
  }
  and(other: BooleanObject) {
    return other;
  }
  or(_other: BooleanObject) {
    return this;
  }
  not() {
    return False;
  }
}
class FalseClassOld extends BooleanObject {
  if<T>(_lambaTrue: () => T, lamba: () => T) {
    return lamba();
  }
  and(_other: BooleanObject) {
    return this;
  }
  or(other: BooleanObject) {
    return other;
  }
  not() {
    return True;
  }
}

export const True = new TrueClassOld() as BooleanObject;
export const False = new FalseClassOld() as BooleanObject;

