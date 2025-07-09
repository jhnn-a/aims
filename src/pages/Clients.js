import React, { useState, useEffect, useMemo } from "react";
import {
  addClient,
  getAllClients,
  updateClient,
  deleteClient,
} from "../services/clientService";
import { getAllEmployees } from "../services/employeeService";

const isValidClientName = (value) => value.trim().length > 0; // allow anything except empty

// --- Modal shared style variables ---
const MODAL_WIDTH = 420;
const MODAL_PADDING = 32;
const MODAL_RADIUS = 16;
const MODAL_HEADER_FONT_SIZE = "1.5rem";
const MODAL_HEADER_MARGIN = "0 0 18px 0";
const MODAL_FORM_GAP = 18;
const MODAL_FORM_PADDING = "20px 20px 16px 20px";
const MODAL_BUTTON_ROW_GAP = 12;
const MODAL_BUTTON_HEIGHT = 44;
const MODAL_BUTTON_FONT_SIZE = "1rem";

function ClientFormModal({ data, onChange, onSave, onCancel }) {
  const [showError, setShowError] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveClick = async () => {
    if (!data.clientName.trim()) {
      setShowError(true);
      return;
    }
    setShowError(false);
    setSaving(true);
    onSave(); // Modal will close immediately, loading handled outside
    setSaving(false);
  };

  return (
    <div style={styles.modalOverlay}>
      <div
        style={{
          ...styles.modalContent,
          width: MODAL_WIDTH,
          minWidth: MODAL_WIDTH,
          maxWidth: MODAL_WIDTH,
          padding: MODAL_PADDING,
          borderRadius: MODAL_RADIUS,
        }}
      >
        <h3
          style={{
            fontSize: MODAL_HEADER_FONT_SIZE,
            margin: MODAL_HEADER_MARGIN,
            color: "#1D2636",
            letterSpacing: 0.2,
            textAlign: "left",
            fontWeight: "inherit", // explicitly inherit (default)
          }}
        >
          {data.id ? "Edit Client Details" : "Add New Client"}
        </h3>
        <div
          style={{
            background: "#EFF2F4",
            borderRadius: 10,
            padding: MODAL_FORM_PADDING,
            marginBottom: 0,
            display: "flex",
            flexDirection: "column",
            gap: MODAL_FORM_GAP,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                marginBottom: 0,
              }}
            >
              <label
                style={{ ...styles.modalLabel, marginBottom: 0, padding: 0 }}
              >
                Client Name:{" "}
              </label>
              <span
                style={{
                  color: "#e53935",
                  marginTop: 2,
                }}
              >
                *
              </span>
            </div>
            <div style={{ width: "100%" }}>
              <input
                name="clientName"
                value={data.clientName}
                onChange={(e) => {
                  onChange(e);
                  if (showError) setShowError(false);
                }}
                style={{
                  ...styles.modalInput,
                  marginTop: 0,
                  marginBottom: 0,
                  width: "100%",
                }}
                placeholder="Enter client name (e.g. ABC Holdings, Inc.)"
                disabled={saving}
              />
              {showError && (
                <div
                  style={{
                    color: "#e53935",
                    marginTop: 4,
                  }}
                >
                  * Client Name is required
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: MODAL_BUTTON_ROW_GAP,
              marginTop: 10,
              width: "100%",
            }}
          >
            <button
              onClick={handleSaveClick}
              style={{
                ...styles.actionBtn,
                width: "50%",
                borderRadius: 6,
                height: MODAL_BUTTON_HEIGHT,
                fontSize: MODAL_BUTTON_FONT_SIZE,
                fontWeight: 400,
                transition: "background 0.2s, color 0.2s, opacity 0.2s",
                opacity: saving ? 0.7 : 1,
              }}
              disabled={saving}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1F2637";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = styles.actionBtn.background;
                e.currentTarget.style.color = styles.actionBtn.color;
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={onCancel}
              style={{
                ...styles.actionBtn,
                width: "50%",
                borderRadius: 6,
                height: MODAL_BUTTON_HEIGHT,
                background: "#fff",
                color: styles.modalButton.color || "#000",
                fontSize: MODAL_BUTTON_FONT_SIZE,
                fontWeight: 400,
                transition: "background 0.2s, color 0.2s",
              }}
              disabled={saving}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1F2637";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.color =
                  styles.modalButton.color || "#000";
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({ onConfirm, onCancel, deleting }) {
  const [hovered, setHovered] = useState({ delete: false, cancel: false });
  return (
    <div style={styles.modalOverlay}>
      <div
        style={{
          ...styles.modalContent,
          width: MODAL_WIDTH,
          minWidth: MODAL_WIDTH,
          maxWidth: MODAL_WIDTH,
          padding: MODAL_PADDING,
          borderRadius: MODAL_RADIUS,
        }}
      >
        <h3
          style={{
            fontSize: MODAL_HEADER_FONT_SIZE,
            margin: MODAL_HEADER_MARGIN,
            color: "#1D2636",
            letterSpacing: 0.2,
            textAlign: "left",
            fontWeight: "inherit", // explicitly inherit (default)
          }}
        >
          Confirm Deletion
        </h3>
        <div
          style={{
            background: "#EFF2F4",
            borderRadius: 10,
            padding: MODAL_FORM_PADDING,
            marginBottom: 0,
            display: "flex",
            flexDirection: "column",
            gap: MODAL_FORM_GAP,
          }}
        >
          <p
            style={{
              fontFamily: "Inter, Arial, Helvetica, sans-serif",
              margin: 0,
              marginBottom: 0,
              textAlign: "left",
              maxWidth: 340,
              wordBreak: "break-word",
              fontSize: "1rem",
              color: "#1D2636",
            }}
          >
            Are you sure you want to permanently delete this client?{" "}
            <span style={{ fontWeight: 400, color: "#e53935" }}>
              This action cannot be undone.
            </span>
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: MODAL_BUTTON_ROW_GAP,
              marginTop: 10,
              width: "100%",
            }}
          >
            <button
              onClick={onConfirm}
              style={{
                ...styles.actionBtn,
                width: "50%",
                borderRadius: 6,
                height: MODAL_BUTTON_HEIGHT,
                background: hovered.delete ? "#e53935" : "#fff",
                color: hovered.delete ? "#fff" : "#e53935",
                fontWeight: 400,
                border: "1.5px solid #e53935",
                fontSize: MODAL_BUTTON_FONT_SIZE,
                transition: "background 0.2s, color 0.2s, opacity 0.2s",
                opacity: deleting ? 0.7 : 1,
                boxShadow: hovered.delete
                  ? "0 2px 8px rgba(229,57,53,0.10)"
                  : "none",
              }}
              disabled={deleting}
              onMouseEnter={() => setHovered((h) => ({ ...h, delete: true }))}
              onMouseLeave={() => setHovered((h) => ({ ...h, delete: false }))}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={onCancel}
              style={{
                ...styles.actionBtn,
                width: "50%",
                borderRadius: 6,
                height: MODAL_BUTTON_HEIGHT,
                background: hovered.cancel ? "#1F2637" : "#fff",
                color: hovered.cancel
                  ? "#fff"
                  : styles.modalButton.color || "#000",
                border: "1.5px solid #e0e7ef",
                fontSize: MODAL_BUTTON_FONT_SIZE,
                fontWeight: 400,
                transition: "background 0.2s, color 0.2s",
                boxShadow: hovered.cancel
                  ? "0 2px 8px rgba(31,38,55,0.10)"
                  : "none",
              }}
              disabled={deleting}
              onMouseEnter={() => setHovered((h) => ({ ...h, cancel: true }))}
              onMouseLeave={() => setHovered((h) => ({ ...h, cancel: false }))}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({
    id: null,
    clientName: "",
  });
  const [search, setSearch] = useState("");
  const [sortNumber, setSortNumber] = useState(null); // null (normal), true (reversed)
  const [sortName, setSortName] = useState(null); // null, true (asc), false (desc)
  const [sortId, setSortId] = useState(null); // null (default), false (desc)
  const [sortEmpCount, setSortEmpCount] = useState(null); // null (default), true (asc), false (desc)
  const [addBtnHover, setAddBtnHover] = useState(false);
  const [sortBtnHover, setSortBtnHover] = useState(false);
  const [checkedRows, setCheckedRows] = useState([]);
  const [editBtnHoverIdx, setEditBtnHoverIdx] = useState(null);
  const [deleteBtnHoverIdx, setDeleteBtnHoverIdx] = useState(null);
  const [hoveredRowIdx, setHoveredRowIdx] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // Store the original order for # column sorting
  const [originalClients, setOriginalClients] = useState([]);
  const tbodyRef = React.useRef(); // Ref for scrollable tbody
  const tableBodyRef = React.useRef(null); // Ref for tbody scrollable area
  const [pendingScrollTop, setPendingScrollTop] = useState(null); // For restoring scroll

  useEffect(() => {
    loadClientsAndEmployees();
  }, []);

  const loadClientsAndEmployees = async () => {
    setLoading(true);
    const [clientData] = await Promise.all([getAllClients()]);
    setClients(clientData);
    setOriginalClients(clientData); // Save original order
    setLoading(false);
  };

  const handleInput = ({ target: { name, value } }) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const isFormValid = () => isValidClientName(form.clientName);

  const handleSave = async () => {
    if (!isFormValid()) return;
    const payload = { clientName: form.clientName.trim() };
    form.id ? await updateClient(form.id, payload) : await addClient(payload);
    resetForm();
    loadClientsAndEmployees();
  };

  const handleEdit = (client) => {
    setForm(client);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setSelectedId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    await deleteClient(selectedId);
    setSelectedId(null);
    setShowConfirm(false);
    loadClientsAndEmployees();
  };

  const cancelDelete = () => {
    setSelectedId(null);
    setShowConfirm(false);
  };

  const resetForm = () => {
    setForm({ id: null, clientName: "" });
    setShowForm(false);
  };

  // Memoize filteredClients so it doesn't change on every render
  const filteredClients = useMemo(() => {
    let result = clients.filter(
      (client) =>
        client.clientName.toLowerCase().includes(search.toLowerCase()) ||
        String(client.id).toLowerCase().includes(search.toLowerCase())
    );
    if (sortNumber !== null) {
      if (sortNumber === false) {
        result = [...result].reverse();
      } else {
        result = [...result];
      }
    } else if (sortEmpCount !== null) {
      result = [...result].sort((a, b) =>
        sortEmpCount === true
          ? (a.employeeCount ?? 0) - (b.employeeCount ?? 0)
          : (b.employeeCount ?? 0) - (a.employeeCount ?? 0)
      );
    } else if (sortId !== null) {
      const getIdNum = (id) => {
        const match = String(id).match(/(\d{4})$/);
        return match ? Number(match[1]) : 0;
      };
      result = [...result].sort((a, b) =>
        sortId === true
          ? getIdNum(a.id) - getIdNum(b.id)
          : getIdNum(b.id) - getIdNum(a.id)
      );
    } else if (sortName !== null) {
      result = [...result].sort((a, b) =>
        sortName === true
          ? a.clientName.localeCompare(b.clientName)
          : b.clientName.localeCompare(a.clientName)
      );
    }
    return result;
  }, [clients, search, sortNumber, sortEmpCount, sortId, sortName]);

  // --- Selection logic ---
  // Ensure checkedRows only contains IDs present in filteredClients
  useEffect(() => {
    const validIds = new Set(filteredClients.map((client) => client.id));
    setCheckedRows((prev) => prev.filter((id) => validIds.has(id)));
  }, [filteredClients]);

  const handleCheckboxChange = (id) => {
    setCheckedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  // Check All: select all filtered clients (across all pages)
  const handleCheckAll = (e) => {
    if (e.target.checked) {
      setCheckedRows(filteredClients.map((client) => client.id));
    } else {
      setCheckedRows([]);
    }
  };

  // Reset to first page when changing items per page, and scroll table body to top
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setCurrentPage(1);
    setItemsPerPage(newItemsPerPage);
    // Always scroll to top when changing items per page
    if (tableBodyRef.current) {
      tableBodyRef.current.scrollTop = 0;
    }
  };

  // Pagination logic
  const totalPages = Math.max(
    1,
    Math.ceil(filteredClients.length / itemsPerPage)
  );
  // Ensure currentPage is not out of range after itemsPerPage change
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
    // eslint-disable-next-line
  }, [itemsPerPage, filteredClients.length]);

  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Always scroll table body to top when currentPage or search changes (not on every selection/itemsPerPage change)
  useEffect(() => {
    if (tableBodyRef.current) {
      tableBodyRef.current.scrollTop = 0;
    }
  }, [currentPage, search]);

  return (
    <main style={{ flex: "1 1 0%", padding: 16, background: "#F9F9F9" }}>
      <div style={styles.pageContainer}>
        <p
          style={{
            color: "rgb(29, 37, 54)",
            margin: 0,
            marginBottom: 18,
            fontSize: "2rem",
          }}
        >
          Client Database
        </p>
        <div style={styles.searchBarRow}>
          <div style={styles.searchBarContainer}>
            <svg
              width="22"
              height="22"
              style={{ color: "#445F6D", opacity: 0.7 }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by Client Name or Client ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          {/* Circular Add New Client Button */}
          <AddNewClientButton onClick={() => setShowForm(true)} />
          {/* Bulk Delete Button (only show if any row is checked) */}
          {checkedRows.length > 0 && (
            <BulkDeleteButton onClick={() => setShowConfirm("bulk")} />
          )}
        </div>

        {showForm && (
          <ClientFormModal
            data={form}
            onChange={handleInput}
            onSave={handleSave}
            onCancel={resetForm}
            isValid={isFormValid()}
          />
        )}

        {showConfirm && (
          <DeleteConfirmationModal
            onConfirm={
              showConfirm === "bulk"
                ? async () => {
                    // Bulk delete
                    for (const id of checkedRows) {
                      await deleteClient(id);
                    }
                    setCheckedRows([]);
                    setShowConfirm(false);
                    loadClientsAndEmployees();
                  }
                : confirmDelete
            }
            onCancel={() => setShowConfirm(false)}
          />
        )}

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div
              style={{
                ...styles.tableContainer,
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 2px 12px rgba(68,95,109,0.07)",
              }}
            >
              <table
                style={{ ...styles.table, minWidth: 700, tableLayout: "fixed" }}
              >
                <thead
                  style={{
                    display: "block",
                    width: "100%",
                    background: "#fff",
                  }}
                >
                  <tr style={{ display: "table", width: "100%" }}>
                    <th
                      style={{
                        ...styles.th,
                        width: 44,
                        minWidth: 36,
                        maxWidth: 48,
                        textAlign: "center",
                        padding: "10px 4px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                        }}
                      >
                        <CustomCheckbox
                          checked={
                            checkedRows.length > 0 &&
                            checkedRows.length === filteredClients.length &&
                            filteredClients.length > 0
                          }
                          indeterminate={
                            checkedRows.length > 0 &&
                            checkedRows.length < filteredClients.length
                          }
                          onChange={handleCheckAll}
                        />
                      </div>
                    </th>
                    <th
                      style={{
                        ...styles.th,
                        width: 44,
                        minWidth: 36,
                        maxWidth: 48,
                        textAlign: "center",
                        padding: "10px 4px",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      onClick={() => {
                        setSortNumber(sortNumber === false ? null : false);
                        setSortName(null);
                        setSortId(null);
                        setSortEmpCount(null); // Ensure employee count sort is deactivated
                      }}
                      title="Sort by Row Number"
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        #
                        <svg
                          width="28"
                          height="18"
                          viewBox="0 0 28 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{
                            marginLeft: 4,
                            verticalAlign: "middle",
                            display: "inline-block",
                            opacity: sortNumber === false ? 1 : 0.4,
                          }}
                          aria-hidden="true"
                        >
                          {/* Up arrow (left) */}
                          <g>
                            <line
                              x1="10"
                              y1="15"
                              x2="10"
                              y2="4"
                              stroke={
                                sortNumber === false ? "#1D2636" : "#ACABAC"
                              }
                              strokeWidth="2.2"
                              strokeLinecap="round"
                            />
                            <polyline
                              points="7,7 10,4 13,7"
                              stroke={
                                sortNumber === false ? "#1D2636" : "#ACABAC"
                              }
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </g>
                          {/* Down arrow (right) */}
                          <g>
                            <line
                              x1="18"
                              y1="4"
                              x2="18"
                              y2="15"
                              stroke={
                                sortNumber === false ? "#1D2636" : "#ACABAC"
                              }
                              strokeWidth="2.2"
                              strokeLinecap="round"
                            />
                            <polyline
                              points="15,12 18,15 21,12"
                              stroke={
                                sortNumber === false ? "#1D2636" : "#ACABAC"
                              }
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </g>
                        </svg>
                      </span>
                    </th>
                    <th
                      style={{
                        ...styles.th,
                        width: 44,
                        minWidth: 36,
                        maxWidth: 48,
                        textAlign: "center",
                        padding: "10px 4px",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      onClick={() => {
                        setSortId(sortId === false ? true : false); // Only two states: true (asc), false (desc)
                        setSortNumber(null);
                        setSortName(null);
                        setSortEmpCount(null); // Ensure employee count sort is deactivated
                      }}
                      title="Sort by Client ID"
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        CLIENT ID
                        <svg
                          width="28"
                          height="18"
                          viewBox="0 0 28 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{
                            marginLeft: 4,
                            verticalAlign: "middle",
                            display: "inline-block",
                            opacity: 1,
                          }}
                          aria-hidden="true"
                        >
                          {/* Up arrow (left) colored if descending */}
                          <g>
                            <line
                              x1="10"
                              y1="15"
                              x2="10"
                              y2="4"
                              stroke={sortId === false ? "#1D2636" : "#D0CFD0"}
                              strokeWidth="2.2"
                              strokeLinecap="round"
                            />
                            <polyline
                              points="7,7 10,4 13,7"
                              stroke={sortId === false ? "#1D2636" : "#D0CFD0"}
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </g>
                          {/* Down arrow (right) colored if descending */}
                          <g>
                            <line
                              x1="18"
                              y1="4"
                              x2="18"
                              y2="15"
                              stroke={sortId === false ? "#1D2636" : "#D0CFD0"}
                              strokeWidth="2.2"
                              strokeLinecap="round"
                            />
                            <polyline
                              points="15,12 18,15 21,12"
                              stroke={sortId === false ? "#1D2636" : "#D0CFD0"}
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </g>
                        </svg>
                      </span>
                    </th>
                    <th
                      style={{
                        ...styles.th,
                        width: 120,
                        minWidth: 120,
                        maxWidth: 120,
                        cursor: "pointer",
                        userSelect: "none",
                        textAlign: "center", // Center the CLIENT NAME header text
                        position: "relative",
                        paddingRight: 0,
                      }}
                      onClick={() => {
                        setSortName(
                          sortName === null
                            ? true // A–Z
                            : sortName === true
                            ? false // Z–A
                            : null // default
                        );
                        setSortNumber(null);
                        setSortId(null);
                        setSortEmpCount(null); // Ensure employee count sort is deactivated
                      }}
                      title="Sort by Client Name"
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          fontWeight: 600,
                          color: "#1D2536",
                          letterSpacing: 0.2,
                          justifyContent: "center", // Center content inside the span
                          width: "100%",
                        }}
                      >
                        CLIENT NAME
                        <svg
                          width="28"
                          height="18"
                          viewBox="0 0 28 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{
                            marginLeft: 4,
                            verticalAlign: "middle",
                            display: "inline-block",
                            opacity: sortName !== null ? 1 : 0.4,
                          }}
                          aria-hidden="true"
                        >
                          {/* Up arrow (left) */}
                          <g>
                            <line
                              x1="10"
                              y1="15"
                              x2="10"
                              y2="4"
                              stroke={sortName === true ? "#1D2636" : "#ACABAC"}
                              strokeWidth="2.2"
                              strokeLinecap="round"
                            />
                            <polyline
                              points="7,7 10,4 13,7"
                              stroke={sortName === true ? "#1D2636" : "#ACABAC"}
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </g>
                          {/* Down arrow (right) */}
                          <g>
                            <line
                              x1="18"
                              y1="4"
                              x2="18"
                              y2="15"
                              stroke={
                                sortName === false ? "#1D2636" : "#ACABAC"
                              }
                              strokeWidth="2.2"
                              strokeLinecap="round"
                            />
                            <polyline
                              points="15,12 18,15 21,12"
                              stroke={
                                sortName === false ? "#1D2636" : "#ACABAC"
                              }
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </g>
                        </svg>
                      </span>
                    </th>
                    <th
                      style={{
                        ...styles.th,
                        width: 60,
                        minWidth: 40,
                        maxWidth: 80,
                        textAlign: "center",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      onClick={() => {
                        setSortEmpCount(
                          sortEmpCount === null
                            ? true // ascending
                            : sortEmpCount === true
                            ? false // descending
                            : null // default (unsorted)
                        );
                        setSortNumber(null);
                        setSortName(null);
                        setSortId(null);
                      }}
                      title="Sort by Employee Count"
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        EMPLOYEE COUNT
                        <svg
                          width="28"
                          height="18"
                          viewBox="0 0 28 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{
                            marginLeft: 4,
                            verticalAlign: "middle",
                            display: "inline-block",
                            opacity: sortEmpCount !== null ? 1 : 0.4,
                          }}
                          aria-hidden="true"
                        >
                          {/* Up arrow (left) - colored if ascending */}
                          <g>
                            <line
                              x1="10"
                              y1="15"
                              x2="10"
                              y2="4"
                              stroke={
                                sortEmpCount === true ? "#1D2636" : "#ACABAC"
                              }
                              strokeWidth="2.2"
                              strokeLinecap="round"
                            />
                            <polyline
                              points="7,7 10,4 13,7"
                              stroke={
                                sortEmpCount === true ? "#1D2636" : "#ACABAC"
                              }
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </g>
                          {/* Down arrow (right) - colored if descending */}
                          <g>
                            <line
                              x1="18"
                              y1="4"
                              x2="18"
                              y2="15"
                              stroke={
                                sortEmpCount === false ? "#1D2636" : "#ACABAC"
                              }
                              strokeWidth="2.2"
                              strokeLinecap="round"
                            />
                            <polyline
                              points="15,12 18,15 21,12"
                              stroke={
                                sortEmpCount === false ? "#1D2636" : "#ACABAC"
                              }
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </g>
                        </svg>
                      </span>
                    </th>
                    <th
                      style={{
                        ...styles.th,
                        width: 70,
                        minWidth: 50,
                        maxWidth: 90,
                        textAlign: "center",
                      }}
                    >
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody
                  ref={tableBodyRef}
                  style={{
                    display: "block",
                    maxHeight: "45vh",
                    overflowY: "auto",
                    width: "100%",
                  }}
                >
                  {paginatedClients.map((client, idx) => {
                    const isChecked = checkedRows.includes(client.id);
                    // Highlighted row: dark bg, white text
                    const isHovered = hoveredRowIdx === idx;
                    const tdBg = isChecked
                      ? { background: "#1D2636", color: "#fff" }
                      : isHovered
                      ? { background: "#f9f9f9" }
                      : {};
                    return (
                      <tr
                        key={client.id || idx}
                        onMouseEnter={() => setHoveredRowIdx(idx)}
                        onMouseLeave={() => setHoveredRowIdx(null)}
                        style={{
                          cursor: "pointer",
                          display: "table",
                          width: "100%",
                        }}
                      >
                        <td
                          style={{
                            ...styles.td,
                            ...tdBg,
                            width: 44,
                            minWidth: 36,
                            maxWidth: 48,
                            textAlign: "center",
                            padding: "8px 4px",
                            verticalAlign: "middle",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center", // center align checkbox
                              height: "100%",
                            }}
                          >
                            <CustomCheckbox
                              checked={isChecked}
                              onChange={() => handleCheckboxChange(client.id)}
                            />
                          </div>
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            ...tdBg,
                            width: 44,
                            minWidth: 36,
                            maxWidth: 48,
                            textAlign: "center",
                            padding: "8px 4px",
                          }}
                        >
                          {sortNumber === false
                            ? filteredClients.length - idx
                            : idx + 1}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            ...tdBg,
                            width: 70,
                            minWidth: 50,
                            maxWidth: 80,
                            textAlign: "left", // changed from center to left
                          }}
                        >
                          {client.id}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            ...tdBg,
                            width: 120,
                            minWidth: 120,
                            maxWidth: 120,
                            textAlign: "left",
                          }}
                        >
                          {client.clientName}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            ...tdBg,
                            width: 60,
                            minWidth: 40,
                            maxWidth: 80,
                            textAlign: "center",
                          }}
                        >
                          {client.employeeCount ?? 0}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            ...tdBg,
                            width: 70,
                            minWidth: 50,
                            maxWidth: 90,
                            textAlign: "center",
                            padding: 0,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              justifyContent: "center",
                              height: 32,
                            }}
                          >
                            <ActionIconButton
                              type="edit"
                              onClick={() => handleEdit(client)}
                              title="Edit"
                            />
                            <ActionIconButton
                              type="delete"
                              onClick={() => handleDelete(client.id)}
                              title="Delete"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Modern Pagination Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 18,
                gap: 16,
                width: "100%",
                fontFamily: "'Inter', Arial, sans-serif",
              }}
            >
              {/* Left: Pagination Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  style={{
                    ...styles.actionBtn,
                    minWidth: 0,
                    width: 36,
                    height: 36,
                    padding: 0,
                    borderRadius: 18,
                    background: currentPage === 1 ? "#E8E8E8" : "#FFD87D",
                    color: "#1D2636",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                  }}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous Page"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ display: "block" }}
                  >
                    <polyline
                      points="11 5 7 9 11 13"
                      stroke="#1D2636"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </button>
                <select
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  style={{
                    fontFamily: "'Inter', Arial, sans-serif",
                    fontSize: "1rem",
                    border: "1.5px solid #e0e7ef",
                    borderRadius: 8,
                    padding: "6px 18px 6px 10px",
                    background: "#fff",
                    color: "#1D2636",
                    outline: "none",
                    minWidth: 60,
                    margin: "0 4px",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Page {i + 1}
                    </option>
                  ))}
                </select>
                <span
                  style={{ color: "#888", fontSize: "1rem", marginLeft: 2 }}
                >
                  of {totalPages}
                </span>
                <button
                  style={{
                    ...styles.actionBtn,
                    minWidth: 0,
                    width: 36,
                    height: 36,
                    padding: 0,
                    borderRadius: 18,
                    background:
                      currentPage === totalPages ? "#E8E8E8" : "#FFD87D",
                    color: "#1D2636",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                  }}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  aria-label="Next Page"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ display: "block" }}
                  >
                    <polyline
                      points="7 5 11 9 7 13"
                      stroke="#1D2636"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </button>
                <span
                  style={{ marginLeft: 18, color: "#888", fontSize: "1rem" }}
                >
                  Items per page
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) =>
                    handleItemsPerPageChange(Number(e.target.value))
                  }
                  style={{
                    fontFamily: "'Inter', Arial, sans-serif",
                    fontSize: "1rem",
                    border: "1.5px solid #e0e7ef",
                    borderRadius: 8,
                    padding: "6px 18px 6px 10px",
                    background: "#fff",
                    color: "#1D2636",
                    outline: "none",
                    minWidth: 60,
                    margin: "0 4px",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              {/* Right: Items range */}
              <div
                style={{
                  color: "#888",
                  fontSize: "1rem",
                  fontFamily: "'Inter', Arial, sans-serif",
                }}
              >
                {(() => {
                  const start =
                    filteredClients.length === 0
                      ? 0
                      : (currentPage - 1) * itemsPerPage + 1;
                  const end = Math.min(
                    currentPage * itemsPerPage,
                    filteredClients.length
                  );
                  return `${start} - ${end} of ${filteredClients.length} items`;
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default Clients;

const styles = {
  pageContainer: {
    padding: "0 0 32px 0",
    maxWidth: "100%",
    background: "#F9F9F9",
    width: "100%",
    height: "100%",
    color: "rgb(29, 37, 54)",
    overflow: "hidden",
  },
  pageTitle: {
    color: "rgb(29, 37, 54)",
    margin: 0,
    marginBottom: 18,
  },
  searchBarRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
    paddingLeft: 0,
    flexWrap: "wrap",
    fontFamily: "'Inter', Arial, sans-serif",
    color: "rgb(29, 37, 54)",
  },
  searchBarContainer: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    borderRadius: 24,
    boxShadow: "0 2px 8px rgba(68,95,109,0.10)",
    border: "1.5px solid #e0e7ef",
    padding: "2px 16px 2px 12px",
    width: 400,
    minWidth: 0,
    transition: "box-shadow 0.2s, border 0.2s",
    fontFamily: "'Inter', Arial, sans-serif",
    color: "rgb(29, 37, 54)",
  },
  searchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#000",
    padding: "8px",
    width: "100%",
    minWidth: 0,
    fontFamily: "'Inter', Arial, sans-serif",
    marginBottom: 0,
    marginTop: 0,
    borderRadius: 5,
    fontSize: "inherit",
  },
  actionBtn: {
    background: "#FFD87D",
    color: "rgb(29, 37, 54)",
    border: "none",
    borderRadius: "5px 5px 5px 5px",
    padding: "14px 30px",
    cursor: "pointer",
    marginLeft: 0,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    transition: "background 0.2s, box-shadow 0.2s",
    fontFamily: "'Inter', Arial, sans-serif",
    fontSize: "1rem", // ensure 16px
  },
  secondaryBtn: {
    background: "#92D6E3",
    color: "rgb(29, 37, 54)",
    border: "none",
    borderRadius: "5px 5px 5px 5px",
    padding: "14px 30px",
    cursor: "pointer",
    marginLeft: 0,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    transition: "background 0.2s, box-shadow 0.2s",
    fontFamily: "'Inter', Arial, sans-serif",
    fontSize: "1rem", // ensure 16px
  },
  tableContainer: {
    marginTop: 0,
    background: "#FFFFFF",
    borderRadius: "24px",
    border: "1px solid #E8E8E8",
    padding: 0,
    width: "100%",
    maxWidth: "100vw",
    overflow: "auto",
    // height: 420, // <-- removed fixed height
  },
  table: {
    width: "100%",
    minWidth: 0,
    borderCollapse: "separate",
    borderSpacing: "0",
    background: "#FFFFFF",
    borderRadius: "24px",
    overflow: "hidden",
    tableLayout: "fixed",
    maxWidth: "100%",
    margin: "0 auto",
    fontFamily: "'Inter', Arial, sans-serif",
    color: "rgb(29, 37, 54)",
    border: "1px solid #E8E8E8",
    boxShadow: "none",
  },
  th: {
    padding: "16px 28px",
    background: "#E8E8E8",
    color: "#1D2536",
    borderBottom: "none",
    textAlign: "center",
    verticalAlign: "middle",
    letterSpacing: 0.2,
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontFamily: "'Inter', Arial, sans-serif",
  },
  td: {
    padding: "14px 28px",
    color: "#1D2536",
    borderBottom: "none",
    background: "#fff",
    verticalAlign: "middle",
    wordBreak: "break-word",
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "none",
    fontFamily: "'Inter', Arial, sans-serif",
    textAlign: "left",
  },
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
    padding: 32,
    borderRadius: 14,
    minWidth: 400,
    maxWidth: 520,
    boxShadow: "0 6px 24px rgba(68,95,109,0.13)",
    fontFamily: "'Inter', Arial, sans-serif",
    color: "rgb(29, 37, 54)",
  },
  modalTitle: {
    color: "rgb(29, 37, 54)",
    margin: 0,
    marginBottom: 12,
    fontSize: "inherit",
    fontFamily: "inherit",
    fontWeight: "inherit",
  },
  modalTitleBold: {
    color: "rgb(29, 37, 54)",
    margin: 0,
    marginBottom: 6,
    letterSpacing: 0.2,
    textAlign: "left",
    padding: 0,
    fontSize: "inherit",
    fontFamily: "inherit",
    fontWeight: "inherit",
  },
  modalFormSection: {
    background: "#EFF2F4",
    borderRadius: 10,
    padding: "18px 18px 14px 18px",
    marginBottom: 0,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  modalLabel: {
    color: "#000",
    marginBottom: 0,
    display: "block",
    padding: "5px 0 0 0",
    fontSize: "inherit",
    fontFamily: "inherit",
    fontWeight: "inherit",
  },
  modalInput: {
    color: "#000",
    padding: "8px",
    border: "1px solid #e0e7ef",
    borderRadius: 6,
    marginTop: 2,
    marginBottom: 8,
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
    outline: "none",
    fontSize: "inherit",
    fontFamily: "inherit",
    fontWeight: "inherit",
  },
  modalButton: {
    color: "#000",
    background: "#f7f9fb",
    border: "1px solid #e0e7ef",
    borderRadius: 8,
    padding: "8px 18px",
    cursor: "pointer",
    transition: "background 0.2s, box-shadow 0.2s",
    fontSize: "1rem", // force 16px
    fontFamily: "inherit",
    fontWeight: "inherit",
  },
  modalButtonRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  animatedAddBtn: {
    background: "#FFD87D",
    color: "#1D2636",
    border: "none",
    borderRadius: 21,
    padding: 0,
    cursor: "pointer",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    width: 42,
    minWidth: 42,
    minHeight: 42,
    transition: "background 0.2s, transform 0.2s",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
};

// Custom Checkbox component
function CustomCheckbox({ checked, indeterminate, onChange }) {
  const ref = React.useRef();
  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        width: 20,
        height: 20,
      }}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{
          position: "absolute",
          opacity: 0,
          width: 20,
          height: 20,
          margin: 0,
          cursor: "pointer",
        }}
      />
      <span
        style={{
          display: "inline-block",
          width: 20,
          height: 20,
          border: "2px solid #ACABAC", // checkbox border color
          borderRadius: 4,
          background: "#fff",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {checked && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              display: "block",
            }}
          >
            <polyline
              points="3.5,8.5 7,12 12.5,4.5"
              fill="none"
              stroke="#1D2636"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {/* Indeterminate bar */}
        {indeterminate && !checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              display: "block",
            }}
          >
            <rect
              x="2"
              y="5.2"
              width="8"
              height="1.6"
              rx="0.8"
              fill="#1D2636"
            />
          </svg>
        )}
      </span>
    </label>
  );
}

