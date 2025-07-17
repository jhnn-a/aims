import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  addClient,
  getAllClients,
  updateClient,
  deleteClient,
} from "../services/clientService";
import { useSnackbar } from "../components/Snackbar";
import LoadingSpinner, {
  TableLoadingSpinner,
} from "../components/LoadingSpinner";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../utils/firebase";

// --- Modal Components ---
const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};
const modalBoxStyle = {
  background: "#fff",
  minWidth: 300,
  padding: 16,
  maxWidth: "90vw",
  borderRadius: 0, // No corner rounding
  boxShadow: "none", // Remove shadow
  fontWeight: "normal", // Ensure normal text
  fontStyle: "normal",
  fontSize: "inherit",
  color: "inherit",
};

// Employee Database modal styles for consistent design
const employeeModalStyles = {
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
    fontFamily: "Maax, sans-serif",
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
    fontFamily: "Maax, sans-serif",
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
    fontFamily: "Maax, sans-serif",
  },
};

const ClientFormModal = ({ data, onChange, onSave, onCancel }) => {
  const [showError, setShowError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!data.clientName.trim()) {
      setShowError(true);
      return;
    }
    setShowError(false);
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalBoxStyle}>
        <div>{data.id ? "Edit Client Details" : "Add New Client"}</div>
        <div>
          <label>
            Client Name: <span>*</span>
          </label>
          <input
            name="clientName"
            value={data.clientName}
            onChange={(e) => {
              onChange(e);
              if (showError) setShowError(false);
            }}
            placeholder="Enter client name (e.g. ABC Holdings, Inc.)"
            disabled={isSaving}
          />
          {showError && <div>* Client Name is required</div>}
        </div>
        <button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </div>
  );
};

