import {Scope} from "./scope";

export class MachineStackItem extends Scope {
  constructor(
    public pc: VirtualMachineAddress = 0,
    readonly parent: MachineStackItem | null = null,
  ) {
    super(parent);
  }
  halted = false;
}
