import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { VirtualMachine } from "src/virtual_machine";

const vm = new VirtualMachine();

export const Workspace = () => (
  <div style={{ height: "100vh", width: "100vw" }}>
    <Allotment>
      <ClassList />
      <ComponentB />
    </Allotment>
  </div>
);

function selectClassNames(names: string[]) {
  return names.filter((name) => {
    const vObject = vm.globalContext.at(name);
    return vObject.classId === "Class";
  });
}

const ClassList = () => {
  return (
    <ul>
      {selectClassNames(vm.globalContext.keys).map((name) => (
        <div key={name}>{name}</div>
      ))}
    </ul>
  );
};
const ComponentB = () => <div>B</div>;
