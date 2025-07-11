import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { addEmployee, getAllEmployees, updateEmployee, deleteEmployee } from "../services/employeeService";
import { getAllClients } from "../services/clientService";
import { getAllDevices, updateDevice } from "../services/deviceService";
import { getDeviceHistoryForEmployee, logDeviceHistory, deleteDeviceHistory } from "../services/deviceHistoryService";
import { useSnackbar } from "../components/Snackbar";

const isValidName = (value) => /^[A-Za-zÑñ\s.'\-(),]+$/.test(value.trim());


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
        {/* Hidden fields for First Name, Last Name, Middle Name */}
        <input
          name="firstName"
          value={data.firstName || ""}
          onChange={onChange}
          style={{ display: "none" }}
        />
        <input
          name="lastName"
          value={data.lastName || ""}
          onChange={onChange}
          style={{ display: "none" }}
        />
        <input
          name="middleName"
          value={data.middleName || ""}
          onChange={onChange}
          style={{ display: "none" }}
        />
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

// Helper to format assignment date (handles Firestore timestamps)
function formatAssignmentDate(dateValue) {
  if (!dateValue) return "";
  
  // Handle Firestore timestamp object
  if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
    const date = new Date(dateValue.seconds * 1000);
    return formatDisplayDate(date.toISOString().slice(0, 10));
  }
  
  // Handle regular date string or Date object
  if (typeof dateValue === 'string' || dateValue instanceof Date) {
    return formatDisplayDate(dateValue);
  }
  
  return "";
}

// Helper to format history date (handles Firestore timestamps)
function formatHistoryDate(dateValue) {
  if (!dateValue) return "";
  
  // Handle Firestore timestamp object
  if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
    const date = new Date(dateValue.seconds * 1000);
    return date.toLocaleString();
  }
  
  // Handle regular date string or Date object
  if (typeof dateValue === 'string' || dateValue instanceof Date) {
    return new Date(dateValue).toLocaleString();
  }
  
  return "";
}

function DeleteConfirmationModal({ onConfirm, onCancel, children }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h2 style={{ color: "#e11d48", marginBottom: 12 }}>Confirm Deletion</h2>
        <p>Are you sure you want to delete this employee?</p>
        {children && <div style={{ marginTop: 8 }}>{children}</div>}
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
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M14.85 3.15a1.5 1.5 0 0 1 2.12 2.12l-9.2 9.2-2.47.35.35-2.47 9.2-9.2Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.44 5.44l1.12 1.12"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const DeleteIcon = ({ color = "#e11d48" }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="5"
      y="7"
      width="10"
      height="8"
      rx="2"
      stroke={color}
      strokeWidth="1.5"
    />
    <path
      d="M8 9v4M12 9v4"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M3 7h14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path
      d="M8.5 4h3a1 1 0 0 1 1 1V7h-5V5a1 1 0 0 1 1-1Z"
      stroke={color}
      strokeWidth="1.5"
    />
  </svg>
);