// Place this above the Clients component or at the bottom of the file:
function ActionIconButton({ type, onClick, title }) {
  const [hover, setHover] = useState(false);
  // Font size matches table body (17px), icon ~18px, container 28x28
  const iconColor = hover ? "#fff" : "#1D2636";
  const bgColor = hover ? "#1F2637" : "rgb(255,216,125)";
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: bgColor,
        border: "none",
        outline: "none",
        padding: 0,
        margin: 0,
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        borderRadius: 7,
        transition: "background 0.18s, color 0.18s",
        boxShadow: hover ? "0 1px 4px rgba(29,37,54,0.10)" : "none",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {type === "edit" ? (
        // 3 horizontal dots (kebab) icon
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block" }}
        >
          <circle cx="4.5" cy="9" r="1.5" fill={iconColor} />
          <circle cx="9" cy="9" r="1.5" fill={iconColor} />
          <circle cx="13.5" cy="9" r="1.5" fill={iconColor} />
        </svg>
      ) : (
        // Modern, bold trash bin (no inner lines)
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block" }}
        >
          <rect
            x="4.5"
            y="6"
            width="9"
            height="8"
            rx="2"
            stroke={iconColor}
            strokeWidth="1.6"
            fill="none"
          />
          <rect
            x="6.5"
            y="3"
            width="5"
            height="2.2"
            rx="1"
            stroke={iconColor}
            strokeWidth="1.6"
            fill={hover ? iconColor : "#fff"}
          />
          <line
            x1="4"
            y1="6"
            x2="14"
            y2="6"
            stroke={iconColor}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}

function AddNewClientButton({ onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        background: hover ? "#1F2637" : "#FFD87D",
        color: hover ? "#fff" : "#1D2636",
        border: "none",
        borderRadius: "5px",
        width: 36,
        height: 36,
        minWidth: 36,
        minHeight: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        fontSize: "1rem",
        padding: 0,
        position: "relative",
        transition: "background 0.2s, color 0.2s, box-shadow 0.2s",
        marginLeft: 8,
        marginRight: 0,
      }}
      aria-label="Add New Client"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
        aria-hidden="true"
      >
        <circle
          cx="10"
          cy="10"
          r="9"
          stroke={hover ? "#fff" : "#1D2636"}
          strokeWidth="2"
          fill={hover ? "#1F2637" : "#FFD87D"}
        />
        <line
          x1="10"
          y1="6"
          x2="10"
          y2="14"
          stroke={hover ? "#fff" : "#1D2636"}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="6"
          y1="10"
          x2="14"
          y2="10"
          stroke={hover ? "#fff" : "#1D2636"}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

function BulkDeleteButton({ onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        background: hover ? "#1F2637" : "#FFD87D",
        color: hover ? "#fff" : "#1D2636",
        border: "none",
        borderRadius: "5px",
        width: 36,
        height: 36,
        minWidth: 36,
        minHeight: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        fontSize: "1rem",
        padding: 0,
        position: "relative",
        transition: "background 0.2s, color 0.2s, box-shadow 0.2s",
        marginLeft: 8,
        marginRight: 0,
      }}
      aria-label="Delete Selected"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Delete Selected"
    >
      {/* Trash bin icon, now 20x20 to match add icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <rect
          x="5.5"
          y="7"
          width="9"
          height="8"
          rx="2"
          stroke={hover ? "#fff" : "#1D2636"}
          strokeWidth="1.6"
          fill={hover ? "#1F2637" : "#FFD87D"}
        />
        <rect
          x="7.5"
          y="3.5"
          width="5"
          height="2.2"
          rx="1"
          stroke={hover ? "#fff" : "#1D2636"}
          strokeWidth="1.6"
          fill={hover ? "#fff" : "#FFD87D"}
        />
        <line
          x1="5"
          y1="7"
          x2="15"
          y2="7"
          stroke={hover ? "#fff" : "#1D2636"}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
