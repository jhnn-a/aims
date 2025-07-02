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
        <h3>{data.id ? "Edit Client" : "Add Client"}</h3>
        <div>
          <label>Client Name:</label>
          <input
            name="clientName"
            value={data.clientName}
            onChange={onChange}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <button onClick={onSave} disabled={!isValid}>
            Save
          </button>
          <button onClick={onCancel} style={{ marginLeft: 8 }}>
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
        <h3>Confirm Deletion</h3>
        <p>Are you sure you want to delete this client?</p>
        <div style={{ marginTop: 16 }}>
          <button onClick={onConfirm} style={{ color: "red" }}>
            Delete
          </button>
          <button onClick={onCancel} style={{ marginLeft: 8 }}>
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

  let filteredClients = clients.filter((client) =>
    client.clientName.toLowerCase().includes(search.toLowerCase())
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
            placeholder="Search by client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <button onClick={() => setShowForm(true)} style={styles.actionBtn}>
          Add New Client
        </button>
        <button
          onClick={() => setSortByAZ((prev) => !prev)}
          style={styles.secondaryBtn}
        >
          {sortByAZ ? "Clear Sort" : "Sort by Name (A-Z)"}
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
                {/* To adjust table width, edit the width/minWidth/maxWidth values below */}
                <th style={{ ...styles.th, width: 70, minWidth: 50, maxWidth: 80 }}>ID</th>
                <th style={{ ...styles.th, width: 140, minWidth: 100, maxWidth: 180 }}>Client Name</th>
                <th style={{ ...styles.th, width: 60, minWidth: 40, maxWidth: 80, textAlign: "center" }}>Employee Count</th>
                <th style={{ ...styles.th, width: 70, minWidth: 50, maxWidth: 90, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id}>
                  <td style={{ ...styles.td, width: 70, minWidth: 50, maxWidth: 80 }}>{client.id}</td>
                  <td style={{ ...styles.td, width: 140, minWidth: 100, maxWidth: 180 }}>{client.clientName}</td>
                  <td style={{ ...styles.td, width: 60, minWidth: 40, maxWidth: 80, textAlign: "center" }}>{client.employeeCount ?? 0}</td>
                  <td style={{ ...styles.td, width: 70, minWidth: 50, maxWidth: 90, textAlign: "center", padding: 0 }}>
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
                        onMouseEnter={e => e.currentTarget.style.background = "#d0f0f7"}
                        onMouseLeave={e => e.currentTarget.style.background = "#eaf7fa"}
                        onClick={() => handleEdit(client)}
                        title="Edit"
                      >
                        <svg width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M12 20h9"/>
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
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
                        onMouseEnter={e => e.currentTarget.style.background = "#ffd6de"}
                        onMouseLeave={e => e.currentTarget.style.background = "#ffe9ec"}
                        onClick={() => handleDelete(client.id)}
                        title="Delete"
                      >
                        <svg width="16" height="16" fill="none" stroke="#e57373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
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
    padding: "32px 0 32px 0",
    maxWidth: "100%",
    background: "#f7f9fb",
    minHeight: "100vh",
    fontFamily: "Segoe UI, Arial, sans-serif",
  },
  pageTitle: {
    color: "#233037",
    fontWeight: 800,
    fontSize: 28,
    margin: 0,
    marginBottom: 18,
    letterSpacing: 1,
    fontFamily: 'Segoe UI, Arial, sans-serif',
  },
  searchBarRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
    paddingLeft: 0,
    flexWrap: 'wrap',
  },
  searchBarContainer: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    borderRadius: 24,
    boxShadow: "0 2px 8px rgba(68,95,109,0.10)",
    border: "1.5px solid #e0e7ef",
    padding: "2px 16px 2px 12px",
    width: 320,
    minWidth: 0,
    transition: "box-shadow 0.2s, border 0.2s",
  },
  searchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 17,
    color: "#233037",
    padding: "10px 0 10px 8px",
    width: "100%",
    fontWeight: 500,
    minWidth: 0,
  },
  actionBtn: {
    background: "#70C1B3",
    color: "#233037",
    border: "none",
    borderRadius: 8,
    padding: "10px 22px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    marginLeft: 0,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    transition: "background 0.2s, box-shadow 0.2s",
  },
  secondaryBtn: {
    background: "#FFE066",
    color: "#233037",
    border: "none",
    borderRadius: 8,
    padding: "10px 22px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    marginLeft: 0,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    transition: "background 0.2s, box-shadow 0.2s",
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
    borderSpacing: 0 ,
    background: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    tableLayout: "fixed", // Make columns auto-fit
    maxWidth: "100%",
    margin: "0 auto",
  },
  th: {
    padding: "8px 8px", // reduced vertical and horizontal padding
    background: "#445F6D",
    color: "#fff",
    fontWeight: 700,
    fontSize: 15, // slightly smaller font
    borderBottom: "2px solid #e0e7ef",
    textAlign: "left",
    letterSpacing: 0.2,
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  td: {
    padding: "6px 8px", // reduced vertical and horizontal padding
    color: "#233037",
    fontSize: 14, // slightly smaller font
    borderBottom: "1px solid #e0e7ef",
    background: "#f7f9fb",
    verticalAlign: "middle",
    wordBreak: "break-word",
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "none",
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
  },
};
