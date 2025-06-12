import { useState, useEffect } from "react";
import {
  addClient,
  getAllClients,
  updateClient,
  deleteClient,
} from "../services/clientService";
import { getAllEmployees } from "../services/employeeService";

const isValidName = (value) => /^[A-Za-z\s]+$/.test(value.trim());

const ClientFormModal = ({ data, onChange, onSave, onCancel, isValid }) => (
  <div style={styles.modalOverlay}>
    <div style={styles.modalContent}>
      <h3>{data.id ? "Edit Client" : "Add Client"}</h3>
      <div>
        <label>Client Name:</label>
        <input name="clientName" value={data.clientName} onChange={onChange} />
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

const DeleteConfirmationModal = ({ onConfirm, onCancel }) => (
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

function Clients() {
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]); // Store all employees
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({
    id: null,
    clientName: "",
  });

  useEffect(() => {
    loadClientsAndEmployees();
  }, []);

  const loadClientsAndEmployees = async () => {
    setLoading(true);
    const [clientData, employeeData] = await Promise.all([
      getAllClients(),
      getAllEmployees(),
    ]);
    setClients(clientData);
    setEmployees(employeeData);
    setLoading(false);
  };

  const handleInput = ({ target: { name, value } }) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const isFormValid = () => isValidName(form.clientName);

  const handleSave = async () => {
    if (!isFormValid()) return;
    const payload = {
      clientName: form.clientName.trim(),
    };
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

  // Helper: count employees for a given clientId
  const getEmployeeCount = (clientId) =>
    employees.filter((emp) => emp.clientId === clientId).length;

  return (
    <div style={styles.pageContainer}>
      <h2>Client Database</h2>
      <button onClick={() => setShowForm(true)}>Add New Client</button>

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
              {clients.map((client) => (
                <tr key={client.id}>
                  <td style={styles.td}>{client.id}</td>
                  <td style={styles.td}>{client.clientName}</td>
                  <td style={styles.td}>{getEmployeeCount(client.id)}</td>
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
