import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  addEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
  resignEmployee,
  undoResignation,
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

// Simple Modal Component with CompanyAssets styling
function EmployeeFormModal({
  data,
  onChange,
  onSave,
  onCancel,
  isValid,
  clients,
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(34, 46, 58, 0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: 32,
          width: "90%",
          maxWidth: 500,
          maxHeight: "80vh",
          overflow: "auto",
          fontFamily: 'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: "0 20px 32px rgba(34, 46, 58, 0.2)",
        }}
      >
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "#222e3a",
            marginBottom: 24,
            marginTop: 0,
          }}
        >
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
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ 
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 6,
          }}>
            Full Name:
          </label>
          <input
            name="fullName"
            value={data.fullName}
            onChange={onChange}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'inherit',
              outline: "none",
              "&:focus": {
                borderColor: "#2563eb",
                boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.1)",
              },
            }}
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ 
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 6,
          }}>
            Position:
          </label>
          <input
            name="position"
            value={data.position}
            onChange={onChange}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'inherit',
              outline: "none",
            }}
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ 
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 6,
          }}>
            Department:
          </label>
          <input
            name="department"
            value={data.department}
            onChange={onChange}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'inherit',
              outline: "none",
            }}
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ 
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 6,
          }}>
            Client:
          </label>
          <select
            name="clientId"
            value={data.clientId}
            onChange={onChange}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'inherit',
              outline: "none",
              backgroundColor: "white",
            }}
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
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ 
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 6,
          }}>
            Corporate Email:
          </label>
          <input
            type="email"
            name="corporateEmail"
            value={data.corporateEmail || ""}
            onChange={onChange}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'inherit',
              outline: "none",
            }}
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ 
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 6,
          }}>
            Personal Email:
          </label>
          <input
            type="email"
            name="personalEmail"
            value={data.personalEmail || ""}
            onChange={onChange}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'inherit',
              outline: "none",
            }}
          />
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ 
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 6,
          }}>
            Date Hired:
          </label>
          <input
            type="date"
            name="dateHired"
            value={data.dateHired ? data.dateHired : ""}
            onChange={onChange}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'inherit',
              outline: "none",
            }}
          />
        </div>
        
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button 
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "white",
              color: "#374151",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button 
            onClick={onSave} 
            disabled={!isValid}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 6,
              background: isValid ? "#2563eb" : "#9ca3af",
              color: "white",
              fontSize: 14,
              fontWeight: 500,
              cursor: isValid ? "pointer" : "not-allowed",
              fontFamily: 'inherit',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal for bulk resign confirmation
function BulkResignModal({ isOpen, onConfirm, onCancel, selectedCount, reason, setReason }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(34, 46, 58, 0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: 32,
          width: "90%",
          maxWidth: 400,
          fontFamily: 'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: "0 20px 32px rgba(34, 46, 58, 0.2)",
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#222e3a",
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          Confirm Bulk Resign
        </h2>
        <p style={{ color: "#6b7280", marginBottom: 20, fontSize: 14 }}>
          Are you sure you want to resign {selectedCount} employee(s)?
        </p>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ 
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 6,
          }}>
            Reason for resignation:
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional reason..."
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'inherit',
              outline: "none",
              minHeight: 80,
              resize: "vertical",
            }}
          />
        </div>
        
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button 
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "white",
              color: "#374151",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 6,
              background: "#dc2626",
              color: "white",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: 'inherit',
            }}
          >
            Resign {selectedCount} Employee(s)
          </button>
        </div>
      </div>
    </div>
  );
}

