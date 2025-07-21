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
import "./Clients.css";

function ClientFormModal({
  data,
  onChange,
  onSave,
  onCancel,
  showError,
  isSaving,
}) {
  return (
    <div className="clients-modal-overlay">
      <div className="clients-modal-box">
        <button
          className="clients-modal-close"
          onClick={onCancel}
          aria-label="Close"
          title="Close"
        >
          ×
        </button>
        <h3 className="clients-modal-title">
          {data.id ? "Edit Client Details" : "Add New Client"}
        </h3>
        <div className="clients-modal-form">
          <label className="clients-modal-label">
            Client Name: <span style={{ color: "#e11d48" }}>*</span>
          </label>
          <input
            className="clients-modal-input"
            name="clientName"
            value={data.clientName}
            onChange={onChange}
            placeholder="Enter client name (e.g. ABC Holdings, Inc.)"
            disabled={isSaving}
          />
          {showError && (
            <div className="clients-modal-error">* Client Name is required</div>
          )}
        </div>
        <div className="clients-modal-actions">
          <button
            className="clients-modal-save"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            className="clients-modal-cancel"
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
  return (
    <div className="clients-modal-overlay">
      <div className="clients-delete-modal">
        <h2
          style={{
            fontSize: 22,
            color: "#233037",
            fontWeight: 700,
            fontFamily:
              "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          Confirm Deletion
        </h2>
        <div
          style={{
            fontFamily:
              "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: 15,
            lineHeight: 1.5,
            color: "#445F6D",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Are you sure you want to permanently delete this client?
          <div
            style={{
              fontSize: 13,
              color: "#6B7280",
              marginTop: 8,
              fontStyle: "italic",
            }}
          >
            This action will be reversible for 5 seconds using the undo
            notification.
          </div>
        </div>
        <div className="clients-delete-actions">
          <button
            className="clients-delete-btn"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <button
            className="clients-cancel-btn"
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

// Bulk delete confirmation modal
function BulkDeleteConfirmationModal({
  count,
  onConfirm,
  onCancel,
  isDeleting,
}) {
  return (
    <div className="clients-modal-overlay">
      <div className="clients-delete-modal">
        <h2
          style={{
            fontSize: 22,
            color: "#233037",
            fontWeight: 700,
            fontFamily:
              "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          Confirm Deletion
        </h2>
        <div
          style={{
            fontFamily:
              "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: 15,
            lineHeight: 1.5,
            color: "#445F6D",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Are you sure you want to delete the selected {count} client
          {count > 1 ? "s" : ""}?
          <div
            style={{
              fontSize: 13,
              color: "#6B7280",
              marginTop: 8,
              fontStyle: "italic",
            }}
          >
            This action cannot be undone.
          </div>
        </div>
        <div className="clients-delete-actions">
          <button
            className="clients-delete-btn"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <button
            className="clients-cancel-btn"
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
  const [showErrorMsg, setShowErrorMsg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);
  const fetchClients = useCallback(async () => {
    setLoading(true);
    const [clientData] = await Promise.all([getAllClients()]);
    setClients(clientData);
    setLoading(false);
  }, []);

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
    const payload = { clientName: form.clientName.trim() };
    if (form.id) {
      await updateClient(form.id, payload);
    } else {
      await addClient(payload);
    }
    handleResetForm();
    fetchClients();
    setIsSaving(false);
  }, [form, isFormValid, fetchClients]);

  const handleEdit = useCallback((client) => {
    setForm(client);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((id) => {
    setSelectedId(id);
    setShowConfirm(true);
  }, []);

  // Bulk delete handler
  const handleBulkDelete = useCallback(() => {
    setShowBulkDelete(true);
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

  const handleConfirmBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      // Delete all selected clients
      await Promise.all(checkedRows.map((id) => deleteClient(id)));
      setClients((prev) => prev.filter((c) => !checkedRows.includes(c.id)));
      setCheckedRows([]);
      setShowBulkDelete(false);
    } catch (error) {
      showError("Failed to delete selected clients. Please try again.");
    }
    setIsBulkDeleting(false);
  }, [checkedRows, deleteClient, showError]);

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
    <div className="clients-page">
      {/* Header */}
      <div className="clients-header">
        <h1 className="clients-title">Client Database</h1>
        <div className="clients-header-actions">
          <button className="clients-add-btn" onClick={() => setShowForm(true)}>
            + Add Client
          </button>
          {checkedRows.length > 0 && (
            <button className="clients-delete-btn" onClick={handleBulkDelete}>
              Delete
            </button>
          )}
        </div>
      </div>
      {/* Search Bar */}
      <div className="clients-search-bar">
        <div style={{ position: "relative", maxWidth: 400, width: "100%" }}>
          <input
            type="text"
            placeholder="Search clients..."
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
      {/* Bulk selection toolbar */}
      {checkedRows.length > 0 && (
        <div className="clients-bulk-toolbar">
          <span style={{ fontWeight: 700, marginRight: 2 }}>
            {checkedRows.length}
          </span>
          <span style={{ color: "#3b3b4a" }}>
            {checkedRows.length === 1 ? "client" : "clients"} selected.
          </span>
        </div>
      )}
      {/* Add/Edit Modal */}
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
      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <DeleteConfirmationModal
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowConfirm(false)}
          isDeleting={false}
        />
      )}
      {/* Bulk Delete Confirmation Modal */}
      {showBulkDelete && (
        <BulkDeleteConfirmationModal
          count={checkedRows.length}
          onConfirm={handleConfirmBulkDelete}
          onCancel={() => setShowBulkDelete(false)}
          isDeleting={isBulkDeleting}
        />
      )}
      {/* Main Table Content */}
      <div className="clients-table-container">
        <div className="clients-table-wrapper">
          <table className="clients-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      checkedRows.length > 0 &&
                      checkedRows.length === clients.length &&
                      clients.length > 0
                    }
                    onChange={handleCheckAll}
                    className="clients-checkbox"
                  />
                </th>
                <th>#</th>
                <th>Client ID</th>
                <th>Client Name</th>
                <th>Employee Count</th>
                <th>Actions</th>
              </tr>
            </thead>
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
                  // Find the index of this client in the selected rows array for alternating colors
                  const selectedIndex = checkedRows.indexOf(client.id);
                  const rowClass = isChecked
                    ? selectedIndex % 2 === 0
                      ? "clients-table-row selected"
                      : "clients-table-row selected-alt"
                    : idx % 2 === 0
                    ? "clients-table-row unselected"
                    : "clients-table-row unselected-alt";
                  return (
                    <tr
                      key={client.id || idx}
                      className={rowClass}
                      onMouseEnter={(e) =>
                        !isChecked && e.currentTarget.classList.add("hover")
                      }
                      onMouseLeave={(e) =>
                        !isChecked && e.currentTarget.classList.remove("hover")
                      }
                    >
                      <td
                        style={{
                          textAlign: "center",
                          padding: 0,
                          border: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(client.id)}
                          style={{
                            width: 16,
                            height: 16,
                            accentColor: "#3b82f6",
                          }}
                        />
                      </td>
                      <td>{idx + 1}</td>
                      <td>{client.id}</td>
                      <td>{client.clientName}</td>
                      <td>{client.employeeCount ?? 0}</td>
                      <td className="clients-table-actions-cell">
                        <button
                          type="button"
                          className="clients-table-actions-btn"
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
                            <circle cx="4.5" cy="9" r="1.2" fill="#1D2536" />
                            <circle cx="9" cy="9" r="1.2" fill="#1D2536" />
                            <circle cx="13.5" cy="9" r="1.2" fill="#1D2536" />
                          </svg>
                        </button>
                        {actionMenu.open && actionMenu.idx === idx && (
                          <div
                            ref={actionMenuRef}
                            className="clients-table-actions-menu"
                            style={{
                              left:
                                actionMenu.anchor?.getBoundingClientRect()
                                  .left ?? 0,
                              top:
                                actionMenu.anchor?.getBoundingClientRect()
                                  .bottom + 4 ?? 0,
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
                              onMouseOver={(e) =>
                                (e.currentTarget.style.background = "#F0F0F3")
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
                              onMouseOver={(e) =>
                                (e.currentTarget.style.background = "#F1C9BF")
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
        {/* Pagination Footer */}
        <div className="clients-pagination-footer">
          <button
            className="clients-pagination-btn"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            First
          </button>
          <button
            className="clients-pagination-btn"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          {getPageNumbers().map((page) => (
            <button
              key={page}
              className={`clients-pagination-btn${
                page === currentPage ? " selected" : ""
              }`}
              onClick={() => setCurrentPage(page)}
              disabled={page === currentPage}
            >
              {page}
            </button>
          ))}
          <button
            className="clients-pagination-btn"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <button
            className="clients-pagination-btn"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </button>
          <span className="clients-pagination-info">
            Showing {startIdx} - {endIdx} of {filteredClients.length} clients
          </span>
          <span className="clients-pagination-select">
            Show:
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="clients-rows-select"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </span>
        </div>
      </div>
    </div>
  );
}

export default Clients;
