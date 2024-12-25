import {getBoxedValue, type BoxedValue} from "./boxed_value";
import {Queue} from "./generics";
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
  args = Queue<BoxedValue<any>>();
  halted = false;
}
