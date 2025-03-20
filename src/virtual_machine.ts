import { closureDefaults, type CompiledClosureDescription } from "./closures";
import { GlobalContext } from "./contexts";
import { invariant, raise, StackUnderflowError } from "./errors";
import { Dict, Stack } from "./generics";
import { primitiveMethodDict } from "./primitive_method";
import { VirtualObject, type AnyLiteralJsValue } from "./virtual_objects";
import { classDescriptions } from "./std_class_library";
import {
  runtimeTypeNotNil,
  runtimeTypePositiveNumber,
  runtimeTypeString,
} from "./runtime_type_checks";
import type { Instruction } from "./instructions";
import { getWithDefault } from "../utils";
import { guid } from "./guid";

export class VirtualMachine {
  globalContext = new GlobalContext();

  contextStack = Stack<VirtualObject>();

  vNil = VirtualObject.createNil(this);
  vTrue = VirtualObject.createTrue(this);
  vFalse = VirtualObject.createFalse(this);
  internedStrings = Dict<VirtualObject>();
  internedNumbers = [] as VirtualObject[];

  /** Instructions for all closures */
  instructionsByClosureId = Dict<Instruction<any>[]>();
  /** Index of the current closure being executed */
  currentClosureId = "";
  /** Index of the next instruction to execute */
  instructionPointer = 0;

  constructor() {
    this.initializeGlobalContext();
  }

  toString() {
    return "VirtualMachine";
  }

  createObject(classKey: string, literalValue?: AnyLiteralJsValue) {
    return VirtualObject.createObject(this, classKey, literalValue);
  }

  asLiteral(value: AnyLiteralJsValue): VirtualObject {
    const classKey = VirtualObject.getLiteralClassKey(value);
    switch (classKey) {
      case "String":
        invariant(typeof value === "string", TypeError, "String", typeof value);
        if (value in this.internedStrings) {
          return this.internedStrings[value];
        } else {
          const vo = VirtualObject.createObject(this, classKey, value);
          this.internedStrings[value] = vo;
          return vo;
        }
      case "Number":
        invariant(typeof value === "number", TypeError, "String", typeof value);
        if (value in this.internedNumbers) {
          return this.internedNumbers[value];
        } else {
          const vo = VirtualObject.createObject(this, classKey, value);
          this.internedNumbers[value] = vo;
          return vo;
        }
      case "UndefinedObject":
        return this.vNil;
      case "True":
        return this.vTrue;
      case "False":
        return this.vFalse;
      case "Array":
        invariant(Array.isArray(value), TypeError, "Array", String(value));
        return VirtualObject.createObject(this, classKey, value);
      default:
        raise(
          TypeError,
          "String | Number | UndefinedObject | True | False",
          classKey,
        );
    }
  }

  initializeGlobalContext() {
    this.globalContext.put("nil", this.vNil);

    this.globalContext.put("true", this.vTrue);

    this.globalContext.put("false", this.vFalse);

    for (const cls of classDescriptions) {
      this.initializeClass(cls.name, cls.superClass, cls.ivars);
    }

    for (const cls of classDescriptions) {
      const vClass = this.globalContext.at(cls.name);
      vClass.writeNamedVar("className", this.asLiteral(cls.name));
      vClass.writeNamedVar("superClass", this.globalContext.at(cls.superClass));
      vClass.writeNamedVar("classComment", this.asLiteral(cls.classComment));

      for (const [selector, description] of Object.entries(cls.methodDict)) {
        const closure = this.createClosure(description);
        vClass.methodDict[selector] = closure;
      }
    }
  }

  initializeClass(
    className: string,
    superClassName: string,
    addlIvars: string[] = [],
  ) {
    const vClass = VirtualObject.stubClassObject(
      this,
      superClassName,
      addlIvars,
    );
    this.globalContext.put(className, vClass);
  }

  get evalStack() {
    const context = this.contextStack.peek();
    invariant(context, StackUnderflowError, "context");
    return context.readNamedVar("evalStack", runtimeTypeNotNil);
  }

  peekNextReceiver() {
    const result = this.evalStack.stackTop;
    invariant(result, StackUnderflowError, "evaluation");
    return result;
  }

  popNextReceiver() {
    const result = this.evalStack.stackPop();
    invariant(result, StackUnderflowError, "evaluation");
    return result;
  }

  restoreReceiver(receiver: VirtualObject) {
    this.evalStack.stackPush(receiver);
  }

  sendPrimative(selector: string) {
    const primativeMethod = primitiveMethodDict[selector];
    if (primativeMethod === undefined) {
      return false;
    }
    return primativeMethod.attempt(this);
  }

