import { filterEmployeesByClientAndPosition } from "./employeeFilters";

const employees = [
  { id: "EMP1", clientId: "CLI1", position: "Support" },
  { id: "EMP2", clientId: "CLI1", position: "Manager" },
  { id: "EMP3", clientId: "CLI2", position: "Support" },
  { id: "EMP4", clientId: "CLI2", position: "  Support  " },
];

describe("filterEmployeesByClientAndPosition", () => {
  it("returns all employees when no filters are selected", () => {
    expect(filterEmployeesByClientAndPosition(employees, "", "")).toEqual(
      employees
    );
  });

  it("filters by client and position together", () => {
    expect(
      filterEmployeesByClientAndPosition(employees, "CLI1", "Support")
    ).toEqual([employees[0]]);
  });

  it("matches trimmed position values and filters by either facet", () => {
    expect(
      filterEmployeesByClientAndPosition(employees, "CLI2", "Support")
    ).toEqual([employees[2], employees[3]]);
    expect(filterEmployeesByClientAndPosition(employees, "CLI1", "")).toEqual([
      employees[0],
      employees[1],
    ]);
  });
});
