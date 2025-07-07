import { useState, useEffect } from "react";
import {
  addClient,
  getAllClients,
  updateClient,
  deleteClient,
} from "../services/clientService";
import { getAllEmployees } from "../services/employeeService";

const isValidClientName = (value) => value.trim().length > 0; // allow anything except empty

function ClientFormModal({ data, onChange, onSave, onCancel, isValid }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>
          {data.id ? "Edit Client" : "Add Client"}
        </h3>
        <div>
          <label style={styles.modalLabel}>Client Name:</label>
          <input
            name="clientName"
            value={data.clientName}
            onChange={onChange}
            style={styles.modalInput}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={onSave}
            disabled={!isValid}
            style={styles.modalButton}
          >
            Save
          </button>
          <button
            onClick={onCancel}
            style={{ ...styles.modalButton, marginLeft: 8 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({ onConfirm, onCancel }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Confirm Deletion</h3>
        <p style={styles.modalText}>
          Are you sure you want to delete this client?
        </p>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={onConfirm}
            style={{ ...styles.modalButton, color: "red" }}
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            style={{ ...styles.modalButton, marginLeft: 8 }}
          >
            Cancel
          </button>
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
  const [sortByAZ, setSortByAZ] = useState(false);
  const [addBtnHover, setAddBtnHover] = useState(false);
  const [sortBtnHover, setSortBtnHover] = useState(false);

  useEffect(() => {
    loadClientsAndEmployees();
  }, []);

  const loadClientsAndEmployees = async () => {
    setLoading(true);
    const [clientData] = await Promise.all([getAllClients()]);
    setClients(clientData);
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

  let filteredClients = clients.filter(
    (client) =>
      client.clientName.toLowerCase().includes(search.toLowerCase()) ||
      String(client.id).toLowerCase().includes(search.toLowerCase())
  );
  if (sortByAZ) {
    filteredClients = [...filteredClients].sort((a, b) =>
      a.clientName.localeCompare(b.clientName)
    );
  }

  return (
    <div style={styles.pageContainer}>
      <h2 style={styles.pageTitle}>Client Database</h2>
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
        <button
          onClick={() => setSortByAZ((prev) => !prev)}
          style={{
            ...styles.secondaryBtn,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: sortBtnHover
              ? "#1F2637"
              : styles.secondaryBtn.background,
            color: sortBtnHover ? "#fff" : "#1D2536",
            transition: "background 0.2s, color 0.2s",
            padding: "14px 30px 14px 30px", // Ensure even padding like actionBtn
          }}
          onMouseEnter={() => setSortBtnHover(true)}
          onMouseLeave={() => setSortBtnHover(false)}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: sortBtnHover ? "#fff" : "#1D2536",
              transition: "color 0.2s",
            }}
          >
            {sortByAZ ? "CLEAR SORT" : "SORT BY NAME (A-Z)"}
            <svg
              width="28"
              height="18"
              viewBox="0 0 28 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                marginLeft: 8,
                verticalAlign: "middle",
                display: "inline-block",
              }}
              aria-hidden="true"
            >
              {/* Up arrow with longer tail (left) */}
              <g>
                <line
                  x1="10"
                  y1="15"
                  x2="10"
                  y2="4"
                  stroke={sortBtnHover ? "#fff" : "#1D2536"}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <polyline
                  points="7,7 10,4 13,7"
                  stroke={sortBtnHover ? "#fff" : "#1D2536"}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </g>
              {/* Down arrow with longer tail (right, closer to left) */}
              <g>
                <line
                  x1="18"
                  y1="4"
                  x2="18"
                  y2="15"
                  stroke={sortBtnHover ? "#fff" : "#1D2536"}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <polyline
                  points="15,12 18,15 21,12"
                  stroke={sortBtnHover ? "#fff" : "#1D2536"}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </g>
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
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th
                  style={{
                    ...styles.th,
                    width: 70,
                    minWidth: 50,
                    maxWidth: 80,
                    textAlign: "center", // Center Client ID header
                  }}
                >
                  Client ID
                </th>
                <th
                  style={{
                    ...styles.th,
                    width: 140,
                    minWidth: 100,
                    maxWidth: 180,
                  }}
                >
                  Client Name
                </th>
                <th
                  style={{
                    ...styles.th,
                    width: 60,
                    minWidth: 40,
                    maxWidth: 80,
                    textAlign: "center",
                  }}
                >
                  Employee Count
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id}>
                  <td
                    style={{
                      ...styles.td,
                      width: 70,
                      minWidth: 50,
                      maxWidth: 80,
                      textAlign: "center", // Center Client ID cell
                    }}
                  >
                    {client.id}
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      width: 140,
                      minWidth: 100,
                      maxWidth: 180,
                      textAlign: "left", // Left-align Client Name for readability
                    }}
                  >
                    {client.clientName}
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      width: 60,
                      minWidth: 40,
                      maxWidth: 80,
                      textAlign: "center", // Center Employee Count for consistency
                    }}
                  >
                    {client.employeeCount ?? 0}
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      width: 70,
                      minWidth: 50,
                      maxWidth: 90,
                      textAlign: "center", // Center Actions for consistency
                      padding: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        height: 32,
                      }}
                    >
                      <button
                        style={{
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "none",
                          outline: "none",
                          borderRadius: 6,
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
                        onClick={() => handleEdit(client)}
                        title="Edit"
                      >
                        <svg
                          width="16"
                          height="16"
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
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "none",
                          outline: "none",
                          borderRadius: 6,
                          background: "#ffe9ec",
                          cursor: "pointer",
                          transition: "background 0.18s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#ffd6de")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "#ffe9ec")
                        }
                        onClick={() => handleDelete(client.id)}
                        title="Delete"
                      >
                        <svg
                          width="16"
                          height="16"
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

