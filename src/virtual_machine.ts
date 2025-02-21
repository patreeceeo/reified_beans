import { type ClosureDescriptionJs } from "./closures";
import { GlobalContext } from "./contexts";
import { invariant, raise, StackUnderflowError, TypeError } from "./errors";
import { Dict, Stack } from "./generics";
import { InstructionPointer } from "./instructions";
import { primitiveMethodDict } from "./primitive_method";
import { VirtualObject, type AnyLiteralJsValue } from "./virtual_objects";
import stdClassLibrary from "./std_class_library";
import {
  runtimeTypeNotNil,
  runtimeTypePositiveNumber,
} from "./runtime_type_checks";

const MAX_INSTRUCTION_BYTES = 2 ** 20; // 1MB

export class VirtualMachine {
  globalContext = new GlobalContext();

  contextStack = Stack<VirtualObject>();

  instructionBuffer = new ArrayBuffer(MAX_INSTRUCTION_BYTES);
  instructionPointer = new InstructionPointer(
    this.instructionBuffer,
    0,
    MAX_INSTRUCTION_BYTES,
  );

  constructor() {
    this.initializeGlobalContext();
  }

  toString() {
    return "VirtualMachine";
  }

  internedStrings = Dict<VirtualObject>();
  internedNumbers = [] as VirtualObject[];

  createObject(
    classKey: string,
    ivars: string[] = [],
    literalValue: AnyLiteralJsValue = undefined,
  ) {
    return new VirtualObject(this, classKey, ivars, literalValue);
  }

  asLiteral(value: AnyLiteralJsValue): VirtualObject {
    const classKey = this.getLiteralClassName(value);
    switch (classKey) {
      case "String":
        invariant(typeof value === "string", TypeError, "String", typeof value);
        if (value in this.internedStrings) {
          return this.internedStrings[value];
        } else {
          const vo = this.createObject(classKey, [], value);
          this.internedStrings[value] = vo;
          return vo;
        }
      case "Number":
        invariant(typeof value === "number", TypeError, "String", typeof value);
        if (value in this.internedNumbers) {
          return this.internedNumbers[value];
        } else {
          const vo = this.createObject(classKey, [], value);
          this.internedNumbers[value] = vo;
          return vo;
        }
      case "UndefinedObject":
        return this.globalContext.at("nil");
      case "True":
        return this.globalContext.at("true");
      case "False":
        return this.globalContext.at("false");
      case "Array":
        invariant(Array.isArray(value), TypeError, "Array", String(value));
        return this.createObject(classKey, [], value);
      default:
        raise(
          TypeError,
          "String | Number | UndefinedObject | True | False",
          classKey,
        );
    }
  }

  // TODO: move to virtual_objects
  getLiteralClassName(value: AnyLiteralJsValue) {
    if (value === true) {
      return "True";
    } else if (value === false) {
      return "False";
    } else {
      switch (typeof value) {
        case "string":
          return "String";
        case "number":
          return "Number";
        case "undefined":
          return "UndefinedObject";
        case "object":
          invariant(Array.isArray(value), TypeError, "Array", String(value));
          return "Array";
        default:
          raise(
            TypeError,
            "string | number | boolean | undefined",
            typeof value,
          );
      }
    }
  }

