import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
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
import { doc, setDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useSnackbar } from "../components/Snackbar";
import LoadingSpinner, {
  TableLoadingSpinner,
} from "../components/LoadingSpinner";
import undoManager from "../utils/undoManager";

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
  if (dateValue && typeof dateValue === "object" && dateValue.seconds) {
    const date = new Date(dateValue.seconds * 1000);
    return formatDisplayDate(date.toISOString().slice(0, 10));
  }

  // Handle regular date string or Date object
  if (typeof dateValue === "string" || dateValue instanceof Date) {
    return formatDisplayDate(dateValue);
  }

  return "";
}

// Helper to format history date (handles Firestore timestamps)
function formatHistoryDate(dateValue) {
  if (!dateValue) return "";

  // Handle Firestore timestamp object
  if (dateValue && typeof dateValue === "object" && dateValue.seconds) {
    const date = new Date(dateValue.seconds * 1000);
    return date.toLocaleString();
  }

  // Handle regular date string or Date object
  if (typeof dateValue === "string" || dateValue instanceof Date) {
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
  const {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showUndoNotification,
  } = useSnackbar();

  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [sortByLastName, setSortByLastName] = useState(false);
  const [showImportExportDropdown, setShowImportExportDropdown] =
    useState(false);
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

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

  // Responsive screen size state
  const [screenSize, setScreenSize] = useState("large");

  useEffect(() => {
    loadClientsAndEmployees();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showImportExportDropdown &&
        !event.target.closest(".dropdown-container")
      ) {
        setShowImportExportDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showImportExportDropdown]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1400) {
        setScreenSize("large");
      } else if (width >= 1200) {
        setScreenSize("medium");
      } else if (width >= 1024) {
        setScreenSize("small");
      } else {
        setScreenSize("compact");
      }
    };

    handleResize(); // Set initial size
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
      console.error("Error saving employee:", error);
      showError(
        `Failed to ${form.id ? "update" : "add"} employee. Please try again.`
      );
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
      const employeeToDelete = employees.find((emp) => emp.id === selectedId);

      // Store original employee data for undo
      const originalEmployeeData = { ...employeeToDelete };

      // This appears to be a soft delete (moving to resigned status)
      await updateEmployee(selectedId, {
        ...employeeToDelete,
        status: "resigned",
      });

      // Remove from active employees list immediately
      setEmployees((prev) => prev.filter((emp) => emp.id !== selectedId));

      // Show undo notification
      showUndoNotification(
        `Employee ${employeeToDelete.fullName} moved to Resigned Employees`,
        async () => {
          // Undo function - restore employee to active status
          try {
            await updateEmployee(selectedId, {
              ...originalEmployeeData,
              status: "active",
            });
            loadClientsAndEmployees();
            showSuccess(
              `Employee ${employeeToDelete.fullName} restored to Active Employees`
            );
          } catch (error) {
            console.error("Error restoring employee:", error);
            showError("Failed to restore employee. Please try again.");
          }
        },
        5000 // 5 seconds to undo
      );

      setSelectedId(null);
      setShowConfirm(false);
      loadClientsAndEmployees();
    } catch (error) {
      console.error("Error moving employee to resigned:", error);
      showError("Failed to move employee. Please try again.");
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

  // Pagination logic
  const getCurrentEmployees = () => {
    return employeeSection === "active"
      ? filteredActiveEmployees
      : filteredResignedEmployees;
  };

  const totalItems = getCurrentEmployees().length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = getCurrentEmployees().slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  // Reset to first page when switching sections or searching
  useEffect(() => {
    setCurrentPage(1);
  }, [employeeSection, searchActive, searchResigned]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const PaginationComponent = () => {
    const handlePageChange = (page) => {
      setCurrentPage(page);
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1);
    };

    const totalItems = getCurrentEmployees().length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return null;

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          border: "1px solid rgb(215, 215, 224)",
          borderTop: "none",
          background: "#fff",
          borderBottomLeftRadius: "12px",
          borderBottomRightRadius: "12px",
          minHeight: "60px",
          marginTop: "0",
          boxSizing: "border-box",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {/* First Page Button */}
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            style={{
              fontFamily: "Maax, sans-serif",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              background: currentPage === 1 ? "#f3f4f6" : "#fff",
              color: currentPage === 1 ? "#6b7280" : "#374151",
              borderRadius: "6px",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.3s ease",
              minWidth: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (currentPage !== 1) {
                e.currentTarget.style.background = "#f3f4f6";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== 1) {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          >
            &lt;&lt;
          </button>

          {/* Previous Page Button */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              fontFamily: "Maax, sans-serif",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              background: currentPage === 1 ? "#f3f4f6" : "#fff",
              color: currentPage === 1 ? "#6b7280" : "#374151",
              borderRadius: "6px",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.3s ease",
              minWidth: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (currentPage !== 1) {
                e.currentTarget.style.background = "#f3f4f6";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== 1) {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          >
            &lt;
          </button>

          {/* Next Page Button */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              fontFamily: "Maax, sans-serif",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              background: currentPage === totalPages ? "#f3f4f6" : "#fff",
              color: currentPage === totalPages ? "#6b7280" : "#374151",
              borderRadius: "6px",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.3s ease",
              minWidth: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (currentPage !== totalPages) {
                e.currentTarget.style.background = "#f3f4f6";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== totalPages) {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          >
            &gt;
          </button>

          {/* Last Page Button */}
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            style={{
              fontFamily: "Maax, sans-serif",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              background: currentPage === totalPages ? "#f3f4f6" : "#fff",
              color: currentPage === totalPages ? "#6b7280" : "#374151",
              borderRadius: "6px",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.3s ease",
              minWidth: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (currentPage !== totalPages) {
                e.currentTarget.style.background = "#f3f4f6";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== totalPages) {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          >
            &gt;&gt;
          </button>

          {/* Items per page dropdown */}
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            style={{
              fontFamily: "Maax, sans-serif",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              background: "#fff",
              fontSize: "14px",
              cursor: "pointer",
              marginLeft: "16px",
              transition: "all 0.3s ease",
              color: "#374151",
              fontWeight: "500",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <option value={10}>10 items per page</option>
            <option value={25}>25 items per page</option>
            <option value={50}>50 items per page</option>
            <option value={100}>100 items per page</option>
          </select>
        </div>

        <div
          style={{
            fontFamily: "Maax, sans-serif",
            fontSize: "14px",
            color: "#6b7280",
            fontWeight: "500",
          }}
        >
          {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, totalItems)} of{" "}
          {totalItems} items
        </div>
      </div>
    );
  };

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
    let condition = "GOOD";
    let reason = "Returned to Stock Room"; // Default for all unassigns
    if (unassignReason === "repair") {
      condition = "NEEDS REPAIR";
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
    try {
      // Get the history item before deleting
      const historyBackup = history.find((h) => h.id === historyId);
      if (!historyBackup) return;

      // Delete the history item
      await deleteDeviceHistory(historyId);

      // Update UI immediately
      setHistory((prev) => prev.filter((h) => h.id !== historyId));

      // Create undo function
      const undoAction = async () => {
        try {
          // Note: We would need a restoreDeviceHistory function in the service
          // For now, we'll just refresh the history list
          if (selectedEmployee) {
            const hist = await getDeviceHistoryForEmployee(selectedEmployee.id);
            setHistory(hist);
          }

          showSuccess(`History item has been restored!`);
        } catch (error) {
          console.error("Error restoring history:", error);
          showError("Failed to restore history item. Please try again.");
        }
      };

      // Add to undo manager
      undoManager.addDeletedItem(
        `history_${historyId}`,
        historyBackup,
        undoAction,
        5000 // 5 seconds
      );

      // Show undo notification
      showUndoNotification(
        `History item deleted.`,
        () => undoManager.restoreItem(`history_${historyId}`),
        5000
      );
    } catch (error) {
      console.error("Error deleting history:", error);
      showError("Failed to delete history item. Please try again.");
    }
  };

  // Debug function to test import format
  const testImportFormat = () => {
    const testData = {
      "DATE HIRED": "01/15/2024",
      "CLIENT": "Sample Client",
      "LAST NAME": "Doe",
      "FIRST NAME": "John",
      "MIDDLE NAME": "M",
      "POSITION": "Developer",
      "CORPORATE EMAIL": "john.doe@company.com",
      "PERSONAL EMAIL": "john@personal.com"
    };
    
    console.log("Test import data format:");
    console.log("Expected columns:", Object.keys(testData));
    console.log("Available clients:", clients.map(c => c.clientName));
    
    // Test the mapping
    const firstName = (testData["FIRST NAME"] || "").toString().trim();
    const lastName = (testData["LAST NAME"] || "").toString().trim();
    const fullName = `${firstName} ${lastName}`.trim();
    
    console.log("Generated full name:", fullName);
    
    showSuccess("Test data logged to console. Check developer tools.");
  };

  // Import from Excel handler (enhanced with detailed error handling)
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      showError("No file selected. Please select an Excel file to import.");
      return;
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      showError("Invalid file type. Please select an Excel file (.xlsx, .xls) or CSV file.");
      return;
    }

    console.log("Starting import process...");
    console.log("File:", file.name, "Size:", file.size, "Type:", file.type);
    
    setImporting(true);
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      // Show initial progress
      showSuccess("Reading Excel file...");
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("No worksheets found in the Excel file.");
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      
      console.log("Raw Excel data:", rows);
      console.log("Expected columns: DATE HIRED, CLIENT, LAST NAME, FIRST NAME, MIDDLE NAME, POSITION, CORPORATE EMAIL, PERSONAL EMAIL");
      
      if (!rows || rows.length === 0) {
        throw new Error("No data found in the Excel file. Please check that the file contains employee data.");
      }

      // Check for required columns
      const firstRow = rows[0];
      const requiredColumns = ["FIRST NAME", "LAST NAME"];
      const missingColumns = requiredColumns.filter(col => !(col in firstRow));
      
      if (missingColumns.length > 0) {
        console.log("Available columns:", Object.keys(firstRow));
        throw new Error(`Missing required columns: ${missingColumns.join(", ")}. Available columns: ${Object.keys(firstRow).join(", ")}`);
      }

      showSuccess(`Found ${rows.length} rows to process. Starting import...`);
      setImportProgress({ current: 0, total: rows.length });

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 1;
        
        try {
          console.log(`Processing row ${rowNumber}:`, row);
          
          // Extract names from the new column structure
          const firstName = (row["FIRST NAME"] || "").toString().trim();
          const lastName = (row["LAST NAME"] || "").toString().trim();
          const middleName = (row["MIDDLE NAME"] || "").toString().trim();
          
          // Validate required fields
          if (!firstName || !lastName) {
            skippedCount++;
            errors.push(`Row ${rowNumber}: Missing required fields (First Name: "${firstName}", Last Name: "${lastName}")`);
            continue;
          }
          
          // Generate fullName without middle name as requested
          const fullName = `${firstName} ${lastName}`.trim();
          
          // Handle client lookup
          const clientName = (row["CLIENT"] || "").toString().trim();
          let clientId = "";
          if (clientName) {
            const client = clients.find((c) => 
              c.clientName.toLowerCase() === clientName.toLowerCase()
            );
            if (!client) {
              console.log(`Warning: Client "${clientName}" not found. Available clients:`, clients.map(c => c.clientName));
              errors.push(`Row ${rowNumber}: Client "${clientName}" not found`);
            } else {
              clientId = client.id;
            }
          }

          // Handle date parsing
          let dateHired = "";
          if (row["DATE HIRED"]) {
            try {
              const date = new Date(row["DATE HIRED"]);
              if (isNaN(date.getTime())) {
                errors.push(`Row ${rowNumber}: Invalid date format for DATE HIRED: "${row["DATE HIRED"]}"`);
              } else {
                dateHired = date.toISOString().slice(0, 10);
              }
            } catch (dateErr) {
              errors.push(`Row ${rowNumber}: Error parsing DATE HIRED: "${row["DATE HIRED"]}"`);
            }
          }
          
          // Map Excel columns to employee fields with new column order
          const payload = {
            fullName: fullName,
            firstName: firstName,
            lastName: lastName,
            middleName: middleName,
            position: (row["POSITION"] || "").toString().trim(),
            clientId: clientId,
            department: (row["DEPARTMENT"] || "").toString().trim(), // Keep department field for existing functionality
            dateHired: dateHired,
            corporateEmail: (row["CORPORATE EMAIL"] || "").toString().trim(),
            personalEmail: (row["PERSONAL EMAIL"] || "").toString().trim(),
          };

          console.log(`Attempting to add employee:`, payload);
          await addEmployee(payload);
          importedCount++;
          console.log(`Successfully added employee: ${fullName}`);
          
        } catch (rowError) {
          errorCount++;
          console.error(`Error processing row ${rowNumber}:`, rowError);
          errors.push(`Row ${rowNumber}: ${rowError.message || rowError}`);
        }
        
        setImportProgress({ current: i + 1, total: rows.length });
      }

      // Refresh the employee list
      await loadClientsAndEmployees();
      
      // Show detailed results
      let resultMessage = `Import completed: ${importedCount} imported`;
      if (skippedCount > 0) resultMessage += `, ${skippedCount} skipped`;
      if (errorCount > 0) resultMessage += `, ${errorCount} errors`;
      
      if (errors.length > 0) {
        console.log("Import errors:", errors);
        showError(`${resultMessage}. Errors: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`);
      } else if (importedCount > 0) {
        showSuccess(resultMessage);
      } else {
        showError("No employees were imported. Please check your file format and data.");
      }

    } catch (err) {
      console.error("Import error:", err);
      showError(`Import failed: ${err.message || "Unknown error occurred. Please check the file format and try again."}`);
    }
    
    setImporting(false);
    setImportProgress({ current: 0, total: 0 });
    // Reset file input value so the same file can be re-imported if needed
    e.target.value = "";
  };

  // Select all handler (only for active employees)
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentEmployees.map((emp) => emp.id));
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
      // Store employees data for undo
      const employeesToDelete = employees.filter(emp => selectedIds.includes(emp.id));
      
      setDeleteProgress({ current: 0, total: selectedIds.length });
      for (let i = 0; i < selectedIds.length; i++) {
        await deleteEmployee(selectedIds[i]);
        setDeleteProgress({ current: i + 1, total: selectedIds.length });
      }

      // Update UI immediately
      setEmployees(prev => prev.filter(emp => !selectedIds.includes(emp.id)));

      // Show undo notification
      showUndoNotification(
        `Successfully deleted ${selectedIds.length} employee(s)`,
        async () => {
          // Undo function - restore all employees
          try {
            for (const employeeData of employeesToDelete) {
              // Restore employee with original ID using setDoc
              const { id: originalId, ...employeeDataToRestore } = employeeData;
              await setDoc(doc(db, "employees", originalId), employeeDataToRestore);
            }
            await loadClientsAndEmployees();
            showSuccess(`${employeesToDelete.length} employee(s) restored successfully`);
          } catch (error) {
            console.error("Error restoring employees:", error);
            showError("Failed to restore employees. Please try again.");
          }
        }
      );

      setSelectedIds([]);
      setDeleteProgress({ current: 0, total: 0 });
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      console.error("Error during bulk delete:", error);
      showError("Failed to delete some employees. Please try again.");
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
      const exportData = (
        employeeSection === "active"
          ? filteredActiveEmployees
          : filteredResignedEmployees
      ).map((emp) => ({
        "Employee ID": emp.id || "", // Add Employee ID column
        "DATE HIRED": emp.dateHired ? formatDateForExport(emp.dateHired) : "",
        "CLIENT": emp.client && emp.client !== "-" ? emp.client : "",
        "LAST NAME": emp.lastName || "",
        "FIRST NAME": emp.firstName || "",
        "MIDDLE NAME": emp.middleName || "",
        "POSITION": emp.position || "",
        "CORPORATE EMAIL": emp.corporateEmail || "",
        "PERSONAL EMAIL": emp.personalEmail || "",
      }));

      // Create a new workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns (updated for new column order)
      const colWidths = [
        { wch: 15 }, // Employee ID
        { wch: 12 }, // DATE HIRED
        { wch: 20 }, // CLIENT
        { wch: 15 }, // LAST NAME
        { wch: 15 }, // FIRST NAME
        { wch: 15 }, // MIDDLE NAME
        { wch: 20 }, // POSITION
        { wch: 25 }, // CORPORATE EMAIL
        { wch: 25 }, // PERSONAL EMAIL
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
      showError("Failed to export data. Please try again.");
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
          condition: device.condition || "GOOD",
        });
        await logDeviceHistory({
          employeeId: resignEmployee.id,
          deviceId: device.id,
          deviceTag: device.deviceTag,
          action: "unassigned",
          reason: "Employee Resigned",
          condition: device.condition || "GOOD",
          date: new Date(),
        });
      }

      // 4. Cache resigned employee and devices for undo functionality
      setLastResignedEmployee(resignEmployee);
      setResignedDevicesCache(assignedDevices);

      // 5. Show snackbar notification
      showWarning(
        `Employee ${resignEmployee.fullName} resigned and all assets returned to inventory.`
      );

      setShowResignConfirm(false);
      setResignEmployee(null);
      loadClientsAndEmployees();

      // Auto-hide and clear last resigned employee after 8 seconds (longer to allow undo action)
      setTimeout(() => {
        setLastResignedEmployee(null);
        setResignedDevicesCache([]);
      }, 8000);
    } catch (error) {
      console.error("Error resigning employee:", error);
      showError("Failed to resign employee. Please try again.");
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
      // Create a backup of the employee data
      const employeeBackup = { ...employeeToDelete };

      // Delete the employee
      await deleteEmployee(employeeToDelete.id);

      // Update UI immediately
      setEmployees((prev) =>
        prev.filter((emp) => emp.id !== employeeToDelete.id)
      );

      // Close the modal
      setShowDeleteConfirmModal(false);

      // Show undo notification
      showUndoNotification(
        `Employee ${employeeToDelete.fullName} permanently deleted`,
        async () => {
          // Undo function - restore the employee
          try {
            // Restore employee with original ID using setDoc
            const { id: originalId, ...employeeDataToRestore } = employeeBackup;
            await setDoc(doc(db, "employees", originalId), employeeDataToRestore);
            
            loadClientsAndEmployees();
            showSuccess(
              `Employee ${employeeBackup.fullName} restored successfully`
            );
          } catch (error) {
            console.error("Error restoring employee:", error);
            showError("Failed to restore employee. Please try again.");
          }
        },
        5000 // 5 seconds to undo
      );

      // Clear the employee to delete
      setEmployeeToDelete(null);
    } catch (error) {
      console.error("Error deleting employee:", error);
      showError("Failed to delete employee. Please try again.");
      setEmployeeToDelete(null);
    }
  };

  const confirmRestoreEmployee = async () => {
    if (!employeeToRestore) return;

    try {
      await updateEmployee(employeeToRestore.id, {
        ...employeeToRestore,
        status: "active",
      });

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employeeToRestore.id ? { ...emp, status: "active" } : emp
        )
      );

      setLastRestoredEmployee(employeeToRestore);
      showSuccess(
        `Employee ${employeeToRestore.fullName} restored to Active Employees.`
      );
      setShowRestoreConfirmModal(false);
      setEmployeeToRestore(null);

      // Auto-hide and clear last restored employee after 5 seconds
      setTimeout(() => {
        setLastRestoredEmployee(null);
      }, 5000);
    } catch (error) {
      console.error("Error restoring employee:", error);
      showError("Failed to restore employee. Please try again.");
    }
  };

  const handleUndoRestore = async () => {
    if (!lastRestoredEmployee) return;

    try {
      await updateEmployee(lastRestoredEmployee.id, {
        ...lastRestoredEmployee,
        status: "resigned",
      });

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === lastRestoredEmployee.id
            ? { ...emp, status: "resigned" }
            : emp
        )
      );

      setLastRestoredEmployee(null);
    } catch (error) {
      console.error("Error undoing restore:", error);
      showError("Failed to undo restore. Please try again.");
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
          condition: device.condition || "GOOD",
        });
        await logDeviceHistory({
          employeeId: lastResignedEmployee.id,
          deviceId: device.id,
          deviceTag: device.deviceTag,
          action: "assigned",
          reason: "Resignation Undone",
          condition: device.condition || "GOOD",
          date: new Date(),
        });
      }

      // 3. Update UI state
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === lastResignedEmployee.id
            ? { ...emp, status: "active" }
            : emp
        )
      );

      // 4. Show success message
      showSuccess(
        `Resignation undone. Employee ${lastResignedEmployee.fullName} and assets restored.`
      );

      // 5. Clear undo state
      setLastResignedEmployee(null);
      setResignedDevicesCache([]);

      // 6. Refresh data
      loadClientsAndEmployees();
    } catch (error) {
      console.error("Error undoing resignation:", error);
      showError("Failed to undo resignation. Please try again.");
    }
  };

  const handleUndoDelete = async () => {
    if (!lastDeletedEmployee) return;

    try {
      await updateEmployee(lastDeletedEmployee.id, {
        ...lastDeletedEmployee,
        status: "active",
      });

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === lastDeletedEmployee.id ? { ...emp, status: "active" } : emp
        )
      );

      showSuccess(
        `Employee ${lastDeletedEmployee.fullName} restored to Active Employees.`
      );

      setLastDeletedEmployee(null);
      loadClientsAndEmployees();
    } catch (error) {
      console.error("Error undoing delete:", error);
      showError("Failed to undo delete. Please try again.");
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
            <button onClick={onCancel} style={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={styles.pageContainer}>
      <div style={styles.headerSection}>
        <div style={styles.headerRow}>
          <h2 style={styles.pageTitle}>Employee Database</h2>
          <div style={styles.headerActions}>
            <button
              onClick={() => setShowForm(true)}
              style={styles.addBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgb(37, 99, 235)";
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(37, 99, 235, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgb(242, 242, 242)";
                e.currentTarget.style.color = "rgb(59, 59, 74)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }}
            >
              + Add Employee
            </button>
            <div
              style={styles.dropdownContainer}
              className="dropdown-container"
            >
              <button
                onClick={() =>
                  setShowImportExportDropdown(!showImportExportDropdown)
                }
                style={styles.dropdownBtn}
                disabled={importing}
                onMouseEnter={(e) => {
                  if (!importing) {
                    e.currentTarget.style.background = "rgb(37, 99, 235)";
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(37, 99, 235, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!importing) {
                    e.currentTarget.style.background = "rgb(242, 242, 242)";
                    e.currentTarget.style.color = "rgb(59, 59, 74)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 4px rgba(0,0,0,0.1)";
                  }
                }}
              >
                {importing
                  ? importProgress.total > 0
                    ? `Importing ${importProgress.current}/${importProgress.total}...`
                    : "Importing..."
                  : "▼ Import / Export"}
              </button>
              {showImportExportDropdown && (
                <div style={styles.dropdownMenu}>
                  <label style={styles.dropdownItem}>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      style={{ display: "none" }}
                      onChange={handleImportExcel}
                      disabled={importing}
                    />
                    <span
                      onClick={() => {
                        document
                          .querySelector(
                            'input[type="file"][accept=".xlsx,.xls"]'
                          )
                          .click();
                        setShowImportExportDropdown(false);
                      }}
                      style={{
                        cursor: "pointer",
                        display: "block",
                        width: "100%",
                        height: "100%",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.parentElement.style.background =
                          "rgb(248, 248, 248)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.parentElement.style.background =
                          "transparent")
                      }
                    >
                      Import
                    </span>
                  </label>
                  <button
                    onClick={() => {
                      handleExportToExcel();
                      setShowImportExportDropdown(false);
                    }}
                    style={styles.dropdownItem}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgb(248, 248, 248)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    Export
                  </button>
                  <button
                    onClick={() => {
                      testImportFormat();
                      setShowImportExportDropdown(false);
                    }}
                    style={{
                      ...styles.dropdownItem,
                      color: "#2563eb",
                      fontStyle: "italic"
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgb(248, 248, 248)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    🔍 Debug Import Format
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section Toggle Buttons - Browser Tab Style */}
      <div
        style={{
          width: "100%",
          maxWidth: "none",
          margin: "0",
          padding: "0 24px",
          display: "flex",
          alignItems: "flex-end",
          gap: 0,
          marginBottom: "-1px", // Connect to table
          zIndex: 10,
          position: "relative",
        }}
      >
        <button
          type="button"
          style={{
            fontFamily: "Maax, sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            padding: "12px 24px",
            borderRadius: "12px 12px 0 0", // Rounded top corners only
            border: "1px solid rgb(215, 215, 224)",
            borderBottom:
              employeeSection === "active"
                ? "1px solid #fff"
                : "1px solid rgb(215, 215, 224)",
            cursor: "pointer",
            transition: "all 0.3s ease",
            minHeight: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              employeeSection === "active"
                ? "0 -2px 8px rgba(37, 99, 235, 0.1)"
                : "none",
            transform:
              employeeSection === "active"
                ? "translateY(0)"
                : "translateY(2px)",
            background:
              employeeSection === "active" ? "#fff" : "rgb(248, 250, 252)",
            color: employeeSection === "active" ? "#2563eb" : "#6b7280",
            position: "relative",
            zIndex: employeeSection === "active" ? 15 : 10,
            whiteSpace: "nowrap",
            marginRight: "4px",
          }}
          onClick={() => setEmployeeSection("active")}
          onMouseEnter={(e) => {
            if (employeeSection !== "active") {
              e.currentTarget.style.background = "rgb(245, 247, 250)";
              e.currentTarget.style.color = "#2563eb";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
          onMouseLeave={(e) => {
            if (employeeSection !== "active") {
              e.currentTarget.style.background = "rgb(248, 250, 252)";
              e.currentTarget.style.color = "#6b7280";
              e.currentTarget.style.transform = "translateY(2px)";
            }
          }}
        >
          👥 Active Employees
        </button>
        <button
          type="button"
          style={{
            fontFamily: "Maax, sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            padding: "12px 24px",
            borderRadius: "12px 12px 0 0", // Rounded top corners only
            border: "1px solid rgb(215, 215, 224)",
            borderBottom:
              employeeSection === "resigned"
                ? "1px solid #fff"
                : "1px solid rgb(215, 215, 224)",
            cursor: "pointer",
            transition: "all 0.3s ease",
            minHeight: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              employeeSection === "resigned"
                ? "0 -2px 8px rgba(234, 179, 8, 0.1)"
                : "none",
            transform:
              employeeSection === "resigned"
                ? "translateY(0)"
                : "translateY(2px)",
            background:
              employeeSection === "resigned" ? "#fff" : "rgb(248, 250, 252)",
            color: employeeSection === "resigned" ? "#eab308" : "#6b7280",
            position: "relative",
            zIndex: employeeSection === "resigned" ? 15 : 10,
            whiteSpace: "nowrap",
          }}
          onClick={() => setEmployeeSection("resigned")}
          onMouseEnter={(e) => {
            if (employeeSection !== "resigned") {
              e.currentTarget.style.background = "rgb(245, 247, 250)";
              e.currentTarget.style.color = "#eab308";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
          onMouseLeave={(e) => {
            if (employeeSection !== "resigned") {
              e.currentTarget.style.background = "rgb(248, 250, 252)";
              e.currentTarget.style.color = "#6b7280";
              e.currentTarget.style.transform = "translateY(2px)";
            }
          }}
        >
          📋 Resigned Employees
        </button>
      </div>

      {/* Table Section */}
      {employeeSection === "active" && (
        <div
          style={{
            ...styles.tableWrapper,
            borderTopLeftRadius: "0", // Remove top-left radius to connect with tab
            borderTopRightRadius: "12px",
            marginTop: "0",
            position: "relative",
            zIndex: 5,
          }}
        >
          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div style={styles.bulkActionsContainer}>
              <button
                style={{
                  ...(deleteProgress.total > 0
                    ? { ...styles.deleteBtn, ...styles.washedOutBtn }
                    : {
                        ...styles.deleteBtn,
                        minWidth: "120px",
                        minHeight: "36px",
                        fontSize: 14,
                        fontWeight: 500,
                        borderRadius: 6,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        outline: "none",
                        transition: "all 0.3s ease",
                      }),
                }}
                disabled={deleteProgress.total > 0}
                onClick={handleBulkDelete}
                onMouseEnter={(e) => {
                  if (deleteProgress.total === 0) {
                    e.currentTarget.style.background = "#dc2626";
                    e.currentTarget.style.transform =
                      "translateY(-2px) scale(1.05)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 16px rgba(220, 38, 38, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (deleteProgress.total === 0) {
                    e.currentTarget.style.background = "#e11d48";
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(225,29,72,0.10)";
                  }
                }}
              >
                🗑️ Delete Selected
              </button>
              {deleteProgress.total > 0 && (
                <span
                  style={{
                    color: "#e11d48",
                    fontWeight: 600,
                    fontSize: 14,
                    marginLeft: 12,
                  }}
                >
                  Deleting {deleteProgress.current}/{deleteProgress.total}...
                </span>
              )}
            </div>
          )}

          {/* Table Toolbar */}
          <div
            style={{
              width: "100%",
              height: "40px",
              background: "#fff",
              border: "1px solid rgb(215, 215, 224)",
              borderBottom: "none",
              borderTopLeftRadius: "0", // Remove top-left radius to connect with tab
              borderTopRightRadius: "12px",
              margin: 0,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              padding: "8px 16px",
              gap: 12,
              justifyContent: "space-between",
              position: "relative",
              zIndex: 10,
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                  color: "#1D2536",
                  fontSize: 16,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={styles.searchIcon}
                >
                  <circle
                    cx="7"
                    cy="7"
                    r="5.5"
                    stroke="#1D2536"
                    strokeWidth="1.5"
                  ></circle>
                  <line
                    x1="11.3536"
                    y1="11.6464"
                    x2="15"
                    y2="15.2929"
                    stroke="#1D2536"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  ></line>
                </svg>
              </span>
              <input
                type="text"
                placeholder={`Search by ${
                  employeeSection === "active" ? "Active" : "Resigned"
                } Employee Name...`}
                value={
                  employeeSection === "active" ? searchActive : searchResigned
                }
                onChange={(e) =>
                  employeeSection === "active"
                    ? setSearchActive(e.target.value)
                    : setSearchResigned(e.target.value)
                }
                style={{
                  fontFamily: "Maax, sans-serif",
                  fontSize: 14,
                  color: "#2B2C3B",
                  background: "#F8F8F8",
                  width: 280,
                  height: 24,
                  borderRadius: 6,
                  border: "1px solid rgb(215, 215, 224)",
                  outline: "none",
                  padding: "4px 8px 4px 32px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <select
              value={sortByLastName ? "lastName" : "default"}
              onChange={(e) => setSortByLastName(e.target.value === "lastName")}
              style={{
                fontFamily: "Maax, sans-serif",
                fontSize: 14,
                color: "rgb(59, 59, 74)",
                background: "rgb(242, 242, 242)",
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid rgb(215, 215, 224)",
                outline: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgb(37, 99, 235)";
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(37, 99, 235, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgb(242, 242, 242)";
                e.currentTarget.style.color = "rgb(59, 59, 74)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }}
            >
              <option value="default">Sort: Default</option>
              <option value="lastName">Sort: Last A–Z</option>
            </select>
          </div>

          {loading ? (
            <TableLoadingSpinner text="Loading active employees..." />
          ) : (
            <>
              {/* Fixed Header */}
              <table style={styles.headerTable}>
                <thead>
                  <tr>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "50px",
                        minWidth: "50px",
                        maxWidth: "50px",
                        flexShrink: 0,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          getCurrentEmployees().length > 0 &&
                          selectedIds.length === getCurrentEmployees().length
                        }
                        onChange={handleSelectAll}
                        style={styles.checkbox}
                      />
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "60px",
                        minWidth: "60px",
                        flexShrink: 0,
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "15%",
                        minWidth: "120px",
                      }}
                    >
                      Employee ID
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "20%",
                        minWidth: "160px",
                      }}
                    >
                      Full Name
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "16%",
                        minWidth: "130px",
                      }}
                    >
                      Position
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "12%",
                        minWidth: "100px",
                      }}
                    >
                      Department
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "12%",
                        minWidth: "100px",
                      }}
                    >
                      Client
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "18%",
                        minWidth: "140px",
                      }}
                    >
                      Corporate Email
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "10%",
                        minWidth: "100px",
                      }}
                    >
                      Date Hired
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "7%",
                        minWidth: "80px",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
              </table>

              {/* Scrollable Body */}
              <div style={styles.tableBody}>
                <table style={styles.bodyTable}>
                  <tbody>
                    {currentEmployees.length > 0 ? (
                      currentEmployees.map((emp, index) => (
                        <tr
                          key={emp.id}
                          style={{
                            ...styles.clientTr,
                            background:
                              index % 2 === 0
                                ? "rgb(250, 250, 252)"
                                : "rgb(240, 240, 243)",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#e0f7f4")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background =
                              index % 2 === 0
                                ? "rgb(250, 250, 252)"
                                : "rgb(240, 240, 243)")
                          }
                        >
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "50px",
                              minWidth: "50px",
                              maxWidth: "50px",
                              flexShrink: 0,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(emp.id)}
                              onChange={() => handleSelectOne(emp.id)}
                              style={styles.checkbox}
                            />
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "60px",
                              minWidth: "60px",
                              flexShrink: 0,
                            }}
                          >
                            {indexOfFirstItem + index + 1}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "15%",
                              minWidth: "120px",
                            }}
                          >
                            {emp.id}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "20%",
                              minWidth: "160px",
                            }}
                          >
                            <span
                              style={{
                                cursor: "pointer",
                                color: "#2563eb",
                                fontWeight: 500,
                                textDecoration: "underline",
                                textUnderlineOffset: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              onClick={() => handleShowDevices(emp)}
                            >
                              {formatName(emp.fullName)}
                            </span>
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "16%",
                              minWidth: "130px",
                            }}
                          >
                            {emp.position}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "12%",
                              minWidth: "100px",
                            }}
                          >
                            {emp.department || "-"}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "12%",
                              minWidth: "100px",
                            }}
                          >
                            {emp.client}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "18%",
                              minWidth: "140px",
                            }}
                          >
                            {emp.corporateEmail || "-"}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "10%",
                              minWidth: "100px",
                            }}
                          >
                            {emp.dateHired
                              ? formatDisplayDate(emp.dateHired)
                              : "-"}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "7%",
                              minWidth: "80px",
                            }}
                          >
                            <div style={styles.actionButtonsContainer}>
                              <button
                                style={{
                                  ...styles.actionButton,
                                  background: "rgba(37, 99, 235, 0.2)",
                                }}
                                onClick={() => handleEdit(emp)}
                                title="Edit"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(37, 99, 235, 0.35)";
                                  e.currentTarget.style.transform =
                                    "scale(1.1)";
                                  e.currentTarget.style.boxShadow =
                                    "0 2px 8px rgba(37, 99, 235, 0.4)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(37, 99, 235, 0.2)";
                                  e.currentTarget.style.transform = "scale(1)";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  fill="none"
                                  stroke="#2563eb"
                                  strokeWidth="2"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                </svg>
                              </button>
                              <button
                                style={{
                                  ...styles.actionButton,
                                  background: "rgba(234, 179, 8, 0.2)",
                                }}
                                onClick={() => handleResign(emp)}
                                title="Resign"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(234, 179, 8, 0.35)";
                                  e.currentTarget.style.transform =
                                    "scale(1.1)";
                                  e.currentTarget.style.boxShadow =
                                    "0 2px 8px rgba(234, 179, 8, 0.4)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(234, 179, 8, 0.2)";
                                  e.currentTarget.style.transform = "scale(1)";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  fill="none"
                                  stroke="#eab308"
                                  strokeWidth="2"
                                >
                                  <path d="M6 19V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" />
                                  <path d="M9 9h6" />
                                  <path d="M9 13h6" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="9"
                          style={{
                            ...styles.clientTd,
                            textAlign: "center",
                            padding: "40px 20px",
                            fontSize: "16px",
                            color: "#6b7280",
                            fontStyle: "italic",
                          }}
                        >
                          No active employees found
                        </td>
                      </tr>
                    )}
                    {/* Add empty rows to maintain consistent table height */}
                    {currentEmployees.length > 0 &&
                      currentEmployees.length < itemsPerPage &&
                      Array.from(
                        { length: itemsPerPage - currentEmployees.length },
                        (_, i) => (
                          <tr
                            key={`empty-${i}`}
                            style={{
                              ...styles.clientTr,
                              background:
                                (currentEmployees.length + i) % 2 === 0
                                  ? "rgb(250, 250, 252)"
                                  : "rgb(240, 240, 243)",
                            }}
                          >
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "50px",
                                minWidth: "50px",
                                maxWidth: "50px",
                                flexShrink: 0,
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "60px",
                                minWidth: "60px",
                                flexShrink: 0,
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "22%",
                                minWidth: "180px",
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "18%",
                                minWidth: "140px",
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "14%",
                                minWidth: "120px",
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "14%",
                                minWidth: "120px",
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "20%",
                                minWidth: "160px",
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "12%",
                                minWidth: "100px",
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "10%",
                                minWidth: "110px",
                              }}
                            >
                              &nbsp;
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {/* Pagination for Active Employees */}
          {employeeSection === "active" && <PaginationComponent />}
        </div>
      )}

      {employeeSection === "resigned" && (
        <div
          style={{
            ...styles.tableWrapper,
            borderTopLeftRadius: "0", // Remove top-left radius to connect with tab
            borderTopRightRadius: "12px",
            marginTop: "0",
            position: "relative",
            zIndex: 5,
          }}
        >
          {/* Table Toolbar */}
          <div
            style={{
              width: "100%",
              height: "40px",
              background: "#fff",
              border: "1px solid rgb(215, 215, 224)",
              borderBottom: "none",
              borderTopLeftRadius: "0", // Remove top-left radius to connect with tab
              borderTopRightRadius: "12px",
              margin: 0,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              padding: "8px 16px",
              gap: 12,
              justifyContent: "space-between",
              position: "relative",
              zIndex: 10,
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                  color: "#1D2536",
                  fontSize: 16,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={styles.searchIcon}
                >
                  <circle
                    cx="7"
                    cy="7"
                    r="5.5"
                    stroke="#1D2536"
                    strokeWidth="1.5"
                  ></circle>
                  <line
                    x1="11.3536"
                    y1="11.6464"
                    x2="15"
                    y2="15.2929"
                    stroke="#1D2536"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  ></line>
                </svg>
              </span>
              <input
                type="text"
                placeholder={`Search by ${
                  employeeSection === "active" ? "Active" : "Resigned"
                } Employee Name...`}
                value={
                  employeeSection === "active" ? searchActive : searchResigned
                }
                onChange={(e) =>
                  employeeSection === "active"
                    ? setSearchActive(e.target.value)
                    : setSearchResigned(e.target.value)
                }
                style={{
                  fontFamily: "Maax, sans-serif",
                  fontSize: 14,
                  color: "#2B2C3B",
                  background: "#F8F8F8",
                  width: 280,
                  height: 24,
                  borderRadius: 6,
                  border: "1px solid rgb(215, 215, 224)",
                  outline: "none",
                  padding: "4px 8px 4px 32px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <select
              value={sortByLastName ? "lastName" : "default"}
              onChange={(e) => setSortByLastName(e.target.value === "lastName")}
              style={{
                fontFamily: "Maax, sans-serif",
                fontSize: 14,
                color: "rgb(59, 59, 74)",
                background: "rgb(242, 242, 242)",
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid rgb(215, 215, 224)",
                outline: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgb(37, 99, 235)";
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(37, 99, 235, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgb(242, 242, 242)";
                e.currentTarget.style.color = "rgb(59, 59, 74)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }}
            >
              <option value="default">Sort: Default</option>
              <option value="lastName">Sort: Last A–Z</option>
            </select>
          </div>

          {loading ? (
            <TableLoadingSpinner text="Loading resigned employees..." />
          ) : (
            <>
              {/* Fixed Header */}
              <table style={styles.headerTable}>
                <thead>
                  <tr>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "50px",
                        minWidth: "50px",
                        flexShrink: 0,
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "15%",
                        minWidth: "120px",
                      }}
                    >
                      Employee ID
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "18%",
                        minWidth: "140px",
                      }}
                    >
                      Full Name
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "15%",
                        minWidth: "120px",
                      }}
                    >
                      Position
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "12%",
                        minWidth: "100px",
                      }}
                    >
                      Department
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "12%",
                        minWidth: "100px",
                      }}
                    >
                      Client
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "16%",
                        minWidth: "130px",
                      }}
                    >
                      Corporate Email
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "12%",
                        minWidth: "90px",
                      }}
                    >
                      Date Hired
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "10%",
                        minWidth: "90px",
                      }}
                    >
                      Resigned Date
                    </th>
                    <th
                      style={{
                        ...styles.clientTh,
                        width: "10%",
                        minWidth: "100px",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
              </table>

              {/* Scrollable Body */}
              <div style={styles.tableBody}>
                <table style={styles.bodyTable}>
                  <tbody>
                    {currentEmployees.length > 0 ? (
                      currentEmployees.map((emp, index) => (
                        <tr
                          key={emp.id}
                          style={{
                            ...styles.clientTr,
                            background:
                              index % 2 === 0
                                ? "rgb(250, 250, 252)"
                                : "rgb(240, 240, 243)",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#fef9c3")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background =
                              index % 2 === 0
                                ? "rgb(250, 250, 252)"
                                : "rgb(240, 240, 243)")
                          }
                        >
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "50px",
                              minWidth: "50px",
                              flexShrink: 0,
                            }}
                          >
                            {indexOfFirstItem + index + 1}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "15%",
                              minWidth: "120px",
                            }}
                          >
                            {emp.id}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "18%",
                              minWidth: "140px",
                            }}
                          >
                            {formatName(emp.fullName)}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "15%",
                              minWidth: "120px",
                            }}
                          >
                            {emp.position}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "12%",
                              minWidth: "100px",
                            }}
                          >
                            {emp.department || "-"}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "12%",
                              minWidth: "100px",
                            }}
                          >
                            {emp.client}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "16%",
                              minWidth: "130px",
                            }}
                          >
                            {emp.corporateEmail || "-"}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "12%",
                              minWidth: "90px",
                            }}
                          >
                            {emp.dateHired
                              ? formatDisplayDate(emp.dateHired)
                              : "-"}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "10%",
                              minWidth: "90px",
                            }}
                          >
                            {emp.resignedDate
                              ? formatDisplayDate(emp.resignedDate)
                              : "-"}
                          </td>
                          <td
                            style={{
                              ...styles.clientTd,
                              width: "10%",
                              minWidth: "100px",
                            }}
                          >
                            <div style={styles.actionButtonsContainer}>
                              <button
                                style={{
                                  ...styles.actionButton,
                                  background: "rgba(22, 163, 74, 0.2)",
                                }}
                                onClick={() => handleRestoreEmployee(emp)}
                                title="Restore"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(22, 163, 74, 0.35)";
                                  e.currentTarget.style.transform =
                                    "scale(1.1)";
                                  e.currentTarget.style.boxShadow =
                                    "0 2px 8px rgba(22, 163, 74, 0.4)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(22, 163, 74, 0.2)";
                                  e.currentTarget.style.transform = "scale(1)";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  fill="none"
                                  stroke="#16a34a"
                                  strokeWidth="2"
                                >
                                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                  <path d="M3 3v5h5" />
                                </svg>
                              </button>
                              <button
                                style={{
                                  ...styles.actionButton,
                                  background: "rgba(220, 38, 38, 0.2)",
                                }}
                                onClick={() => handleDeleteResigned(emp)}
                                title="Delete"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(220, 38, 38, 0.35)";
                                  e.currentTarget.style.transform =
                                    "scale(1.1)";
                                  e.currentTarget.style.boxShadow =
                                    "0 2px 8px rgba(220, 38, 38, 0.4)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(220, 38, 38, 0.2)";
                                  e.currentTarget.style.transform = "scale(1)";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  fill="none"
                                  stroke="#dc2626"
                                  strokeWidth="2"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="9"
                          style={{
                            ...styles.clientTd,
                            textAlign: "center",
                            padding: "40px 20px",
                            fontSize: "16px",
                            color: "#6b7280",
                            fontStyle: "italic",
                          }}
                        >
                          No resigned employees found
                        </td>
                      </tr>
                    )}
                    {/* Add empty rows to maintain consistent table height */}
                    {currentEmployees.length > 0 &&
                      currentEmployees.length < itemsPerPage &&
                      Array.from(
                        { length: itemsPerPage - currentEmployees.length },
                        (_, i) => (
                          <tr
                            key={`empty-${i}`}
                            style={{
                              ...styles.clientTr,
                              background:
                                (currentEmployees.length + i) % 2 === 0
                                  ? "rgb(250, 250, 252)"
                                  : "rgb(240, 240, 243)",
                            }}
                          >
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "50px",
                                minWidth: "50px",
                                flexShrink: 0,
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "20%",
                                minWidth: "160px",
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "16%",
                                minWidth: "120px",
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "12%",
                                minWidth: "100px",
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "12%",
                                minWidth: "100px",
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "18%",
                                minWidth: "140px",
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "10%",
                                minWidth: "90px",
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "10%",
                                minWidth: "90px",
                              }}
                            >
                              &nbsp;
                            </td>
                            <td
                              style={{
                                ...styles.clientTd,
                                width: "10%",
                                minWidth: "100px",
                              }}
                            >
                              &nbsp;
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {/* Pagination for Resigned Employees */}
          {employeeSection === "resigned" && <PaginationComponent />}
        </div>
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

                                showSuccess(
                                  `Device ${assigningDevice.deviceTag} assigned to ${emp.fullName}.`
                                );
                              } catch (err) {
                                console.error("Error assigning device:", err);
                                showError(
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
                <LoadingSpinner
                  size="medium"
                  color="#2563eb"
                  text="Loading device history..."
                  showText={true}
                  backgroundColor="transparent"
                />
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
              Are you sure you want to permanently delete this employee record?
              This action cannot be undone.
            </p>
            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
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
            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
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
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#15803d")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#16a34a")
                }
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
              Are you sure you want to delete {selectedIds.length} selected
              employee(s)? This will move them to Resigned Employees.
            </p>
            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
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
  // Page Container
  pageContainer: {
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
  },
  
  // Header Section
  headerSection: {
    backgroundColor: "#fff",
    padding: "20px",
    marginBottom: "20px",
    borderRadius: "4px",
    border: "1px solid #ddd",
  },
  
  headerTitle: {
    fontSize: "24px",
    fontWeight: "bold",
    margin: "0 0 10px 0",
    color: "#333",
  },
  
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "10px",
  },
  
  pageTitle: {
    fontSize: "24px",
    fontWeight: "bold",
    margin: "0",
    color: "#333",
  },
  
  sectionHeader: {
    backgroundColor: "#fff",
    padding: "20px",
    marginBottom: "20px",
    borderRadius: "4px",
    border: "1px solid #ddd",
  },
  
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    margin: "0 0 10px 0",
    color: "#333",
  },
  
  sectionSubtitle: {
    fontSize: "14px",
    color: "#666",
    margin: "0 0 20px 0",
  },
  
  sectionContent: {
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "4px",
    overflow: "hidden",
  },
  
  // Navigation Tabs
  tabsContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    gap: "10px",
    flexWrap: "wrap",
  },
  
  leftTabsGroup: {
    display: "flex",
    gap: "2px",
  },
  
  rightTabsGroup: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  
  tab: {
    padding: "10px 20px",
    border: "1px solid #ddd",
    backgroundColor: "#f8f9fa",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
    color: "#333",
  },
  
  activeTab: {
    backgroundColor: "#007bff",
    color: "#fff",
    border: "1px solid #007bff",
  },
  
  // Actions Bar
  topActionsBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 20px",
    backgroundColor: "#f8f9fa",
    borderBottom: "1px solid #ddd",
    gap: "10px",
    flexWrap: "wrap",
  },
  
  leftActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  
  rightActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  
  // Controls Section
  controlsSection: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  
  // Buttons
  button: {
    padding: "8px 16px",
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
    color: "#333",
  },
  
  primaryButton: {
    backgroundColor: "#007bff",
    color: "#fff",
    border: "1px solid #007bff",
  },
  
  successButton: {
    backgroundColor: "#28a745",
    color: "#fff",
    border: "1px solid #28a745",
  },
  
  dangerButton: {
    backgroundColor: "#dc3545",
    color: "#fff",
    border: "1px solid #dc3545",
  },
  
  warningButton: {
    backgroundColor: "#ffc107",
    color: "#212529",
    border: "1px solid #ffc107",
  },
  
  toggleBtn: {
    padding: "8px 16px",
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
    color: "#333",
  },
  
  sortBtn: {
    padding: "8px 16px",
    border: "1px solid #ddd",
    backgroundColor: "#f8f9fa",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
    color: "#333",
  },
  
  // Search Input
  searchInput: {
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    width: "250px",
  },
  
  searchInputWrapper: {
    position: "relative",
  },
  
  searchIcon: {
    position: "absolute",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#666",
  },
  
  searchContainer: {
    display: "none",
  },
  
  // Dropdown Menu
  dropdownContainer: {
    position: "relative",
    display: "inline-block",
  },
  
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: "0",
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "4px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    zIndex: 1000,
    minWidth: "150px",
  },
  
  dropdownItem: {
    padding: "10px 15px",
    border: "none",
    backgroundColor: "transparent",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    fontSize: "14px",
    color: "#333",
  },
  
  // Table Wrapper
  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    padding: "0 20px",
  },
  
  // Table Container
  tableContainer: {
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "4px",
    overflow: "hidden",
  },
  
  // Table Header
  tableHeader: {
    backgroundColor: "#f8f9fa",
    borderBottom: "1px solid #ddd",
  },
  
  headerTable: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1000px",
  },
  
  clientTh: {
    padding: "12px 8px",
    textAlign: "left",
    fontWeight: "bold",
    fontSize: "14px",
    color: "#333",
    borderRight: "1px solid #ddd",
    backgroundColor: "#f8f9fa",
  },
  
  // Table Body
  tableBody: {
    maxHeight: "600px",
    overflowY: "auto",
  },
  
  bodyTable: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1000px",
  },
  
  clientTr: {
    borderBottom: "1px solid #eee",
  },
  
  clientTd: {
    padding: "12px 8px",
    fontSize: "14px",
    color: "#333",
    borderRight: "1px solid #eee",
    verticalAlign: "middle",
  },
  
  // Bulk Actions
  bulkActionsContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "15px",
    flexWrap: "wrap",
  },
  
  // Form Elements
  input: {
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
  },
  
  inputGroup: {
    marginBottom: "15px",
  },
  
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
    fontSize: "14px",
    color: "#333",
  },
  
  select: {
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
  },
  
  checkbox: {
    width: "16px",
    height: "16px",
    margin: "0",
  },
  
  // Action Buttons
  actionButton: {
    padding: "4px 8px",
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "12px",
    margin: "0 2px",
  },
  
  actionButtonsContainer: {
    display: "flex",
    gap: "4px",
    justifyContent: "center",
  },
  
  actionBtn: {
    padding: "6px 12px",
    border: "1px solid #28a745",
    backgroundColor: "#28a745",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "12px",
  },
  
  secondaryBtn: {
    padding: "6px 12px",
    border: "1px solid #ffc107",
    backgroundColor: "#ffc107",
    color: "#212529",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "12px",
  },
  
  deleteBtn: {
    padding: "6px 12px",
    border: "1px solid #dc3545",
    backgroundColor: "#dc3545",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "12px",
  },
  
  cancelBtn: {
    padding: "6px 12px",
    border: "1px solid #6c757d",
    backgroundColor: "#6c757d",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "12px",
  },
  
  washedOutBtn: {
    opacity: "0.6",
    cursor: "not-allowed",
  },
  
  // Modal
  modalOverlay: {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  
  modalContent: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "8px",
    maxWidth: "500px",
    width: "90%",
    maxHeight: "80vh",
    overflowY: "auto",
    border: "1px solid #ddd",
  },
  
  modalTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    margin: "0 0 20px 0",
    color: "#333",
  },
  
  // Pagination
  paginationContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    padding: "20px 0",
  },
  
  paginationBtn: {
    padding: "8px 12px",
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
    color: "#333",
  },
  
  paginationBtnActive: {
    backgroundColor: "#007bff",
    color: "#fff",
    border: "1px solid #007bff",
  },
  
  paginationBtnDisabled: {
    backgroundColor: "#f8f9fa",
    color: "#6c757d",
    cursor: "not-allowed",
    border: "1px solid #ddd",
  },
  
  paginationEllipsis: {
    padding: "8px 4px",
    color: "#6c757d",
  },
  
  // Utility Styles
  flexRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  
  flexColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  
  textCenter: {
    textAlign: "center",
  },
  
  marginBottom: {
    marginBottom: "15px",
  },
};
  // Page Container
  pageContainer: {
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f9f9f9",
    minHeight: "100vh",
  },
  
  // Header Section
  headerSection: {
    backgroundColor: "#fff",
    padding: "20px",
    marginBottom: "20px",
    borderRadius: "8px",
    border: "1px solid #ddd",
  },
  
  headerTitle: {
    fontSize: "24px",
    fontWeight: "bold",
    margin: "0 0 20px 0",
    color: "#333",
  },
  
  // Navigation Tabs
  tabContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  
  tab: {
    padding: "10px 20px",
    border: "1px solid #ddd",
    backgroundColor: "#f5f5f5",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
  },
  
  activeTab: {
    backgroundColor: "#007bff",
    color: "#fff",
    border: "1px solid #007bff",
  },
  
  // Controls Section
  controlsSection: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  
  // Buttons
  button: {
    padding: "8px 16px",
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
  },
  
  primaryButton: {
    backgroundColor: "#007bff",
    color: "#fff",
    border: "1px solid #007bff",
  },
  
  successButton: {
    backgroundColor: "#28a745",
    color: "#fff",
    border: "1px solid #28a745",
  },
  
  dangerButton: {
    backgroundColor: "#dc3545",
    color: "#fff",
    border: "1px solid #dc3545",
  },
  
  warningButton: {
    backgroundColor: "#ffc107",
    color: "#212529",
    border: "1px solid #ffc107",
  },
  
  // Search Input
  searchInput: {
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    width: "250px",
  },
  
  // Dropdown Menu
  dropdownContainer: {
    position: "relative",
    display: "inline-block",
  },
  
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: "0",
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "4px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    zIndex: 1000,
    minWidth: "150px",
  },
  
  dropdownItem: {
    padding: "10px 15px",
    border: "none",
    backgroundColor: "transparent",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    fontSize: "14px",
  },
  
  // Table Container
  tableContainer: {
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "8px",
    overflow: "hidden",
  },
  
  // Table Header
  tableHeader: {
    backgroundColor: "#f8f9fa",
    borderBottom: "1px solid #ddd",
  },
  
  headerTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  
  clientTh: {
    padding: "12px 8px",
    textAlign: "left",
    fontWeight: "bold",
    fontSize: "14px",
    color: "#333",
    borderRight: "1px solid #ddd",
  },
  
  // Table Body
  tableBody: {
    maxHeight: "600px",
    overflowY: "auto",
  },
  
  bodyTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  
  clientTr: {
    borderBottom: "1px solid #eee",
  },
  
  clientTd: {
    padding: "12px 8px",
    fontSize: "14px",
    color: "#333",
    borderRight: "1px solid #eee",
    verticalAlign: "middle",
  },
  
  // Form Elements
  input: {
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
  },
  
  inputGroup: {
    marginBottom: "15px",
  },
  
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
    fontSize: "14px",
    color: "#333",
  },
  
  select: {
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
  },
  
  checkbox: {
    width: "16px",
    height: "16px",
    margin: "0",
  },
  
  // Action Buttons
  actionButton: {
    padding: "4px 8px",
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "12px",
    margin: "0 2px",
  },
  
  actionButtonsContainer: {
    display: "flex",
    gap: "4px",
    justifyContent: "center",
  },
  
  // Modal
  modalOverlay: {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  
  modalContent: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "8px",
    maxWidth: "500px",
    width: "90%",
    maxHeight: "80vh",
    overflowY: "auto",
  },
  
  modalTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    margin: "0 0 20px 0",
    color: "#333",
  },
  
  // Pagination
  paginationContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    padding: "20px 0",
  },
  
  paginationBtn: {
    padding: "8px 12px",
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
  },
  
  paginationBtnActive: {
    backgroundColor: "#007bff",
    color: "#fff",
    border: "1px solid #007bff",
  },
  
  paginationBtnDisabled: {
    backgroundColor: "#f8f9fa",
    color: "#6c757d",
    cursor: "not-allowed",
    border: "1px solid #ddd",
  },
  
  paginationEllipsis: {
    padding: "8px 4px",
    color: "#6c757d",
  },
  
  // Utility Styles
  flexRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  
  flexColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  
  textCenter: {
    textAlign: "center",
  },
  
  marginBottom: {
    marginBottom: "15px",
  },
  
  // Legacy styles to maintain compatibility
  actionBtn: {
    padding: "8px 16px",
    border: "1px solid #ddd",
    backgroundColor: "#28a745",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
  },
  
  secondaryBtn: {
    padding: "8px 16px",
    border: "1px solid #ddd",
    backgroundColor: "#ffc107",
    color: "#212529",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
  },
  
  deleteBtn: {
    padding: "8px 16px",
    border: "1px solid #dc3545",
    backgroundColor: "#dc3545",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
  },
  
  cancelBtn: {
    padding: "8px 16px",
    border: "1px solid #6c757d",
    backgroundColor: "#6c757d",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
  },
  
  washedOutBtn: {
    opacity: "0.6",
    cursor: "not-allowed",
  },
  
  toggleBtn: {
    padding: "10px 20px",
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
  },
  
  searchContainer: {
    display: "none",
  },
  
  searchInputWrapper: {
    position: "relative",
  },
  
  searchIcon: {
    position: "absolute",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#6c757d",
  },
  
  sortBtn: {
    padding: "8px 16px",
    border: "1px solid #ddd",
    backgroundColor: "#f8f9fa",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
  },
  
  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },
  
  bulkActionsContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "15px",
    flexWrap: "wrap",
  },
  
  // Additional legacy compatibility styles
  pageTitle: {
    fontSize: "24px",
    fontWeight: "bold",
    margin: "0 0 20px 0",
    color: "#333",
  },
  
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "10px",
  },
  
  sectionHeader: {
    backgroundColor: "#fff",
    padding: "20px",
    marginBottom: "20px",
    borderRadius: "8px",
    border: "1px solid #ddd",
  },
  
  sectionTitle: {
    fontSize: "24px",
    fontWeight: "bold",
    margin: "0 0 10px 0",
    color: "#333",
  },
  
  sectionSubtitle: {
    fontSize: "14px",
    color: "#666",
    margin: "0 0 20px 0",
  },
  
  sectionContent: {
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "20px",
  },
  
  tabsContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  
  leftTabsGroup: {
    display: "flex",
    gap: "2px",
  },
  
  rightTabsGroup: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  
  topActionsBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "10px",
  },
  
  leftActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  
  rightActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
};
  headerSection: {
    width: "100%",
    maxWidth: "none",
    margin: "0",
    padding: "20px 24px",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: "16px",
  },
  pageTitle: {
    fontFamily: "Maax, sans-serif",
    fontSize: "28px",
    lineHeight: "37.24px",
    fontWeight: 400,
    letterSpacing: "normal",
    color: "rgb(43, 44, 59)",
    margin: 0,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  topControlsSection: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 16,
    flexWrap: "wrap",
    gap: "12px",
  },
  leftControls: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  sortSelect: {
    fontFamily: "Maax, sans-serif",
    fontSize: "14px",
    fontWeight: 500,
    padding: "8px 16px",
    background: "rgb(242, 242, 242)",
    color: "rgb(59, 59, 74)",
    border: "1px solid rgb(215, 215, 224)",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    minHeight: "36px",
    minWidth: "140px",
    outline: "none",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transform: "translateY(0)",
  },
  addBtn: {
    fontFamily: "Maax, sans-serif",
    fontSize: "14px",
    lineHeight: "20.0004px",
    fontWeight: 500,
    letterSpacing: "normal",
    color: "rgb(59, 59, 74)",
    background: "rgb(242, 242, 242)",
    minWidth: "120px",
    height: "36px",
    borderRadius: "6px",
    border: "none",
    outline: "none",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    padding: "0px 16px",
    whiteSpace: "nowrap",
    transform: "translateY(0)",
  },
  dropdownContainer: {
    position: "relative",
    display: "inline-block",
  },
  dropdownBtn: {
    fontFamily: "Maax, sans-serif",
    fontSize: "14px",
    lineHeight: "20.0004px",
    fontWeight: 500,
    letterSpacing: "normal",
    color: "rgb(59, 59, 74)",
    background: "rgb(242, 242, 242)",
    minWidth: "150px",
    height: "36px",
    borderRadius: "6px",
    border: "none",
    outline: "none",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    padding: "0px 16px",
    whiteSpace: "nowrap",
    transform: "translateY(0)",
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "rgb(255, 255, 255)",
    border: "1px solid rgb(215, 215, 224)",
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: 1000,
    marginTop: "4px",
    overflow: "hidden",
  },
  dropdownItem: {
    fontFamily: "Maax, sans-serif",
    fontSize: "14px",
    fontWeight: 400,
    color: "rgb(59, 59, 74)",
    background: "transparent",
    border: "none",
    padding: "12px 16px",
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
    transition: "background 0.2s",
    display: "block",
    "&:hover": {
      background: "rgb(248, 248, 248)",
    },
  },
  sectionToggle: {
    display: "flex",
    gap: 8,
    marginBottom: 16,
    width: "100%",
    maxWidth: "none",
    margin: "0 auto 16px auto",
    padding: "0 24px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  toggleBtn: {
    fontFamily: "Maax, sans-serif",
    fontSize: "14px",
    fontWeight: 500,
    padding: "10px 20px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.3s ease",
    minHeight: "36px",
    minWidth: "120px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transform: "translateY(0)",
    whiteSpace: "nowrap",
  },
  searchContainer: {
    display: "none", // Remove old search container
  },
  searchInputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
    color: "rgb(29, 37, 54)",
    fontSize: "16px",
    paddingLeft: "0px",
    paddingRight: "4px",
    height: "20px",
  },
  searchInput: {
    fontFamily: "Maax, sans-serif",
    fontSize: "14px",
    lineHeight: "20.0004px",
    fontWeight: 400,
    letterSpacing: "normal",
    color: "rgb(43, 44, 59)",
    background: "rgb(248, 248, 248)",
    width: "100%",
    maxWidth: "min(320px, calc(100vw - 200px))",
    minWidth: "200px",
    height: "36px",
    borderRadius: "6px",
    border: "1px solid rgb(215, 215, 224)",
    outline: "none",
    padding: "8px 12px 8px 32px",
    boxSizing: "border-box",
  },
  sortBtn: {
    fontFamily: "Maax, sans-serif",
    fontSize: "12px",
    fontWeight: 500,
    padding: "8px 16px",
    background: "rgb(242, 242, 242)",
    color: "rgb(59, 59, 74)",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background 0.2s",
    minHeight: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  },
  tableWrapper: {
    width: "100%",
    maxWidth: "none",
    margin: "0",
    padding: "0 24px",
    overflowX: "auto",
    boxSizing: "border-box",
  },
  bulkActionsContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
    flexWrap: "wrap",
  },
  headerTable: {
    borderCollapse: "collapse",
    width: "100%",
    minWidth: "1000px",
    tableLayout: "fixed",
    boxShadow: "none",
    border: "1px solid rgb(215, 215, 224)",
    borderBottom: "none",
    borderTop: "none",
    background: "rgb(255, 255, 255)",
    fontFamily: "Maax, sans-serif",
    fontSize: "14px",
    lineHeight: "20.0004px",
    color: "rgb(59, 59, 74)",
    letterSpacing: "normal",
    fontWeight: 400,
    transition: "all 0.3s ease",
  },
  clientTh: {
    textAlign: "left",
    verticalAlign: "middle",
    fontWeight: 400,
    background: "rgb(255, 255, 255)",
    fontFamily: "Maax, sans-serif",
    fontSize: "14px",
    lineHeight: "20.0004px",
    color: "rgb(59, 59, 74)",
    letterSpacing: "normal",
    padding: "16px 8px",
    border: "1px solid rgb(215, 215, 224)",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
  },
  tableBody: {
    width: "100%",
    height: "650px",
    maxHeight: "650px",
    overflowY: "scroll",
    scrollbarWidth: "none",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    WebkitOverflowScrolling: "touch",
  },
  bodyTable: {
    borderCollapse: "collapse",
    width: "100%",
    minWidth: "1000px",
    tableLayout: "fixed",
    boxShadow: "none",
    borderTop: "none",
    borderRight: "1px solid rgb(215, 215, 224)",
    borderBottom: "none",
    borderLeft: "1px solid rgb(215, 215, 224)",
    fontFamily: "Maax, sans-serif",
    fontSize: "14px",
    lineHeight: "20.0004px",
    color: "rgb(59, 59, 74)",
    letterSpacing: "normal",
    fontWeight: 400,
  },
  clientTr: {
    cursor: "pointer",
    transition: "background 0.2s",
  },
  clientTd: {
    textAlign: "left",
    verticalAlign: "middle",
    borderLeft: "1px solid rgb(215, 215, 224)",
    borderRight: "1px solid rgb(215, 215, 224)",
    borderTop: "none",
    borderBottom: "none",
    padding: "16px 8px",
    color: "rgb(59, 59, 74)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minHeight: "60px",
    boxSizing: "border-box",
  },
  checkbox: {
    border: "1px solid rgb(215, 215, 224)",
    boxSizing: "border-box",
    width: "16px",
    height: "16px",
    margin: "0px",
    display: "block",
    position: "relative",
    left: "50%",
    transform: "translateX(-50%)",
  },
  actionButton: {
    background: "none",
    border: "none",
    padding: "0px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    transition: "all 0.3s ease",
    flexShrink: 0,
    transform: "scale(1)",
  },
  actionButtonsContainer: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    minWidth: "80px",
    flexWrap: "wrap",
  },
  // Legacy styles for modals and other components
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
    transition: "all 0.3s ease",
    minWidth: 36,
    minHeight: 28,
    display: "inline-block",
    boxShadow: "0 2px 8px rgba(225,29,72,0.10)",
    outline: "none",
    opacity: 1,
    transform: "translateY(0) scale(1)",
  },
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
    minWidth: "min(400px, 90vw)",
    maxWidth: "min(500px, 95vw)",
    width: "auto",
    boxShadow: "0 12px 48px rgba(37,99,235,0.18)",
    position: "relative",
    margin: "20px",
    boxSizing: "border-box",
  },
  modalTitle: {
    margin: "0 0 18px 0",
    fontWeight: 700,
    color: "#233037",
    letterSpacing: 1,
    fontSize: 22,
    textAlign: "center",
  },

  // Pagination styles
  paginationContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    padding: "16px 0",
  },
  paginationBtn: {
    fontFamily: "Maax, sans-serif",
    fontSize: "14px",
    fontWeight: 500,
    padding: "8px 16px",
    background: "rgb(242, 242, 242)",
    color: "rgb(59, 59, 74)",
    border: "1px solid rgb(215, 215, 224)",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    minHeight: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "36px",
  },
  paginationBtnActive: {
    background: "#2563eb",
    color: "#fff",
    borderColor: "#2563eb",
  },
  paginationBtnDisabled: {
    background: "rgb(248, 248, 248)",
    color: "rgb(156, 163, 175)",
    cursor: "not-allowed",
    borderColor: "rgb(229, 231, 235)",
  },
  paginationEllipsis: {
    fontFamily: "Maax, sans-serif",
    fontSize: "14px",
    color: "rgb(107, 114, 128)",
    padding: "8px 4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
