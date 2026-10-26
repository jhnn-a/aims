export const filterEmployeesByClientAndPosition = (
  employees,
  clientId,
  position
) =>
  employees.filter((employee) => {
    const matchesClient = !clientId || employee.clientId === clientId;
    const matchesPosition =
      !position || employee.position?.trim() === position;
    return matchesClient && matchesPosition;
  });
