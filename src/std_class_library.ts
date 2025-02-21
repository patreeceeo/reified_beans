import type { ClosureDescriptionJs } from "./closures";
import {
  instSendLiteralSelectorExt,
  type InstructionPointer,
} from "./instructions";

interface ClassDescription {
  name: string;
  superClass: string;
  ivars: string[];
  classComment: string;
  methodDict: Record<string, ClosureDescriptionJs>;
}

const dObject: ClassDescription = {
  name: "Object",
  superClass: "nil",
  ivars: [],
  classComment: "I am the parent class of all classes.",
  methodDict: {},
};

const dBehavior: ClassDescription = {
  name: "Behavior",
  superClass: "Object",
  ivars: [],
  classComment:
    "I am the parent class of all 'class' type methods. My instances know about the subclass/superclass relationships between classes, contain the description that instances are created from, and hold the method dictionary that's associated with each class. I provide methods for compiling methods, modifying the class inheritance hierarchy, examining the method dictionary, and iterating over the class hierarchy.",
  // (TODO:reflect) add methodDict as instance variable, remove methodDict from ClassDescription interface.
  methodDict: {},
};

const dClassDescription: ClassDescription = {
  name: "ClassDescription",
  superClass: "Behavior",
  ivars: [],
  classComment:
    "My instances provide methods that access classes by category, and allow whole categories of classes to be filed out to persistent storage.",
  methodDict: {},
};

const dMetaclass: ClassDescription = {
  name: "Metaclass",
  superClass: "ClassDescription",
  ivars: [],
  classComment:
    "I am the root of the class hierarchy. My instances are metaclasses, one for each real class. My instances have a single instance, which they hold onto, which is the class that they are the metaclass of. I provide methods for creation of actual class objects from metaclass object, and the creation of metaclass objects, which are my instances. If this is confusing to you, it should be...the Smalltalk metaclass system is strange and complex.",
  methodDict: {},
};

const dClass: ClassDescription = {
  name: "Class",
  superClass: "Metaclass",
  ivars: ["classComment", "className", "superClass"],
  classComment:
    "I am THE class object. My instances are the classes of the system. I provide information commonly attributed to classes: namely, the class name, class comment (you wouldn't be reading this if it weren't for me), a list of the instance variables of the class, and the class category.",
  methodDict: {},
};

const dUndefinedObject: ClassDescription = {
  name: "UndefinedObject",
  superClass: "Object",
  ivars: [],
  classComment:
    "I am the parent class of all classes that represent undefined values.",
  methodDict: {},
};

const dBoolean: ClassDescription = {
  name: "Boolean",
  superClass: "Object",
  ivars: [],
  classComment:
    "I am the abstract parent class of the two classes True and False.",
  methodDict: {},
};

const dTrue: ClassDescription = {
  name: "True",
  superClass: "Boolean",
  ivars: [],
  classComment: "My instances represent logical accuracy.",
  methodDict: {},
};

const dFalse: ClassDescription = {
  name: "False",
  superClass: "Boolean",
  ivars: [],
  classComment: "My instances represent logical inaccuracy.",
  methodDict: {},
};

const dNumber: ClassDescription = {
  name: "Number",
  superClass: "Object",
  ivars: [],
  classComment: "I am the parent class of all classes that represent numbers.",
  methodDict: {},
};

const dString: ClassDescription = {
  name: "String",
  superClass: "Object",
  ivars: [],
  classComment:
    "I am the parent class of all classes that represent sequences of characters.",
  methodDict: {},
};

const dArray_at: ClosureDescriptionJs = {
  argCount: 1,
  tempCount: 0,
  literals: ["at:"],
  getInstructions: (pointer: InstructionPointer) => {
    instSendLiteralSelectorExt.writeWith(pointer, 0, 1);
  },
};

const dArray: ClassDescription = {
  name: "Array",
  superClass: "Object",
  ivars: [],
  classComment: "",
  methodDict: {
    "at:": dArray_at,
  },
};

const dRange: ClassDescription = {
  name: "Range",
  superClass: "Object",
  ivars: ["start", "end"],
  classComment: "I represent a range of numbers.",
  methodDict: {},
};

const dClosure: ClassDescription = {
  name: "Closure",
  superClass: "Object",
  ivars: [
    "argCount",
    "tempCount",
    "literals",
    "instructionByteRange",
    "localContext",
  ],
  classComment:
    "I am the parent class of all classes that represent closures. Closures are the basic units of executable code. They may declare arguments and temporary variables and a local (lexical) environment, all of which are accessible to the code in the closure. All closures implicitly have access to the global environment.",
  methodDict: {},
};

const dContext: ClassDescription = {
  name: "Context",
  superClass: "Object",
  ivars: ["evalStack", "instructionByteIndex", "receiver", "closure"],
  classComment:
    "I am the parent class of all classes that represent the context in which a closure is executed. I hold the closure, the receiver of the message that caused the closure to be executed, a stack used for evaluating expressions, and an index that points to the next byte code to be executed",
  methodDict: {},
};

const dMethodContext: ClassDescription = {
  name: "MethodContext",
  superClass: "Context",
  ivars: ["argsAndTemps"],
  classComment:
    "I am the parent class of all classes that represent the context in which a method is executed. I hold the arguments and temporary variables of an invokation of a method.",
  methodDict: {},
};

const dBlockContext: ClassDescription = {
  name: "BlockContext",
  superClass: "Context",
  ivars: ["localContext"],
  classComment:
    "I am the parent class of all classes that represent the context in which a block is executed. I reference the local (lexical) context in which the block is declared.",
  methodDict: {},
};

const classDescriptions = [
  dObject,
  dBehavior,
  dClassDescription,
  dMetaclass,
  dClass,
  dUndefinedObject,
  dBoolean,
  dTrue,
  dFalse,
  dNumber,
  dString,
  dArray,
  dRange,
  dClosure,
  dContext,
  dMethodContext,
  dBlockContext,
];

export default classDescriptions;
