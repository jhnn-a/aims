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

// Styles moved to Clients.css

function ClientFormModal({ data, onChange, onSave, onCancel }) {
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
    <div className="modal-overlay">
      <div className="modal-box">
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
}

function DeleteConfirmationModal({ onConfirm, onCancel, isDeleting }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-delete-title">Confirm Deletion</h2>
        <p>Are you sure you want to permanently delete this client?</p>
        <p className="modal-delete-desc">
          This action will be reversible for 5 seconds using the undo
          notification.
        </p>
        <div className="modal-delete-actions">
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="modal-delete-btn"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="modal-cancel-btn"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Clients() {
  const { showSuccess, showError, showUndoNotification } = useSnackbar();
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
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

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
      const clientToDelete = clients.find((c) => c.id === selectedId);
      if (!clientToDelete) return;
      const clientBackup = { ...clientToDelete };
      await deleteClient(selectedId);
      setClients((prev) => prev.filter((c) => c.id !== selectedId));
      showUndoNotification(
        `Client "${clientBackup.name}" deleted successfully`,
        async () => {
          try {
            const { id: originalId, ...clientDataToRestore } = clientBackup;
            await setDoc(doc(db, "clients", originalId), clientDataToRestore);
            const updatedClients = await getAllClients();
            setClients(updatedClients);
            showSuccess(`Client "${clientBackup.name}" restored successfully`);
          } catch (error) {
            showError("Failed to restore client. Please try again.");
          }
        },
        5000
      );
      setSelectedId(null);
      setShowConfirm(false);
    } catch (error) {
      showError("Failed to delete client. Please try again.");
    }
  }, [selectedId, clients, showUndoNotification, showSuccess, showError]);

  const handleBulkDelete = useCallback(async () => {
    if (checkedRows.length === 0) return;
    try {
      const clientsToDelete = clients.filter((c) => checkedRows.includes(c.id));
      for (const id of checkedRows) {
        await deleteClient(id);
      }
      setClients((prev) => prev.filter((c) => !checkedRows.includes(c.id)));
      showUndoNotification(
        `${checkedRows.length} client(s) deleted successfully`,
        async () => {
          try {
            for (const clientData of clientsToDelete) {
              const { id: originalId, ...clientDataToRestore } = clientData;
              await setDoc(doc(db, "clients", originalId), clientDataToRestore);
            }
            const updatedClients = await getAllClients();
            setClients(updatedClients);
            showSuccess(
              `${clientsToDelete.length} client(s) restored successfully`
            );
          } catch (error) {
            showError("Failed to restore clients. Please try again.");
          }
        },
        5000
      );
      setCheckedRows([]);
      setShowConfirm(false);
    } catch (error) {
      showError("Failed to delete clients. Please try again.");
    }
  }, [checkedRows, clients, showUndoNotification, showSuccess, showError]);

  const handleResetForm = useCallback(() => {
    setForm({ id: null, clientName: "" });
    setShowForm(false);
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
    <main className="clients-main">
      <div className="clients-container">
        <div>
          <div className="clients-header">
            <div className="clients-header-inner">
              <span className="clients-title">Client Database</span>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="clients-add-btn"
              >
                Add New Client
              </button>
            </div>
          </div>
          <div className="clients-toolbar">
            <div className="clients-search">
              <input
                type="text"
                placeholder="Search assigned assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="clients-search-input"
              />
              <span className="clients-search-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle
                    cx="8"
                    cy="8"
                    r="6.5"
                    stroke="#A0AEC0"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="13.3536"
                    y1="13.6464"
                    x2="17"
                    y2="17.2929"
                    stroke="#A0AEC0"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </div>
          </div>
          {checkedRows.length > 0 && (
            <div className="clients-selected-toolbar">
              <span className="clients-selected-count">
                <span style={{ fontWeight: 700, marginRight: 2 }}>
                  {checkedRows.length}
                </span>
                {checkedRows.length === 1 ? "client" : "clients"} selected.
              </span>
            </div>
          )}
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
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontWeight: 400,
                    width: 40,
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
          <div
            style={{
              width: "100%",
              height: 706,
              maxHeight: 706,
              overflowY: "scroll",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
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
                  borderTop: "none",
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
                    paginatedClients.map((client, idx) => {
                      const isChecked = checkedRows.includes(client.id);
                      let rowBg;
                      if (isChecked) {
                        rowBg = idx % 2 === 0 ? "#F1C9BF" : "#EAC2B8";
                      } else {
                        rowBg = idx % 2 === 0 ? "#FAFAFC" : "#F0F0F3";
                      }
                      const isFirstRow = idx === 0;
                      const isLastRow = idx === paginatedClients.length - 1;
                      const getCellBorderStyle = (cellIdx) => ({
                        width:
                          cellIdx === 0
                            ? 40
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
                        borderBottom: isLastRow ? "none" : "none",
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
                                  borderRadius: 0,
                                  boxShadow: "0 4px 16px 0 #00000014",
                                  zIndex: 10,
                                  minWidth: 120,
                                  padding: 0,
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 0 12px 0",
                background: "#fff",
                borderTop: "1px solid #d7d7e0",
                fontFamily: "Maax, sans-serif",
                fontSize: 14,
                minHeight: 48,
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ color: "#233037", fontWeight: 500 }}>
                  Showing {startIdx} - {endIdx} of {filteredClients.length}{" "}
                  clients
                </span>
                <span style={{ color: "#233037", fontWeight: 500 }}>
                  Show:
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      marginLeft: 8,
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid #d7d7e0",
                      fontFamily: "Maax, sans-serif",
                      fontSize: 14,
                      background: "#fff",
                      color: "#233037",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    minWidth: 48,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid #d7d7e0",
                    background: currentPage === 1 ? "#F3F4F6" : "#fff",
                    color: "#233037",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontWeight: 500,
                    fontFamily: "Maax, sans-serif",
                  }}
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    minWidth: 48,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid #d7d7e0",
                    background: currentPage === 1 ? "#F3F4F6" : "#fff",
                    color: "#233037",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontWeight: 500,
                    fontFamily: "Maax, sans-serif",
                  }}
                >
                  Previous
                </button>
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      minWidth: 32,
                      height: 32,
                      borderRadius: 8,
                      border: "1px solid #d7d7e0",
                      background: page === currentPage ? "#5EC6B8" : "#fff",
                      color: page === currentPage ? "#fff" : "#233037",
                      fontWeight: page === currentPage ? 700 : 500,
                      fontFamily: "Maax, sans-serif",
                      cursor: page === currentPage ? "default" : "pointer",
                      boxShadow:
                        page === currentPage
                          ? "0 2px 8px rgba(94,198,184,0.10)"
                          : "none",
                      outline: "none",
                    }}
                    disabled={page === currentPage}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  style={{
                    minWidth: 48,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid #d7d7e0",
                    background: currentPage === totalPages ? "#F3F4F6" : "#fff",
                    color: "#233037",
                    cursor:
                      currentPage === totalPages ? "not-allowed" : "pointer",
                    fontWeight: 500,
                    fontFamily: "Maax, sans-serif",
                  }}
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    minWidth: 48,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid #d7d7e0",
                    background: currentPage === totalPages ? "#F3F4F6" : "#fff",
                    color: "#233037",
                    cursor:
                      currentPage === totalPages ? "not-allowed" : "pointer",
                    fontWeight: 500,
                    fontFamily: "Maax, sans-serif",
                  }}
                >
                  Last
                </button>
              </div>
            </div>
            <div
              style={{
                position: "sticky",
                bottom: 0,
                left: 0,
                width: "100%",
                background: "#fff",
                zIndex: 2,
                borderTop: "none",
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
}

export default Clients;
