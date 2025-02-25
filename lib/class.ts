import { type ClassDescription } from "src/virtual_objects";

const dClass: ClassDescription = {
  name: "Class",
  superClass: "Metaclass",
  ivars: ["classComment", "className", "superClass"],
  classComment:
    "I am THE class object. My instances are the classes of the system. I provide information commonly attributed to classes: namely, the class name, class comment (you wouldn't be reading this if it weren't for me), a list of the instance variables of the class, and the class category.",
  methodDict: {},
};

export default dClass;