function Employees() {
  const { showSuccess, showError, showWarning, showInfo } = useSnackbar();
  
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
    firstName: "",
    lastName: "",
    middleName: "",
    position: "",
    clientId: "",
    department: "",
    dateHired: "",
    corporateEmail: "",
    personalEmail: "",
  });
  // Toggle state: "active" or "resigned"
  const [employeeSection, setEmployeeSection] = useState("active");
  // Search state for each section
  const [searchActive, setSearchActive] = useState("");
  const [searchResigned, setSearchResigned] = useState("");
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
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [resignEmployee, setResignEmployee] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [employeeToRestore, setEmployeeToRestore] = useState(null);
  const [lastRestoredEmployee, setLastRestoredEmployee] = useState(null);
  const [lastResignedEmployee, setLastResignedEmployee] = useState(null);
  const [resignedDevicesCache, setResignedDevicesCache] = useState([]);
  const [lastDeletedEmployee, setLastDeletedEmployee] = useState(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);


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
    
    try {
      // Always set dateHired to today if not specified
      let dateHired = form.dateHired;
      if (!dateHired || dateHired.trim() === "") {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        dateHired = new Date(now.getTime() - offset * 60 * 1000)
          .toISOString()
          .slice(0, 10);
      }

      // Generate fullName from firstName and lastName if they exist
      let fullName = form.fullName;
      if (form.firstName && form.lastName) {
        fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;
      }

      const payload = {
        fullName: fullName.trim(),
        firstName: form.firstName || "",
        lastName: form.lastName || "",
        middleName: form.middleName || "",
        position: form.position || "",
        clientId: form.clientId || "",
        department: form.department || "",
        dateHired,
        corporateEmail: form.corporateEmail || "",
        personalEmail: form.personalEmail || "",
      };
      
      const isEditing = !!form.id;
      
      if (isEditing) {
        await updateEmployee(form.id, payload);
        showSuccess(`Employee details updated successfully.`);
      } else {
        await addEmployee(payload);
        showSuccess(`New employee successfully added.`);
      }
      
      resetForm();
      loadClientsAndEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      showError(`Failed to ${form.id ? 'update' : 'add'} employee. Please try again.`);
    }
  };

  const handleEdit = (emp) => {
    setForm({
      id: emp.id,
      fullName: emp.fullName,
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      middleName: emp.middleName || "",
      position: emp.position,
      clientId: emp.clientId || "",
      department: emp.department || "",
      dateHired: emp.dateHired || "",
      corporateEmail: emp.corporateEmail || "",
      personalEmail: emp.personalEmail || "",
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setSelectedId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const employeeToDelete = employees.find(emp => emp.id === selectedId);
      
      // This appears to be a soft delete (moving to resigned status)
      await updateEmployee(selectedId, {
        ...employeeToDelete,
        status: "resigned",
      });
      
      setLastDeletedEmployee(employeeToDelete);
      showWarning(`Employee record moved to Resigned Employees.`);
      
      setSelectedId(null);
      setShowConfirm(false);
      loadClientsAndEmployees();
      
      // Auto-hide and clear last deleted employee after 6 seconds
      setTimeout(() => {
        setLastDeletedEmployee(null);
      }, 6000);
    } catch (error) {
      console.error('Error moving employee to resigned:', error);
      showError('Failed to move employee. Please try again.');
    }
  };

  const cancelDelete = () => {
    setSelectedId(null);
    setShowConfirm(false);
  };

  const resetForm = () => {
    setForm({
      id: null,
      fullName: "",
      firstName: "",
      lastName: "",
      middleName: "",
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

  // Filtered lists for each section
  const filteredActiveEmployees = getSortedEmployees().filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(searchActive.toLowerCase()) &&
      emp.status !== "resigned"
  );
  const filteredResignedEmployees = getSortedEmployees().filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(searchResigned.toLowerCase()) &&
      emp.status === "resigned"
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
      date: new Date(), // Store full timestamp for precise ordering
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


  // Import from Excel handler (restored for ESLint and feature completeness)
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      setImportProgress({ current: 0, total: rows.length });
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Map Excel columns to employee fields (adjust as needed)
        const payload = {
          fullName: row["Full Name"] || "",
          firstName: row["First Name"] || "",
          lastName: row["Last Name"] || "",
          middleName: row["Middle Name"] || "",
          position: row["Position"] || "",
          clientId: clients.find((c) => c.clientName === row["Client"])?.id || "",
          department: row["Department"] || "",
          dateHired: row["Date Hired"] ? new Date(row["Date Hired"]).toISOString().slice(0, 10) : "",
          corporateEmail: row["Corporate Email"] || "",
          personalEmail: row["Personal Email"] || "",
        };
        await addEmployee(payload);
        setImportProgress({ current: i + 1, total: rows.length });
      }
      loadClientsAndEmployees();
      showSuccess(`Successfully imported ${rows.length} employees from Excel.`);
    } catch (err) {
      console.error("Import error:", err);
      showError('Import failed. Please check the file format and try again.');
    }
    setImporting(false);
    setImportProgress({ current: 0, total: 0 });
    // Reset file input value so the same file can be re-imported if needed
    e.target.value = "";
  };

  // Select all handler (only for active employees)
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredActiveEmployees.map((emp) => emp.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Individual select handler (only for active employees)
  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // Bulk delete handler with progress
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setDeleteProgress({ current: 0, total: selectedIds.length });
      for (let i = 0; i < selectedIds.length; i++) {
        await deleteEmployee(selectedIds[i]);
        setDeleteProgress({ current: i + 1, total: selectedIds.length });
      }
      
      showWarning(`Successfully deleted ${selectedIds.length} employee(s).`);
      
      setSelectedIds([]);
      setDeleteProgress({ current: 0, total: 0 });
      setShowBulkDeleteConfirm(false);
      loadClientsAndEmployees();
    } catch (error) {
      console.error('Error during bulk delete:', error);
      showError('Failed to delete some employees. Please try again.');
    }
  };

  // Export to Excel handler
  const handleExportToExcel = () => {
    try {
      // Helper function to format date for export (MM/DD/YYYY format)
      const formatDateForExport = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        if (isNaN(d)) return "";
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${mm}/${dd}/${yyyy}`; // Use slashes instead of dashes
      };

      // Use the correct filtered list based on the current section
      const exportData = (employeeSection === "active" ? filteredActiveEmployees : filteredResignedEmployees).map((emp) => ({
        "Full Name": emp.fullName || "", // Add Full Name column that import expects
        "First Name": emp.firstName || "",
        "Last Name": emp.lastName || "",
        "Middle Name": emp.middleName || "",
        Position: emp.position || "",
        Department: emp.department || "",
        Client: emp.client && emp.client !== "-" ? emp.client : "",
        "Corporate Email": emp.corporateEmail || "",
        "Personal Email": emp.personalEmail || "",
        "Date Hired": emp.dateHired ? formatDateForExport(emp.dateHired) : "",
      }));

      // Create a new workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns (updated for new column)
      const colWidths = [
        { wch: 25 }, // Full Name
        { wch: 15 }, // First Name
        { wch: 15 }, // Last Name
        { wch: 15 }, // Middle Name
        { wch: 20 }, // Position
        { wch: 15 }, // Department
        { wch: 20 }, // Client
        { wch: 25 }, // Corporate Email
        { wch: 25 }, // Personal Email
        { wch: 12 }, // Date Hired
      ];
      ws["!cols"] = colWidths;

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Employees");

      // Generate filename with current date
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
      const filename = `employees_export_${dateStr}.xlsx`;

      // Save the file
      XLSX.writeFile(wb, filename);
      
      showSuccess(`Employee data exported to Excel successfully.`);
    } catch (error) {
      console.error("Export error:", error);
      showError('Failed to export data. Please try again.');
    }
  };

  // Resign logic
  const handleResign = (emp) => {
    setResignEmployee(emp);
    setShowResignConfirm(true);
  };

  const confirmResign = async () => {
    if (!resignEmployee) return;
    
    try {
      // 1. Get all assigned devices before unassigning (for undo functionality)
      const allDevices = await getAllDevices();
      const assignedDevices = allDevices.filter(
        (d) => d.assignedTo === resignEmployee.id
      );
      
      // 2. Mark employee as resigned
      await updateEmployee(resignEmployee.id, {
        ...resignEmployee,
        status: "resigned",
      });
      
      // 3. Unassign all devices
      for (const device of assignedDevices) {
        const { id, ...deviceWithoutId } = device;
        await updateDevice(device.id, {
          ...deviceWithoutId,
          assignedTo: "",
          assignmentDate: "",
          status: "Stock Room",
          condition: device.condition || "Working",
        });
        await logDeviceHistory({
          employeeId: resignEmployee.id,
          deviceId: device.id,
          deviceTag: device.deviceTag,
          action: "unassigned",
          reason: "Employee Resigned",
          condition: device.condition || "Working",
          date: new Date(),
        });
      }
      
      // 4. Cache resigned employee and devices for undo functionality
      setLastResignedEmployee(resignEmployee);
      setResignedDevicesCache(assignedDevices);
      
      // 5. Show snackbar notification
      showWarning(`Employee ${resignEmployee.fullName} resigned and all assets returned to inventory.`);
      
      setShowResignConfirm(false);
      setResignEmployee(null);
      loadClientsAndEmployees();
      
      // Auto-hide and clear last resigned employee after 8 seconds (longer to allow undo action)
      setTimeout(() => {
        setLastResignedEmployee(null);
        setResignedDevicesCache([]);
      }, 8000);
    } catch (error) {
      console.error('Error resigning employee:', error);
      showError('Failed to resign employee. Please try again.');
    }
  };

  const cancelResign = () => {
    setShowResignConfirm(false);
    setResignEmployee(null);
  };

  // Add handlers for resigned employee actions
  const handleDeleteResigned = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteConfirmModal(true);
  };

  const handleRestoreEmployee = (employee) => {
    setEmployeeToRestore(employee);
    setShowRestoreConfirmModal(true);
  };

  const confirmDeleteResigned = async () => {
    if (!employeeToDelete) return;
    
    try {
      await deleteEmployee(employeeToDelete.id);
      setEmployees(prev => prev.filter(emp => emp.id !== employeeToDelete.id));
      setShowDeleteConfirmModal(false);
      setEmployeeToDelete(null);
      
      // Show success snackbar
      showWarning(`Employee ${employeeToDelete.name} has been permanently deleted.`);
    } catch (error) {
      console.error('Error deleting employee:', error);
      showError('Failed to delete employee. Please try again.');
    }
  };

  const confirmRestoreEmployee = async () => {
    if (!employeeToRestore) return;
    
    try {
      await updateEmployee(employeeToRestore.id, {
        ...employeeToRestore,
        status: "active",
      });
      
      setEmployees(prev => 
        prev.map(emp => 
          emp.id === employeeToRestore.id 
            ? { ...emp, status: "active" }
            : emp
        )
      );
      
      setLastRestoredEmployee(employeeToRestore);
      showSuccess(`Employee ${employeeToRestore.fullName} restored to Active Employees.`);
      setShowRestoreConfirmModal(false);
      setEmployeeToRestore(null);
      
      // Auto-hide and clear last restored employee after 5 seconds
      setTimeout(() => {
        setLastRestoredEmployee(null);
      }, 5000);
    } catch (error) {
      console.error('Error restoring employee:', error);
      showError('Failed to restore employee. Please try again.');
    }
  };

  const handleUndoRestore = async () => {
    if (!lastRestoredEmployee) return;
    
    try {
      await updateEmployee(lastRestoredEmployee.id, {
        ...lastRestoredEmployee,
        status: "resigned",
      });
      
      setEmployees(prev => 
        prev.map(emp => 
          emp.id === lastRestoredEmployee.id 
            ? { ...emp, status: "resigned" }
            : emp
        )
      );
      
      setLastRestoredEmployee(null);
    } catch (error) {
      console.error('Error undoing restore:', error);
      showError('Failed to undo restore. Please try again.');
    }
  };

  const handleUndoResign = async () => {
    if (!lastResignedEmployee) return;
    
    try {
      // 1. Restore employee status to active
      await updateEmployee(lastResignedEmployee.id, {
        ...lastResignedEmployee,
        status: "active",
      });
      
      // 2. Reassign all previously assigned devices
      for (const device of resignedDevicesCache) {
        const { id, ...deviceWithoutId } = device;
        await updateDevice(device.id, {
          ...deviceWithoutId,
          assignedTo: lastResignedEmployee.id,
          assignmentDate: device.assignmentDate,
          status: "Assigned",
          condition: device.condition || "Working",
        });
        await logDeviceHistory({
          employeeId: lastResignedEmployee.id,
          deviceId: device.id,
          deviceTag: device.deviceTag,
          action: "assigned",
          reason: "Resignation Undone",
          condition: device.condition || "Working",
          date: new Date(),
        });
      }
      
      // 3. Update UI state
      setEmployees(prev => 
        prev.map(emp => 
          emp.id === lastResignedEmployee.id 
            ? { ...emp, status: "active" }
            : emp
        )
      );
      
      // 4. Show success message
      showSuccess(`Resignation undone. Employee ${lastResignedEmployee.fullName} and assets restored.`);
      
      // 5. Clear undo state
      setLastResignedEmployee(null);
      setResignedDevicesCache([]);
      
      // 6. Refresh data
      loadClientsAndEmployees();
    } catch (error) {
      console.error('Error undoing resignation:', error);
      showError('Failed to undo resignation. Please try again.');
    }
  };

  const handleUndoDelete = async () => {
    if (!lastDeletedEmployee) return;
    
    try {
      await updateEmployee(lastDeletedEmployee.id, {
        ...lastDeletedEmployee,
        status: "active",
      });
      
      setEmployees(prev => 
        prev.map(emp => 
          emp.id === lastDeletedEmployee.id 
            ? { ...emp, status: "active" }
            : emp
        )
      );
      
      showSuccess(`Employee ${lastDeletedEmployee.fullName} restored to Active Employees.`);
      
      setLastDeletedEmployee(null);
      loadClientsAndEmployees();
    } catch (error) {
      console.error('Error undoing delete:', error);
      showError('Failed to undo delete. Please try again.');
    }
  };

  // Resign confirmation modal
  function ResignConfirmationModal({ onConfirm, onCancel, employee }) {
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modalContent}>
          <h2 style={{ color: "#eab308", marginBottom: 12 }}>
            Confirm Resignation
          </h2>
          <p>
            Are you sure you want to resign <b>{employee?.fullName}</b>?<br />
            All assigned assets will be unassigned and the employee will be
            marked as resigned.
          </p>
          <div style={{ marginTop: 24, textAlign: "right" }}>
            <button
              onClick={onConfirm}
              style={{
                background: "#eab308",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                marginRight: 8,
              }}
            >
              Confirm
            </button>
            <button
              onClick={onCancel}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
}
  return (
    <div style={styles.pageContainer}>
      <div style={styles.headerRow}>
        <h2 style={styles.pageTitle}>Employee Database</h2>
        <div>
          <button onClick={() => setShowForm(true)} style={styles.actionBtn}>
            + Add Employee
          </button>
          <button
            onClick={handleExportToExcel}
            style={{
              ...styles.secondaryBtn,
              marginLeft: 8,
              background: "#10b981",
              color: "#fff",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#059669")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#10b981")}
          >
            📊 Export Excel
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
                  ? `📥 Importing ${importProgress.current}/${importProgress.total}...`
                  : "📥 Importing..."
                : "📥 Import Excel"}
            </button>
          </label>
        </div>
      </div>


      {/* Enhanced unified toolbar for section toggles, search, and sort */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 18,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 1px 4px rgba(68,95,109,0.06)",
          padding: "12px 18px 12px 18px",
          minHeight: 64,
        }}
      >
        {/* Left: Section toggle buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            style={{
              ...styles.secondaryBtn,
              background: employeeSection === "active" ? "#2563eb" : "#FFE066",
              color: employeeSection === "active" ? "#fff" : "#233037",
              fontWeight: employeeSection === "active" ? 800 : 700,
              border: employeeSection === "active" ? "2px solid #2563eb" : "none",
              boxShadow: employeeSection === "active" ? "0 2px 8px rgba(37,99,235,0.10)" : styles.secondaryBtn.boxShadow,
              minWidth: 120,
              fontSize: 16,
              letterSpacing: 0.2,
              transition: "background 0.18s, color 0.18s, border 0.18s",
            }}
            onClick={() => setEmployeeSection("active")}
            tabIndex={0}
          >
            Active Employees
          </button>
          <button
            type="button"
            style={{
              ...styles.secondaryBtn,
              background: employeeSection === "resigned" ? "#eab308" : "#FFE066",
              color: employeeSection === "resigned" ? "#fff" : "#233037",
              fontWeight: employeeSection === "resigned" ? 800 : 700,
              border: employeeSection === "resigned" ? "2px solid #eab308" : "none",
              boxShadow: employeeSection === "resigned" ? "0 2px 8px rgba(234,179,8,0.10)" : styles.secondaryBtn.boxShadow,
              minWidth: 160,
              fontSize: 16,
              letterSpacing: 0.2,
              transition: "background 0.18s, color 0.18s, border 0.18s",
            }}
            onClick={() => setEmployeeSection("resigned")}
            tabIndex={0}
          >
            Resigned Employees
          </button>
        </div>
        {/* Right: Search and sort controls (contextual) */}
        <div style={{ display: "flex", gap: 8, flex: 1, justifyContent: "flex-end", minWidth: 260 }}>
          {employeeSection === "active" ? (
            <>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchActive}
                onChange={(e) => setSearchActive(e.target.value)}
                style={{ ...styles.input, marginRight: 0, minWidth: 180, flex: 1 }}
              />
              <button onClick={toggleSortByLastName} style={{ ...styles.secondaryBtn, minWidth: 120 }}>
                {sortByLastName ? "Clear Sort" : "Sort by Last Name (A-Z)"}
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchResigned}
                onChange={(e) => setSearchResigned(e.target.value)}
                style={{ ...styles.input, marginRight: 0, minWidth: 180, flex: 1 }}
              />
              <button onClick={toggleSortByLastName} style={{ ...styles.secondaryBtn, minWidth: 120 }}>
                {sortByLastName ? "Clear Sort" : "Sort by Last Name (A-Z)"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Section content: Active or Resigned */}
      {employeeSection === "active" && (
        <>
          {/* Removed redundant toolbar: search and sort are now in the unified top toolbar */}
          <div style={{ marginBottom: 12 }}>
            {selectedIds.length > 0 && (
              <>
                <button
                  style={{
                    ...(deleteProgress.total > 0
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
                  disabled={deleteProgress.total > 0}
                  onClick={handleBulkDelete}
                  onMouseEnter={(e) => {
                    if (!(deleteProgress.total > 0)) {
                      e.currentTarget.style.background = "#c81e3a";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(deleteProgress.total > 0)) {
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
                    <rect
                      x="5.5"
                      y="7.5"
                      width="9"
                      height="8"
                      rx="2"
                      stroke="#fff"
                      strokeWidth="1.5"
                      fill="none"
                    />
                    <path
                      d="M8 10v4M12 10v4"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M3 7.5h14"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8.5 4.5h3a1 1 0 0 1 1 1V7.5h-5V5.5a1 1 0 0 1 1-1z"
                      stroke="#fff"
                      strokeWidth="1.5"
                      fill="none"
                    />
                  </svg>
                  Delete Selected
                </button>
                {deleteProgress.total > 0 && (
                  <span style={{ color: "#e11d48", fontWeight: 600 }}>
                    Deleting {deleteProgress.current}/{deleteProgress.total}...
                  </span>
                )}
              </>
            )}
          </div>
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
                          filteredActiveEmployees.length > 0 &&
                          selectedIds.length === filteredActiveEmployees.length
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
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveEmployees.map((emp) => (
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
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#d0f0f7")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "#eaf7fa")
                            }
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
                          {/* Delete button removed as per request; use Resign instead */}
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
                              background: "#fef9c3",
                              cursor: "pointer",
                              transition: "background 0.18s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#fde68a")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "#fef9c3")
                            }
                            onClick={() => handleResign(emp)}
                            title="Resign"
                          >
                            {/* Resign SVG icon */}
                            <svg
                              width="18"
                              height="18"
                              fill="none"
                              stroke="#eab308"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              viewBox="0 0 24 24"
                            >
                              <path d="M6 19V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" />
                              <path d="M9 9h6" />
                              <path d="M9 13h6" />
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
        </>
      )}

      {employeeSection === "resigned" && (
        <>
          {/* Removed redundant toolbar: search and sort are now in the unified top toolbar */}
          {/* Table for Resigned Employees (read-only) */}
          {loading ? (
            <p style={{ textAlign: "center", marginTop: 40 }}>Loading...</p>
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
                    <th style={styles.th}>Corporate Email</th>
                    <th style={styles.th}>Personal Email</th>
                    <th style={styles.th}>Date Hired</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResignedEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      style={{ background: "#fef9c3" }}
                    >
                      <td style={styles.td}>{emp.id}</td>
                      <td style={styles.td}>{formatName(emp.fullName)}</td>
                      <td style={styles.td}>{emp.position}</td>
                      <td style={styles.td}>{emp.department || "-"}</td>
                      <td style={styles.td}>{emp.client}</td>
                      <td style={styles.td}>{emp.corporateEmail || "-"}</td>
                      <td style={styles.td}>{emp.personalEmail || "-"}</td>
                      <td style={styles.td}>
                        {emp.dateHired ? formatDisplayDate(emp.dateHired) : "-"}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: 12 }}>
                          {/* Restore Button */}
                          <button
                            style={{
                              width: 40,
                              height: 40,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "none",
                              outline: "none",
                              borderRadius: 8,
                              background: "#dcfce7",
                              cursor: "pointer",
                              transition: "background 0.18s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#bbf7d0")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "#dcfce7")
                            }
                            onClick={() => handleRestoreEmployee(emp)}
                            title="Restore this employee to Active Employees"
                          >
                            <svg
                              width="16"
                              height="16"
                              fill="none"
                              stroke="#16a34a"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              viewBox="0 0 24 24"
                            >
                              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                              <path d="M3 3v5h5" />
                            </svg>
                          </button>
                          
                          {/* Delete Button */}
                          <button
                            style={{
                              width: 40,
                              height: 40,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "none",
                              outline: "none",
                              borderRadius: 8,
                              background: "#fee2e2",
                              cursor: "pointer",
                              transition: "background 0.18s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#fecaca")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "#fee2e2")
                            }
                            onClick={() => handleDeleteResigned(emp)}
                            title="Permanently delete this record"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 20 20"
                              fill="none"
                            >
                              <rect
                                x="5.5"
                                y="7.5"
                                width="9"
                                height="8"
                                rx="2"
                                stroke="#dc2626"
                                strokeWidth="1.5"
                                fill="none"
                              />
                              <path
                                d="M8 10v4M12 10v4"
                                stroke="#dc2626"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                              <path
                                d="M3 7.5h14"
                                stroke="#dc2626"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                              <path
                                d="M8.5 4.5h3a1 1 0 0 1 1 1V7.5h-5V5.5a1 1 0 0 1 1-1z"
                                stroke="#dc2626"
                                strokeWidth="1.5"
                                fill="none"
                              />
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
        </>
      )}

      {/* Modals and overlays */}
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
              width: "97vw", // responsive, but not full width
              maxHeight: "80vh",
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              boxSizing: "border-box",
            }}
          >
            <h3
              style={{
                color: "#2563eb",
                margin: "0 0 14px 0",
                fontWeight: 700,
                fontSize: 20,
                textAlign: "center",
                letterSpacing: 1,
              }}
            >
              Devices Assigned to {selectedEmployee?.fullName}
            </h3>
            <button
              onClick={handleShowHistory}
              style={{
                ...styles.secondaryBtn,
                alignSelf: "flex-end",
                marginBottom: 8,
                fontSize: 14,
                padding: "7px 16px",
                borderRadius: 7,
              }}
            >
              View History
            </button>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                marginBottom: 10,
                borderRadius: 12,
                background: "#f7f9fb",
                boxShadow: "0 1px 4px rgba(68,95,109,0.06)",
                padding: 0,
                minHeight: 80,
                maxHeight: "48vh",
                overflowX: "auto", // allow horizontal scroll if needed
              }}
            >
              {devicesForEmployee.length === 0 ? (
                <p style={{ textAlign: "center", margin: 24 }}>
                  No devices assigned.
                </p>
              ) : (
                <table
                  style={{
                    width: "100%",
                    minWidth: 600, // reduce minWidth since fewer columns
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    background: "#fff",
                    borderRadius: 12,
                    tableLayout: "fixed",
                    fontSize: 14,
                  }}
                >
                  <colgroup>
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th
                        style={{
                          ...styles.th,
                          fontSize: 14,
                          padding: "10px 8px",
                        }}
                      >
                        Tag
                      </th>
                      <th
                        style={{
                          ...styles.th,
                          fontSize: 14,
                          padding: "10px 8px",
                        }}
                      >
                        Type
                      </th>
                      <th
                        style={{
                          ...styles.th,
                          fontSize: 14,
                          padding: "10px 8px",
                        }}
                      >
                        Brand
                      </th>
                      <th
                        style={{
                          ...styles.th,
                          fontSize: 14,
                          padding: "10px 8px",
                        }}
                      >
                        Model
                      </th>
                      <th
                        style={{
                          ...styles.th,
                          fontSize: 14,
                          padding: "10px 8px",
                        }}
                      >
                        Condition
                      </th>
                      <th
                        style={{
                          ...styles.th,
                          fontSize: 14,
                          padding: "10px 8px",
                        }}
                      >
                        Assignment Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {devicesForEmployee.map((dev) => (
                      <tr key={dev.id}>
                        <td
                          style={{
                            ...styles.td,
                            fontWeight: 600,
                            fontSize: 14,
                            padding: "10px 8px",
                          }}
                        >
                          {dev.deviceTag}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            fontSize: 14,
                            padding: "10px 8px",
                          }}
                        >
                          {dev.deviceType}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            fontSize: 14,
                            padding: "10px 8px",
                          }}
                        >
                          {dev.brand}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            fontSize: 14,
                            padding: "10px 8px",
                          }}
                        >
                          {dev.model}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            fontSize: 14,
                            padding: "10px 8px",
                          }}
                        >
                          {dev.condition}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            fontSize: 14,
                            padding: "10px 8px",
                          }}
                        >
                          {formatAssignmentDate(dev.assignmentDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <button
              onClick={handleCloseDevicesModal}
              style={{
                ...styles.cancelBtn,
                marginTop: 8,
                alignSelf: "flex-end",
                fontSize: 14,
                padding: "8px 18px",
                borderRadius: 7,
              }}
            >
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
                                    date: new Date(), // Store full timestamp for precise ordering
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
                                    date: new Date(), // Store full timestamp for precise ordering
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
                                    date: new Date(), // Store full timestamp for precise ordering
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
                                
                                showSuccess(`Device ${assigningDevice.deviceTag} assigned to ${emp.fullName}.`);
                              } catch (err) {
                                console.error('Error assigning device:', err);
                                showError('Failed to assign device. Please try again.');
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
        <>{/* ...existing code for showUnassignModal... */}</>
      )}
      {showHistoryModal && (
        <div style={styles.modalOverlay}>
          <div
            style={{
              ...styles.modalContent,
              maxWidth: 820, // expanded for Delete column
              minWidth: 520, // slightly wider for comfort
              width: "96vw", // responsive, but not full width
              maxHeight: "80vh",
              padding: "32px 32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              boxSizing: "border-box",
            }}
          >
            <h3
              style={{
                color: "#2563eb",
                margin: "0 0 18px 0",
                fontWeight: 700,
                fontSize: 22,
                textAlign: "center",
                letterSpacing: 1,
              }}
            >
              Device Assignment History
            </h3>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                marginBottom: 12,
                borderRadius: 12,
                background: "#f7f9fb",
                boxShadow: "0 1px 4px rgba(68,95,109,0.06)",
                padding: 0,
                minHeight: 120,
                maxHeight: "48vh",
                overflowX: "auto", // allow horizontal scroll if needed
              }}
            >
              {loadingHistory ? (
                <p style={{ textAlign: "center", margin: 32 }}>Loading...</p>
              ) : history.length === 0 ? (
                <p style={{ textAlign: "center", margin: 32 }}>
                  No history found.
                </p>
              ) : (
                <table
                  style={{
                    width: "100%",
                    minWidth: 700, // ensure table doesn't shrink too much
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    background: "#fff",
                    borderRadius: 12,
                    tableLayout: "fixed",
                    fontSize: 15,
                  }}
                >
                  <colgroup>
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "33%" }} />
                    <col style={{ width: "12%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th
                        style={{
                          ...styles.th,
                          fontSize: 15,
                          padding: "10px 8px",
                        }}
                      >
                        Device Tag
                      </th>
                      <th
                        style={{
                          ...styles.th,
                          fontSize: 15,
                          padding: "10px 8px",
                        }}
                      >
                        Action
                      </th>
                      <th
                        style={{
                          ...styles.th,
                          fontSize: 15,
                          padding: "10px 8px",
                        }}
                      >
                        Date
                      </th>
                      <th
                        style={{
                          ...styles.th,
                          fontSize: 15,
                          padding: "10px 8px",
                        }}
                      >
                        Reason
                      </th>
                      <th
                        style={{
                          ...styles.th,
                          fontSize: 15,
                          padding: "10px 8px",
                          textAlign: "center",
                        }}
                      >
                        Delete
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td
                          style={{
                            ...styles.td,
                            fontWeight: 600,
                            fontSize: 15,
                            padding: "10px 8px",
                          }}
                        >
                          {h.deviceTag}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            fontSize: 15,
                            padding: "10px 8px",
                          }}
                        >
                          {h.action}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            fontSize: 15,
                            padding: "10px 8px",
                          }}
                        >
                          {formatHistoryDate(h.date)}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            fontSize: 15,
                            padding: "10px 8px",
                          }}
                        >
                          {h.reason || "-"}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            textAlign: "center",
                            padding: "10px 8px",
                          }}
                        >
                          <button
                            onClick={() => handleDeleteHistory(h.id)}
                            style={{
                              ...styles.deleteBtn,
                              minWidth: 48,
                              minHeight: 28,
                              padding: "6px 0",
                              fontSize: 13,
                              borderRadius: 7,
                            }}
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
              style={{
                ...styles.cancelBtn,
                marginTop: 8,
                alignSelf: "flex-end",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {showResignConfirm && (
        <ResignConfirmationModal
          onConfirm={confirmResign}
          onCancel={cancelResign}
          employee={resignEmployee}
        />
      )}

      {showDeleteConfirmModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: 400 }}>
            <h3 style={{ color: "#dc2626", marginBottom: 16, fontSize: 20 }}>
              Confirm Deletion
            </h3>
            <p style={{ marginBottom: 24, lineHeight: 1.6 }}>
              Are you sure you want to permanently delete this employee record? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setEmployeeToDelete(null);
                }}
                style={{
                  ...styles.cancelBtn,
                  minWidth: 80,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteResigned}
                style={{
                  ...styles.deleteBtn,
                  minWidth: 100,
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestoreConfirmModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: 400 }}>
            <h3 style={{ color: "#16a34a", marginBottom: 16, fontSize: 20 }}>
              Restore Employee
            </h3>
            <p style={{ marginBottom: 24, lineHeight: 1.6 }}>
              Do you want to restore this employee to the Active Employees list?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowRestoreConfirmModal(false);
                  setEmployeeToRestore(null);
                }}
                style={{
                  ...styles.cancelBtn,
                  minWidth: 80,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRestoreEmployee}
                style={{
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.18s",
                  minWidth: 100,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#15803d")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#16a34a")}
              >
                Yes, Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: 400 }}>
            <h3 style={{ color: "#dc2626", marginBottom: 16, fontSize: 20 }}>
              Confirm Bulk Delete
            </h3>
            <p style={{ marginBottom: 24, lineHeight: 1.6 }}>
              Are you sure you want to delete {selectedIds.length} selected employee(s)? This will move them to Resigned Employees.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                style={{
                  ...styles.cancelBtn,
                  minWidth: 80,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                style={{
                  ...styles.deleteBtn,
                  minWidth: 100,
                }}
              >
                Yes, Delete All
              </button>
            </div>
          </div>
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
    fontFamily: "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
    transition:
      "background 0.18s, box-shadow 0.18s, color 0.18s, opacity 0.18s",
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
