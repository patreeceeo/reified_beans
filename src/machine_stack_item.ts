import {getBoxedValue} from "./boxed_value";
import {nilValue} from "./nil_value";
import {Scope} from "./scope";

export class MachineStackItem extends Scope {
  thisContext = getBoxedValue(nilValue);
  constructor(
    public pc: VirtualMachineAddress = 0,
    readonly parent: MachineStackItem | null = null,
  ) {
    super(parent);
  }
  halted = false;
}
