/** 
* @fileoverview Define the standard library.
*
* Much of this may change or be removed as the ability to define classes in the language develops.
*
* Methods are being defined here to prevent circular dependency between the class definitions and machine ops.
*/
import {theIteratorClass, theClassClass, theFalseClass, theNilClass, theNumberClass, theProcClass, theTrueClass, theObjectClass} from "./class_definitions";
import {newMachineOp} from "./machine_ops";

export function loadStdlib() {
  theClassClass.setMethodImplementation("new", [
    // Args: <the class object>, ...newArgs
    newMachineOp("ReplaceWithNativeMethodAnswer", "instantiate"),
    // Args: instance, ...newArgs
    newMachineOp("AddToScope", "result"),
    // Args: instance, ...newArgs
    newMachineOp("LookupMethod", "initialize"),
    // Args: <initialize method>, instance, ...newArgs
    newMachineOp("PushState"),
    newMachineOp("ClearArgs"),
    newMachineOp("GetFromScope", "result")
  ])
  theObjectClass.setMethodImplementation("initialize", [])
  theTrueClass.setMethodImplementation("ifTrue", [
    newMachineOp("ShiftArg"),
    newMachineOp("PushState"),
  ])
  theTrueClass.setMethodImplementation("ifFalse", [
    newMachineOp("ShiftArg"),
    newMachineOp("ShiftArg"),
  ])
  theTrueClass.setMethodImplementation("ifTrue_ifFalse", [
    newMachineOp("ShiftArg"),
    newMachineOp("PushState"),
  ])
  theFalseClass.setMethodImplementation("ifTrue", [
    newMachineOp("ShiftArg"),
    newMachineOp("ShiftArg"),
  ])
  theFalseClass.setMethodImplementation("ifFalse", [
    newMachineOp("ShiftArg"),
    newMachineOp("PushState"),
  ])
  theFalseClass.setMethodImplementation("ifTrue_ifFalse", [
    newMachineOp("ShiftArg"),
    newMachineOp("ShiftArg"),
    newMachineOp("PushState"),
  ])
}

export const stdlib = [
  theObjectClass,
  theNumberClass,
  theTrueClass,
  theFalseClass,
  theNilClass,
  theProcClass,
  theClassClass,
  theIteratorClass
]
