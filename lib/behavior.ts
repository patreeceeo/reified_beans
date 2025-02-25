import { type ClassDescription } from "src/virtual_objects";

export const dBehavior: ClassDescription = {
  name: "Behavior",
  superClass: "Object",
  ivars: [],
  classComment:
    "I am the parent class of all 'class' type methods. My instances know about the subclass/superclass relationships between classes, contain the description that instances are created from, and hold the method dictionary that's associated with each class. I provide methods for compiling methods, modifying the class inheritance hierarchy, examining the method dictionary, and iterating over the class hierarchy.",
  // (TODO:reflect) add methodDict as instance variable, remove methodDict from ClassDescription interface.
  methodDict: {},
};

export default dBehavior;
