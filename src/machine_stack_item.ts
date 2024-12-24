import {getBoxedValue, type BoxedValue} from "./boxed_value";
import {Queue} from "./generics";
import {NilValue} from "./nil_value";
import {Scope} from "./scope";

export class MachineStackItem extends Scope {
  thisContext = getBoxedValue(NilValue);
  constructor(
    public pc: VirtualMachineAddress = 0,
    readonly parent: MachineStackItem | null = null,
  ) {
    super(parent);
  }
  args = Queue<BoxedValue>();
  halted = false;
}
