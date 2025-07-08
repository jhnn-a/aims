import { useState, useEffect } from "react";
import {
  addClient,
  getAllClients,
  updateClient,
  deleteClient,
} from "../services/clientService";
import { getAllEmployees } from "../services/employeeService";

const isValidClientName = (value) => value.trim().length > 0; // allow anything except empty

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
      <div style={styles.modalContent}>
        <h3 style={{ ...styles.modalTitleBold, marginBottom: 6 }}>
          {data.id ? "Edit Client Details" : "Add New Client"}
        </h3>
        <div
          style={{
            ...styles.modalFormSection,
            padding: "18px 18px 14px 18px",
            gap: 10,
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
              ...styles.modalButtonRow,
              gap: 8,
              justifyContent: "flex-end",
              width: "100%",
            }}
          >
            <button
              onClick={handleSaveClick}
              style={{
                ...styles.actionBtn,
                width: "50%",
                borderRadius: 5,
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
                borderRadius: 5,
                background: "#fff",
                color: styles.modalButton.color || "#000",
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
          width: 400,
          minWidth: 400,
          maxWidth: 400,
        }}
      >
        <h3 style={{ ...styles.modalTitleBold, marginBottom: 6 }}>
          Confirm Deletion
        </h3>
        <div
          style={{
            ...styles.modalFormSection,
            padding: "18px 18px 14px 18px",
            gap: 10,
          }}
        >
          <p
            style={{
              fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
              margin: 0,
              marginBottom: 0,
              textAlign: "left",
              maxWidth: 340,
              wordBreak: "break-word",
            }}
          >
            Are you sure you want to permanently delete this client?{" "}
            <span style={{ fontWeight: 400, color: "#e53935" }}>
              This action cannot be undone.
            </span>
          </p>
          <div
            style={{
              ...styles.modalButtonRow,
              gap: 8,
              justifyContent: "flex-end",
              width: "100%",
              marginTop: 0,
            }}
          >
            <button
              onClick={onConfirm}
              style={{
                ...styles.actionBtn,
                width: "50%",
                borderRadius: 5,
                background: hovered.delete ? "#e53935" : "#fff",
                color: hovered.delete ? "#fff" : "#e53935",
                fontWeight: 700,
                border: "1.5px solid #e53935",
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
                borderRadius: 5,
                background: hovered.cancel ? "#1F2637" : "#fff",
                color: hovered.cancel
                  ? "#fff"
                  : styles.modalButton.color || "#000",
                border: "1.5px solid #e0e7ef",
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
  const [checkedRows, setCheckedRows] = useState([]); // for checkboxes
  const [editBtnHoverIdx, setEditBtnHoverIdx] = useState(null);
  const [deleteBtnHoverIdx, setDeleteBtnHoverIdx] = useState(null);
  const [hoveredRowIdx, setHoveredRowIdx] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  // Store the original order for # column sorting
  const [originalClients, setOriginalClients] = useState([]);

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

  const handleCheckboxChange = (id) => {
    setCheckedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };
  const handleCheckAll = (e) => {
    if (e.target.checked) {
      setCheckedRows(filteredClients.map((client) => client.id));
    } else {
      setCheckedRows([]);
    }
  };

  let filteredClients = clients.filter(
    (client) =>
      client.clientName.toLowerCase().includes(search.toLowerCase()) ||
      String(client.id).toLowerCase().includes(search.toLowerCase())
  );

  // Apply sorting
  if (sortNumber !== null) {
    // # column: reverse the filtered rows, not just the numbers
    if (sortNumber === false) {
      filteredClients = [...filteredClients].reverse(); // descending (reversed order)
    } else {
      filteredClients = [...filteredClients]; // ascending (original order)
    }
  } else if (sortEmpCount !== null) {
    filteredClients = [...filteredClients].sort((a, b) =>
      sortEmpCount === true
        ? (a.employeeCount ?? 0) - (b.employeeCount ?? 0)
        : (b.employeeCount ?? 0) - (a.employeeCount ?? 0)
    );
  } else if (sortId !== null) {
    // Extract last 4 digits as number for sorting
    const getIdNum = (id) => {
      const match = String(id).match(/(\d{4})$/); // WRONG: double backslash
      return match ? Number(match[1]) : 0;
    };
    filteredClients = [...filteredClients].sort((a, b) =>
      sortId === true
        ? getIdNum(a.id) - getIdNum(b.id)
        : getIdNum(b.id) - getIdNum(a.id)
    );
  } else if (sortName !== null) {
    filteredClients = [...filteredClients].sort((a, b) =>
      sortName === true
        ? a.clientName.localeCompare(b.clientName)
        : b.clientName.localeCompare(a.clientName)
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
          <button
            onClick={() => setShowForm(true)}
            style={{
              ...styles.actionBtn,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: addBtnHover ? "#1F2637" : styles.actionBtn.background,
              color: addBtnHover ? "#fff" : styles.actionBtn.color,
              transition: "background 0.2s, color 0.2s",
            }}
            onMouseEnter={() => setAddBtnHover(true)}
            onMouseLeave={() => setAddBtnHover(false)}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: addBtnHover ? "#fff" : styles.actionBtn.color,
                transition: "color 0.2s",
              }}
            >
              ADD NEW CLIENT
              <svg
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  marginLeft: 8,
                  verticalAlign: "middle",
                  display: "inline-block",
                }}
                aria-hidden="true"
              >
                <circle
                  cx="10"
                  cy="10"
                  r="9"
                  stroke={addBtnHover ? "#fff" : "#1D2536"}
                  strokeWidth="2"
                />
                <line
                  x1="10"
                  y1="6"
                  x2="10"
                  y2="14"
                  stroke={addBtnHover ? "#fff" : "#1D2536"}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="6"
                  y1="10"
                  x2="14"
                  y2="10"
                  stroke={addBtnHover ? "#fff" : "#1D2536"}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </button>
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
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
          />
        )}

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
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
                            checkedRows.length === filteredClients.length &&
                            filteredClients.length > 0
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
                <tbody>
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
                        key={client.id}
                        onMouseEnter={() => setHoveredRowIdx(idx)}
                        onMouseLeave={() => setHoveredRowIdx(null)}
                        style={{ cursor: "pointer" }}
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
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 24,
                }}
              >
                <button
                  style={{
                    ...styles.actionBtn,
                    padding: "8px 18px",
                    minWidth: 0,
                    fontSize: "1rem",
                    background: "#E8E8E8",
                    color: "#1D2636",
                    border: "none",
                  }}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                {/* Windowed Pagination Logic */}
                {(() => {
                  const pageButtons = [];
                  const windowSize = 2; // pages to show left/right of current
                  const showFirst = 1;
                  const showLast = totalPages;
                  let start = Math.max(currentPage - windowSize, 2);
                  let end = Math.min(currentPage + windowSize, totalPages - 1);
                  if (currentPage <= windowSize + 2) {
                    start = 2;
                    end = Math.min(2 + windowSize * 2, totalPages - 1);
                  }
                  if (currentPage >= totalPages - windowSize - 1) {
                    start = Math.max(totalPages - windowSize * 2, 2);
                    end = totalPages - 1;
                  }
                  // Always show first page
                  pageButtons.push(
                    <button
                      key={1}
                      style={{
                        ...styles.actionBtn,
                        padding: "8px 14px",
                        minWidth: 0,
                        fontSize: "1rem",
                        background: currentPage === 1 ? "#1F2637" : "#E8E8E8",
                        color: currentPage === 1 ? "#fff" : "#1D2636",
                        border:
                          currentPage === 1 ? "1.5px solid #1F2637" : "none",
                      }}
                      onClick={() => setCurrentPage(1)}
                    >
                      1
                    </button>
                  );
                  // Ellipsis if needed
                  if (start > 2) {
                    pageButtons.push(
                      <span
                        key="start-ellipsis"
                        style={{ padding: "0 4px", color: "#888" }}
                      >
                        ...
                      </span>
                    );
                  }
                  // Middle page buttons
                  for (let i = start; i <= end; i++) {
                    pageButtons.push(
                      <button
                        key={i}
                        style={{
                          ...styles.actionBtn,
                          padding: "8px 14px",
                          minWidth: 0,
                          fontSize: "1rem",
                          background: currentPage === i ? "#1F2637" : "#E8E8E8",
                          color: currentPage === i ? "#fff" : "#1D2636",
                          border:
                            currentPage === i ? "1.5px solid #1F2637" : "none",
                        }}
                        onClick={() => setCurrentPage(i)}
                      >
                        {i}
                      </button>
                    );
                  }
                  // Ellipsis if needed
                  if (end < totalPages - 1) {
                    pageButtons.push(
                      <span
                        key="end-ellipsis"
                        style={{ padding: "0 4px", color: "#888" }}
                      >
                        ...
                      </span>
                    );
                  }
                  // Always show last page if more than 1
                  if (totalPages > 1) {
                    pageButtons.push(
                      <button
                        key={totalPages}
                        style={{
                          ...styles.actionBtn,
                          padding: "8px 14px",
                          minWidth: 0,
                          fontSize: "1rem",
                          background:
                            currentPage === totalPages ? "#1F2637" : "#E8E8E8",
                          color:
                            currentPage === totalPages ? "#fff" : "#1D2636",
                          border:
                            currentPage === totalPages
                              ? "1.5px solid #1F2637"
                              : "none",
                        }}
                        onClick={() => setCurrentPage(totalPages)}
                      >
                        {totalPages}
                      </button>
                    );
                  }
                  return pageButtons;
                })()}
                <button
                  style={{
                    ...styles.actionBtn,
                    padding: "8px 18px",
                    minWidth: 0,
                    fontSize: "1rem",
                    background: "#E8E8E8",
                    color: "#1D2636",
                    border: "none",
                  }}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
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
    fontSize: "inherit",
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
    fontSize: "inherit",
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
    maxHeight: "calc(100vh - 170px)",
    fontFamily: "'Inter', Arial, sans-serif",
    color: "rgb(29, 37, 54)",
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
    fontSize: "inherit",
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
};

// Custom Checkbox component
function CustomCheckbox({ checked, onChange }) {
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

// Set the background color for the outermost <main> if this file is the entry point for a page
// If this <main> is nested, ensure the outer <main> in App.js or the layout file has backgroundColor: '#F9F9F9'
// Example for App.js or layout file:
// <main style={{ backgroundColor: '#F9F9F9', minHeight: '100vh', width: '100vw' }}> ... </main>
