/** 
* @fileoverview Define the standard library.
*
* Much of this may change or be removed as the ability to define classes in the language develops.
*
* Methods are being defined here to prevent circular dependency between the class definitions and machine ops.
*/
import {theClassClass, theFalseClass, theNilClass, theNumberClass, theProcClass, theTrueClass} from "./class_definitions";
import type {Dict} from "./generics";
import {MachineOp, newMachineOp} from "./machine_ops";

export function loadStdlib() {
  loadTrueClassMethods(theTrueClass.methodOpsByName)
  loadFalseClassMethods(theFalseClass.methodOpsByName)
}

function loadTrueClassMethods(methodOpsByName: Dict<readonly MachineOp[]>) {
  methodOpsByName.ifTrue = [
    newMachineOp("PushState"),
    newMachineOp("PopState")
  ]
  methodOpsByName.ifFalse = [
    newMachineOp("DiscardArg"),
    newMachineOp("PopState")
  ]
  methodOpsByName.ifTrue_ifFalse = [
    newMachineOp("PushState"),
    newMachineOp("PopState")
  ]
}

function loadFalseClassMethods(methodOpsByName: Dict<readonly MachineOp[]>) {
  methodOpsByName.ifTrue = [
    newMachineOp("DiscardArg"),
    newMachineOp("PopState")
  ]
  methodOpsByName.ifFalse = [
    newMachineOp("PushState"),
    newMachineOp("PopState")
  ]
  methodOpsByName.ifTrue_ifFalse = [
    newMachineOp("DiscardArg"),
    newMachineOp("PushState"),
    newMachineOp("PopState")
  ]
}

export const stdlib = [
  theNumberClass,
  theTrueClass,
  theFalseClass,
  theNilClass,
  theProcClass,
  theClassClass
]