  initializeGlobalContext() {
    const vNil = this.createObject(this.getLiteralClassName(undefined));
    vNil.isNil = true;
    this.globalContext.put("nil", vNil);

    const vTrue = this.createObject(this.getLiteralClassName(true));
    vTrue.isTrue = true;
    this.globalContext.put("true", vTrue);

    const vFalse = this.createObject(this.getLiteralClassName(false));
    vFalse.isFalse = true;
    this.globalContext.put("false", vFalse);

    for (const cls of stdClassLibrary) {
      this.initializeClass(cls.name, cls.superClass, cls.ivars);
    }

    for (const cls of stdClassLibrary) {
      const vClass = this.globalContext.at(cls.name);
      vClass.setVarWithName("className", this.asLiteral(cls.name));
      vClass.setVarWithName(
        "superClass",
        this.globalContext.at(cls.superClass),
      );
      vClass.setVarWithName("classComment", this.asLiteral(cls.classComment));

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
    const superClass = this.globalContext.at(superClassName);
    const ivars = [...superClass.ivars, ...addlIvars];
    const vClass = this.createObject("Class", ivars);
    this.globalContext.put(className, vClass);
  }

  peekNextReceiver() {
    const context = this.contextStack.peek();
    invariant(context, StackUnderflowError, "contextStack");
    const evalStack = context.readVarWithName("evalStack", runtimeTypeNotNil);
    const result = evalStack.stackTop;
    invariant(result, StackUnderflowError, "evalStack");
    return result;
  }

  /** (TODO:reflect) onNotUnderstood arg should refer to interpretable instructions */
  basicSend(selector: string, onNotUnderstood: () => void) {
    if (this.sendPrimative(selector)) {
      return;
    }

    // try non-primative method
    const closure = this.peekNextReceiver().getMethod(selector);
    if (closure !== undefined) {
      this.invokeAsMethod(closure);
    } else {
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

  // TODO: maybe this should be a method on ClosureContext?
  populateArgs(
    closure: VirtualObject,
    senderContext: VirtualObject,
    args: VirtualObject,
  ) {
    const argCount = closure.readVarWithName(
      "argCount",
      runtimeTypePositiveNumber,
    );
    const evalStack = senderContext.readVarWithName(
      "evalStack",
      runtimeTypeNotNil,
    );
    for (let index = 0; index < argCount.primitiveValue; index++) {
      args.setIndex(index, evalStack.stackPop()!);
    }
  }

  createClosure(description: ClosureDescriptionJs = {}): VirtualObject {
    const byteOffset = this.instructionPointer.byteOffset;

    if (description.getInstructions) {
      description.getInstructions(this.instructionPointer);
    }

    const literals = description.literals ?? [];

    const instructionByteRange = this.createObject("Range");
    instructionByteRange.setVarWithName("start", this.asLiteral(byteOffset));
    instructionByteRange.setVarWithName(
      "end",
      this.asLiteral(this.instructionPointer.byteOffset),
    );

    const closure = this.createObject("Closure");
    closure.setVarWithName(
      "argCount",
      this.asLiteral(description.argCount ?? 0),
    );
    closure.setVarWithName(
      "tempCount",
      this.asLiteral(description.tempCount ?? 0),
    );
    closure.setVarWithName("literals", this.asLiteral(literals));
    closure.setVarWithName("instructionByteRange", instructionByteRange);

    return closure;
  }

  createMethodContext(receiver: VirtualObject, closure: VirtualObject) {
    const context = this.createObject("MethodContext");
    const argCount = closure.readVarWithName(
      "argCount",
      runtimeTypePositiveNumber,
    );
    const tempCount = closure.readVarWithName(
      "tempCount",
      runtimeTypePositiveNumber,
    );

    this.initializeContext(context, receiver, closure);

    const vArgsAndTemps = this.createObject(
      "Array",
      [],
      new Array(argCount.primitiveValue + tempCount.primitiveValue),
    );

    context.setVarWithName("argsAndTemps", vArgsAndTemps);

    this.initializeLocalContextForClosureLiterals(closure, context);
    return context;
  }

  createBlockContext(blockClosure: VirtualObject) {
    const localContext = blockClosure.readVarWithName(
      "localContext",
      runtimeTypeNotNil,
    );
    invariant(
      localContext,
      Error,
      "Expected block closure to refer to the context of another closure",
    );
    const receiver = localContext.readVarWithName(
      "receiver",
      runtimeTypeNotNil,
    );
    const blockContext = this.createObject("BlockContext");

    this.initializeContext(blockContext, receiver, blockClosure);

    blockContext.setVarWithName("localContext", localContext);

    this.initializeLocalContextForClosureLiterals(blockClosure, localContext);

    return blockContext;
  }

  initializeContext(
    context: VirtualObject,
    receiver: VirtualObject,
    closure: VirtualObject,
  ) {
    context.setVarWithName("evalStack", this.createObject("Array", [], []));
    context.setVarWithName("instructionByteIndex", this.asLiteral(0));
    context.setVarWithName("receiver", receiver);
    context.setVarWithName("closure", closure);
  }

  initializeLocalContextForClosureLiterals(
    closure: VirtualObject,
    context: VirtualObject,
  ) {
    const literals = closure.readVarWithName("literals", runtimeTypeNotNil);
    for (let i = 0; i <= literals.maxIndex; i++) {
      const literal = literals.readIndex(i);
      if (literal.hasVarWithName("localContext")) {
        literal.setVarWithName("localContext", context);
      }
    }
  }

  /** (TODO:reflect) implement in interpreted language? */
  invokeAsMethod(closure: VirtualObject) {
    const sender = this.contextStack.peek();
    invariant(sender, StackUnderflowError, "context");
    const evalStack = sender.readVarWithName("receiver", runtimeTypeNotNil);
    const receiver = evalStack.stackPop()!;
    const context = this.createMethodContext(receiver, closure);
    const argsAndTemps = context.readVarWithName(
      "argsAndTemps",
      runtimeTypeNotNil,
    );
    this.populateArgs(closure, sender, argsAndTemps);
    this.contextStack.push(context);
  }

  sendPrimative(selector: string) {
    const primativeMethod = primitiveMethodDict[selector];
    if (primativeMethod === undefined) {
      return false;
    }
    return primativeMethod.attempt(this);
  }
}
