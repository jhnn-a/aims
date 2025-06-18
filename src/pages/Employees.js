import { useState, useEffect } from "react";
import * as XLSX from "xlsx"; // <-- add this import
import {
  addEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
} from "../services/employeeService";
import { getAllClients } from "../services/clientService";
import { getAllDevices, updateDevice } from "../services/deviceService";
import {
  getDeviceHistoryForEmployee,
  logDeviceHistory,
  deleteDeviceHistory,
} from "../services/deviceHistoryService";

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
        <h2 style={styles.modalTitle}>
          {data.id ? "Edit Employee" : "Add Employee"}
        </h2>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Full Name:</label>
          <input
            name="fullName"
            value={data.fullName}
            onChange={onChange}
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Position:</label>
          <input
            name="position"
            value={data.position}
            onChange={onChange}
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Department:</label>
          <input
            name="department"
            value={data.department}
            onChange={onChange}
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Client:</label>
          <select
            name="clientId"
            value={data.clientId}
            onChange={onChange}
            style={styles.input}
          >
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
        {/* New Corporate Email field */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Corporate Email:</label>
          <input
            type="email"
            name="corporateEmail"
            value={data.corporateEmail || ""}
            onChange={onChange}
            style={styles.input}
          />
        </div>
        {/* New Personal Email field */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Personal Email:</label>
          <input
            type="email"
            name="personalEmail"
            value={data.personalEmail || ""}
            onChange={onChange}
            style={styles.input}
          />
        </div>
        {/* Date Hired field */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Date Hired:</label>
          <input
            type="date"
            name="dateHired"
            value={data.dateHired ? data.dateHired : ""}
            onChange={onChange}
            style={styles.input}
          />
        </div>
        {/* Remove Date Added field from modal */}
        <div style={{ marginTop: 24, textAlign: "right" }}>
          <button onClick={onSave} disabled={!isValid} style={styles.actionBtn}>
            Save
          </button>
          <button onClick={onCancel} style={styles.cancelBtn}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper to format date as MM-DD-YYYY
function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

function DeleteConfirmationModal({ onConfirm, onCancel }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h2 style={{ color: "#e11d48", marginBottom: 12 }}>Confirm Deletion</h2>
        <p>Are you sure you want to delete this employee?</p>
        <div style={{ marginTop: 24, textAlign: "right" }}>
          <button onClick={onConfirm} style={styles.deleteBtn}>
            Delete
          </button>
          <button onClick={onCancel} style={styles.cancelBtn}>
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
    dateHired: "",
    corporateEmail: "",
    personalEmail: "",
  });
  const [search, setSearch] = useState("");
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [devicesForEmployee, setDevicesForEmployee] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assigningDevice, setAssigningDevice] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [unassignDevice, setUnassignDevice] = useState(null);
  const [unassignReason, setUnassignReason] = useState("working");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteProgress, setDeleteProgress] = useState({
    current: 0,
    total: 0,
  });
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });

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

  // Only require name for validation
  const isFormValid = () => isValidName(form.fullName);

  const handleSave = async () => {
    if (!isFormValid()) return;
    // Always set dateHired to today if not specified
    let dateHired = form.dateHired;
    if (!dateHired || dateHired.trim() === "") {
      const now = new Date();
      const offset = now.getTimezoneOffset();
      dateHired = new Date(now.getTime() - offset * 60 * 1000)
        .toISOString()
        .slice(0, 10);
    }
    const payload = {
      fullName: form.fullName.trim(),
      position: form.position || "",
      clientId: form.clientId || "",
      department: form.department || "",
      dateHired,
      corporateEmail: form.corporateEmail || "",
      personalEmail: form.personalEmail || "",
      // dateAdded removed
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
      dateHired: emp.dateHired || "",
      corporateEmail: emp.corporateEmail || "",
      personalEmail: emp.personalEmail || "",
      // dateAdded removed
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
      dateHired: "",
      corporateEmail: "",
      personalEmail: "",
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

  const handleUnassign = (device) => {
    setUnassignDevice(device);
    setUnassignReason("working");
    setShowUnassignModal(true);
  };

  const confirmUnassign = async () => {
    if (!unassignDevice) return;
    let condition = "Working";
    let reason = "Returned to Stock Room"; // Default for all unassigns
    if (unassignReason === "repair") {
      condition = "Needs Repair";
      reason = "Returned for repair";
    }
    if (unassignReason === "retired") {
      condition = "Retired";
      reason = "Returned as retired";
    }
    // Remove id from payload
    const { id, ...deviceWithoutId } = unassignDevice;
    await updateDevice(unassignDevice.id, {
      ...deviceWithoutId,
      assignedTo: "",
      assignmentDate: "",
      status: "Stock Room",
      condition,
    });
    // Log history
    await logDeviceHistory({
      employeeId: selectedEmployee.id,
      deviceId: unassignDevice.id,
      deviceTag: unassignDevice.deviceTag,
      action: "unassigned",
      reason,
      condition,
      date: new Date().toISOString(),
    });
    setShowUnassignModal(false);
    setUnassignDevice(null);
    // Refresh device list in modal
    if (selectedEmployee) {
      const allDevices = await getAllDevices();
      setDevicesForEmployee(
        allDevices.filter((d) => d.assignedTo === selectedEmployee.id)
      );
    }
  };

  const cancelUnassign = () => {
    setShowUnassignModal(false);
    setUnassignDevice(null);
  };

  const handleShowHistory = async () => {
    if (!selectedEmployee) return;
    setLoadingHistory(true);
    const hist = await getDeviceHistoryForEmployee(selectedEmployee.id);
    console.log(
      "Fetched device history for employee",
      selectedEmployee.id,
      hist
    ); // Debug log
    setHistory(hist);
    setShowHistoryModal(true);
    setLoadingHistory(false);
  };

  const handleDeleteHistory = async (historyId) => {
    await deleteDeviceHistory(historyId);
    // Refresh history list
    if (selectedEmployee) {
      const hist = await getDeviceHistoryForEmployee(selectedEmployee.id);
      setHistory(hist);
    }
  };

  // Import Excel handler with progress
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportProgress({ current: 0, total: 0 });
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      // Expect columns: Date Hired, Client, Full Name, Position, Corporate Email, Personal Email, Department
      // Map client name to clientId
      const clientNameToId = Object.fromEntries(
        clients.map((c) => [c.clientName.trim().toLowerCase(), c.id])
      );

      setImportProgress({ current: 0, total: rows.length });

      let importedCount = 0;
      for (let i = 0; i < rows.length; i++) {
        setImportProgress({ current: i + 1, total: rows.length });
        const row = rows[i];
        const clientId =
          clientNameToId[(row["Client"] || "").trim().toLowerCase()] || "";
        if (row["Full Name"]) {
          // --- Date Hired Fix ---
          let dateHired = row["Date Hired"] || "";
          if (dateHired) {
            // Try to parse Excel date formats (MM/DD/YYYY or DD/MM/YYYY or Date object)
            // If it's a Date object (from Excel), convert to yyyy-mm-dd
            if (typeof dateHired === "number") {
              // Excel serial date
              // Excel's epoch starts at 1899-12-30
              const excelEpoch = new Date(1899, 11, 30);
              const d = new Date(excelEpoch.getTime() + dateHired * 86400000);
              dateHired = d.toISOString().slice(0, 10);
            } else if (
              typeof dateHired === "string" &&
              dateHired.includes("/")
            ) {
              // Parse MM/DD/YYYY or M/D/YYYY
              const [m, d, y] = dateHired.split("/");
              if (m && d && y) {
                const jsDate = new Date(
                  `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
                );
                if (!isNaN(jsDate)) {
                  dateHired = jsDate.toISOString().slice(0, 10);
                } else {
                  dateHired = "";
                }
              }
            }
          }
          // fallback to today if still invalid
          if (!dateHired) {
            const now = new Date();
            const offset = now.getTimezoneOffset();
            dateHired = new Date(now.getTime() - offset * 60 * 1000)
              .toISOString()
              .slice(0, 10);
          }
          const dateAdded = dateHired;
          await addEmployee({
            fullName: row["Full Name"],
            position: row["Position"] || "",
            department: row["Department"] || "",
            clientId,
            dateHired,
            corporateEmail: row["Corporate Email"] || "",
            personalEmail: row["Personal Email"] || "",
            dateAdded,
          });
          importedCount++;
        }
      }
      loadClientsAndEmployees();
      alert(
        `Import finished! Imported ${importedCount} of ${rows.length} row(s).`
      );
    } catch (err) {
      alert("Failed to import. Please check your Excel file format.");
    }
    setImporting(false);
    setImportProgress({ current: 0, total: 0 });
    e.target.value = ""; // reset file input
  };

  // Select all handler
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredEmployees.map((emp) => emp.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Individual select handler
  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // Bulk delete handler with progress
  const handleBulkDelete = async () => {
    if (
      selectedIds.length === 0 ||
      !window.confirm(`Delete ${selectedIds.length} selected employee(s)?`)
    )
      return;
    setDeleteProgress({ current: 0, total: selectedIds.length });
    for (let i = 0; i < selectedIds.length; i++) {
      await deleteEmployee(selectedIds[i]);
      setDeleteProgress({ current: i + 1, total: selectedIds.length });
    }
    setSelectedIds([]);
    setDeleteProgress({ current: 0, total: 0 });
    loadClientsAndEmployees();
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.headerRow}>
        <h2 style={styles.pageTitle}>Employee Database</h2>
        <div>
          <button onClick={() => setShowForm(true)} style={styles.actionBtn}>
            + Add Employee
          </button>
          <label style={{ marginLeft: 8 }}>
            <input
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleImportExcel}
              disabled={importing}
            />
            <button
              type="button"
              style={styles.secondaryBtn}
              disabled={importing}
              onClick={() =>
                document
                  .querySelector('input[type="file"][accept=".xlsx,.xls"]')
                  .click()
              }
            >
              {importing
                ? importProgress.total > 0
                  ? `Importing ${importProgress.current}/${importProgress.total}...`
                  : "Importing..."
                : "Import Excel"}
            </button>
          </label>
        </div>
      </div>
      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />
        <button onClick={toggleSortByLastName} style={styles.secondaryBtn}>
          {sortByLastName ? "Clear Sort" : "Sort by Last Name (A-Z)"}
        </button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <button
          style={{ color: "red", marginRight: 8 }}
          disabled={selectedIds.length === 0 || deleteProgress.total > 0}
          onClick={handleBulkDelete}
        >
          Delete Selected
        </button>
        {deleteProgress.total > 0 && (
          <span style={{ color: "#e11d48", fontWeight: 600 }}>
            Deleting {deleteProgress.current}/{deleteProgress.total}...
          </span>
        )}
      </div>

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
            <h3 style={{ color: "#2563eb" }}>
              Devices Assigned to {selectedEmployee?.fullName}
            </h3>
            <button onClick={handleShowHistory} style={styles.secondaryBtn}>
              View History
            </button>
            {devicesForEmployee.length === 0 ? (
              <p>No devices assigned.</p>
            ) : (
              <table style={styles.table}>
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
                          onClick={() => handleUnassign(dev)}
                          style={styles.deleteBtn}
                        >
                          Unassign
                        </button>
                        <button
                          onClick={() => {
                            setAssigningDevice(dev);
                            setAssignModalOpen(true);
                          }}
                          style={styles.secondaryBtn}
                        >
                          {dev.assignedTo ? "Reassign" : "Assign"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button onClick={handleCloseDevicesModal} style={styles.cancelBtn}>
              Close
            </button>
            {/* Assign Modal */}
            {assignModalOpen && assigningDevice && (
              <div style={{ ...styles.modalOverlay, zIndex: 1100 }}>
                <div style={{ ...styles.modalContent, minWidth: 350 }}>
                  <h4 style={{ color: "#2563eb" }}>
                    Assign Device: {assigningDevice.deviceTag}
                  </h4>
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
                              borderRadius: 6,
                              border: "1px solid #e5e7eb",
                              background: "#f8fafc",
                              cursor: "pointer",
                            }}
                            onClick={async () => {
                              try {
                                // If reassigning, log unassign for previous employee
                                if (
                                  assigningDevice.assignedTo &&
                                  assigningDevice.assignedTo !== emp.id
                                ) {
                                  // Find previous employee name
                                  const prevEmp = employees.find(
                                    (e) => e.id === assigningDevice.assignedTo
                                  );
                                  const prevEmpName = prevEmp
                                    ? prevEmp.fullName
                                    : assigningDevice.assignedTo;
                                  await logDeviceHistory({
                                    employeeId: assigningDevice.assignedTo,
                                    deviceId: assigningDevice.id,
                                    deviceTag: assigningDevice.deviceTag,
                                    action: "unassigned",
                                    reason: `Reassigned to ${emp.fullName}`,
                                    condition: assigningDevice.condition,
                                    date: new Date().toISOString(),
                                  });
                                  // Assign to new employee
                                  // Remove id from payload
                                  const { id, ...deviceWithoutId } =
                                    assigningDevice;
                                  await updateDevice(assigningDevice.id, {
                                    ...deviceWithoutId,
                                    assignedTo: emp.id,
                                    assignmentDate: new Date()
                                      .toISOString()
                                      .slice(0, 10),
                                  });
                                  // Log assign history with previous employee name
                                  await logDeviceHistory({
                                    employeeId: emp.id,
                                    deviceId: assigningDevice.id,
                                    deviceTag: assigningDevice.deviceTag,
                                    action: "assigned",
                                    reason: `Received from reassignment (${prevEmpName})`,
                                    date: new Date().toISOString(),
                                  });
                                } else {
                                  // Normal assign
                                  const { id, ...deviceWithoutId } =
                                    assigningDevice;
                                  await updateDevice(assigningDevice.id, {
                                    ...deviceWithoutId,
                                    assignedTo: emp.id,
                                    assignmentDate: new Date()
                                      .toISOString()
                                      .slice(0, 10),
                                  });
                                  await logDeviceHistory({
                                    employeeId: emp.id,
                                    deviceId: assigningDevice.id,
                                    deviceTag: assigningDevice.deviceTag,
                                    action: "assigned",
                                    reason: "assigned",
                                    date: new Date().toISOString(),
                                  });
                                }
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
                    style={{ marginTop: 12, ...styles.cancelBtn }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showUnassignModal && unassignDevice && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ color: "#e11d48" }}>
              Unassign Device: {unassignDevice.deviceTag}
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600 }}>Reason for unassigning:</label>
              <div style={{ marginTop: 8 }}>
                <label>
                  <input
                    type="radio"
                    name="unassignReason"
                    value="working"
                    checked={unassignReason === "working"}
                    onChange={() => setUnassignReason("working")}
                  />
                  Normal unassign (still working)
                </label>
              </div>
              <div>
                <label>
                  <input
                    type="radio"
                    name="unassignReason"
                    value="repair"
                    checked={unassignReason === "repair"}
                    onChange={() => setUnassignReason("repair")}
                  />
                  Needs repair
                </label>
              </div>
              <div>
                <label>
                  <input
                    type="radio"
                    name="unassignReason"
                    value="retired"
                    checked={unassignReason === "retired"}
                    onChange={() => setUnassignReason("retired")}
                  />
                  Retired
                </label>
              </div>
            </div>
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button onClick={confirmUnassign} style={styles.actionBtn}>
                Confirm
              </button>
              <button onClick={cancelUnassign} style={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ color: "#2563eb" }}>Device Assignment History</h3>
            {loadingHistory ? (
              <p>Loading...</p>
            ) : history.length === 0 ? (
              <p>No history found.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Device Tag</th>
                    <th style={styles.th}>Action</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Reason</th>
                    <th style={styles.th}>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td style={styles.td}>{h.deviceTag}</td>
                      <td style={styles.td}>{h.action}</td>
                      <td style={styles.td}>
                        {new Date(h.date).toLocaleString()}
                      </td>
                      <td style={styles.td}>{h.reason || "-"}</td>
                      <td style={styles.td}>
                        <button
                          onClick={() => handleDeleteHistory(h.id)}
                          style={styles.deleteBtn}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button
              onClick={() => setShowHistoryModal(false)}
              style={{ marginTop: 16, ...styles.cancelBtn }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: "center", marginTop: 40 }}>Loading...</p>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th
                  style={{
                    ...styles.th,
                    width: 32,
                    minWidth: 32,
                    maxWidth: 32,
                    textAlign: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      filteredEmployees.length > 0 &&
                      selectedIds.length === filteredEmployees.length
                    }
                    onChange={handleSelectAll}
                    style={{ width: 16, height: 16, margin: 0 }}
                  />
                </th>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Full Name</th>
                <th style={styles.th}>Position</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Corporate Email</th>
                <th style={styles.th}>Personal Email</th>
                <th style={styles.th}>Date Hired</th>
                {/* Remove Date Added column */}
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp.id}
                  style={
                    emp.client === "Joii Workstream"
                      ? { backgroundColor: "#f8fafc" }
                      : {}
                  }
                >
                  <td
                    style={{
                      ...styles.td,
                      width: 32,
                      minWidth: 32,
                      maxWidth: 32,
                      textAlign: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(emp.id)}
                      onChange={() => handleSelectOne(emp.id)}
                      style={{ width: 16, height: 16, margin: 0 }}
                    />
                  </td>
                  <td style={styles.td}>{emp.id}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        cursor: "pointer",
                        color: "#2563eb",
                        fontWeight: 500,
                        textDecoration: "underline",
                        textUnderlineOffset: 2,
                      }}
                      onClick={() => handleShowDevices(emp)}
                    >
                      {formatName(emp.fullName)}
                    </span>
                  </td>
                  <td style={styles.td}>{emp.position}</td>
                  <td style={styles.td}>{emp.department || "-"}</td>
                  <td style={styles.td}>{emp.client}</td>
                  <td style={styles.td}>{emp.corporateEmail || "-"}</td>
                  <td style={styles.td}>{emp.personalEmail || "-"}</td>
                  <td style={styles.td}>
                    {emp.dateHired ? formatDisplayDate(emp.dateHired) : "-"}
                  </td>
                  {/* Remove Date Added cell */}
                  <td style={styles.td}>
                    <button
                      onClick={() => handleEdit(emp)}
                      style={styles.actionBtn}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id)}
                      style={styles.deleteBtn}
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
  pageContainer: {
    padding: "16px 0 16px 0", // Only top/bottom padding, no left/right
    maxWidth: "100%",
    background: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "Segoe UI, Arial, sans-serif",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
    paddingLeft: 0, // align with Inventory
  },
  pageTitle: {
    color: "#2563eb",
    fontWeight: 700,
    fontSize: 28,
    margin: 0,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
    paddingLeft: 0, // align with Inventory
  },
  input: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 16,
    background: "#fff",
    minWidth: 220,
    marginRight: 0,
  },
  inputGroup: {
    marginBottom: 14,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontWeight: 500,
    color: "#334155",
    marginBottom: 2,
  },
  tableContainer: {
    marginTop: 16,
    overflowX: "auto",
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 2px 12px #2563eb0a",
    padding: 0,
    maxWidth: "100vw",
    width: "100%",
  },
  table: {
    width: "100%",
    minWidth: 900,
    borderCollapse: "collapse",
    background: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    tableLayout: "auto",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  th: {
    border: "1px solid #e5e7eb",
    padding: "6px 4px",
    backgroundColor: "#f1f5f9",
    textAlign: "left",
    fontWeight: 600,
    color: "#2563eb",
    fontSize: 14,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  td: {
    border: "1px solid #e5e7eb",
    padding: "6px 4px",
    background: "#fff",
    fontSize: 14,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 180,
  },
  actionBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "4px 10px",
    fontWeight: 600,
    fontSize: 12,
    marginRight: 4,
    cursor: "pointer",
    transition: "background 0.18s",
    minWidth: 36,
    minHeight: 24,
    display: "inline-block",
  },
  secondaryBtn: {
    background: "#e2e8f0",
    color: "#2563eb",
    border: "none",
    borderRadius: 6,
    padding: "4px 10px",
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer",
    transition: "background 0.18s",
    marginRight: 4,
    minWidth: 36,
    minHeight: 24,
    display: "inline-block",
  },
  deleteBtn: {
    background: "#e11d48",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "4px 10px",
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer",
    marginLeft: 0,
    transition: "background 0.18s",
    minWidth: 36,
    minHeight: 24,
    display: "inline-block",
    boxShadow: "0 2px 8px rgba(225,29,72,0.10)",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "#e11d48",
    outline: "none",
  },
  cancelBtn: {
    background: "#e2e8f0",
    color: "#18181a",
    border: "none",
    borderRadius: 8,
    padding: "6px 18px",
    fontWeight: 600,
    fontSize: 14,
    marginLeft: 8,
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    background: "#fff",
    padding: "36px 40px",
    borderRadius: 18,
    minWidth: 340,
    boxShadow: "0 12px 48px rgba(37,99,235,0.18)",
    position: "relative",
    maxWidth: 420,
  },
  modalTitle: {
    margin: "0 0 18px 0",
    fontWeight: 700,
    color: "#18181a",
    letterSpacing: 1,
    fontSize: 22,
    textAlign: "center",
  },
};
