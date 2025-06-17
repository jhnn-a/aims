import { useState, useEffect } from "react";
import {
  addEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
} from "../services/employeeService";
import { getAllClients } from "../services/clientService";
import { getAllDevices, updateDevice } from "../services/deviceService";

const isValidName = (value) => /^[A-Za-zÑñ\s.'\-(),]+$/.test(value.trim());
const isValidPosition = (value) =>
  /^[A-Za-zÑñ0-9\s.'\-(),/\\]+$/.test(value.trim());

function EmployeeFormModal({
  data,
  onChange,
  onSave,
  onCancel,
  isValid,
  clients,
}) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h3>{data.id ? "Edit Employee" : "Add Employee"}</h3>
        <div>
          <label>Full Name:</label>
          <input name="fullName" value={data.fullName} onChange={onChange} />
        </div>
        <div>
          <label>Position:</label>
          <input name="position" value={data.position} onChange={onChange} />
        </div>
        <div>
          <label>Department:</label>
          <input
            name="department"
            value={data.department}
            onChange={onChange}
          />
        </div>
        <div>
          <label>Client:</label>
          <select name="clientId" value={data.clientId} onChange={onChange}>
            <option value="" disabled>
              Choose Client
            </option>
            {clients
              .slice()
              .sort((a, b) => a.clientName.localeCompare(b.clientName))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName}
                </option>
              ))}
          </select>
        </div>
        <div style={{ marginTop: 16 }}>
          <button onClick={onSave} disabled={!isValid}>
            Save
          </button>
          <button onClick={onCancel} style={{ marginLeft: 8 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({ onConfirm, onCancel }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h3>Confirm Deletion</h3>
        <p>Are you sure you want to delete this employee?</p>
        <div style={{ marginTop: 16 }}>
          <button onClick={onConfirm} style={{ color: "red" }}>
            Delete
          </button>
          <button onClick={onCancel} style={{ marginLeft: 8 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [sortByLastName, setSortByLastName] = useState(false);
  const [form, setForm] = useState({
    id: null,
    fullName: "",
    position: "",
    clientId: "",
    department: "",
  });
  const [search, setSearch] = useState("");
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [devicesForEmployee, setDevicesForEmployee] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assigningDevice, setAssigningDevice] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");

  useEffect(() => {
    loadClientsAndEmployees();
  }, []);

  const loadClientsAndEmployees = async () => {
    setLoading(true);
    const [employeeData, clientData] = await Promise.all([
      getAllEmployees(),
      getAllClients(),
    ]);
    setClients(clientData);
    const clientMap = Object.fromEntries(
      clientData.map((client) => [client.id, client.clientName])
    );
    setEmployees(
      employeeData.map((emp) => ({
        ...emp,
        client:
          emp.clientId && clientMap[emp.clientId]
            ? clientMap[emp.clientId]
            : "-",
      }))
    );
    setLoading(false);
  };

  const handleInput = ({ target: { name, value } }) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const isFormValid = () =>
    isValidName(form.fullName) &&
    isValidPosition(form.position) &&
    form.clientId.trim() !== "" &&
    form.department.trim() !== "";

  const handleSave = async () => {
    if (!isFormValid()) return;
    const payload = {
      fullName: form.fullName.trim(),
      position: form.position.trim(),
      clientId: form.clientId.trim(),
      department: form.department.trim(),
    };
    if (form.id) {
      await updateEmployee(form.id, payload);
    } else {
      await addEmployee(payload);
    }
    resetForm();
    loadClientsAndEmployees();
  };

  const handleEdit = (emp) => {
    setForm({
      id: emp.id,
      fullName: emp.fullName,
      position: emp.position,
      clientId: emp.clientId || "",
      department: emp.department || "",
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setSelectedId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    await deleteEmployee(selectedId);
    setSelectedId(null);
    setShowConfirm(false);
    loadClientsAndEmployees();
  };

  const cancelDelete = () => {
    setSelectedId(null);
    setShowConfirm(false);
  };

  const resetForm = () => {
    setForm({
      id: null,
      fullName: "",
      position: "",
      clientId: "",
      department: "",
    });
    setShowForm(false);
  };

  const toggleSortByLastName = () => {
    setSortByLastName((prev) => !prev);
  };

  const getSortedEmployees = () => {
    if (!sortByLastName) return employees;
    return [...employees].sort((a, b) => {
      const lastA = a.fullName.trim().split(/\s+/).slice(-1)[0].toLowerCase();
      const lastB = b.fullName.trim().split(/\s+/).slice(-1)[0].toLowerCase();
      return lastA.localeCompare(lastB);
    });
  };

  const formatName = (fullName) => {
    const words = fullName.trim().split(/\s+/);
    if (sortByLastName && words.length > 1) {
      const last = words.pop();
      return `${last} ${words.join(" ")}`;
    }
    return fullName;
  };

  const filteredEmployees = getSortedEmployees().filter((emp) =>
    emp.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleShowDevices = async (employee) => {
    setSelectedEmployee(employee);
    const allDevices = await getAllDevices();
    const assignedDevices = allDevices.filter(
      (d) => d.assignedTo === employee.id
    );
    setDevicesForEmployee(assignedDevices);
    setShowDevicesModal(true);
  };
  const handleCloseDevicesModal = () => {
    setShowDevicesModal(false);
    setDevicesForEmployee([]);
    setSelectedEmployee(null);
  };

  return (
    <div style={styles.pageContainer}>
      <h2>Employee Database</h2>
      <input
        type="text"
        placeholder="Search by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12, padding: 6, width: 240 }}
      />
      <button onClick={() => setShowForm(true)} style={{ marginLeft: 12 }}>
        Add New Employee
      </button>
      <button onClick={toggleSortByLastName} style={{ marginLeft: 12 }}>
        {sortByLastName ? "Clear Sort" : "Sort by Last Name (A-Z)"}
      </button>

      {showForm && (
        <EmployeeFormModal
          data={form}
          onChange={handleInput}
          onSave={handleSave}
          onCancel={resetForm}
          isValid={isFormValid()}
          clients={clients}
        />
      )}

      {showConfirm && (
        <DeleteConfirmationModal
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {showDevicesModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Devices Assigned to {selectedEmployee?.fullName}</h3>
            {devicesForEmployee.length === 0 ? (
              <p>No devices assigned.</p>
            ) : (
              <table
                style={{
                  width: "100%",
                  marginTop: 12,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th style={styles.th}>Tag</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Brand</th>
                    <th style={styles.th}>Model</th>
                    <th style={styles.th}>Condition</th>
                    <th style={styles.th}>Assignment Date</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devicesForEmployee.map((dev) => (
                    <tr key={dev.id}>
                      <td style={styles.td}>{dev.deviceTag}</td>
                      <td style={styles.td}>{dev.deviceType}</td>
                      <td style={styles.td}>{dev.brand}</td>
                      <td style={styles.td}>{dev.model}</td>
                      <td style={styles.td}>{dev.condition}</td>
                      <td style={styles.td}>{dev.assignmentDate || ""}</td>
                      <td style={styles.td}>
                        <button
                          onClick={async () => {
                            try {
                              await updateDevice(dev.id, {
                                ...dev,
                                assignedTo: "",
                                assignmentDate: "",
                              });
                              const allDevices = await getAllDevices();
                              setDevicesForEmployee(
                                allDevices.filter(
                                  (d) => d.assignedTo === selectedEmployee.id
                                )
                              );
                            } catch (err) {
                              alert(
                                "Failed to unassign device. Please try again."
                              );
                            }
                          }}
                          style={{ color: "red", marginRight: 8 }}
                        >
                          Unassign
                        </button>
                        <button
                          onClick={() => {
                            setAssigningDevice(dev);
                            setAssignModalOpen(true);
                          }}
                        >
                          {dev.assignedTo ? "Reassign" : "Assign"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button onClick={handleCloseDevicesModal} style={{ marginTop: 16 }}>
              Close
            </button>
            {/* Assign Modal */}
            {assignModalOpen && assigningDevice && (
              <div style={{ ...styles.modalOverlay, zIndex: 1100 }}>
                <div style={{ ...styles.modalContent, minWidth: 350 }}>
                  <h4>Assign Device: {assigningDevice.deviceTag}</h4>
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={assignSearch}
                    onChange={(e) => setAssignSearch(e.target.value)}
                    style={{ width: "100%", marginBottom: 8, padding: 6 }}
                  />
                  <ul
                    style={{
                      maxHeight: 200,
                      overflowY: "auto",
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    {employees
                      .filter((emp) => emp.id !== selectedEmployee.id)
                      .filter((emp) =>
                        emp.fullName
                          .toLowerCase()
                          .includes(assignSearch.toLowerCase())
                      )
                      .map((emp) => (
                        <li
                          key={emp.id}
                          style={{ listStyle: "none", marginBottom: 8 }}
                        >
                          <button
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: 8,
                            }}
                            onClick={async () => {
                              try {
                                await updateDevice(assigningDevice.id, {
                                  ...assigningDevice,
                                  assignedTo: emp.id,
                                  assignmentDate: new Date()
                                    .toISOString()
                                    .slice(0, 10),
                                });
                                const allDevices = await getAllDevices();
                                setDevicesForEmployee(
                                  allDevices.filter(
                                    (d) => d.assignedTo === selectedEmployee.id
                                  )
                                );
                                setAssignModalOpen(false);
                                setAssigningDevice(null);
                                setAssignSearch("");
                              } catch (err) {
                                alert(
                                  "Failed to assign device. Please try again."
                                );
                              }
                            }}
                          >
                            {emp.fullName}
                          </button>
                        </li>
                      ))}
                  </ul>
                  <button
                    onClick={() => {
                      setAssignModalOpen(false);
                      setAssigningDevice(null);
                      setAssignSearch("");
                    }}
                    style={{ marginTop: 12 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Full Name</th>
                <th style={styles.th}>Position</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp.id}
                  style={
                    emp.client === "Joii Workstream"
                      ? { backgroundColor: "#f0f0f0" }
                      : {}
                  }
                >
                  <td style={styles.td}>{emp.id}</td>
                  <td style={styles.td}>
                    <span
                      style={{ cursor: "pointer", color: "#1976d2" }}
                      onClick={() => handleShowDevices(emp)}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.textDecoration = "none")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.textDecoration = "none")
                      }
                    >
                      {formatName(emp.fullName)}
                    </span>
                  </td>
                  <td style={styles.td}>{emp.position}</td>
                  <td style={styles.td}>{emp.department || "-"}</td>
                  <td style={styles.td}>{emp.client}</td>
                  <td style={styles.td}>
                    <button onClick={() => handleEdit(emp)}>Edit</button>
                    <button
                      onClick={() => handleDelete(emp.id)}
                      style={{ marginLeft: 8, color: "red" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Employees;

const styles = {
  pageContainer: { padding: 16, maxWidth: "100%" },
  tableContainer: { marginTop: 16, overflowX: "auto" },
  table: { width: "100%", minWidth: 600, borderCollapse: "collapse" },
  th: {
    border: "1px solid #ccc",
    padding: 8,
    backgroundColor: "#f5f5f5",
    textAlign: "left",
  },
  td: { border: "1px solid #ccc", padding: 8 },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 8,
    minWidth: 300,
  },
};
