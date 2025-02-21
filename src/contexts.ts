import { VirtualObject } from "./virtual_objects";
import { Dict, FixedLengthArray, Stack } from "./generics";
import { invariant, BindingError } from "./errors";

export class GlobalContext {
  dict = Dict<VirtualObject>();

  at(key: string): VirtualObject {
    let vObject = this.dict[key];
    invariant(vObject !== undefined, BindingError, "GlobalContext", key);
    return vObject;
  }

  put(key: string, value: VirtualObject) {
    this.dict[key] = value;
  }
}
