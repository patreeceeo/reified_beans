import { VirtualMachine } from "./virtual_machine";
import { type AnyLiteralJsValue } from "./virtual_objects";
import { Interpreter } from "./interpreter";
import { ContextValue } from "./contexts";
import { instruction } from "./instructions";

export function invokeEmptyMethodOnLiteral(
  vm: VirtualMachine,
  receiver: AnyLiteralJsValue,
) {
  return vm.invokeAsMethod(vm.asLiteral(receiver), vm.createClosure());
}

export function sendMessageToLiteral(literal: boolean, selector: string) {
  const vm = new VirtualMachine();
  const interpreter = new Interpreter(vm);

  invokeEmptyMethodOnLiteral(vm, undefined);
  const { evalStack } = vm;
  const vObject = vm.asLiteral(literal);

  evalStack.stackPush(vObject);

  vm.send(selector);
  interpreter.run();

  return vm;
}

export function isBlockEvaluated(literal: boolean, selector: string) {
  const vm = new VirtualMachine();
  const interpreter = new Interpreter(vm);
  invokeEmptyMethodOnLiteral(vm, undefined);

  const { evalStack } = vm;

  const blockClosure = vm.createClosure({
    literals: [42],
    instructions: [instruction.push(ContextValue.LiteralConst, 0)],
  });
  const vObject = vm.asLiteral(literal);

  evalStack.stackPush(blockClosure);
  evalStack.stackPush(vObject);

  vm.send(selector);
  interpreter.run();

  return vm.evalStack.stackTop!.primitiveValue === 42;
}
