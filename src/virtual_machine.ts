import { Closure, type ClosureDescriptionJs } from "./closures";
import { ClosureContext, GlobalContext } from "./contexts";
import {
  invariant,
  NotImplementedError,
  raise,
  StackUnderflowError,
} from "./errors";
import { Dict, FixedLengthArray, Stack } from "./generics";
import { InstructionPointer } from "./instructions";
import { primitiveMethodDict } from "./primitive_method";
import { VirtualObject } from "./virtual_objects";
import stdClassLibrary from "./std_class_library";

const MAX_INSTRUCTION_BYTES = 2 ** 20; // 1MB

export class VirtualMachine {
  globalContext = new GlobalContext();

  contextStack = Stack<ClosureContext>();

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

  createObject(classKey: string, ivars: string[] = []) {
    return new VirtualObject(this, classKey, ivars);
  }

  asLiteral(value: string | number | boolean | undefined) {
    const classKey = this.getLiteralClassName(value);
    switch (classKey) {
      case "String":
        invariant(typeof value === "string", TypeError, "String", typeof value);
        if (value in this.internedStrings) {
          return this.internedStrings[value];
        } else {
          const vo = this.createObject(classKey);
          vo.primitiveValue = value;
          this.internedStrings[value] = vo;
          return vo;
        }
      case "Number":
        invariant(typeof value === "number", TypeError, "String", typeof value);
        if (value in this.internedNumbers) {
          return this.internedNumbers[value];
        } else {
          const vo = this.createObject(classKey);
          vo.primitiveValue = value;
          this.internedNumbers[value] = vo;
          return vo;
        }
      case "UndefinedObject":
        return this.globalContext.at("nil");
      case "True":
        return this.globalContext.at("true");
      case "False":
        return this.globalContext.at("false");
      default:
        raise(
          TypeError,
          "String | Number | UndefinedObject | True | False",
          classKey,
        );
    }
  }

  getLiteralClassName(value: string | number | boolean | undefined) {
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
      this.globalContext
        .at(cls.name)
        .setVarWithName("className", this.asLiteral(cls.name));
      this.globalContext
        .at(cls.name)
        .setVarWithName("superClass", this.globalContext.at(cls.superClass));
      this.globalContext
        .at(cls.name)
        .setVarWithName("classComment", this.asLiteral(cls.classComment));
    }
  }

  initializeClass(
    className: string,
    superClassName: string,
    addlIvars: string[] = [],
  ) {
    const superClass = this.globalContext.at(superClassName);
    const ivars = [...superClass.ivars, ...addlIvars];
    const vClass = new VirtualObject(this, "Class", ivars);
    this.globalContext.put(className, vClass);
  }

  peekNextReceiver() {
    const context = this.contextStack.peek();
    invariant(context, StackUnderflowError, "contextStack");
    const result = context.evalStack.peek();
    invariant(result, StackUnderflowError, "evalStack");
    return result;
  }

  /** (TODO:reflect) onNotUnderstood arg should refer to interpretable instructions */
  basicSend(selector: string, onNotUnderstood: () => void) {
    if (this.sendPrimative(selector)) {
      return;
    }

    // try non-primative method
    const closure = this.peekNextReceiver().getInstanceMethod(selector);
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
        raise(NotImplementedError, this.peekNextReceiver().classKey, selector);
      });
    });
  }

  populateArgs(
    closure: Closure,
    sender: ClosureContext,
    args: FixedLengthArray<VirtualObject>,
  ) {
    for (let index = 0; index < closure.argCount; index++) {
      args.put(index, sender.evalStack.pop()!);
    }
  }

  createClosure(description: ClosureDescriptionJs): Closure {
    const byteOffset = this.instructionPointer.byteOffset;

    if (description.getInstructions) {
      description.getInstructions(this.instructionPointer);
    }

    const byteLength = this.instructionPointer.byteOffset - byteOffset;

    const closure = new Closure(
      description.argCount,
      description.tempCount,
      description.literals.length,
      this,
      byteOffset,
      byteLength,
    );

    for (const [i, value] of description.literals.entries()) {
      closure.literals.put(i, this.asLiteral(value));
    }

    return closure;
  }

  /** (TODO:reflect) implement in interpreted language? */
  invokeAsMethod(closure: Closure) {
    const sender = this.contextStack.peek();
    invariant(sender, StackUnderflowError, "context");
    const receiver = sender.evalStack.pop()!;
    const context = new ClosureContext(receiver, closure);
    this.populateArgs(closure, sender, context.argsAndTemps);
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