export default Clients;

const styles = {
  pageContainer: {
    padding: "0 0 32px 0",
    maxWidth: "100%",
    background: "#fff", // Changed from #f7f9fb to white
    minHeight: "100vh",
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
    fontWeight: 300,
    color: "rgb(29, 37, 54)",
    fontSize: 17,
    lineHeight: "24px",
  },
  pageTitle: {
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
    fontWeight: 700,
    color: "rgb(29, 37, 54)",
    fontSize: 50,
    lineHeight: "50px",
    margin: 0,
    marginBottom: 18,
    letterSpacing: 1,
  },
  searchBarRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
    paddingLeft: 0,
    flexWrap: "wrap",
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
    fontWeight: 300,
    color: "rgb(29, 37, 54)",
    fontSize: 17,
    lineHeight: "24px",
  },
  searchBarContainer: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    borderRadius: 24,
    boxShadow: "0 2px 8px rgba(68,95,109,0.10)",
    border: "1.5px solid #e0e7ef",
    padding: "2px 16px 2px 12px",
    width: 400, // Increased from 320 to 400 for full placeholder visibility
    minWidth: 0,
    transition: "box-shadow 0.2s, border 0.2s",
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
    fontWeight: 300,
    color: "rgb(29, 37, 54)",
    fontSize: 17,
    lineHeight: "24px",
  },
  searchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 17,
    color: "rgb(29, 37, 54)",
    padding: "10px 0 10px 8px",
    width: "100%",
    fontWeight: 300,
    minWidth: 0,
    lineHeight: "24px",
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
  },
  actionBtn: {
    background: "#FFD87D",
    color: "rgb(29, 37, 54)",
    border: "none",
    borderRadius: "5px 5px 5px 5px", // Changed from 8 to 5px all corners
    padding: "14px 30px 14px 30px", // Updated padding
    fontWeight: 300,
    fontSize: 15,
    cursor: "pointer",
    marginLeft: 0,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    transition: "background 0.2s, box-shadow 0.2s",
    lineHeight: "15px",
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
  },
  secondaryBtn: {
    background: "#92D6E3",
    color: "rgb(29, 37, 54)",
    border: "none",
    borderRadius: "5px 5px 5px 5px", // Changed from 8 to 5px all corners
    padding: "14px 30px 13px 30px", // Updated padding
    fontWeight: 300,
    fontSize: 15,
    cursor: "pointer",
    marginLeft: 0,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    transition: "background 0.2s, box-shadow 0.2s",
    lineHeight: "15px",
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
  },
  tableContainer: {
    marginTop: 16,
    background: "#f5f7fa", // subtle background to visually anchor the table
    borderRadius: 16,
    boxShadow: "0 2px 12px rgba(68,95,109,0.10)",
    padding: 0,
    width: "100%",
    maxWidth: "100vw",
    overflowX: "unset", // Remove horizontal scroll
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
    fontWeight: 300,
    color: "rgb(29, 37, 54)",
    fontSize: 17,
    lineHeight: "24px",
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
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
    fontWeight: 300,
    color: "rgb(29, 37, 54)",
    fontSize: 17,
    lineHeight: "24px",
  },
  th: {
    padding: "6px 8px", // slightly reduced vertical padding for less row height
    background: "#1D2536",
    color: "#fff",
    fontWeight: 400, // slightly bolder for header
    fontSize: 17,
    borderBottom: "2px solid #e0e7ef",
    textAlign: "center",
    letterSpacing: 0.2,
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
    lineHeight: "22px", // slightly reduced
  },
  td: {
    padding: "5px 8px", // slightly reduced vertical padding for less row height
    color: "rgb(29, 37, 54)",
    fontSize: 17,
    borderBottom: "1px solid #e0e7ef",
    background: "#EFF2F4", // updated table body background
    verticalAlign: "middle",
    wordBreak: "break-word",
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "none",
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
    fontWeight: 300,
    lineHeight: "22px", // slightly reduced
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
    padding: 24,
    borderRadius: 14,
    minWidth: 300,
    boxShadow: "0 6px 24px rgba(68,95,109,0.13)",
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
    fontWeight: 300,
    color: "rgb(29, 37, 54)",
    fontSize: 17,
    lineHeight: "24px",
  },
  modalTitle: {
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
    fontWeight: 300,
    color: "rgb(29, 37, 54)",
    fontSize: 17,
    lineHeight: "24px",
    margin: 0,
    marginBottom: 12,
  },
  modalLabel: {
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
    fontWeight: 300,
    color: "rgb(29, 37, 54)",
    fontSize: 17,
    lineHeight: "24px",
    marginBottom: 4,
    display: "block",
  },
  modalText: {
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
    fontWeight: 300,
    color: "rgb(29, 37, 54)",
    fontSize: 17,
    lineHeight: "24px",
    margin: 0,
    marginBottom: 12,
  },
  modalInput: {
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
    fontWeight: 300,
    color: "rgb(29, 37, 54)",
    fontSize: 17,
    lineHeight: "24px",
    padding: "8px 10px",
    border: "1px solid #e0e7ef",
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 8,
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
    outline: "none",
  },
  modalButton: {
    fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
    fontStyle: "normal",
    fontWeight: 300,
    color: "rgb(29, 37, 54)",
    fontSize: 15,
    lineHeight: "15px",
    background: "#f7f9fb",
    border: "1px solid #e0e7ef",
    borderRadius: 8,
    padding: "8px 18px",
    cursor: "pointer",
    transition: "background 0.2s, box-shadow 0.2s",
  },
};
