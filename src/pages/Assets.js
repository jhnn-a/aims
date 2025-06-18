import { useEffect, useState } from "react";
import {
  getAllDevices,
  deleteDevice,
  updateDevice,
} from "../services/deviceService";
import { getAllEmployees } from "../services/employeeService";
import { logDeviceHistory } from "../services/deviceHistoryService"; // <-- add this import

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
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [unassignDevice, setUnassignDevice] = useState(null);
  const [unassignReason, setUnassignReason] = useState("working");

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
    // Remove id field from payload if present
    const { id, ...payloadWithoutId } = form;
    await updateDevice(form._editDeviceId, payloadWithoutId);
    setShowForm(false);
    setForm({});
    loadDevicesAndEmployees();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this device?")) {
      await deleteDevice(id);
      loadDevicesAndEmployees();
    }
  };

  const handleUnassign = (device) => {
    setUnassignDevice(device);
    setUnassignReason("working");
    setShowUnassignModal(true);
  };

  const confirmUnassign = async () => {
    if (!unassignDevice) return;
    let condition = "Working";
    let reason = "Normal unassign (still working)";
    if (unassignReason === "repair") {
      condition = "Needs Repair";
      reason = "Needs repair";
    }
    if (unassignReason === "retired") {
      condition = "Retired";
      reason = "Retired";
    }
    // Remove id from payload
    const { id, ...deviceWithoutId } = unassignDevice;
    await updateDevice(unassignDevice.id, {
      ...deviceWithoutId,
      assignedTo: "",
      assignmentDate: "",
      status: "Stock Room",
      condition,
    });
    // Log history
    await logDeviceHistory({
      employeeId: unassignDevice.assignedTo,
      deviceId: unassignDevice.id,
      deviceTag: unassignDevice.deviceTag,
      action: "unassigned",
      reason,
      condition,
      date: new Date().toISOString(),
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
                          // If reassigning, log unassign for previous employee
                          if (
                            assigningDevice.assignedTo &&
                            assigningDevice.assignedTo !== emp.id
                          ) {
                            await logDeviceHistory({
                              employeeId: assigningDevice.assignedTo,
                              deviceId: assigningDevice.id,
                              deviceTag: assigningDevice.deviceTag,
                              action: "unassigned",
                              reason: "Reassigned to another employee",
                              condition: assigningDevice.condition,
                              date: new Date().toISOString(),
                            });
                          }
                          // Remove id from payload
                          const { id, ...deviceWithoutId } = assigningDevice;
                          await updateDevice(assigningDevice.id, {
                            ...deviceWithoutId,
                            assignedTo: emp.id,
                            assignmentDate: new Date()
                              .toISOString()
                              .slice(0, 10),
                          });
                          // Log assign history
                          await logDeviceHistory({
                            employeeId: emp.id,
                            deviceId: assigningDevice.id,
                            deviceTag: assigningDevice.deviceTag,
                            action: "assigned",
                            reason: "assigned", // <-- add this line
                            date: new Date().toISOString(),
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

      {showUnassignModal && unassignDevice && (
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
            zIndex: 1200,
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
            <h3>Unassign Device: {unassignDevice.deviceTag}</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600 }}>Reason for unassigning:</label>
              <div style={{ marginTop: 8 }}>
                <label>
                  <input
                    type="radio"
                    name="unassignReason"
                    value="working"
                    checked={unassignReason === "working"}
                    onChange={() => setUnassignReason("working")}
                  />
                  Normal unassign (still working)
                </label>
              </div>
              <div>
                <label>
                  <input
                    type="radio"
                    name="unassignReason"
                    value="repair"
                    checked={unassignReason === "repair"}
                    onChange={() => setUnassignReason("repair")}
                  />
                  Needs repair
                </label>
              </div>
              <div>
                <label>
                  <input
                    type="radio"
                    name="unassignReason"
                    value="retired"
                    checked={unassignReason === "retired"}
                    onChange={() => setUnassignReason("retired")}
                  />
                  Retired
                </label>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button onClick={confirmUnassign} style={{ marginRight: 8 }}>
                Confirm
              </button>
              <button onClick={cancelUnassign}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Assets;