// Modern Confirmation Modal for Individual Actions
function ConfirmationModal({ isOpen, onConfirm, onCancel, title, message, confirmText, confirmColor = "#dc2626" }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
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
          fontFamily: 'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <h2
          style={{
            color: confirmColor,
            marginBottom: 12,
            margin: "0 0 18px 0",
            fontWeight: 700,
            letterSpacing: 1,
            fontSize: 22,
            textAlign: "center",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: "0 0 16px 0",
            color: "#374151",
            fontSize: 16,
            textAlign: "center",
          }}
        >
          {message}
        </p>
        <div
          style={{
            marginTop: 24,
            textAlign: "right",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            onClick={onConfirm}
            style={{
              background: confirmColor,
              color: "#fff",
              border: "none",
              borderRadius: 7,
              padding: "7px 16px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.3s ease",
              minWidth: 36,
              minHeight: 28,
              display: "inline-block",
              boxShadow: `0 2px 8px ${confirmColor}20`,
              outline: "none",
              opacity: 1,
              transform: "translateY(0) scale(1)",
            }}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            style={{
              background: "#e0e7ef",
              color: "#233037",
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              fontWeight: 700,
              fontSize: 14,
              marginLeft: 8,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Employee Assets Modal
function EmployeeAssetsModal({ isOpen, onClose, employee, devices }) {
  if (!isOpen || !employee) return null;

  // Filter devices assigned to this employee
  const assignedDevices = devices.filter(device => device.assignedTo === employee.id);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      // Handle different date formats
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(34, 46, 58, 0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          width: "90%",
          maxWidth: 1000,
          maxHeight: "90vh",
          overflow: "hidden",
          fontFamily: 'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: "0 20px 32px rgba(34, 46, 58, 0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#222e3a",
                marginBottom: 4,
                marginTop: 0,
              }}
            >
              Assigned Assets
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "#6b7280",
                margin: 0,
              }}
            >
              {employee.fullName} • {assignedDevices.length} asset(s)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 24,
              color: "#6b7280",
              cursor: "pointer",
              padding: "8px",
              borderRadius: 6,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: assignedDevices.length === 0 ? "40px 32px" : 0,
          }}
        >
          {assignedDevices.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#6b7280",
                fontSize: 16,
              }}
            >
              No assets assigned to this employee
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
                color: "#374151",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <th
                    style={{
                      padding: "16px 24px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Device Tag
                  </th>
                  <th
                    style={{
                      padding: "16px 24px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Device Type
                  </th>
                  <th
                    style={{
                      padding: "16px 24px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Brand
                  </th>
                  <th
                    style={{
                      padding: "16px 24px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Model
                  </th>
                  <th
                    style={{
                      padding: "16px 24px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Serial Number
                  </th>
                  <th
                    style={{
                      padding: "16px 24px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Condition
                  </th>
                  <th
                    style={{
                      padding: "16px 24px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Date Assigned
                  </th>
                </tr>
              </thead>
              <tbody>
                {assignedDevices.map((device) => (
                  <tr
                    key={device.id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <td
                      style={{
                        padding: "16px 24px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "150px",
                      }}
                    >
                      {device.deviceTag || "-"}
                    </td>
                    <td
                      style={{
                        padding: "16px 24px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "120px",
                      }}
                    >
                      {device.deviceType || "-"}
                    </td>
                    <td
                      style={{
                        padding: "16px 24px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "120px",
                      }}
                    >
                      {device.brand || "-"}
                    </td>
                    <td
                      style={{
                        padding: "16px 24px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "150px",
                      }}
                    >
                      {device.model || "-"}
                    </td>
                    <td
                      style={{
                        padding: "16px 24px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "150px",
                      }}
                    >
                      {device.serialNumber || "-"}
                    </td>
                    <td
                      style={{
                        padding: "16px 24px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100px",
                      }}
                    >
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                          background: 
                            device.condition === "New" ? "#dcfce7" :
                            device.condition === "Good" ? "#dbeafe" :
                            device.condition === "Fair" ? "#fef3c7" :
                            device.condition === "Poor" ? "#fee2e2" : "#f3f4f6",
                          color:
                            device.condition === "New" ? "#166534" :
                            device.condition === "Good" ? "#1e40af" :
                            device.condition === "Fair" ? "#92400e" :
                            device.condition === "Poor" ? "#dc2626" : "#374151",
                        }}
                      >
                        {device.condition || "Unknown"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "16px 24px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "120px",
                      }}
                    >
                      {formatDate(device.assignmentDate || device.dateAssigned)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 32px",
            borderTop: "1px solid #e5e7eb",
            textAlign: "right",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "white",
              color: "#374151",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: 'inherit',
            }}
          >
            Close
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

export default function Employee() {
  const [employees, setEmployees] = useState([]);
  const [resignedEmployees, setResignedEmployees] = useState([]);
  const [form, setForm] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState([]);
  const [devices, setDevices] = useState([]);
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [activeTab, setActiveTab] = useState("active");
  const { showSuccess, showError, showUndoNotification } = useSnackbar();
  
  // Assets modal state
  const [assetsModal, setAssetsModal] = useState({
    isOpen: false,
    employee: null,
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [employeesPerPage, setEmployeesPerPage] = useState(50);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkResignModal, setShowBulkResignModal] = useState(false);
  const [bulkResignReason, setBulkResignReason] = useState("");
  
  // Confirmation modal states
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [employeeToResign, setEmployeeToResign] = useState(null);
  const [employeeToUndo, setEmployeeToUndo] = useState(null);

  // Load clients and employees
  const loadClientsAndEmployees = async () => {
    setIsTableLoading(true);
    try {
      const [clientsData, employeesData, devicesData] = await Promise.all([
        getAllClients(),
        getAllEmployees(),
        getAllDevices(),
      ]);
      setClients(clientsData);
      setDevices(devicesData);
      
      // Separate active and resigned employees
      const activeEmployees = employeesData.filter(emp => !emp.isResigned);
      const resignedEmployees = employeesData.filter(emp => emp.isResigned);
      
      setEmployees(activeEmployees);
      setResignedEmployees(resignedEmployees);
    } catch (error) {
      showError("Error loading data: " + error.message);
    } finally {
      setIsTableLoading(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClientsAndEmployees();
  }, []);

  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Reset pagination when employeesPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [employeesPerPage]);

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setIsTableLoading(true);
      const dataToSave = { ...form };

      if (form.id) {
        await updateEmployee(form.id, dataToSave);
        showSuccess("Employee updated successfully!");
      } else {
        await addEmployee(dataToSave);
        showSuccess("Employee added successfully!");
      }

      setForm({});
      setShowForm(false);
      loadClientsAndEmployees();
    } catch (error) {
      showError("Error saving employee: " + error.message);
    } finally {
      setIsTableLoading(false);
    }
  };

  // Resign employee with undo capability
  const handleResignEmployee = (id, reason = "") => {
    const employee = employees.find(emp => emp.id === id);
    setEmployeeToResign({ id, reason, employee });
    setShowResignConfirm(true);
  };
  
  const confirmResignEmployee = async () => {
    if (!employeeToResign) return;
    
    const { id, reason, employee } = employeeToResign;
    
    try {
      setIsTableLoading(true);
      
      // Store original state for undo
      const originalState = { ...employee };
      
      // Add to undo manager
      undoManager.addDeletedItem(
        id,
        originalState,
        async (originalData) => {
          try {
            // Restore the employee by removing resignation fields
            await undoResignation(id);
            loadClientsAndEmployees();
            showSuccess("Employee resignation undone successfully!");
          } catch (error) {
            showError("Failed to undo resignation: " + error.message);
          }
        },
        8000 // 8 seconds to undo
      );

      // Perform the resignation
      await resignEmployee(id, reason);
      loadClientsAndEmployees();
      
      // Show undo notification
      showUndoNotification(
        "Employee resigned successfully",
        () => {
          undoManager.restoreItem(id);
        }
      );
      
      setShowResignConfirm(false);
      setEmployeeToResign(null);
    } catch (error) {
      showError("Error resigning employee: " + error.message);
    } finally {
      setIsTableLoading(false);
    }
  };

  // Undo resignation - restore employee to active status
  const handleUndoResignation = (id) => {
    const employee = resignedEmployees.find(emp => emp.id === id);
    setEmployeeToUndo({ id, employee });
    setShowUndoConfirm(true);
  };
  
  const confirmUndoResignation = async () => {
    if (!employeeToUndo) return;
    
    const { id } = employeeToUndo;
    
    try {
      setIsTableLoading(true);
      await undoResignation(id);
      showSuccess("Employee restored to active status successfully!");
      loadClientsAndEmployees();
      setShowUndoConfirm(false);
      setEmployeeToUndo(null);
    } catch (error) {
      showError("Error restoring employee: " + error.message);
    } finally {
      setIsTableLoading(false);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(currentEmployees.map(emp => emp.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectEmployee = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedIds([]); // Clear selection when switching tabs
    setSortBy("default"); // Reset sort when switching tabs
  };

  // Bulk resign with undo capability
  const handleBulkResign = async () => {
    try {
      setIsTableLoading(true);
      
      // Store original states and selected IDs for undo
      const employeesToResign = employees.filter(emp => selectedIds.includes(emp.id));
      const originalStates = employeesToResign.map(emp => ({ ...emp }));
      const resignedIds = [...selectedIds]; // Copy the array before clearing
      
      // Add each employee to undo manager
      resignedIds.forEach((id, index) => {
        undoManager.addDeletedItem(
          id,
          originalStates[index],
          async (originalData) => {
            try {
              await undoResignation(id);
              loadClientsAndEmployees();
            } catch (error) {
              console.error(`Failed to undo resignation for employee ${id}:`, error);
            }
          },
          10000 // 10 seconds for bulk operations
        );
      });

      // Perform bulk resignation
      for (const id of resignedIds) {
        await resignEmployee(id, bulkResignReason);
      }
      
      setShowBulkResignModal(false);
      setBulkResignReason("");
      const resignedCount = resignedIds.length;
      setSelectedIds([]);
      loadClientsAndEmployees();
      
      // Show undo notification for bulk operation
      showUndoNotification(
        `Successfully resigned ${resignedCount} employee(s)`,
        () => {
          // Restore all resigned employees
          resignedIds.forEach(id => {
            undoManager.restoreItem(id);
          });
        }
      );
    } catch (error) {
      showError("Failed to resign employees: " + error.message);
    } finally {
      setIsTableLoading(false);
    }
  };

  // Excel import
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsTableLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        console.log("Parsed Excel rows:", rows); // Debug log

        if (rows.length === 0) {
          showError("Excel file is empty or has no valid data");
          setIsTableLoading(false);
          return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const row of rows) {
          try {
            // Build full name from first and last name (excluding middle name)
            const firstName = row["FIRST NAME"] || "";
            const lastName = row["LAST NAME"] || "";
            const fullName = `${firstName} ${lastName}`.trim();

            const employeeData = {
              fullName: fullName,
              position: row["POSITION"] || "",
              department: "", // You might want to add DEPARTMENT column to your Excel or set a default
              clientId: findClientIdByName(row["CLIENT"] || ""),
              corporateEmail: row["CORPORATE EMAIL"] || "",
              personalEmail: row["PERSONAL EMAIL"] || "",
              dateHired: row["DATE HIRED"] || "",
              firstName: firstName,
              lastName: lastName,
              middleName: "", // Intentionally left empty as requested
            };

            console.log("Processing employee:", employeeData); // Debug log

            // Validate required fields (fullName and position are minimum requirements)
            if (employeeData.fullName && employeeData.position) {
              await addEmployee(employeeData);
              successCount++;
            } else {
              console.log("Skipping invalid row (missing fullName or position):", row);
              errorCount++;
            }
          } catch (error) {
            console.error("Error adding employee:", error);
            errorCount++;
          }
        }

        if (successCount > 0) {
          showSuccess(`Successfully imported ${successCount} employee(s)${errorCount > 0 ? ` (${errorCount} failed)` : ""}`);
          await loadClientsAndEmployees();
        } else {
          showError("No valid employees found to import. Please check your Excel format and ensure FIRST NAME, LAST NAME, and POSITION columns have data.");
        }
      } catch (error) {
        console.error("Error importing Excel file:", error);
        showError("Error importing Excel file: " + error.message);
      } finally {
        setIsTableLoading(false);
      }
    };

    reader.onerror = () => {
      showError("Error reading the Excel file");
      setIsTableLoading(false);
    };

    reader.readAsArrayBuffer(file);
    e.target.value = ""; // Reset file input
  };

  // Helper function to find client ID by name
  const findClientIdByName = (clientName) => {
    if (!clientName) return "";
    const client = clients.find(c => c.clientName === clientName);
    return client ? client.id : "";
  };

  // Helper function to extract first and last names from fullName
  const extractNames = (fullName) => {
    if (!fullName) return { firstName: "", lastName: "" };
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(' ') || "";
    return { firstName, lastName };
  };

  // Excel export
  const exportToExcel = () => {
    const exportData = currentEmployees.map((emp, index) => {
      const { firstName, lastName } = extractNames(emp.fullName);
      return {
        "Employee ID": index + 1, // Simple sequential ID
        "DATE HIRED": formatDisplayDate(emp.dateHired),
        "CLIENT": getClientName(emp.clientId),
        "LAST NAME": lastName,
        "FIRST NAME": firstName,
        "MIDDLE NAME": "", // Intentionally left empty as requested
        "POSITION": emp.position,
        "CORPORATE EMAIL": emp.corporateEmail || "",
        "PERSONAL EMAIL": emp.personalEmail || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, `employees_${activeTab}.xlsx`);
    showSuccess(`Excel file exported successfully! (${exportData.length} ${activeTab} employees)`);
  };

  // Utility functions
  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.clientName : "No Client";
  };

  const isFormValid = () => {
    return form.fullName && form.position && form.department && form.clientId;
  };

  // Sort employees
  const sortEmployees = (employeeList) => {
    return [...employeeList].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.fullName.localeCompare(b.fullName);
        case "position":
          return a.position.localeCompare(b.position);
        default:
          return 0;
      }
    });
  };

  const allEmployees = activeTab === "active" 
    ? sortEmployees(employees) 
    : sortEmployees(resignedEmployees);
  
  // Calculate pagination
  const totalPages = Math.ceil(allEmployees.length / employeesPerPage);
  const startIndex = (currentPage - 1) * employeesPerPage;
  const endIndex = startIndex + employeesPerPage;
  const currentEmployees = allEmployees.slice(startIndex, endIndex);
  
  const isAllSelected = currentEmployees.length > 0 && selectedIds.length === currentEmployees.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < currentEmployees.length;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100vh",
      background: "#f7f9fb",
      fontFamily: 'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: "hidden",
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        color: "#222e3a",
        letterSpacing: 1,
        padding: "20px 24px 0px 24px",
        flexShrink: 0,
      }}>
        Employee Management
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: "flex",
        padding: "16px 24px 0px 24px",
        flexShrink: 0,
      }}>
        <button
          onClick={() => handleTabChange("active")}
          style={{
            padding: "12px 20px",
            border: "none",
            background: "transparent",
            color: activeTab === "active" ? "#2563eb" : "#6b7280",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: 'inherit',
            borderBottom: activeTab === "active" ? "2px solid #2563eb" : "2px solid transparent",
            transition: "all 0.2s ease",
          }}
        >
          Active Employees ({employees.length})
        </button>
        <button
          onClick={() => handleTabChange("resigned")}
          style={{
            padding: "12px 20px",
            border: "none",
            background: "transparent",
            color: activeTab === "resigned" ? "#2563eb" : "#6b7280",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: 'inherit',
            borderBottom: activeTab === "resigned" ? "2px solid #2563eb" : "2px solid transparent",
            transition: "all 0.2s ease",
          }}
        >
          Resigned Employees ({resignedEmployees.length})
        </button>
      </div>

      {/* Controls */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 24px 16px 24px",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'inherit',
              outline: "none",
              backgroundColor: "white",
            }}
          >
            <option value="default">Sort: Default</option>
            <option value="name">Sort: Name A-Z</option>
            <option value="position">Sort: Position</option>
          </select>
          
          {/* Show bulk resign only for active employees */}
          {selectedIds.length > 0 && activeTab === "active" && (
            <button
              onClick={() => setShowBulkResignModal(true)}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 6,
                background: "#dc2626",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: 'inherit',
              }}
            >
              Resign Selected ({selectedIds.length})
            </button>
          )}
        </div>
        
        <div style={{ display: "flex", gap: 12 }}>
          {/* Show Import Excel only for active tab */}
          {activeTab === "active" && (
            <label
              style={{
                padding: "8px 16px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                background: "white",
                color: "#374151",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: 'inherit',
                display: "inline-block",
              }}
            >
              Import Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                style={{ display: "none" }}
              />
            </label>
          )}
          <button
            onClick={exportToExcel}
            style={{
              padding: "8px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "white",
              color: "#374151",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: 'inherit',
            }}
          >
            Export Excel
          </button>
          {/* Show Add Employee only for active tab */}
          {activeTab === "active" && (
            <button
              onClick={() => {
                setForm({});
                setShowForm(true);
              }}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 6,
                background: "#2563eb",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: 'inherit',
              }}
            >
              Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div style={{
        flex: 1,
        margin: "0 24px",
        background: "white",
        borderRadius: "12px 12px 0 0", // Only top corners rounded
        border: "1px solid #e5e7eb",
        borderBottom: "none", // Remove bottom border to connect with pagination
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      }}>
        <div style={{
          flex: 1,
          overflow: "auto",
          minHeight: 0,
        }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
            color: "#374151",
          }}>
            <thead>
              <tr style={{
                background: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}>
                <th style={{
                  padding: 16,
                  textAlign: "left",
                  fontWeight: 600,
                  color: "#374151",
                  width: "40px",
                }}>
                  {activeTab === "active" && (
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                  )}
                </th>
                <th style={{ padding: 16, textAlign: "left", fontWeight: 600, color: "#374151" }}>
                  Full Name
                </th>
                <th style={{ padding: 16, textAlign: "left", fontWeight: 600, color: "#374151" }}>
                  Position
                </th>
                <th style={{ padding: 16, textAlign: "left", fontWeight: 600, color: "#374151" }}>
                  Department
                </th>
                <th style={{ padding: 16, textAlign: "left", fontWeight: 600, color: "#374151" }}>
                  Client
                </th>
                <th style={{ padding: 16, textAlign: "left", fontWeight: 600, color: "#374151" }}>
                  Corporate Email
                </th>
                <th style={{ padding: 16, textAlign: "left", fontWeight: 600, color: "#374151" }}>
                  {activeTab === "active" ? "Date Hired" : "Date Resigned"}
                </th>
                {activeTab === "resigned" && (
                  <th style={{ padding: 16, textAlign: "left", fontWeight: 600, color: "#374151" }}>
                    Resignation Reason
                  </th>
                )}
                {activeTab === "resigned" && (
                  <th style={{ padding: 16, textAlign: "center", fontWeight: 600, color: "#374151" }}>
                    Actions
                  </th>
                )}
                {activeTab === "active" && (
                  <th style={{ padding: 16, textAlign: "center", fontWeight: 600, color: "#374151" }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {isTableLoading ? (
                <tr>
                  <td colSpan={activeTab === "active" ? "8" : "9"} style={{ padding: 40, textAlign: "center" }}>
                    <TableLoadingSpinner />
                  </td>
                </tr>
              ) : currentEmployees.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === "active" ? "8" : "9"} style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
                    {activeTab === "active" ? "No active employees found" : "No resigned employees found"}
                  </td>
                </tr>
              ) : (
                currentEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      ":hover": { backgroundColor: "#f9fafb" },
                    }}
                  >
                    <td style={{ padding: 16 }}>
                      {activeTab === "active" && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(employee.id)}
                          onChange={(e) => handleSelectEmployee(employee.id, e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                      )}
                    </td>
                    <td style={{ padding: 16 }}>
                      <span
                        onClick={() => setAssetsModal({ isOpen: true, employee })}
                        style={{
                          color: "#2563eb",
                          cursor: "pointer",
                          textDecoration: "underline",
                          textDecorationColor: "transparent",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.textDecorationColor = "#2563eb";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.textDecorationColor = "transparent";
                        }}
                      >
                        {employee.fullName}
                      </span>
                    </td>
                    <td style={{ padding: 16 }}>{employee.position}</td>
                    <td style={{ padding: 16 }}>{employee.department}</td>
                    <td style={{ padding: 16 }}>{getClientName(employee.clientId)}</td>
                    <td style={{ padding: 16 }}>{employee.corporateEmail || "-"}</td>
                    <td style={{ padding: 16 }}>
                      {activeTab === "active" 
                        ? formatDisplayDate(employee.dateHired)
                        : formatDisplayDate(employee.dateResigned || employee.dateHired)
                      }
                    </td>
                    {activeTab === "resigned" && (
                      <td style={{ padding: 16 }}>
                        {employee.resignationReason || "-"}
                      </td>
                    )}
                    {activeTab === "resigned" && (
                      <td style={{ padding: 16, textAlign: "center" }}>
                        <button
                          onClick={() => handleUndoResignation(employee.id)}
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #059669",
                            borderRadius: 4,
                            background: "white",
                            color: "#059669",
                            fontSize: 12,
                            cursor: "pointer",
                            fontFamily: 'inherit',
                          }}
                        >
                          Undo Resignation
                        </button>
                      </td>
                    )}
                    {activeTab === "active" && (
                      <td style={{ padding: 16, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                          <button
                            onClick={() => {
                              setForm(employee);
                              setShowForm(true);
                            }}
                            style={{
                              padding: "4px 8px",
                              border: "1px solid #d1d5db",
                              borderRadius: 4,
                              background: "white",
                              color: "#374151",
                              fontSize: 12,
                              cursor: "pointer",
                              fontFamily: 'inherit',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleResignEmployee(employee.id)}
                            style={{
                              padding: "4px 8px",
                              border: "1px solid #dc2626",
                              borderRadius: 4,
                              background: "white",
                              color: "#dc2626",
                              fontSize: 12,
                              cursor: "pointer",
                              fontFamily: 'inherit',
                            }}
                          >
                            Resign
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {allEmployees.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            background: "#fff",
            borderTop: "1px solid #e5e7eb",
            margin: "0 24px",
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            marginTop: -1, // To merge with table border
          }}
        >
          {/* Left side - Results info and items per page */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "14px", color: "#6b7280" }}>
              Showing {startIndex + 1}-{Math.min(endIndex, allEmployees.length)} of {allEmployees.length} {activeTab} employees
            </span>
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Show:</span>
              <select
                value={employeesPerPage}
                onChange={(e) => setEmployeesPerPage(Number(e.target.value))}
                style={{
                  padding: "6px 8px",
                  border: "1px solid #e0e7ef",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontFamily: 'inherit',
                  outline: "none",
                  background: "#fff",
                  color: "#445F6D",
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          {/* Right side - Pagination controls */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e0e7ef",
                  background: currentPage === 1 ? "#f5f7fa" : "#fff",
                  color: currentPage === 1 ? "#9ca3af" : "#445F6D",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: 'inherit',
                }}
              >
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polyline points="11,17 6,12 11,7" />
                  <polyline points="18,17 13,12 18,7" />
                </svg>
                First
              </button>

              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e0e7ef",
                  background: currentPage === 1 ? "#f5f7fa" : "#fff",
                  color: currentPage === 1 ? "#9ca3af" : "#445F6D",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: 'inherit',
                }}
              >
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polyline points="15,18 9,12 15,6" />
                </svg>
                Previous
              </button>

              {/* Page Numbers */}
              {(() => {
                const pageNumbers = [];
                const maxVisiblePages = 5;
                let startPage = Math.max(
                  1,
                  currentPage - Math.floor(maxVisiblePages / 2)
                );
                let endPage = Math.min(
                  totalPages,
                  startPage + maxVisiblePages - 1
                );

                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }

                for (let i = startPage; i <= endPage; i++) {
                  pageNumbers.push(
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #e0e7ef",
                        background: i === currentPage ? "#2563eb" : "#fff",
                        color: i === currentPage ? "#fff" : "#445F6D",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        minWidth: "40px",
                        fontFamily: 'inherit',
                      }}
                    >
                      {i}
                    </button>
                  );
                }

                return pageNumbers;
              })()}

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e0e7ef",
                  background: currentPage === totalPages ? "#f5f7fa" : "#fff",
                  color: currentPage === totalPages ? "#9ca3af" : "#445F6D",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: 'inherit',
                }}
              >
                Next
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polyline points="9,18 15,12 9,6" />
                </svg>
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e0e7ef",
                  background: currentPage === totalPages ? "#f5f7fa" : "#fff",
                  color: currentPage === totalPages ? "#9ca3af" : "#445F6D",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: 'inherit',
                }}
              >
                Last
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polyline points="13,17 18,12 13,7" />
                  <polyline points="6,17 11,12 6,7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer spacing */}
      <div style={{ height: 24, flexShrink: 0 }} />

      {/* Modals */}
      {showForm && (
        <EmployeeFormModal
          data={form}
          onChange={handleFormChange}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          isValid={isFormValid()}
          clients={clients}
        />
      )}

      {/* Only show bulk resign modal for active employees */}
      {activeTab === "active" && (
        <BulkResignModal
          isOpen={showBulkResignModal}
          onConfirm={handleBulkResign}
          onCancel={() => setShowBulkResignModal(false)}
          selectedCount={selectedIds.length}
          reason={bulkResignReason}
          setReason={setBulkResignReason}
        />
      )}

      {/* Individual Resign Confirmation */}
      <ConfirmationModal
        isOpen={showResignConfirm}
        onConfirm={confirmResignEmployee}
        onCancel={() => {
          setShowResignConfirm(false);
          setEmployeeToResign(null);
        }}
        title="Confirm Resignation"
        message={
          employeeToResign?.employee 
            ? `Are you sure you want to resign ${employeeToResign.employee.fullName}?`
            : "Are you sure you want to resign this employee?"
        }
        confirmText="Resign"
        confirmColor="#dc2626"
      />

      {/* Undo Resignation Confirmation */}
      <ConfirmationModal
        isOpen={showUndoConfirm}
        onConfirm={confirmUndoResignation}
        onCancel={() => {
          setShowUndoConfirm(false);
          setEmployeeToUndo(null);
        }}
        title="Restore Employee"
        message={
          employeeToUndo?.employee 
            ? `Are you sure you want to restore ${employeeToUndo.employee.fullName} to active status?`
            : "Are you sure you want to restore this employee to active status?"
        }
        confirmText="Restore"
        confirmColor="#059669"
      />

      {/* Employee Assets Modal */}
      <EmployeeAssetsModal
        isOpen={assetsModal.isOpen}
        onClose={() => setAssetsModal({ isOpen: false, employee: null })}
        employee={assetsModal.employee}
        devices={devices}
      />

      {isLoading && <LoadingSpinner />}
    </div>
  );
}
