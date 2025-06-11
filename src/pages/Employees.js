import { useState, useEffect } from "react";
import {
  addEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
} from "../services/employeeService";

const EmployeeFormModal = ({ data, onChange, onSave, onCancel }) => (
  <div style={styles.modalOverlay}>
    <div style={styles.modalContent}>
      <h3>{data.id ? "Edit Employee" : "Add Employee"}</h3>
      <div>
        <label>Full Name:</label>
        <input name="fullName" value={data.fullName} onChange={onChange} />
      </div>
      <div>
        <label>Position:</label>
        <input name="position" value={data.position} onChange={onChange} />
      </div>
      <div>
        <label>Status:</label>
        <input name="status" value={data.status} onChange={onChange} />
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={onSave}>Save</button>
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
      <p>Are you sure you want to delete this employee?</p>
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

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({
    id: null,
    fullName: "",
    position: "",
    status: "",
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    const data = await getAllEmployees();
    setEmployees(data);
    setLoading(false);
  };

  const handleInput = ({ target: { name, value } }) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const handleSave = async () => {
    const payload = {
      fullName: form.fullName,
      position: form.position,
      status: form.status,
    };
    form.id
      ? await updateEmployee(form.id, payload)
      : await addEmployee(payload);
    resetForm();
    loadEmployees();
  };

  const handleEdit = (emp) => {
    setForm(emp);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setSelectedId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    await deleteEmployee(selectedId);
    setSelectedId(null);
    setShowConfirm(false);
    loadEmployees();
  };

  const cancelDelete = () => {
    setSelectedId(null);
    setShowConfirm(false);
  };

  const resetForm = () => {
    setForm({ id: null, fullName: "", position: "", status: "" });
    setShowForm(false);
  };

  return (
    <div style={styles.pageContainer}>
      <h2>Employee Database</h2>
      <button onClick={() => setShowForm(true)}>Add New Employee</button>

      {showForm && (
        <EmployeeFormModal
          data={form}
          onChange={handleInput}
          onSave={handleSave}
          onCancel={resetForm}
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
                <th style={styles.th}>Full Name</th>
                <th style={styles.th}>Position</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td style={styles.td}>{emp.id}</td>
                  <td style={styles.td}>{emp.fullName}</td>
                  <td style={styles.td}>{emp.position}</td>
                  <td style={styles.td}>{emp.status}</td>
                  <td style={styles.td}>
                    <button onClick={() => handleEdit(emp)}>Edit</button>
                    <button
                      onClick={() => handleDelete(emp.id)}
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
};

export default Employees;

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
