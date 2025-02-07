const dObject = {
  name: "Object",
  superClass: "nil",
  ivars: [],
  classComment: "I am the parent class of all classes.",
};

const dBehavior = {
  name: "Behavior",
  superClass: "Object",
  ivars: [],
  classComment:
    "I am the parent class of all 'class' type methods. My instances know about the subclass/superclass relationships between classes, contain the description that instances are created from, and hold the method dictionary that's associated with each class. I provide methods for compiling methods, modifying the class inheritance hierarchy, examining the method dictionary, and iterating over the class hierarchy.",
};

const dClassDescription = {
  name: "ClassDescription",
  superClass: "Behavior",
  ivars: [],
  classComment:
    "My instances provide methods that access classes by category, and allow whole categories of classes to be filed out to persistent storage.",
};

const dMetaclass = {
  name: "Metaclass",
  superClass: "ClassDescription",
  ivars: [],
  classComment:
    "I am the root of the class hierarchy. My instances are metaclasses, one for each real class. My instances have a single instance, which they hold onto, which is the class that they are the metaclass of. I provide methods for creation of actual class objects from metaclass object, and the creation of metaclass objects, which are my instances. If this is confusing to you, it should be...the Smalltalk metaclass system is strange and complex.",
};

const dClass = {
  name: "Class",
  superClass: "Metaclass",
  ivars: ["classComment", "className", "superClass"],
  classComment:
    "I am THE class object. My instances are the classes of the system. I provide information commonly attributed to classes: namely, the class name, class comment (you wouldn't be reading this if it weren't for me), a list of the instance variables of the class, and the class category.",
};

const dUndefinedObject = {
  name: "UndefinedObject",
  superClass: "Object",
  ivars: [],
  classComment:
    "I am the parent class of all classes that represent undefined values.",
};

const dBoolean = {
  name: "Boolean",
  superClass: "Object",
  ivars: [],
  classComment:
    "I am the abstract parent class of the two classes True and False.",
};

const dTrue = {
  name: "True",
  superClass: "Boolean",
  ivars: [],
  classComment: "My instances represent logical accuracy.",
};

const dFalse = {
  name: "False",
  superClass: "Boolean",
  ivars: [],
  classComment: "My instances represent logical inaccuracy.",
};

const dString = {
  name: "String",
  superClass: "Object",
  ivars: [],
  classComment:
    "I am the parent class of all classes that represent sequences of characters.",
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
  dString,
];

export default classDescriptions;