const DeleteConfirmationModal = ({ onConfirm, onCancel, isDeleting }) => (
  <div style={employeeModalStyles.modalOverlay}>
    <div style={employeeModalStyles.modalContent}>
      <h2 style={{ color: "#e11d48", marginBottom: 12 }}>Confirm Deletion</h2>
      <p>Are you sure you want to permanently delete this client?</p>
      <p style={{ color: "#666", fontSize: "14px", marginTop: 8 }}>
        This action will be reversible for 5 seconds using the undo notification.
      </p>
      <div style={{ marginTop: 24, textAlign: "right" }}>
        <button 
          onClick={onConfirm} 
          disabled={isDeleting}
          style={employeeModalStyles.deleteBtn}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
        <button 
          onClick={onCancel} 
          disabled={isDeleting}
          style={employeeModalStyles.cancelBtn}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

const Clients = () => {
  const { showSuccess, showError, showWarning, showInfo, showUndoNotification } = useSnackbar();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({ id: null, clientName: "" });
  const [search, setSearch] = useState("");
  const [checkedRows, setCheckedRows] = useState([]);
  const [actionMenu, setActionMenu] = useState({
    open: false,
    idx: null,
    anchor: null,
  });
  const actionMenuRef = useRef();

  // Fetch clients on mount
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const [clientData] = await Promise.all([getAllClients()]);
    setClients(clientData);
    setLoading(false);
  }, []);

  const handleInputChange = useCallback(({ target: { name, value } }) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const isFormValid = useCallback(
    () => form.clientName.trim().length > 0,
    [form.clientName]
  );

  const handleSave = useCallback(async () => {
    if (!isFormValid()) return;
    const payload = { clientName: form.clientName.trim() };
    if (form.id) {
      await updateClient(form.id, payload);
    } else {
      await addClient(payload);
    }
    handleResetForm();
    fetchClients();
  }, [form, isFormValid, fetchClients]);

  const handleEdit = useCallback((client) => {
    setForm(client);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((id) => {
    setSelectedId(id);
    setShowConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedId) return;

    try {
      // Store the client data before deletion for undo
      const clientToDelete = clients.find(c => c.id === selectedId);
      if (!clientToDelete) return;

      const clientBackup = { ...clientToDelete };
      
      // Delete the client
      await deleteClient(selectedId);
      
      // Remove from UI immediately
      setClients(prev => prev.filter(c => c.id !== selectedId));
      
      // Show undo notification
      showUndoNotification(
        `Client "${clientBackup.name}" deleted successfully`,
        async () => {
          // Undo function - restore the client
          try {
            // Restore client with original ID using setDoc
            const { id: originalId, ...clientDataToRestore } = clientBackup;
            await setDoc(doc(db, "clients", originalId), clientDataToRestore);
            
            // Refresh the clients list
            const updatedClients = await getAllClients();
            setClients(updatedClients);
            
            showSuccess(`Client "${clientBackup.name}" restored successfully`);
          } catch (error) {
            console.error("Error restoring client:", error);
            showError("Failed to restore client. Please try again.");
          }
        },
        5000 // 5 seconds to undo
      );
      
      setSelectedId(null);
      setShowConfirm(false);
      
    } catch (error) {
      console.error("Error deleting client:", error);
      showError("Failed to delete client. Please try again.");
    }
  }, [selectedId, clients, showUndoNotification, showSuccess, showError]);

  const handleBulkDelete = useCallback(async () => {
    if (checkedRows.length === 0) return;

    try {
      // Store the clients data before deletion for undo
      const clientsToDelete = clients.filter(c => checkedRows.includes(c.id));
      
      // Delete all selected clients
      for (const id of checkedRows) {
        await deleteClient(id);
      }
      
      // Remove from UI immediately
      setClients(prev => prev.filter(c => !checkedRows.includes(c.id)));
      
      // Show undo notification
      showUndoNotification(
        `${checkedRows.length} client(s) deleted successfully`,
        async () => {
          // Undo function - restore all clients
          try {
            for (const clientData of clientsToDelete) {
              // Restore client with original ID using setDoc
              const { id: originalId, ...clientDataToRestore } = clientData;
              await setDoc(doc(db, "clients", originalId), clientDataToRestore);
            }
            
            // Refresh the clients list
            const updatedClients = await getAllClients();
            setClients(updatedClients);
            
            showSuccess(`${clientsToDelete.length} client(s) restored successfully`);
          } catch (error) {
            console.error("Error restoring clients:", error);
            showError("Failed to restore clients. Please try again.");
          }
        },
        5000 // 5 seconds to undo
      );
      
      setCheckedRows([]);
      setShowConfirm(false);
      
    } catch (error) {
      console.error("Error deleting clients:", error);
      showError("Failed to delete clients. Please try again.");
    }
  }, [checkedRows, clients, showUndoNotification, showSuccess, showError]);

  const handleResetForm = useCallback(() => {
    setForm({ id: null, clientName: "" });
    setShowForm(false);
  }, []);

  // Filtered clients (no pagination)
  const filteredClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          client.clientName.toLowerCase().includes(search.toLowerCase()) ||
          String(client.id).toLowerCase().includes(search.toLowerCase())
      ),
    [clients, search]
  );

  useEffect(() => {
    const validIds = new Set(filteredClients.map((client) => client.id));
    setCheckedRows((prev) => prev.filter((id) => validIds.has(id)));
  }, [filteredClients]);

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

  // Close menu on click outside
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
    <main style={{ background: "#FAFAFC", minHeight: "100vh" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          minHeight: "100vh",
          background: "#FAFAFC",
          width: "100%",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: "IBM Plex Sans",
                fontSize: 28,
                lineHeight: "37.24px",
                fontWeight: 400,
                letterSpacing: "normal",
                color: "#2B2C3B",
              }}
            >
              Client Database
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {checkedRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowConfirm("bulk")}
                  style={{
                    fontFamily:
                      'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 14,
                    lineHeight: "20.0004px",
                    fontWeight: 500,
                    letterSpacing: "normal",
                    color: "#D32F2F", // Changed text color
                    background: "#f2f2f2",
                    minWidth: 87.625,
                    height: 30.6667,
                    borderRadius: 6,
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    transition: "background 0.2s, color 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    userSelect: "none",
                    boxShadow: "none",
                    padding: "0 16px",
                    whiteSpace: "nowrap",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#F1C9BF"; // Changed hover background
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#f2f2f2";
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.background = "#F1C9BF";
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.background = "#f2f2f2";
                  }}
                >
                  Delete Selected
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowForm(true)}
                style={{
                  fontFamily:
                    'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: 14,
                  lineHeight: "20.0004px",
                  fontWeight: 500,
                  letterSpacing: "normal",
                  color: "#3B3B4A",
                  background: "#f2f2f2",
                  minWidth: 87.625,
                  height: 30.6667,
                  borderRadius: 6,
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  transition: "background 0.2s, color 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  userSelect: "none",
                  boxShadow: "none",
                  padding: "0 16px",
                  whiteSpace: "nowrap",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#E5E5E5";
                  e.currentTarget.style.color = "#3B3B4A";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#f2f2f2";
                  e.currentTarget.style.color = "#3B3B4A";
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.background = "#E5E5E5";
                  e.currentTarget.style.color = "#3B3B4A";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.background = "#f2f2f2";
                  e.currentTarget.style.color = "#3B3B4A";
                }}
              >
                Add New Client
              </button>
            </div>
          </div>
          {/* Table Toolbar with search bar and action buttons */}
          <div
            style={{
              width: 1614,
              height: 40,
              background: "#fff",
              border: "1px solid #d7d7e0",
              borderBottom: "none",
              borderRadius: 0,
              margin: 0,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              padding: 8, // 8px all around for toolbar
              gap: 12,
              justifyContent: "space-between",
            }}
          >
            {/* Left: Search bar */}
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
                  left: 4,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                  color: "#1D2536", // updated icon color
                  fontSize: 16,
                  paddingLeft: 0,
                  paddingRight: 4,
                  height: 20,
                }}
              >
                {/* Simple magnifier glass SVG icon */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="7"
                    cy="7"
                    r="5.5"
                    stroke="#1D2536"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="11.3536"
                    y1="11.6464"
                    x2="15"
                    y2="15.2929"
                    stroke="#1D2536"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search by Client Name or Client ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  fontFamily:
                    'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: 14,
                  lineHeight: "20.0004px",
                  fontWeight: 400,
                  letterSpacing: "normal",
                  color: "#2B2C3B",
                  background: "#F8F8F8",
                  width: 270,
                  height: 28,
                  borderRadius: 6,
                  border: "1px solid #d7d7e0",
                  outline: "none",
                  marginRight: 16,
                  padding: "4px 8px 4px 28px", // left padding for icon
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
          {/* Secondary toolbar for row selection actions */}
          {checkedRows.length > 0 && (
            <div
              style={{
                width: 1614,
                height: 32, // lowered from 40 to 32 for a tighter fit
                background: "#fff",
                border: "1px solid #d7d7e0",
                borderTop: "none",
                borderBottom: "none", // remove bottom border
                borderRadius: 0,
                margin: 0,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                padding: "0 8px",
                gap: 12,
                justifyContent: "flex-start",
              }}
            >
              <span
                style={{
                  fontFamily: "IBM Plex Sans",
                  fontSize: 12,
                  lineHeight: "17.04px",
                  fontWeight: 400,
                  letterSpacing: "normal",
                  color: "#3B3B4A",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 0",
                }}
              >
                <span style={{ fontWeight: 700, marginRight: 2 }}>
                  {checkedRows.length}
                </span>
                {checkedRows.length === 1 ? "client" : "clients"} selected.
              </span>
            </div>
          )}
          {/* Modals */}
          {showForm && (
            <div>
              <div>
                <ClientFormModal
                  data={form}
                  onChange={handleInputChange}
                  onSave={handleSave}
                  onCancel={handleResetForm}
                />
              </div>
            </div>
          )}
          {showConfirm && (
            <div>
              <div>
                <DeleteConfirmationModal
                  onConfirm={
                    showConfirm === "bulk"
                      ? handleBulkDelete
                      : handleConfirmDelete
                  }
                  onCancel={() => setShowConfirm(false)}
                  isDeleting={false}
                />
              </div>
            </div>
          )}
          {/* Table Header */}
          <table
            border="1"
            style={{
              borderCollapse: "collapse",
              width: 1614,
              tableLayout: "fixed",
              boxShadow: "none",
              border: "1px solid #d7d7e0",
              background: "#FFFFFF",
              fontFamily:
                'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: 14,
              lineHeight: "20.0004px",
              color: "rgb(59, 59, 74)",
              letterSpacing: "normal",
              fontWeight: 400,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "center", // Center align for checkbox
                    verticalAlign: "middle",
                    fontWeight: 400,
                    width: 40, // Fixed width for checkbox column
                    minWidth: 40,
                    maxWidth: 40,
                    whiteSpace: "nowrap",
                    background: "#FFFFFF",
                    fontFamily:
                      'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 14,
                    lineHeight: "20.0004px",
                    color: "rgb(59, 59, 74)",
                    letterSpacing: "normal",
                    padding: 0,
                    border: "1px solid #d7d7e0",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      checkedRows.length > 0 &&
                      checkedRows.length === clients.length &&
                      clients.length > 0
                    }
                    onChange={handleCheckAll}
                    style={{
                      border: "1px solid #d7d7e0",
                      boxSizing: "border-box",
                      width: 16,
                      height: 16,
                      margin: 0,
                      display: "block",
                      position: "relative",
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  />
                </th>
                <th
                  style={{
                    textAlign: "left",
                    verticalAlign: "middle",
                    fontWeight: 400,
                    width: "1%",
                    whiteSpace: "nowrap",
                    background: "#FFFFFF",
                    fontFamily:
                      'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 14,
                    lineHeight: "20.0004px",
                    color: "rgb(59, 59, 74)",
                    letterSpacing: "normal",
                    padding: "8px 12px",
                    border: "1px solid #d7d7e0",
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    textAlign: "left",
                    verticalAlign: "middle",
                    fontWeight: 400,
                    width: "24.66%",
                    background: "#FFFFFF",
                    fontFamily:
                      'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 14,
                    lineHeight: "20.0004px",
                    color: "rgb(59, 59, 74)",
                    letterSpacing: "normal",
                    padding: "8px 12px",
                    border: "1px solid #d7d7e0",
                  }}
                >
                  Client ID
                </th>
                <th
                  style={{
                    textAlign: "left",
                    verticalAlign: "middle",
                    fontWeight: 400,
                    width: "24.66%",
                    background: "#FFFFFF",
                    fontFamily:
                      'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 14,
                    lineHeight: "20.0004px",
                    color: "rgb(59, 59, 74)",
                    letterSpacing: "normal",
                    padding: "8px 12px",
                    border: "1px solid #d7d7e0",
                  }}
                >
                  Client Name
                </th>
                <th
                  style={{
                    textAlign: "left",
                    verticalAlign: "middle",
                    fontWeight: 400,
                    width: "24.66%",
                    background: "#FFFFFF",
                    fontFamily:
                      'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 14,
                    lineHeight: "20.0004px",
                    color: "rgb(59, 59, 74)",
                    letterSpacing: "normal",
                    padding: "8px 12px",
                    border: "1px solid #d7d7e0",
                  }}
                >
                  Employee Count
                </th>
                <th
                  style={{
                    textAlign: "left",
                    verticalAlign: "middle",
                    fontWeight: 400,
                    width: "24.66%",
                    background: "#FFFFFF",
                    fontFamily:
                      'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 14,
                    lineHeight: "20.0004px",
                    color: "rgb(59, 59, 74)",
                    letterSpacing: "normal",
                    padding: "8px 12px",
                    border: "1px solid #d7d7e0",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
          </table>
          {/* Table Body */}
          <div
            style={{
              width: "100%",
              height: 706, // Fixed height for the table area
              maxHeight: 706, // Prevents growing beyond 706px
              overflowY: "scroll", // Always allow scrolling
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none", // IE and Edge
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ flex: 1, overflow: "auto", width: "100%" }}>
              <table
                border="1"
                style={{
                  borderCollapse: "collapse",
                  width: 1614,
                  tableLayout: "fixed",
                  boxShadow: "none",
                  border: "1px solid #d7d7e0",
                  borderTop: "none", // Remove double border with sticky footer
                  fontFamily:
                    'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: 14,
                  lineHeight: "20.0004px",
                  color: "rgb(59, 59, 74)",
                  letterSpacing: "normal",
                  fontWeight: 400,
                }}
              >
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ padding: "0", border: "none" }}>
                        <TableLoadingSpinner text="Loading clients..." />
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client, idx) => {
                      const isChecked = checkedRows.includes(client.id);
                      // Alternating highlight colors for selected rows
                      let rowBg;
                      if (isChecked) {
                        rowBg = idx % 2 === 0 ? "#F1C9BF" : "#EAC2B8";
                      } else {
                        rowBg = idx % 2 === 0 ? "#FAFAFC" : "#F0F0F3";
                      }
                      const isFirstRow = idx === 0;
                      const isLastRow = idx === filteredClients.length - 1;
                      // Remove top and bottom borders for all table body cells, and remove bottom border for last row
                      const getCellBorderStyle = (cellIdx) => ({
                        width:
                          cellIdx === 0
                            ? 40 // Fixed width for checkbox column
                            : cellIdx === 1
                            ? "1%"
                            : cellIdx === 2
                            ? "24.66%"
                            : cellIdx === 3
                            ? "24.66%"
                            : cellIdx === 4
                            ? "24.66%"
                            : "24.66%",
                        minWidth: cellIdx === 0 ? 40 : undefined,
                        maxWidth: cellIdx === 0 ? 40 : undefined,
                        textAlign: cellIdx === 0 ? "center" : "left",
                        verticalAlign: "middle",
                        whiteSpace: cellIdx <= 1 ? "nowrap" : undefined,
                        borderLeft: "1px solid #d7d7e0",
                        borderRight: "1px solid #d7d7e0",
                        borderTop: "none",
                        borderBottom: isLastRow ? "none" : "none", // Remove bottom border for last row
                        padding: cellIdx === 0 ? 0 : "8px 12px",
                        color: "rgb(59, 59, 74)",
                      });
                      return (
                        <tr
                          key={client.id || idx}
                          style={{
                            background: rowBg,
                            cursor: "pointer",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isChecked)
                              e.currentTarget.style.background = "#E5E5E8";
                          }}
                          onMouseLeave={(e) => {
                            if (!isChecked)
                              e.currentTarget.style.background = rowBg;
                          }}
                        >
                          <td style={getCellBorderStyle(0)}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleCheckboxChange(client.id)}
                              style={{
                                border: "1px solid #d7d7e0",
                                boxSizing: "border-box",
                                width: 16,
                                height: 16,
                                margin: 0,
                                display: "block",
                                position: "relative",
                                left: "50%",
                                transform: "translateX(-50%)",
                              }}
                            />
                          </td>
                          <td style={getCellBorderStyle(1)}>{idx + 1}</td>
                          <td style={getCellBorderStyle(2)}>{client.id}</td>
                          <td style={getCellBorderStyle(3)}>
                            {client.clientName}
                          </td>
                          <td style={getCellBorderStyle(4)}>
                            {client.employeeCount ?? 0}
                          </td>
                          <td
                            style={{
                              ...getCellBorderStyle(5),
                              textAlign: "center",
                              verticalAlign: "middle",
                              position: "relative",
                            }}
                          >
                            <button
                              type="button"
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 28,
                                height: 28,
                                borderRadius: 4,
                                transition: "background 0.2s, box-shadow 0.2s",
                              }}
                              title="Actions"
                              onClick={(e) => {
                                setActionMenu({
                                  open: true,
                                  idx,
                                  anchor: e.currentTarget,
                                });
                              }}
                            >
                              {/* Triple dot icon */}
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 18 18"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <circle
                                  cx="4.5"
                                  cy="9"
                                  r="1.2"
                                  fill="#1D2536"
                                />
                                <circle cx="9" cy="9" r="1.2" fill="#1D2536" />
                                <circle
                                  cx="13.5"
                                  cy="9"
                                  r="1.2"
                                  fill="#1D2536"
                                />
                              </svg>
                            </button>
                            {actionMenu.open && actionMenu.idx === idx && (
                              <div
                                ref={actionMenuRef}
                                style={{
                                  position: "absolute",
                                  top: 36,
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  background: "#fff",
                                  border: "1px solid #d7d7e0",
                                  borderRadius: 0, // No rounded corners
                                  boxShadow: "0 4px 16px 0 #00000014",
                                  zIndex: 10,
                                  minWidth: 120,
                                  padding: 0,
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center", // Center content horizontally
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenu({
                                      open: false,
                                      idx: null,
                                      anchor: null,
                                    });
                                    handleEdit(client);
                                  }}
                                  style={{
                                    fontFamily:
                                      'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                    fontSize: 14,
                                    color: "#3B3B4A",
                                    background: "none",
                                    border: "none",
                                    borderBottom: "1px solid #eee",
                                    padding: "12px 20px",
                                    cursor: "pointer",
                                    textAlign: "center",
                                    width: "100%",
                                    transition: "background 0.2s",
                                  }}
                                  onMouseOver={(e) =>
                                    (e.currentTarget.style.background =
                                      "#F0F0F3")
                                  }
                                  onMouseOut={(e) =>
                                    (e.currentTarget.style.background = "none")
                                  }
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenu({
                                      open: false,
                                      idx: null,
                                      anchor: null,
                                    });
                                    handleDelete(client.id);
                                  }}
                                  style={{
                                    fontFamily:
                                      'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                    fontSize: 14,
                                    color: "#D32F2F",
                                    background: "none",
                                    border: "none",
                                    padding: "12px 20px",
                                    cursor: "pointer",
                                    textAlign: "center",
                                    width: "100%",
                                    transition: "background 0.2s",
                                  }}
                                  onMouseOver={(e) =>
                                    (e.currentTarget.style.background =
                                      "#F1C9BF")
                                  }
                                  onMouseOut={(e) =>
                                    (e.currentTarget.style.background = "none")
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Sticky Footer Table */}
            <div
              style={{
                position: "sticky",
                bottom: 0,
                left: 0,
                width: "100%",
                background: "#fff",
                zIndex: 2,
                borderTop: "none", // Ensure only 1px border
                flexShrink: 0,
              }}
            >
              <table
                border="1"
                style={{
                  borderCollapse: "collapse",
                  width: 1614,
                  tableLayout: "fixed",
                  boxShadow: "none",
                  border: "1px solid #d7d7e0",
                  fontFamily:
                    'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: 14,
                  lineHeight: "20.0004px",
                  color: "rgb(59, 59, 74)",
                  letterSpacing: "normal",
                  fontWeight: 400,
                }}
              >
                <tfoot>
                  <tr style={{ height: 40 }}>
                    <td
                      style={{
                        width: "1%",
                        whiteSpace: "nowrap",
                        padding: "8px 12px",
                        color: "rgb(59, 59, 74)",
                        background: "#FFFFFF",
                        borderColor: "#d7d7e0",
                        borderLeft: "1px solid #d7d7e0",
                        borderRight: "none",
                        height: 40,
                      }}
                    ></td>
                    <td
                      style={{
                        width: "1%",
                        whiteSpace: "nowrap",
                        padding: "8px 12px",
                        color: "rgb(59, 59, 74)",
                        background: "#FFFFFF",
                        borderColor: "#d7d7e0",
                        borderLeft: "none",
                        borderRight: "none",
                        height: 40,
                      }}
                    ></td>
                    <td
                      style={{
                        width: "24.66%",
                        padding: "8px 12px",
                        color: "rgb(59, 59, 74)",
                        background: "#FFFFFF",
                        borderColor: "#d7d7e0",
                        borderLeft: "none",
                        borderRight: "none",
                        height: 40,
                      }}
                    ></td>
                    <td
                      style={{
                        width: "24.66%",
                        padding: "8px 12px",
                        color: "rgb(59, 59, 74)",
                        background: "#FFFFFF",
                        borderColor: "#d7d7e0",
                        borderLeft: "none",
                        borderRight: "none",
                        height: 40,
                      }}
                    ></td>
                    <td
                      style={{
                        width: "24.66%",
                        padding: "8px 12px",
                        color: "rgb(59, 59, 74)",
                        background: "#FFFFFF",
                        borderColor: "#d7d7e0",
                        borderLeft: "none",
                        borderRight: "none",
                        height: 40,
                      }}
                    ></td>
                    <td
                      style={{
                        width: "24.66%",
                        padding: "8px 12px",
                        color: "rgb(59, 59, 74)",
                        background: "#FFFFFF",
                        borderColor: "#d7d7e0",
                        borderLeft: "none",
                        borderRight: "1px solid #d7d7e0",
                        height: 40,
                      }}
                    ></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <style>{`
                div[style*='overflowY: scroll']::-webkit-scrollbar { display: none; }
              `}</style>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Clients;
