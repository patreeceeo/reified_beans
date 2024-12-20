import {Queue} from "./generics";
import {Scope} from "./scope";

export class MachineStackItem extends Scope {
  thisContext: any;
  constructor(
    readonly parent: MachineStackItem | null = null,
    public pc: VirtualMachineAddress = 0
  ) {
    super(parent);
  }
  args = Queue<any>();
  halted = false;
}
