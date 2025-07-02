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

// SVG Icon components
const EditIcon = ({ color = "#2563eb" }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M14.85 3.15a1.5 1.5 0 0 1 2.12 2.12l-9.2 9.2-2.47.35.35-2.47 9.2-9.2Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.44 5.44l1.12 1.12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const DeleteIcon = ({ color = "#e11d48" }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="5" y="7" width="10" height="8" rx="2" stroke={color} strokeWidth="1.5"/>
    <path d="M8 9v4M12 9v4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M3 7h14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8.5 4h3a1 1 0 0 1 1 1V7h-5V5a1 1 0 0 1 1-1Z" stroke={color} strokeWidth="1.5"/>
  </svg>
);

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
  // Add hover state for icon buttons
  const [hoveredEdit, setHoveredEdit] = useState(null);
  const [hoveredDelete, setHoveredDelete] = useState(null);
  const [hoveredEditId, setHoveredEditId] = useState(null);
  const [hoveredDeleteId, setHoveredDeleteId] = useState(null);

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
          style={{
            ...(selectedIds.length === 0 || deleteProgress.total > 0
              ? { ...styles.deleteBtn, ...styles.washedOutBtn }
              : styles.deleteBtn),
            minWidth: 44,
            minHeight: 32,
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 7,
            marginRight: 8,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            outline: "none",
            transition:
              "background 0.18s, box-shadow 0.18s, color 0.18s, opacity 0.18s",
          }}
          disabled={selectedIds.length === 0 || deleteProgress.total > 0}
          onClick={handleBulkDelete}
          onMouseEnter={(e) => {
            if (!(selectedIds.length === 0 || deleteProgress.total > 0)) {
              e.currentTarget.style.background = "#c81e3a";
            }
          }}
          onMouseLeave={(e) => {
            if (!(selectedIds.length === 0 || deleteProgress.total > 0)) {
              e.currentTarget.style.background = "#e11d48";
            }
          }}
        >
          {/* Trash SVG icon */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            style={{ marginRight: 2 }}
          >
            <rect x="5.5" y="7.5" width="9" height="8" rx="2" stroke="#fff" strokeWidth="1.5" fill="none"/>
            <path d="M8 10v4M12 10v4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M3 7.5h14" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M8.5 4.5h3a1 1 0 0 1 1 1V7.5h-5V5.5a1 1 0 0 1 1-1z" stroke="#fff" strokeWidth="1.5" fill="none"/>
          </svg>
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
          <div
            style={{
              ...styles.modalContent,
              maxWidth: 900, // expanded for Actions column
              minWidth: 540, // slightly wider for comfort
              width: '97vw', // responsive, but not full width
              maxHeight: '80vh',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              boxSizing: 'border-box',
            }}
          >
            <h3
              style={{
                color: '#2563eb',
                margin: '0 0 14px 0',
                fontWeight: 700,
                fontSize: 20,
                textAlign: 'center',
                letterSpacing: 1,
              }}
            >
              Devices Assigned to {selectedEmployee?.fullName}
            </h3>
            <button onClick={handleShowHistory} style={{ ...styles.secondaryBtn, alignSelf: 'flex-end', marginBottom: 8, fontSize: 14, padding: '7px 16px', borderRadius: 7 }}>
              View History
            </button>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: 10,
                borderRadius: 12,
                background: '#f7f9fb',
                boxShadow: '0 1px 4px rgba(68,95,109,0.06)',
                padding: 0,
                minHeight: 80,
                maxHeight: '48vh',
                overflowX: 'auto', // allow horizontal scroll if needed
              }}
            >
              {devicesForEmployee.length === 0 ? (
                <p style={{ textAlign: 'center', margin: 24 }}>No devices assigned.</p>
              ) : (
                <table
                  style={{
                    width: '100%',
                    minWidth: 600, // reduce minWidth since fewer columns
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    background: '#fff',
                    borderRadius: 12,
                    tableLayout: 'fixed',
                    fontSize: 14,
                  }}
                >
                  <colgroup>
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '15%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, fontSize: 14, padding: '10px 8px' }}>Tag</th>
                      <th style={{ ...styles.th, fontSize: 14, padding: '10px 8px' }}>Type</th>
                      <th style={{ ...styles.th, fontSize: 14, padding: '10px 8px' }}>Brand</th>
                      <th style={{ ...styles.th, fontSize: 14, padding: '10px 8px' }}>Model</th>
                      <th style={{ ...styles.th, fontSize: 14, padding: '10px 8px' }}>Condition</th>
                      <th style={{ ...styles.th, fontSize: 14, padding: '10px 8px' }}>Assignment Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devicesForEmployee.map((dev) => (
                      <tr key={dev.id}>
                        <td style={{ ...styles.td, fontWeight: 600, fontSize: 14, padding: '10px 8px' }}>{dev.deviceTag}</td>
                        <td style={{ ...styles.td, fontSize: 14, padding: '10px 8px' }}>{dev.deviceType}</td>
                        <td style={{ ...styles.td, fontSize: 14, padding: '10px 8px' }}>{dev.brand}</td>
                        <td style={{ ...styles.td, fontSize: 14, padding: '10px 8px' }}>{dev.model}</td>
                        <td style={{ ...styles.td, fontSize: 14, padding: '10px 8px' }}>{dev.condition}</td>
                        <td style={{ ...styles.td, fontSize: 14, padding: '10px 8px' }}>{dev.assignmentDate || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <button onClick={handleCloseDevicesModal} style={{ ...styles.cancelBtn, marginTop: 8, alignSelf: 'flex-end', fontSize: 14, padding: '8px 18px', borderRadius: 7 }}>
              Close
            </button>
            {/* Assign Modal */}
            {assignModalOpen && assigningDevice && (
              <div style={{ ...styles.modalOverlay, zIndex: 1100 }}>
                <div style={{ ...styles.modalContent, minWidth: 350 }}>
                  <h4 style={{ color: '#2563eb' }}>
                    Assign Device: {assigningDevice.deviceTag}
                  </h4>
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={assignSearch}
                    onChange={(e) => setAssignSearch(e.target.value)}
                    style={{ width: '100%', marginBottom: 8, padding: 6 }}
                  />
                  <ul
                    style={{
                      maxHeight: 200,
                      overflowY: 'auto',
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
                          style={{ listStyle: 'none', marginBottom: 8 }}
                        >
                          <button
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: 8,
                              borderRadius: 6,
                              border: '1px solid #e5e7eb',
                              background: '#f8fafc',
                              cursor: 'pointer',
                            }}
                            onClick={async () => {
                              try {
                                // If reassigning, log unassign for previous employee
                                if (
                                  assigningDevice.assignedTo &&
                                  assigningDevice.assignedTo !== emp.id
                                ) {
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
                                    action: 'unassigned',
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
                                    action: 'assigned',
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
                                    action: 'assigned',
                                    reason: 'assigned',
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
                                  'Failed to assign device. Please try again.'
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
          <div
            style={{
              ...styles.modalContent,
              maxWidth: 820, // expanded for Delete column
              minWidth: 520, // slightly wider for comfort
              width: '96vw', // responsive, but not full width
              maxHeight: '80vh',
              padding: '32px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              boxSizing: 'border-box',
            }}
          >
            <h3
              style={{
                color: '#2563eb',
                margin: '0 0 18px 0',
                fontWeight: 700,
                fontSize: 22,
                textAlign: 'center',
                letterSpacing: 1,
              }}
            >
              Device Assignment History
            </h3>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: 12,
                borderRadius: 12,
                background: '#f7f9fb',
                boxShadow: '0 1px 4px rgba(68,95,109,0.06)',
                padding: 0,
                minHeight: 120,
                maxHeight: '48vh',
                overflowX: 'auto', // allow horizontal scroll if needed
              }}
            >
              {loadingHistory ? (
                <p style={{ textAlign: 'center', margin: 32 }}>Loading...</p>
              ) : history.length === 0 ? (
                <p style={{ textAlign: 'center', margin: 32 }}>No history found.</p>
              ) : (
                <table
                  style={{
                    width: '100%',
                    minWidth: 700, // ensure table doesn't shrink too much
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    background: '#fff',
                    borderRadius: 12,
                    tableLayout: 'fixed',
                    fontSize: 15,
                  }}
                >
                  <colgroup>
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '33%' }} />
                    <col style={{ width: '12%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, fontSize: 15, padding: '10px 8px' }}>Device Tag</th>
                      <th style={{ ...styles.th, fontSize: 15, padding: '10px 8px' }}>Action</th>
                      <th style={{ ...styles.th, fontSize: 15, padding: '10px 8px' }}>Date</th>
                      <th style={{ ...styles.th, fontSize: 15, padding: '10px 8px' }}>Reason</th>
                      <th style={{ ...styles.th, fontSize: 15, padding: '10px 8px', textAlign: 'center' }}>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td style={{ ...styles.td, fontWeight: 600, fontSize: 15, padding: '10px 8px' }}>{h.deviceTag}</td>
                        <td style={{ ...styles.td, fontSize: 15, padding: '10px 8px' }}>{h.action}</td>
                        <td style={{ ...styles.td, fontSize: 15, padding: '10px 8px' }}>{new Date(h.date).toLocaleString()}</td>
                        <td style={{ ...styles.td, fontSize: 15, padding: '10px 8px' }}>{h.reason || '-'}</td>
                        <td style={{ ...styles.td, textAlign: 'center', padding: '10px 8px' }}>
                          <button
                            onClick={() => handleDeleteHistory(h.id)}
                            style={{ ...styles.deleteBtn, minWidth: 48, minHeight: 28, padding: '6px 0', fontSize: 13, borderRadius: 7 }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <button
              onClick={() => setShowHistoryModal(false)}
              style={{ ...styles.cancelBtn, marginTop: 8, alignSelf: 'flex-end' }}
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
                    <div style={{ display: "flex", gap: 24 }}>
                      <button
                        style={{
                          width: 48,
                          height: 48,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "none",
                          outline: "none",
                          borderRadius: 12,
                          background: "#eaf7fa",
                          cursor: "pointer",
                          transition: "background 0.18s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#d0f0f7")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#eaf7fa")}
                        onClick={() => handleEdit(emp)}
                        title="Edit"
                      >
                        <svg
                          width="18"
                          height="18"
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                      <button
                        style={{
                          width: 48,
                          height: 48,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "none",
                          outline: "none",
                          borderRadius: 12,
                          background: "#ffe9ec",
                          cursor: "pointer",
                          transition: "background 0.18s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#ffd6de")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#ffe9ec")}
                        onClick={() => handleDelete(emp.id)}
                        title="Delete"
                      >
                        <svg
                          width="18"
                          height="18"
                          fill="none"
                          stroke="#e57373"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          viewBox="0 0 24 24"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
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
    padding: "32px 0 32px 0",
    maxWidth: "100%",
    background: "#f7f9fb",
    minHeight: "100vh",
    fontFamily: "Segoe UI, Arial, sans-serif",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
    paddingLeft: 0,
  },
  pageTitle: {
    color: "#233037",
    fontWeight: 800,
    fontSize: 28,
    margin: 0,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
    paddingLeft: 0,
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
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 2px 12px rgba(68,95,109,0.10)",
    padding: 0,
    width: "100%",
    maxWidth: "100vw",
    overflowX: "unset", // Remove horizontal scroll
  },
  table: {
    width: "100%",
    minWidth: 0, // Allow table to shrink
    borderCollapse: "separate",
    borderSpacing: 0,
    background: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    tableLayout: "fixed", // Make columns auto-fit
    maxWidth: "100%",
    margin: "0 auto",
  },
  th: {
    padding: "16px 12px",
    background: "#445F6D",
    color: "#fff",
    fontWeight: 700,
    fontSize: 16,
    borderBottom: "2px solid #e0e7ef",
    textAlign: "left",
    letterSpacing: 0.2,
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  td: {
    padding: "14px 12px",
    color: "#233037",
    fontSize: 15,
    borderBottom: "1px solid #e0e7ef",
    background: "#f7f9fb",
    verticalAlign: "middle",
    wordBreak: "break-word",
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "none",
  },
  actionBtn: {
    background: "#70C1B3",
    color: "#233037",
    border: "none",
    borderRadius: 7,
    padding: "7px 16px",
    fontWeight: 700,
    fontSize: 13,
    marginRight: 4,
    cursor: "pointer",
    transition: "background 0.18s",
    minWidth: 36,
    minHeight: 28,
    display: "inline-block",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  secondaryBtn: {
    background: "#FFE066",
    color: "#233037",
    border: "none",
    borderRadius: 7,
    padding: "7px 16px",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    transition: "background 0.18s",
    marginRight: 4,
    minWidth: 36,
    minHeight: 28,
    display: "inline-block",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  deleteBtn: {
    background: "#e11d48",
    color: "#fff",
    border: "none",
    borderRadius: 7,
    padding: "7px 16px",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    marginLeft: 0,
    transition: "background 0.18s, box-shadow 0.18s, color 0.18s, opacity 0.18s",
    minWidth: 36,
    minHeight: 28,
    display: "inline-block",
    boxShadow: "0 2px 8px rgba(225,29,72,0.10)",
    outline: "none",
    opacity: 1,
  },
  // Add a washed out style for disabled state
  washedOutBtn: {
    background: "#f3f4f6",
    color: "#b91c1c",
    opacity: 0.65,
    cursor: "not-allowed",
    border: "none",
    boxShadow: "none",
  },
  cancelBtn: {
    background: "#e0e7ef",
    color: "#233037",
    border: "none",
    borderRadius: 8,
    padding: "8px 18px",
    fontWeight: 700,
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
    color: "#233037",
    letterSpacing: 1,
    fontSize: 22,
    textAlign: "center",
  },
  iconBtn: {
    background: "none",
    border: "none",
    padding: 6,
    borderRadius: 6,
    cursor: "pointer",
    marginRight: 4,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.18s, box-shadow 0.18s",
    boxShadow: "none",
  },
  iconBtnHover: {
    background: "#e0f7f4",
    boxShadow: "0 2px 8px rgba(112,193,179,0.10)",
  },
  iconBtnDeleteHover: {
    background: "#ffe4ec",
    boxShadow: "0 2px 8px rgba(225,29,72,0.10)",
  },
};
