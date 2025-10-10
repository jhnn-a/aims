import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getAllEmployees } from "../services/employeeService";
import { getAllDevices } from "../services/deviceService";
import * as XLSX from "xlsx";
import {
  addClient,
  getAllClients,
  updateClient,
  deleteClient,
} from "../services/clientService";
import { useSnackbar } from "../components/Snackbar";
import { TableLoadingSpinner } from "../components/LoadingSpinner";
import { useTheme } from "../context/ThemeContext";
import { useCurrentUser } from "../CurrentUserContext"; // Current user context
import { createUserLog, ACTION_TYPES } from "../services/userLogService"; // User logging service

// Defensive wrapper for createUserLog to prevent undefined actionType errors
const safeCreateUserLog = async (userId, userName, userEmail, actionType, description, affectedData = {}) => {
  try {
    // Debug: Log ACTION_TYPES object to check if it's properly imported (only log once per component)
    if (!window.CLIENTS_ACTION_TYPES_LOGGED) {
      console.log("Clients.js - ACTION_TYPES object:", ACTION_TYPES);
      window.CLIENTS_ACTION_TYPES_LOGGED = true;
    }
    
    // Validate all required parameters
    if (!actionType || actionType === undefined || actionType === null) {
      console.error("CRITICAL ERROR: actionType is invalid in Clients.js safeCreateUserLog", {
        actionType,
        typeOfActionType: typeof actionType,
        userId,
        userName,
        userEmail,
        description,
        affectedData,
        stack: new Error().stack
      });
      
      // Try to determine which action type should be used based on description
      let fallbackActionType = ACTION_TYPES.SYSTEM_ERROR;
      if (description && description.toLowerCase().includes('delete')) {
        fallbackActionType = ACTION_TYPES.CLIENT_DELETE;
      } else if (description && description.toLowerCase().includes('export')) {
        fallbackActionType = ACTION_TYPES.CLIENT_EXPORT;
      } else if (description && description.toLowerCase().includes('update')) {
        fallbackActionType = ACTION_TYPES.CLIENT_UPDATE;
      } else if (description && (description.toLowerCase().includes('add') || description.toLowerCase().includes('create'))) {
        fallbackActionType = ACTION_TYPES.CLIENT_CREATE;
      }
      
      console.warn(`Using fallback actionType: ${fallbackActionType}`);
      actionType = fallbackActionType;
    }
    
    // Ensure all parameters are valid
    const safeUserId = userId || "system";
    const safeUserName = userName || "System User";
    const safeUserEmail = userEmail || "system@aims.local";
    const safeDescription = description || "No description provided";
    const safeAffectedData = affectedData || {};
    
    console.log("Clients.js - Calling createUserLog with validated parameters:", {
      userId: safeUserId,
      userName: safeUserName,
      userEmail: safeUserEmail,
      actionType,
      description: safeDescription
    });
    
    return await createUserLog(safeUserId, safeUserName, safeUserEmail, actionType, safeDescription, safeAffectedData);
  } catch (error) {
    console.error("Error in Clients.js safeCreateUserLog:", error);
    console.error("Full error details:", {
      error: error.message,
      stack: error.stack,
      userId,
      userName,
      userEmail,
      actionType,
      description,
      affectedData
    });
    
    // Don't re-throw the error to prevent breaking the main functionality
    console.warn("User logging failed in Clients.js, but continuing with main operation");
    return null;
  }
};

