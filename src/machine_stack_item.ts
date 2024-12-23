import {getBoxedValue, type BoxedValue} from "./boxed_value";
import {Queue, Stack} from "./generics";
import {Nil} from "./nil";
import {Scope} from "./scope";

export class MachineStackItem extends Scope {
  thisContext = getBoxedValue(Nil);
  constructor(
    public pc: VirtualMachineAddress = 0,
    readonly parent: MachineStackItem | null = null,
  ) {
    super(parent);
  }
  args = Queue<BoxedValue>();
  receivers = Stack<BoxedValue>();
  halted = false;
}
