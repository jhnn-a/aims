import { useEffect, useState } from "react";
import {
  getAllDevices,
  deleteDevice,
  updateDevice,
} from "../services/deviceService";
import { getAllEmployees } from "../services/employeeService";

function DeviceFormModal({
  data,
  onChange,
  onSave,
  onCancel,
  onGenerateTag,
  employees,
  tagError,
  saveError,
  isValid,
  useSerial,
  setUseSerial,
  setTagError,
  onSerialToggle,
  editingDevice,
}) {
  // Use the same deviceTypes and conditions as in Inventory.js
  const deviceTypes = [
    { label: "Headset", code: "HS" },
    { label: "Keyboard", code: "KB" },
    { label: "Laptop", code: "LPT" },
    { label: "Monitor", code: "MN" },
    { label: "Mouse", code: "M" },
    { label: "PC", code: "PC" },
    { label: "PSU", code: "PSU" },
    { label: "RAM", code: "RAM" },
    { label: "SSD", code: "SSD" },
    { label: "Webcam", code: "W" },
  ];
  const conditions = ["New", "Working", "Needs Repair", "Retired"];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 8,
          minWidth: 320,
        }}
      >
        <h3>Edit Device</h3>
        <div style={{ marginBottom: 12 }}>
          <label>Device Tag:</label>
          <input
            name="deviceTag"
            value={data.deviceTag || ""}
            onChange={onChange}
            style={{ width: "100%", padding: 6 }}
            disabled
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Device Type:</label>
          <select
            name="deviceType"
            value={data.deviceType || ""}
            onChange={onChange}
            style={{ width: "100%", padding: 6 }}
            disabled
          >
            <option value="">Select Device Type</option>
            {deviceTypes.map((type) => (
              <option key={type.label} value={type.label}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Brand:</label>
          <input
            name="brand"
            value={data.brand || ""}
            onChange={onChange}
            style={{ width: "100%", padding: 6 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Model:</label>
          <input
            name="model"
            value={data.model || ""}
            onChange={onChange}
            style={{ width: "100%", padding: 6 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Condition:</label>
          <select
            name="condition"
            value={data.condition || ""}
            onChange={onChange}
            style={{ width: "100%", padding: 6 }}
          >
            <option value="">Select Condition</option>
            {conditions.map((cond) => (
              <option key={cond} value={cond}>
                {cond}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Remarks:</label>
          <input
            name="remarks"
            value={data.remarks || ""}
            onChange={onChange}
            style={{ width: "100%", padding: 6 }}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <button onClick={onSave} style={{ marginRight: 8 }}>
            Save
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
        {saveError && (
          <div style={{ color: "red", marginTop: 8 }}>{saveError}</div>
        )}
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 8,
          minWidth: 320,
        }}
      >
        <h3>Confirm Deletion</h3>
        <p>Are you sure you want to delete this device?</p>
        <div style={{ marginTop: 16 }}>
          <button onClick={onConfirm} style={{ color: "red", marginRight: 8 }}>
            Delete
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function UnassignReasonModal({ onConfirm, onCancel }) {
  const [reason, setReason] = useState("Working");
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 4000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 8,
          minWidth: 320,
        }}
      >
        <h3>Unassign Device</h3>
        <p>Please select the reason/condition for unassigning:</p>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 16 }}
        >
          <option value="Working">Working (just unassigned)</option>
          <option value="Needs Repair">Needs Repair</option>
          <option value="Retired">Retired</option>
        </select>
        <div>
          <button onClick={() => onConfirm(reason)} style={{ marginRight: 8 }}>
            Confirm
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Assets() {
  const [devices, setDevices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [tagError, setTagError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [useSerial, setUseSerial] = useState(false);
  const [assigningDevice, setAssigningDevice] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [unassignDevice, setUnassignDevice] = useState(null);

  useEffect(() => {
    loadDevicesAndEmployees();
  }, []);

  const loadDevicesAndEmployees = async () => {
    setLoading(true);
    const [allDevices, allEmployees] = await Promise.all([
      getAllDevices(),
      getAllEmployees(),
    ]);
    setDevices(allDevices.filter((d) => d.assignedTo));
    setEmployees(allEmployees);
    setLoading(false);
  };

  const getEmployeeName = (id) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.fullName : id || "";
  };

  // --- Edit logic copied from Inventory.js ---
  const handleEdit = (device) => {
    // Copy all fields except id, but keep a hidden _editDeviceId for update
    const { id, ...rest } = device;
    setForm({ ...rest, _editDeviceId: id });
    setShowForm(true);
  };

  const handleInput = ({ target: { name, value, type } }) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaveError("");
    // Add your validation logic here if needed
    if (!form.deviceType || !form.deviceTag || !form.brand || !form.condition) {
      setSaveError("Please fill in all required fields.");
      return;
    }
    await updateDevice(form._editDeviceId, form);
    setShowForm(false);
    setForm({});
    loadDevicesAndEmployees();
  };

  const handleDelete = (id) => {
    setSelectedId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    await deleteDevice(selectedId);
    setSelectedId(null);
    setShowConfirm(false);
    loadDevicesAndEmployees();
  };

  const cancelDelete = () => {
    setSelectedId(null);
    setShowConfirm(false);
  };

  // Instead of unassigning directly, open the modal
  const handleUnassign = (device) => {
    setUnassignDevice(device);
    setShowUnassignModal(true);
  };

  // Called when user confirms reason in modal
  const confirmUnassign = async (reason) => {
    await updateDevice(unassignDevice.id, {
      ...unassignDevice,
      assignedTo: "",
      assignmentDate: "",
      condition: reason,
    });
    setShowUnassignModal(false);
    setUnassignDevice(null);
    loadDevicesAndEmployees();
  };

  const cancelUnassign = () => {
    setShowUnassignModal(false);
    setUnassignDevice(null);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Assets</h2>
      {showForm && (
        <DeviceFormModal
          data={form}
          onChange={handleInput}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setForm({});
          }}
          onGenerateTag={() => {}}
          employees={employees}
          tagError={tagError}
          setTagError={setTagError}
          saveError={saveError}
          isValid={true}
          useSerial={useSerial}
          setUseSerial={setUseSerial}
          onSerialToggle={() => setUseSerial(!useSerial)}
          editingDevice={form._editDeviceId}
        />
      )}
      {showConfirm && (
        <ConfirmDeleteModal onConfirm={confirmDelete} onCancel={cancelDelete} />
      )}
      {showUnassignModal && (
        <UnassignReasonModal
          onConfirm={confirmUnassign}
          onCancel={cancelUnassign}
        />
      )}
      {loading ? (
        <p>Loading...</p>
      ) : devices.length === 0 ? (
        <p>No assets assigned.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>
                Device Tag
              </th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Type</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Brand</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Model</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>
                Assigned To
              </th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>
                Condition
              </th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Status</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>
                Assignment Date
              </th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id}>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>
                  {device.deviceTag}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>
                  {device.deviceType}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>
                  {device.brand}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>
                  {device.model}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>
                  {getEmployeeName(device.assignedTo)}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>
                  {device.condition}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>
                  {device.status}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>
                  {device.assignmentDate
                    ? new Date(
                        device.assignmentDate.seconds
                          ? device.assignmentDate.seconds * 1000
                          : device.assignmentDate
                      ).toLocaleDateString()
                    : ""}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>
                  <button onClick={() => handleEdit(device)}>Edit</button>
                  <button
                    onClick={() => handleDelete(device.id)}
                    style={{ marginLeft: 8, color: "red" }}
                  >
                    Delete
                  </button>
                  <button
                    style={{ marginLeft: 8 }}
                    onClick={() => {
                      setAssigningDevice(device);
                      setAssignModalOpen(true);
                    }}
                  >
                    {device.assignedTo ? "Reassign" : "Assign"}
                  </button>
                  <button
                    style={{ marginLeft: 8, color: "red" }}
                    onClick={() => handleUnassign(device)}
                  >
                    Unassign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {assignModalOpen && assigningDevice && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: 24,
              borderRadius: 8,
              minWidth: 350,
            }}
          >
            <h4>Assign Device: {assigningDevice.deviceTag}</h4>
            <input
              type="text"
              placeholder="Search employee..."
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              style={{ width: "100%", marginBottom: 8, padding: 6 }}
            />
            <ul
              style={{
                maxHeight: 200,
                overflowY: "auto",
                padding: 0,
                margin: 0,
              }}
            >
              {employees
                .filter((emp) =>
                  emp.fullName
                    .toLowerCase()
                    .includes(assignSearch.toLowerCase())
                )
                .map((emp) => (
                  <li
                    key={emp.id}
                    style={{ listStyle: "none", marginBottom: 8 }}
                  >
                    <button
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: 8,
                      }}
                      onClick={async () => {
                        try {
                          await updateDevice(assigningDevice.id, {
                            ...assigningDevice,
                            assignedTo: emp.id,
                            assignmentDate: new Date()
                              .toISOString()
                              .slice(0, 10),
                            condition: "Working", // <-- always set to Working when assigned
                          });
                          loadDevicesAndEmployees();
                          setAssignModalOpen(false);
                          setAssigningDevice(null);
                          setAssignSearch("");
                        } catch (err) {
                          alert("Failed to assign device. Please try again.");
                        }
                      }}
                    >
                      {emp.fullName}
                    </button>
                  </li>
                ))}
            </ul>
            <button
              onClick={() => {
                setAssignModalOpen(false);
                setAssigningDevice(null);
                setAssignSearch("");
              }}
              style={{ marginTop: 12 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Assets;