function ClientFormModal({
  data,
  onChange,
  onSave,
  onCancel,
  showError,
  isSaving,
}) {
  const { isDarkMode } = useTheme();

  const styles = {
    modalOverlay: {
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
    },
    modalContent: {
      background: isDarkMode ? "#1f2937" : "#fff",
      padding: 20,
      borderRadius: 12,
      minWidth: 480,
      maxWidth: 520,
      width: "70vw",
      boxShadow: isDarkMode
        ? "0 6px 24px rgba(0,0,0,0.3)"
        : "0 6px 24px rgba(34,46,58,0.13)",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      position: "relative",
      border: isDarkMode ? "1.5px solid #4b5563" : "1.5px solid #e5e7eb",
      transition: "box-shadow 0.2s",
      maxHeight: "85vh",
      overflowY: "auto",
      fontFamily:
        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 700,
      color: "#2563eb",
      marginBottom: 14,
      letterSpacing: 0.5,
      textAlign: "center",
      width: "100%",
      fontFamily:
        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      marginBottom: 16,
      width: "100%",
    },
    label: {
      alignSelf: "flex-start",
      fontWeight: 500,
      color: isDarkMode ? "#f3f4f6" : "#222e3a",
      marginBottom: 6,
      fontSize: 13,
      fontFamily:
        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    input: {
      width: "100%",
      fontSize: 13,
      padding: "8px 12px",
      borderRadius: 5,
      border: isDarkMode ? "1.2px solid #4b5563" : "1.2px solid #cbd5e1",
      background: isDarkMode ? "#374151" : "#f1f5f9",
      color: isDarkMode ? "#f3f4f6" : "#222e3a",
      height: "38px",
      boxSizing: "border-box",
      fontFamily:
        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      outline: "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
    },
    button: {
      background: "#2563eb",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "10px 20px",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      transition: "background 0.2s, box-shadow 0.2s",
      outline: "none",
      fontFamily:
        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    cancelButton: {
      background: "#64748b",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "10px 20px",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      transition: "background 0.2s, box-shadow 0.2s",
      outline: "none",
      fontFamily:
        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    error: {
      color: "#e11d48",
      fontSize: 12,
      marginTop: 4,
      fontWeight: 500,
    },
    required: {
      color: "#e11d48",
    },
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <style>{`
          .client-modal input:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }
          
          .client-modal input:hover {
            border-color: #64748b;
          }
        `}</style>

        <h3 style={styles.modalTitle}>
          {data.id ? "Edit Client Details" : "Add New Client"}
        </h3>

        <div className="client-modal" style={{ width: "100%" }}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Client Name <span style={styles.required}>*</span>
            </label>
            <input
              style={styles.input}
              name="clientName"
              value={data.clientName}
              onChange={onChange}
              placeholder="Enter client name (e.g. ABC Holdings, Inc.)"
              disabled={isSaving}
            />
            {showError && (
              <div style={styles.error}>* Client Name is required</div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "center",
            gap: 12,
            width: "100%",
          }}
        >
          <button
            style={{
              ...styles.button,
              opacity: isSaving ? 0.6 : 1,
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            style={styles.cancelButton}
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({ onConfirm, onCancel, isDeleting }) {
  const styles = {
    modalOverlay: {
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
    },
    modalContent: {
      background: "#fff",
      padding: 24,
      borderRadius: 12,
      minWidth: 400,
      maxWidth: 500,
      boxShadow: "0 6px 24px rgba(34,46,58,0.13)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      border: "1.5px solid #e5e7eb",
      fontFamily:
        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    title: {
      fontSize: 18,
      fontWeight: 700,
      color: "#dc2626",
      marginBottom: 16,
      textAlign: "center",
    },
    description: {
      fontSize: 14,
      color: "#374151",
      marginBottom: 12,
      textAlign: "center",
      lineHeight: 1.5,
    },
    warning: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 20,
      textAlign: "center",
      fontStyle: "italic",
    },
    buttonContainer: {
      display: "flex",
      gap: 12,
      justifyContent: "center",
    },
    deleteButton: {
      background: "#dc2626",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "10px 20px",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      transition: "background 0.2s",
    },
    cancelButton: {
      background: "#64748b",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "10px 20px",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      transition: "background 0.2s",
    },
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h2 style={styles.title}>Confirm Deletion</h2>
        <div style={styles.description}>
          Are you sure you want to permanently delete this client?
        </div>
        <div style={styles.warning}>
          This action will be reversible for 5 seconds using the undo
          notification.
        </div>
        <div style={styles.buttonContainer}>
          <button
            style={{
              ...styles.deleteButton,
              opacity: isDeleting ? 0.6 : 1,
              cursor: isDeleting ? "not-allowed" : "pointer",
            }}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <button
            style={styles.cancelButton}
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkDeleteConfirmationModal({
  count,
  onConfirm,
  onCancel,
  isDeleting,
}) {
  const styles = {
    modalOverlay: {
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
    },
    modalContent: {
      background: "#fff",
      padding: 24,
      borderRadius: 12,
      minWidth: 400,
      maxWidth: 500,
      boxShadow: "0 6px 24px rgba(34,46,58,0.13)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      border: "1.5px solid #e5e7eb",
      fontFamily:
        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    title: {
      fontSize: 18,
      fontWeight: 700,
      color: "#dc2626",
      marginBottom: 16,
      textAlign: "center",
    },
    description: {
      fontSize: 14,
      color: "#374151",
      marginBottom: 12,
      textAlign: "center",
      lineHeight: 1.5,
    },
    warning: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 20,
      textAlign: "center",
      fontStyle: "italic",
    },
    buttonContainer: {
      display: "flex",
      gap: 12,
      justifyContent: "center",
    },
    deleteButton: {
      background: "#dc2626",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "10px 20px",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      transition: "background 0.2s",
    },
    cancelButton: {
      background: "#64748b",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "10px 20px",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      transition: "background 0.2s",
    },
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h2 style={styles.title}>Confirm Deletion</h2>
        <div style={styles.description}>
          Are you sure you want to delete the selected {count} client
          {count > 1 ? "s" : ""}?
        </div>
        <div style={styles.warning}>This action cannot be undone.</div>
        <div style={styles.buttonContainer}>
          <button
            style={{
              ...styles.deleteButton,
              opacity: isDeleting ? 0.6 : 1,
              cursor: isDeleting ? "not-allowed" : "pointer",
            }}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <button
            style={styles.cancelButton}
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function EmployeesModal({ open, onClose, employees, clientId }) {
  const { isDarkMode } = useTheme();
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  if (!open) return null;

  const styles = {
    modalOverlay: {
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
    },
    modalContent: {
      background: isDarkMode ? "#1f2937" : "#fff",
      padding: 20,
      borderRadius: 12,
      minWidth: 500,
      maxWidth: 600,
      width: "80vw",
      boxShadow: isDarkMode
        ? "0 6px 24px rgba(0,0,0,0.3)"
        : "0 6px 24px rgba(34,46,58,0.13)",
      display: "flex",
      flexDirection: "column",
      border: isDarkMode ? "1.5px solid #4b5563" : "1.5px solid #e5e7eb",
      maxHeight: "80vh",
      fontFamily:
        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    title: {
      fontSize: 18,
      fontWeight: 700,
      color: "#2563eb",
      marginBottom: 16,
      textAlign: "center",
    },
    listContainer: {
      width: "100%",
      maxHeight: 400,
      overflowY: "auto",
      margin: "16px 0",
      border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
      borderRadius: 6,
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      background: isDarkMode ? "#1f2937" : "#fff",
      fontSize: 14,
    },
    tableHeader: {
      background: isDarkMode ? "#4b5563" : "#f9fafb",
      borderBottom: isDarkMode ? "1px solid #6b7280" : "1px solid #d1d5db",
      position: "sticky",
      top: "0",
      zIndex: 10,
    },
    th: {
      padding: "12px 16px",
      fontSize: 12,
      fontWeight: 600,
      color: isDarkMode ? "#f3f4f6" : "#374151",
      textAlign: "left",
      borderRight: isDarkMode ? "1px solid #6b7280" : "1px solid #d1d5db",
      position: "sticky",
      top: "0",
      background: isDarkMode ? "#4b5563" : "#f9fafb",
      zIndex: 10,
    },
    td: {
      padding: "12px 16px",
      fontSize: 14,
      color: isDarkMode ? "#f3f4f6" : "#374151",
      borderRight: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
      borderBottom: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
    },
    emptyState: {
      color: isDarkMode ? "#9ca3af" : "#6b7280",
      textAlign: "center",
      padding: "40px 20px",
      fontSize: 14,
    },
    button: {
      background: isButtonHovered
        ? isDarkMode
          ? "#475569"
          : "#475569"
        : isDarkMode
        ? "#64748b"
        : "#64748b",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "10px 20px",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      transition: "all 0.2s ease",
      alignSelf: "center",
      marginTop: 16,
      transform: isButtonHovered ? "translateY(-1px)" : "translateY(0)",
      boxShadow: isButtonHovered
        ? isDarkMode
          ? "0 4px 12px rgba(0, 0, 0, 0.3)"
          : "0 4px 12px rgba(0, 0, 0, 0.15)"
        : "none",
    },
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h3 style={styles.title}>
          Employees for {typeof clientId === "string" ? clientId : ""}
        </h3>
        <div style={styles.listContainer}>
          {employees.length === 0 ? (
            <div style={styles.emptyState}>No employees found.</div>
          ) : (
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={{ ...styles.th, borderRight: "none" }}>
                    Employee ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, index) => (
                  <tr
                    key={emp.id}
                    style={{
                      background:
                        index % 2 === 0
                          ? isDarkMode
                            ? "#1f2937"
                            : "#ffffff"
                          : isDarkMode
                          ? "#374151"
                          : "#f9fafb",
                    }}
                  >
                    <td style={styles.td}>
                      {emp.fullName ||
                        `${emp.firstName || ""} ${emp.lastName || ""}`}
                    </td>
                    <td style={{ ...styles.td, borderRight: "none" }}>
                      {emp.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <button
          style={styles.button}
          onClick={onClose}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function Clients() {
  // Debug: Check if ACTION_TYPES is properly imported in Clients component
  console.log("Clients component loaded. ACTION_TYPES:", ACTION_TYPES);
  
  const { showSuccess, showError, showUndoNotification } = useSnackbar();
  const { isDarkMode } = useTheme();
  const currentUser = useCurrentUser(); // Get current user for logging

  const [clients, setClients] = useState([]);
  const [devices, setDevices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [employeesCLI1, setEmployeesCLI1] = useState([]);
  const [employeesModalClientId, setEmployeesModalClientId] =
    useState("CLI0001");
  const [form, setForm] = useState({ id: null, clientName: "" });
  const [search, setSearch] = useState("");
  const [checkedRows, setCheckedRows] = useState([]);
  const [actionMenu, setActionMenu] = useState({
    open: false,
    idx: null,
    anchor: null,
  });
  const actionMenuRef = useRef();
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [showErrorMsg, setShowErrorMsg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (client) => {
    setForm({ id: client.id, clientName: client.clientName });
    setShowForm(true);
  };

  const handleDelete = (client) => {
    setClientToDelete(client);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = useCallback(async () => {
    if (!clientToDelete) return;

    setIsDeleting(true);
    try {
      await deleteClient(clientToDelete.id);

      // Log to User Logs
      await safeCreateUserLog(
        currentUser?.uid,
        currentUser?.username || currentUser?.email,
        currentUser?.email,
        ACTION_TYPES.CLIENT_DELETE,
        `Deleted client ${clientToDelete.clientName}`,
        {
          clientId: clientToDelete.id,
          clientName: clientToDelete.clientName,
        }
      );

      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      setShowDeleteDialog(false);
      setClientToDelete(null);
      showSuccess("Client deleted successfully");
    } catch (error) {
      showError("Failed to delete client. Please try again.");
    }
    setIsDeleting(false);
  }, [clientToDelete, showSuccess, showError, currentUser]);

  const handleShowEmployees = async (clientId = "CLI0001") => {
    setEmployeesModalClientId(clientId);
    const allEmployees = await getAllEmployees();
    const filtered = allEmployees.filter(
      (e) =>
        (e.clientId && e.clientId === clientId) ||
        (e.clientID && e.clientID === clientId)
    );
    setEmployeesCLI1(filtered);
    setShowEmployeesModal(true);
  };

  useEffect(() => {
    fetchClients();
  }, []);
  const fetchClients = useCallback(async () => {
    setLoading(true);
    const [clientData, deviceData, employeeData] = await Promise.all([
      getAllClients(),
      getAllDevices(),
      getAllEmployees(),
    ]);
    setClients(clientData);
    setDevices(deviceData);
    setEmployees(employeeData);
    setLoading(false);
  }, []);

  // Calculate owned assets count for a client
  const getOwnedAssetsCount = useCallback(
    (clientName) => {
      if (!devices || !clientName) return 0;
      // Count only devices where client field explicitly matches the client name (case-insensitive)
      const normalizedClientName = clientName.trim().toLowerCase();

      const matchedDevices = devices.filter((device) => {
        // Only count devices with explicit client field set
        if (!device.client || device.client.trim() === "") return false;
        return device.client.trim().toLowerCase() === normalizedClientName;
      });

      // Debug logging for Joii Philippines
      if (normalizedClientName === "joii philippines") {
        console.log(
          "=== Joii Philippines Asset Count Debug (Explicit Only) ==="
        );
        console.log("Total devices:", devices.length);
        console.log(
          "Devices with explicit client='Joii Philippines':",
          matchedDevices.length
        );
        console.log(
          "Devices with no client field:",
          devices.filter((d) => !d.client || d.client.trim() === "").length
        );
      }

      return matchedDevices.length;
    },
    [devices, employees, clients]
  );

  // Export clients to Excel using SheetJS
  const handleExportClients = useCallback(() => {
    try {
      if (!clients || clients.length === 0) {
        showError("No clients to export");
        return;
      }

      // Map clients to rows with required fields
      const rows = clients.map((c) => ({
        "Client ID": c.id || "",
        "Client Name": c.clientName || "",
        Employees: c.employeeCount != null ? c.employeeCount : "",
        "Owned Assets": getOwnedAssetsCount(c.clientName),
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clients");

      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `clients_export_${ts}.xlsx`;
      XLSX.writeFile(wb, filename);

      // Log to User Logs
      safeCreateUserLog(
        currentUser?.uid,
        currentUser?.username || currentUser?.email,
        currentUser?.email,
        ACTION_TYPES.CLIENT_EXPORT,
        `Exported ${clients.length} client(s) to Excel`,
        {
          clientCount: clients.length,
        }
      );

      showSuccess("Clients exported successfully");
    } catch (err) {
      console.error(err);
      showError("Failed to export clients");
    }
  }, [clients, showError, showSuccess, currentUser]);

  const handleInputChange = useCallback(
    ({ target: { name, value } }) => {
      setForm((prev) => ({ ...prev, [name]: value }));
      if (showErrorMsg) setShowErrorMsg(false);
    },
    [showErrorMsg]
  );

  const isFormValid = useCallback(
    () => form.clientName.trim().length > 0,
    [form.clientName]
  );

  const handleSave = useCallback(async () => {
    if (!isFormValid()) {
      setShowErrorMsg(true);
      return;
    }
    setShowErrorMsg(false);
    setIsSaving(true);

    try {
      const payload = { clientName: form.clientName.trim() };

      if (form.id) {
        await updateClient(form.id, payload);

        // Log to User Logs
        await safeCreateUserLog(
          currentUser?.uid,
          currentUser?.username || currentUser?.email,
          currentUser?.email,
          ACTION_TYPES.CLIENT_UPDATE,
          `Updated client ${payload.clientName}`,
          {
            clientId: form.id,
            clientName: payload.clientName,
          }
        );

        showSuccess("Client updated successfully");
      } else {
        await addClient(payload);

        // Log to User Logs
        await safeCreateUserLog(
          currentUser?.uid,
          currentUser?.username || currentUser?.email,
          currentUser?.email,
          ACTION_TYPES.CLIENT_CREATE,
          `Added new client ${payload.clientName}`,
          {
            clientName: payload.clientName,
          }
        );

        showSuccess("Client added successfully");
      }

      handleResetForm();
      fetchClients();
    } catch (error) {
      showError("Failed to save client. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [form, isFormValid, fetchClients, showSuccess, showError]);

  const handleConfirmBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      // Delete all selected clients
      await Promise.all(checkedRows.map((id) => deleteClient(id)));
      setClients((prev) => prev.filter((c) => !checkedRows.includes(c.id)));
      setCheckedRows([]);
      setShowBulkDelete(false);
      showSuccess("Selected clients deleted successfully");
    } catch (error) {
      showError("Failed to delete selected clients. Please try again.");
    }
    setIsBulkDeleting(false);
  }, [checkedRows, showSuccess, showError]);

  const handleResetForm = useCallback(() => {
    setForm({ id: null, clientName: "" });
    setShowForm(false);
    setShowErrorMsg(false);
  }, []);

  const filteredClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          client.clientName.toLowerCase().includes(search.toLowerCase()) ||
          String(client.id).toLowerCase().includes(search.toLowerCase())
      ),
    [clients, search]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredClients.length / rowsPerPage)
  );
  const paginatedClients = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return filteredClients.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredClients, currentPage, rowsPerPage]);

  const startIdx =
    filteredClients.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIdx = Math.min(currentPage * rowsPerPage, filteredClients.length);

  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  useEffect(() => {
    const validIds = new Set(filteredClients.map((client) => client.id));
    setCheckedRows((prev) => prev.filter((id) => validIds.has(id)));
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [filteredClients, currentPage, totalPages]);

  const handleCheckboxChange = useCallback((id) => {
    setCheckedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  }, []);

  const handleCheckAll = useCallback(
    (e) => {
      if (e.target.checked) {
        setCheckedRows(filteredClients.map((client) => client.id));
      } else {
        setCheckedRows([]);
      }
    },
    [filteredClients]
  );

  const handleBulkDelete = useCallback(() => {
    setShowBulkDelete(true);
  }, []);

  useEffect(() => {
    if (!actionMenu.open) return;
    function handleClick(e) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setActionMenu({ open: false, idx: null, anchor: null });
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [actionMenu.open]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: isDarkMode ? "#111827" : "transparent",
        fontFamily:
          "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        /* Responsive layout styles */
        .clients-header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .clients-header-title {
          flex-shrink: 0;
        }
        
        .clients-header-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          min-width: 0;
        }
        
        /* Responsive search bar styles */
        .clients-search-container {
          /* Small screens (mobile) - max 200px */
          max-width: 200px;
          min-width: 150px;
        }
        
        @media (min-width: 768px) {
          /* Medium screens (tablets) - max 250px */
          .clients-search-container {
            max-width: 250px;
            min-width: 180px;
          }
        }
        
        @media (min-width: 1024px) {
          /* Large screens (laptops) - max 300px */
          .clients-search-container {
            max-width: 300px;
            min-width: 200px;
          }
        }
        
        @media (min-width: 1280px) {
          /* Extra large screens (desktops) - max 400px */
          .clients-search-container {
            max-width: 400px;
            min-width: 250px;
          }
        }
        
        @media (min-width: 1536px) {
          /* Extra extra large screens (large monitors) - max 500px */
          .clients-search-container {
            max-width: 500px;
            min-width: 300px;
          }
        }
        
        /* Responsive button text */
        @media (max-width: 767px) {
          .clients-add-btn-text {
            display: none;
          }
          .clients-delete-btn-text {
            display: none;
          }
        }
        
        /* Dark mode search input placeholder */
        .search-input-dark::placeholder {
          color: #9ca3af;
          opacity: 1;
        }

        /* Custom scrollbar with transparent background */
        .clients-main-scroll::-webkit-scrollbar {
          width: 10px;
        }

        .clients-main-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .clients-main-scroll::-webkit-scrollbar-thumb {
          background: ${
            isDarkMode ? "rgba(156, 163, 175, 0.3)" : "rgba(209, 213, 219, 0.5)"
          };
          border-radius: 5px;
        }

        .clients-main-scroll::-webkit-scrollbar-thumb:hover {
          background: ${
            isDarkMode ? "rgba(156, 163, 175, 0.5)" : "rgba(209, 213, 219, 0.8)"
          };
        }

        /* Firefox scrollbar */
        .clients-main-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${
            isDarkMode ? "rgba(156, 163, 175, 0.3)" : "rgba(209, 213, 219, 0.5)"
          } transparent;
        }
      `}</style>

      {/* Header Section with Search and Actions */}
      <div
        style={{
          padding: "20px 16px 16px 16px",
          background: "transparent",
        }}
      >
        <div className="clients-header-container">
          <h1
            className="clients-header-title"
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: isDarkMode ? "#ffffff" : "#222e3a",
              margin: 0,
              fontFamily:
                "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              letterSpacing: "1px",
            }}
          >
            CLIENTS MANAGEMENT
          </h1>

          {/* Search and Actions Controls */}
          <div className="clients-header-controls">
            {/* Search Bar */}
            <div
              className="clients-search-container"
              style={{
                display: "flex",
                alignItems: "center",
                background: isDarkMode ? "#374151" : "#f9fafb",
                borderRadius: "6px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                padding: "10px 14px",
                flex: "1 1 auto",
              }}
            >
              <svg
                width="18"
                height="18"
                style={{
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                  opacity: 0.8,
                }}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={isDarkMode ? "search-input-dark" : ""}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "14px",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  padding: "0 0 0 10px",
                  width: "100%",
                  fontWeight: 400,
                  colorScheme: isDarkMode ? "dark" : "light",
                }}
              />
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setShowForm(true)}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 16px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "background 0.2s",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  whiteSpace: "nowrap",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span className="clients-add-btn-text">Add Client</span>
              </button>
              <button
                onClick={handleExportClients}
                style={{
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 16px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "background 0.2s",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  whiteSpace: "nowrap",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export Clients</span>
              </button>
              {checkedRows.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "10px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "background 0.2s",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <polyline points="3,6 5,6 21,6" />
                    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
                  </svg>
                  <span className="clients-delete-btn-text">
                    Delete ({checkedRows.length})
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selection Info Bar */}
      {checkedRows.length > 0 && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            flexShrink: 0,
            background: "#f0f9ff",
            border: "1px solid #0ea5e9",
            borderLeft: "none",
            borderRight: "none",
            padding: "8px 16px",
            fontSize: "14px",
            color: "#0369a1",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span style={{ fontWeight: 600 }}>{checkedRows.length}</span>
          <span>
            {checkedRows.length === 1 ? "client" : "clients"} selected
          </span>
        </div>
      )}

      {/* Main Content Card */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          margin: "0 16px 16px 16px",
          background: isDarkMode ? "#1f2937" : "#fff",
          borderRadius: "8px",
          border: isDarkMode ? "1px solid #4b5563" : "1px solid #e5e7eb",
          boxShadow: isDarkMode
            ? "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)"
            : "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        }}
      >
        {loading && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TableLoadingSpinner />
          </div>
        )}

        {!loading && (
          <div
            className="clients-main-scroll"
            style={{
              flex: 1,
              overflow: "auto",
              background: "transparent",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "900px",
                borderCollapse: "collapse",
                background: isDarkMode ? "#1f2937" : "#fff",
                fontSize: "14px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                tableLayout: "fixed",
              }}
            >
              <thead
                style={{
                  position: "sticky",
                  top: "0",
                  background: isDarkMode ? "#374151" : "#f9fafb",
                  zIndex: 10,
                }}
              >
                <tr style={{ background: isDarkMode ? "#374151" : "#f9fafb" }}>
                  <th
                    style={{
                      width: "4%",
                      padding: "8px 4px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      textAlign: "center",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #d1d5db",
                      position: "sticky",
                      top: 0,
                      background: isDarkMode ? "#374151" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    <input
                      type="checkbox"
                      onChange={handleCheckAll}
                      style={{
                        width: 16,
                        height: 16,
                        margin: 0,
                        colorScheme: isDarkMode ? "dark" : "light",
                      }}
                    />
                  </th>
                  <th
                    style={{
                      width: "6%",
                      padding: "8px 4px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      textAlign: "center",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #d1d5db",
                      position: "sticky",
                      top: 0,
                      background: isDarkMode ? "#374151" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      width: "20%",
                      padding: "8px 6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      textAlign: "center",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #d1d5db",
                      position: "sticky",
                      top: 0,
                      background: isDarkMode ? "#374151" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    CLIENT ID
                  </th>
                  <th
                    style={{
                      width: "35%",
                      padding: "8px 6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      textAlign: "center",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #d1d5db",
                      position: "sticky",
                      top: 0,
                      background: isDarkMode ? "#374151" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    CLIENT NAME
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "8px 6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      textAlign: "center",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #d1d5db",
                      position: "sticky",
                      top: 0,
                      background: isDarkMode ? "#374151" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    EMPLOYEES
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "8px 6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      textAlign: "center",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #d1d5db",
                      position: "sticky",
                      top: 0,
                      background: isDarkMode ? "#374151" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    OWNED ASSETS
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "8px 4px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      textAlign: "center",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #d1d5db",
                      position: "sticky",
                      top: 0,
                      background: isDarkMode ? "#374151" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      style={{
                        padding: "40px 20px",
                        textAlign: "center",
                        color: isDarkMode ? "#9ca3af" : "#9ca3af",
                        fontSize: "14px",
                        fontWeight: "400",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      No clients found.
                    </td>
                  </tr>
                ) : (
                  paginatedClients.map((client, index) => {
                    const isChecked = checkedRows.includes(client.id);
                    return (
                      <tr
                        key={client.id || index}
                        style={{
                          borderBottom: isDarkMode
                            ? "1px solid #4b5563"
                            : "1px solid #d1d5db",
                          background: isDarkMode
                            ? index % 2 === 0
                              ? "#374151"
                              : "#1f2937"
                            : index % 2 === 0
                            ? "rgb(250, 250, 252)"
                            : "rgb(240, 240, 243)",
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (isDarkMode) {
                            e.currentTarget.style.background =
                              index % 2 === 0 ? "#4b5563" : "#374151";
                          } else {
                            if (index % 2 === 0) {
                              e.currentTarget.style.background =
                                "rgb(235, 235, 240)";
                            } else {
                              e.currentTarget.style.background =
                                "rgb(225, 225, 235)";
                            }
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isDarkMode) {
                            e.currentTarget.style.background =
                              index % 2 === 0 ? "#374151" : "#1f2937";
                          } else {
                            e.currentTarget.style.background =
                              index % 2 === 0
                                ? "rgb(250, 250, 252)"
                                : "rgb(240, 240, 243)";
                          }
                        }}
                      >
                        <td
                          style={{
                            width: "4%",
                            padding: "8px 4px",
                            textAlign: "center",
                            border: isDarkMode
                              ? "1px solid #4b5563"
                              : "1px solid #d1d5db",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(client.id)}
                            style={{
                              width: 16,
                              height: 16,
                              margin: 0,
                              colorScheme: isDarkMode ? "dark" : "light",
                            }}
                          />
                        </td>
                        <td
                          style={{
                            width: "6%",
                            padding: "8px 4px",
                            fontSize: "14px",
                            color: isDarkMode ? "#f3f4f6" : "rgb(55, 65, 81)",
                            border: isDarkMode
                              ? "1px solid #4b5563"
                              : "1px solid #d1d5db",
                            textAlign: "center",
                          }}
                        >
                          {(currentPage - 1) * rowsPerPage + index + 1}
                        </td>
                        <td
                          style={{
                            width: "20%",
                            padding: "8px 6px",
                            fontSize: "14px",
                            color: isDarkMode ? "#f3f4f6" : "#374151",
                            border: isDarkMode
                              ? "1px solid #4b5563"
                              : "1px solid #d1d5db",
                            textAlign: "center",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleShowEmployees(client.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#2563eb",
                              cursor: "pointer",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "14px",
                              fontWeight: "500",
                              transition: "all 0.2s",
                              textDecoration: "none",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = isDarkMode
                                ? "#1e3a8a"
                                : "#dbeafe";
                              e.target.style.color = isDarkMode
                                ? "#93c5fd"
                                : "#1d4ed8";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = "none";
                              e.target.style.color = "#2563eb";
                            }}
                            title={`Show employees for ${client.id}`}
                          >
                            {client.id}
                          </button>
                        </td>
                        <td
                          style={{
                            width: "35%",
                            padding: "8px 6px",
                            fontSize: "14px",
                            color: isDarkMode ? "#f3f4f6" : "#374151",
                            border: isDarkMode
                              ? "1px solid #4b5563"
                              : "1px solid #d1d5db",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {client.clientName}
                        </td>
                        <td
                          style={{
                            width: "15%",
                            padding: "8px 6px",
                            fontSize: "14px",
                            color: isDarkMode ? "#f3f4f6" : "#374151",
                            border: isDarkMode
                              ? "1px solid #4b5563"
                              : "1px solid #d1d5db",
                            textAlign: "center",
                          }}
                        >
                          {client.employeeCount ?? 0}
                        </td>
                        <td
                          style={{
                            width: "15%",
                            padding: "8px 6px",
                            fontSize: "14px",
                            color: isDarkMode ? "#f3f4f6" : "#374151",
                            border: isDarkMode
                              ? "1px solid #4b5563"
                              : "1px solid #d1d5db",
                            textAlign: "center",
                          }}
                        >
                          {getOwnedAssetsCount(client.clientName)}
                        </td>
                        <td
                          style={{
                            width: "15%",
                            padding: "8px 4px",
                            textAlign: "center",
                            border: isDarkMode
                              ? "1px solid #4b5563"
                              : "1px solid #d1d5db",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                            }}
                          >
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleEdit(client)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "6px",
                                borderRadius: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "background 0.2s",
                                color: "#059669",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = "#d1fae5";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = "none";
                              }}
                              title="Edit client"
                            >
                              <svg
                                width="16"
                                height="16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                viewBox="0 0 24 24"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDelete(client)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "6px",
                                borderRadius: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "background 0.2s",
                                color: "#dc2626",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = "#fee2e2";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = "none";
                              }}
                              title="Delete client"
                            >
                              <svg
                                width="16"
                                height="16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                viewBox="0 0 24 24"
                              >
                                <polyline points="3,6 5,6 21,6" />
                                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            background: isDarkMode ? "#374151" : "#f9fafb",
            borderTop: isDarkMode ? "1px solid #4b5563" : "1px solid #e5e7eb",
            borderRadius: "0 0 8px 8px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            fontSize: "14px",
            zIndex: 5,
          }}
        >
          {/* Pagination Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              style={{
                padding: "6px 12px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                background:
                  currentPage === 1
                    ? isDarkMode
                      ? "#374151"
                      : "#f9fafb"
                    : isDarkMode
                    ? "#1f2937"
                    : "#fff",
                color:
                  currentPage === 1
                    ? isDarkMode
                      ? "#6b7280"
                      : "#9ca3af"
                    : isDarkMode
                    ? "#f3f4f6"
                    : "#374151",
                borderRadius: "6px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "14px",
                transition: "all 0.2s",
              }}
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: "6px 12px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                background:
                  currentPage === 1
                    ? isDarkMode
                      ? "#374151"
                      : "#f9fafb"
                    : isDarkMode
                    ? "#1f2937"
                    : "#fff",
                color:
                  currentPage === 1
                    ? isDarkMode
                      ? "#6b7280"
                      : "#9ca3af"
                    : isDarkMode
                    ? "#f3f4f6"
                    : "#374151",
                borderRadius: "6px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "14px",
                transition: "all 0.2s",
              }}
            >
              Previous
            </button>

            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                disabled={page === currentPage}
                style={{
                  padding: "6px 12px",
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #d1d5db",
                  background:
                    page === currentPage
                      ? "#2563eb"
                      : isDarkMode
                      ? "#1f2937"
                      : "#fff",
                  color:
                    page === currentPage
                      ? "#fff"
                      : isDarkMode
                      ? "#f3f4f6"
                      : "#374151",
                  borderRadius: "6px",
                  cursor: page === currentPage ? "default" : "pointer",
                  fontSize: "14px",
                  fontWeight: page === currentPage ? "600" : "400",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (page !== currentPage) {
                    e.target.style.background = isDarkMode
                      ? "#374151"
                      : "#f3f4f6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (page !== currentPage) {
                    e.target.style.background = isDarkMode ? "#1f2937" : "#fff";
                  }
                }}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: "6px 12px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                background:
                  currentPage === totalPages
                    ? isDarkMode
                      ? "#374151"
                      : "#f9fafb"
                    : isDarkMode
                    ? "#1f2937"
                    : "#fff",
                color:
                  currentPage === totalPages
                    ? isDarkMode
                      ? "#6b7280"
                      : "#9ca3af"
                    : isDarkMode
                    ? "#f3f4f6"
                    : "#374151",
                borderRadius: "6px",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: "14px",
                transition: "all 0.2s",
              }}
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              style={{
                padding: "6px 12px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                background:
                  currentPage === totalPages
                    ? isDarkMode
                      ? "#374151"
                      : "#f9fafb"
                    : isDarkMode
                    ? "#1f2937"
                    : "#fff",
                color:
                  currentPage === totalPages
                    ? isDarkMode
                      ? "#6b7280"
                      : "#9ca3af"
                    : isDarkMode
                    ? "#f3f4f6"
                    : "#374151",
                borderRadius: "6px",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: "14px",
                transition: "all 0.2s",
              }}
            >
              Last
            </button>
          </div>

          {/* Info and Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span
              style={{
                color: isDarkMode ? "#9ca3af" : "#6b7280",
                fontSize: "14px",
              }}
            >
              Showing {startIdx} - {endIdx} of {filteredClients.length} clients
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                  fontSize: "14px",
                }}
              >
                Show:
              </span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: "4px 8px",
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #d1d5db",
                  borderRadius: "4px",
                  background: isDarkMode ? "#374151" : "#fff",
                  fontSize: "14px",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  cursor: "pointer",
                  colorScheme: isDarkMode ? "dark" : "light",
                }}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EmployeesModal
        open={showEmployeesModal}
        onClose={() => setShowEmployeesModal(false)}
        employees={employeesCLI1}
        clientId={employeesModalClientId}
      />
      {showForm && (
        <ClientFormModal
          data={form}
          onChange={handleInputChange}
          onSave={handleSave}
          onCancel={handleResetForm}
          showError={showErrorMsg}
          isSaving={isSaving}
        />
      )}
      {showBulkDelete && (
        <BulkDeleteConfirmationModal
          count={checkedRows.length}
          onConfirm={handleConfirmBulkDelete}
          onCancel={() => setShowBulkDelete(false)}
          isDeleting={isBulkDeleting}
        />
      )}
      {showDeleteDialog && (
        <DeleteConfirmationModal
          name={clientToDelete?.clientName}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteDialog(false)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

export default Clients;
