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
      <h2>Client Database</h2>
      <input
        type="text"
        placeholder="Search by client name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12, padding: 6, width: 240 }}
      />
      <button onClick={() => setShowForm(true)} style={{ marginLeft: 12 }}>
        Add New Client
      </button>
      <button
        onClick={() => setSortByAZ((prev) => !prev)}
        style={{ marginLeft: 12 }}
      >
        {sortByAZ ? "Clear Sort" : "Sort by Name (A-Z)"}
      </button>

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
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Client Name</th>
                <th style={styles.th}>Employee Count</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id}>
                  <td style={styles.td}>{client.id}</td>
                  <td style={styles.td}>{client.clientName}</td>
                  <td style={styles.td}>{client.employeeCount ?? 0}</td>
                  <td style={styles.td}>
                    <button onClick={() => handleEdit(client)}>Edit</button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      style={{ marginLeft: 8, color: "red" }}
                    >
                      Delete
                    </button>
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
  pageContainer: { padding: 16, maxWidth: "100%" },
  tableContainer: { marginTop: 16, overflowX: "auto" },
  table: { width: "100%", minWidth: 600, borderCollapse: "collapse" },
  th: {
    border: "1px solid #ccc",
    padding: 8,
    backgroundColor: "#f5f5f5",
    textAlign: "left",
  },
  td: { border: "1px solid #ccc", padding: 8 },
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
    borderRadius: 8,
    minWidth: 300,
  },
};