  /** (TODO:reflect) onNotUnderstood arg should refer to interpretable instructions */
  basicSend(selector: string, onNotUnderstood: () => void) {
    if (this.sendPrimative(selector)) {
      return;
    }

    // try non-primative method
    const receiver = this.popNextReceiver();
    const closure = receiver.getMethod(selector);
    if (closure !== undefined) {
      this.invokeAsMethod(receiver, closure);
    } else {
      this.restoreReceiver(receiver);
      onNotUnderstood();
    }
  }

  /** (TODO:reflect) implement in interpreted language? */
  send(selector: string) {
    this.basicSend(selector, () => {
      this.basicSend("doesNotUnderstand:", () => {
        const nextReceiver = this.peekNextReceiver();
        throw new Error(
          `${nextReceiver.classKey} instances do not understand #${selector}`,
        );
      });
    });
  }

  /** @deprecated */
  createClosure(description: CompiledClosureDescription = {}): VirtualObject {
    // Since closures are virtual objects but instructions are not, we can't
    // store the instructions in the closure object. Instead, we store them
    // in the VM and reference them by index.
    const instructions = getWithDefault(
      description,
      closureDefaults,
      "instructions",
    );
    const literals = getWithDefault(description, closureDefaults, "literals");
    const argCount = getWithDefault(description, closureDefaults, "argCount");
    const tempCount = getWithDefault(description, closureDefaults, "tempCount");

    const closureId = guid();

    this.instructionsByClosureId[closureId] = instructions;

    const closure = this.createObject("Closure");
    closure.writeNamedVar("argCount", this.asLiteral(argCount));
    closure.writeNamedVar("tempCount", this.asLiteral(tempCount));
    closure.writeNamedVar("literals", this.asLiteral(literals));
    closure.writeNamedVar("closureId", this.asLiteral(closureId));

    return closure;
  }

  createMethodContext(receiver: VirtualObject, closure: VirtualObject) {
    const context = this.createObject("MethodContext");

    this.initializeContext(context, receiver, closure);

    const vArgsAndTemps = this.createObject("Array");

    context.writeNamedVar("argsAndTemps", vArgsAndTemps);

    this.initializeLocalContextForClosureLiterals(closure, context);

    return context;
  }

  createBlockContext(blockClosure: VirtualObject) {
    const localContext = blockClosure.readNamedVar(
      "localContext",
      runtimeTypeNotNil,
    );
    invariant(
      localContext,
      Error,
      "Expected block closure to refer to the context of another closure",
    );
    const receiver = localContext.readNamedVar("receiver", runtimeTypeNotNil);
    const blockContext = this.createObject("BlockContext");

    this.initializeContext(blockContext, receiver, blockClosure);

    blockContext.writeNamedVar("localContext", localContext);

    this.initializeLocalContextForClosureLiterals(blockClosure, localContext);

    return blockContext;
  }

  initializeContext(
    context: VirtualObject,
    receiver: VirtualObject,
    closure: VirtualObject,
  ) {
    context.writeNamedVar("evalStack", this.createObject("Array", []));
    context.writeNamedVar("receiver", receiver);
    context.writeNamedVar("closure", closure);
    context.writeNamedVar("instructionByteIndex", this.asLiteral(0));
  }

  initializeLocalContextForClosureLiterals(
    closure: VirtualObject,
    context: VirtualObject,
  ) {
    const literals = closure.readNamedVar("literals", runtimeTypeNotNil);
    for (let i = 0; i <= literals.maxIndex; i++) {
      const literal = literals.readIndexedVar(i);
      if (literal.hasVarWithName("localContext")) {
        literal.writeNamedVar("localContext", context);
      }
    }
  }

  // (TODO:organize) move to ./contexts
  populateArgs(context: VirtualObject, closure: VirtualObject) {
    const argCount = closure.readNamedVar(
      "argCount",
      runtimeTypePositiveNumber,
    );
    if (argCount.primitiveValue === 0) {
      return;
    }

    const args = context.readNamedVar("argsAndTemps", runtimeTypeNotNil);

    const { evalStack } = this;

    for (let index = 0; index < argCount.primitiveValue; index++) {
      args.writeIndexedVar(index, evalStack.stackPop()!);
    }
  }

  /** (TODO:reflect) implement in interpreted language? */
  invokeAsMethod(receiver: VirtualObject, closure: VirtualObject) {
    const context = this.createMethodContext(receiver, closure);

    this.populateArgs(context, closure);
    this.contextStack.push(context);
    this.jumpToStartOfClosureInstructions(closure);

    return context;
  }

  jumpToStartOfClosureInstructions(closure: VirtualObject) {
    const closureId = closure.readNamedVar(
      "closureId",
      runtimeTypeString,
    ).primitiveValue;
    this.currentClosureId = closureId;
    this.instructionPointer = 0;
  }

  get currentInstruction() {
    return this.instructionsByClosureId[this.currentClosureId][
      this.instructionPointer
    ];
  }

  get indexOfLastInstructionInCurrentClosure() {
    return this.instructionsByClosureId[this.currentClosureId].length - 1;
  }
}
