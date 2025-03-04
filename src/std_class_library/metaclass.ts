import { type ClassDescription } from "src/virtual_objects";

const dMetaclass: ClassDescription = {
  name: "Metaclass",
  superClass: "ClassDescription",
  ivars: [],
  classComment:
    "I am the root of the class hierarchy. My instances are metaclasses, one for each real class. My instances have a single instance, which they hold onto, which is the class that they are the metaclass of. I provide methods for creation of actual class objects from metaclass object, and the creation of metaclass objects, which are my instances. If this is confusing to you, it should be...the Smalltalk metaclass system is strange and complex.",
  methodDict: {},
};

export default dMetaclass;
