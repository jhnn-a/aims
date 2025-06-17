import { useState, useEffect } from "react";
import { getAllEmployees } from "../services/employeeService";
import {
  addDevice,
  updateDevice,
  deleteDevice,
  getAllDevices,
  addMultipleDevices, // import the new function
} from "../services/deviceService";
import * as XLSX from "xlsx";

const initialForm = {
  deviceType: "",
  deviceTag: "",
  brand: "",
  model: "",
  quantity: 1,
  status: "",
  condition: "",
  assignedTo: "",
  assignmentDate: "",
  remarks: "",
  dateAdded: "", // <-- add this line
};

const fieldLabels = {
  dateAdded: "Date Added", // <-- add this line
  deviceType: "Device Type",
  deviceTag: "Device Tag",
  brand: "Brand",
  model: "Model",
  quantity: "Quantity",
  status: "Status",
  condition: "Condition",
  assignedTo: "Assigned To",
  assignmentDate: "Assignment Date",
  remarks: "Remarks",
};

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

const statuses = ["Available", "In Use", "Stock Room", "Retired"];

// Simpler device condition options
const conditions = ["New", "Working", "Needs Repair", "Retired"];

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
  onSerialToggle, // new prop
  editingDevice, // new prop to determine edit mode
}) {
  const handleSerialToggle = (e) => {
    const checked = e.target.checked;
    onSerialToggle(checked); // call parent handler
  };

  const isEditMode = Boolean(editingDevice); // determine if in edit mode

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h3>{data.id ? "Edit Device" : "Add Device"}</h3>

        {/* Device Type Dropdown */}
        <div style={styles.inputGroup}>
          <label>Device Type:</label>
          <select
            name="deviceType"
            value={data.deviceType}
            onChange={onChange}
            style={styles.input}
          >
            <option value="">Select Device Type</option>
            {deviceTypes.map((type) => (
              <option key={type.label} value={type.label}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Device Tag with Generator and Serial Option */}
        {data.deviceType && (
          <div style={styles.inputGroup}>
            <label>Device Tag:</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!useSerial ? (
                <>
                  <span style={{ fontWeight: 600 }}>{`JOII${
                    deviceTypes.find((t) => t.label === data.deviceType)
                      ?.code || ""
                  }`}</span>
                  <input
                    name="deviceTagDigits"
                    value={data.deviceTag.replace(
                      `JOII${
                        deviceTypes.find((t) => t.label === data.deviceType)
                          ?.code || ""
                      }`,
                      ""
                    )}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      onChange({
                        target: {
                          name: "deviceTag",
                          value: `JOII${
                            deviceTypes.find((t) => t.label === data.deviceType)
                              ?.code || ""
                          }${val}`,
                        },
                      });
                    }}
                    style={{ width: 60, padding: 6, marginLeft: 4 }}
                    maxLength={4}
                    pattern="\\d{0,4}"
                    placeholder="0001"
                  />
                  <button type="button" onClick={onGenerateTag}>
                    Generate
                  </button>
                </>
              ) : (
                <input
                  key={useSerial ? "serial" : "tag"}
                  name="deviceTag"
                  value={data.deviceTag}
                  onChange={onChange}
                  style={{ flex: 1, padding: 6 }}
                  maxLength={64}
                  placeholder="Enter Serial Number"
                />
              )}
            </div>
            <label style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={useSerial}
                onChange={handleSerialToggle} // use prop function
                style={{ marginRight: 6 }}
              />
              Use Serial Number Instead
            </label>
            {tagError && (
              <span style={{ color: "red", fontSize: 12 }}>{tagError}</span>
            )}
            {saveError && (
              <span style={{ color: "red", fontSize: 12 }}>{saveError}</span>
            )}
          </div>
        )}

        {/* Brand Input (no suggestions) */}
        <div style={styles.inputGroup}>
          <label>Brand:</label>
          <input
            name="brand"
            value={data.brand}
            onChange={onChange}
            style={styles.input}
            autoComplete="off"
          />
        </div>

        {/* Model */}
        <div style={styles.inputGroup}>
          <label>Model:</label>
          <input
            name="model"
            value={data.model}
            onChange={onChange}
            style={styles.input}
          />
        </div>

        {/* Quantity (hide in edit mode) */}
        {!isEditMode && (
          <div style={styles.inputGroup}>
            <label>Quantity:</label>
            <input
              name="quantity"
              type="number"
              min="1"
              value={data.quantity}
              onChange={onChange}
              style={styles.input}
            />
          </div>
        )}

        {/* Condition Dropdown */}
        <div style={styles.inputGroup}>
          <label>Condition:</label>
          <select
            name="condition"
            value={data.condition}
            onChange={onChange}
            style={styles.input}
          >
            <option value="">Select Condition</option>
            {conditions.map((cond) => (
              <option key={cond} value={cond}>
                {cond}
              </option>
            ))}
          </select>
        </div>

        {/* Assigned To Dropdown */}
        <div style={styles.inputGroup}>
          <label>Assigned To:</label>
          <select
            name="assignedTo"
            value={data.assignedTo}
            onChange={onChange}
            style={styles.input}
          >
            <option value="">Select Employee</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName}
              </option>
            ))}
          </select>
        </div>
        {/* Assignment Date (only show if assignedTo is set) */}
        {data.assignedTo && (
          <div style={styles.inputGroup}>
            <label>Assignment Date:</label>
            <input
              type="date"
              name="assignmentDate"
              value={data.assignmentDate || ""}
              onChange={onChange}
              style={styles.input}
            />
          </div>
        )}

        {/* Date Added */}
        <div style={styles.inputGroup}>
          <label>Date Added:</label>
          <input
            type="date"
            name="dateAdded"
            value={data.dateAdded || ""}
            onChange={onChange}
            style={styles.input}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>

        {/* Remarks */}
        <div style={styles.inputGroup}>
          <label>Remarks:</label>
          <input
            name="remarks"
            value={data.remarks}
            onChange={onChange}
            style={styles.input}
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

function Inventory() {
  const [devices, setDevices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...initialForm });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tagError, setTagError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [useSerial, setUseSerial] = useState(false);
  const [assigningDevice, setAssigningDevice] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [importProgress, setImportProgress] = useState(null);

  const getStatus = (assignedTo) => (assignedTo ? "In Use" : "Stock Room");

  const handleInput = ({ target: { name, value, type } }) => {
    if (name === "deviceType") {
      setForm((prev) => ({ ...prev, deviceType: value, deviceTag: "" }));
      setTagError("");
      return;
    }
    if (name === "deviceTag") {
      if (useSerial) {
        setTagError("");
        setForm((prev) => ({ ...prev, [name]: value }));
        return;
      }
      // Only validate JOII format if not using serial
      const typeObj = deviceTypes.find((t) => t.label === form.deviceType);
      if (typeObj) {
        const prefix = `JOII${typeObj.code}`;
        const regex = new RegExp(`^${prefix}\\d{0,4}$`);
        if (!regex.test(value)) {
          setTagError(
            `Device tag must be in the format ${prefix}0001 (4 digits, no letters).`
          );
          return;
        }
      }
      setTagError("");
    }
    if (name === "assignedTo") {
      setForm((prev) => {
        let newCondition = prev.condition;
        // Always set to "Working" if assignedTo is set and not empty
        if (value) {
          newCondition = "Working";
        }
        return {
          ...prev,
          assignedTo: value,
          condition: newCondition,
        };
      });
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateTag = async () => {
    const typeObj = deviceTypes.find((t) => t.label === form.deviceType);
    if (!typeObj) return;
    const prefix = `JOII${typeObj.code}`;
    // Always fetch the latest device list from the database
    const allDevices = await getAllDevices();
    const ids = allDevices
      .map((d) => d.deviceTag)
      .filter((tag) => tag && tag.startsWith(prefix))
      .map((tag) => parseInt(tag.replace(prefix, "")))
      .filter((num) => !isNaN(num));
    const max = ids.length > 0 ? Math.max(...ids) : 0;
    const newTag = `${prefix}${String(max + 1).padStart(4, "0")}`;
    setForm((prev) => ({ ...prev, deviceTag: newTag }));
  };

  // Load devices and employees from Firestore
  useEffect(() => {
    loadDevicesAndEmployees();
  }, []);

  const loadDevicesAndEmployees = async () => {
    setLoading(true);
    const [deviceData, employeeData] = await Promise.all([
      getAllDevices(),
      getAllEmployees(),
    ]);
    setDevices(deviceData);
    setEmployees(employeeData);
    setLoading(false);
  };

  // Validation for required fields (status removed)
  const isFormValid = () =>
    form.deviceType.trim() !== "" &&
    form.deviceTag.trim() !== "" &&
    form.brand.trim() !== "" &&
    form.condition.trim() !== "" &&
    !tagError;

  const handleSave = async () => {
    setSaveError("");
    if (!isFormValid()) {
      setSaveError("Please fill in all required fields.");
      return;
    }
    // Check for duplicate tag in the database
    const allDevices = await getAllDevices();
    if (useSerial) {
      const serialExists = allDevices.some(
        (d) =>
          d.deviceTag &&
          d.deviceTag.toLowerCase() === form.deviceTag.toLowerCase() &&
          (!form._editDeviceId || d.id !== form._editDeviceId)
      );
      if (serialExists) {
        setSaveError(
          "Serial number already exists. Please use a unique serial number."
        );
        return;
      }
    } else {
      const isDuplicate = allDevices.some(
        (d) =>
          d.deviceTag === form.deviceTag &&
          (!form._editDeviceId || d.id !== form._editDeviceId)
      );
      if (isDuplicate) {
        setSaveError("Device tag already exists. Please use a unique tag.");
        return;
      }
    }
    // Use correct tag prefix for device type
    const typeObj = deviceTypes.find((t) => t.label === form.deviceType);
    if (!typeObj) {
      setSaveError("Invalid device type.");
      return;
    }
    const tagPrefix = `JOII${typeObj.code}`;
    // Default condition to 'New' if not set
    let assignmentDate = form.assignmentDate;
    if (form.assignedTo && !assignmentDate) {
      assignmentDate = new Date().toISOString().slice(0, 10);
    }
    // Default dateAdded to today if not set
    let dateAdded = form.dateAdded;
    if (!dateAdded) {
      dateAdded = new Date().toISOString().slice(0, 10);
    }
    // Always set condition to "Working" if assignedTo is set
    let condition = form.condition;
    if (form.assignedTo) {
      condition = "Working";
    } else if (!form.condition) {
      condition = "New";
    }
    // Make sure to use the updated condition in the payload and in the form state
    const payload = {
      ...form,
      status: getStatus(form.assignedTo),
      condition, // <-- use the updated condition
      assignmentDate,
      dateAdded,
    };
    // If editing, also update the form state so the modal shows the correct value
    if (form._editDeviceId) {
      setForm((prev) => ({ ...prev, condition }));
    }
    const quantity = parseInt(form.quantity, 10) || 1;
    if (useSerial) {
      if (!form._editDeviceId && quantity > 1) {
        await addMultipleDevices(payload, quantity);
      } else if (!form._editDeviceId) {
        await addDevice(payload);
      } else {
        await updateDevice(form._editDeviceId, payload);
      }
    } else {
      if (!form._editDeviceId && quantity > 1) {
        await addMultipleDevices(payload, quantity, tagPrefix);
      } else if (!form._editDeviceId) {
        await addDevice(payload, tagPrefix);
      } else {
        await updateDevice(form._editDeviceId, payload);
      }
    }
    resetForm();
    loadDevicesAndEmployees();
  };

  const handleEdit = (device) => {
    // Copy all fields except id, but keep a hidden _editDeviceId for update
    const { id, ...rest } = device;
    setForm({ ...rest, _editDeviceId: id });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await deleteDevice(id);
    loadDevicesAndEmployees();
  };

  const resetForm = () => {
    setForm({ ...initialForm });
    setUseSerial(false); // Always uncheck serial option on cancel/close
    setShowForm(false);
  };

  // Helper to get employee name by ID
  const getEmployeeName = (id) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.fullName : id || "";
  };

  // Move serial toggle logic here
  const handleSerialToggle = (checked) => {
    setUseSerial(checked);
    setForm((prev) => ({ ...prev, deviceTag: "" }));
    setTagError("");
  };

  // Import handler for Excel file with progress
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setImportProgress({ current: 0, total: 0 });
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      // Fetch all devices once before the loop
      const allDevices = await getAllDevices();

      let addedCount = 0;
      let totalToAdd = rows.filter(
        (row) =>
          row["Device Tag"] &&
          !allDevices.some((d) => d.deviceTag === row["Device Tag"])
      ).length;
      setImportProgress({ current: 0, total: totalToAdd });

      let current = 0;
      for (const row of rows) {
        const deviceData = {
          deviceType: row["Device Type"] || "",
          deviceTag: row["Device Tag"] || "",
          brand: row["Brand"] || "",
          model: row["Model"] || "",
          quantity: 1,
          status: "Stock Room",
          condition: row["Condition"] || "New",
          assignedTo: "",
          assignmentDate: "",
          remarks: row["Remarks"] || "",
          dateAdded: row["Date Added"] || new Date().toISOString().slice(0, 10),
        };
        if (
          deviceData.deviceTag &&
          !allDevices.some((d) => d.deviceTag === deviceData.deviceTag)
        ) {
          await addDevice(deviceData);
          addedCount++;
          current++;
          setImportProgress({ current, total: totalToAdd });
        }
      }
      await loadDevicesAndEmployees();
      setLoading(false);
      setImportProgress(null);
      alert(
        addedCount > 0
          ? `Import complete! ${addedCount} device(s) added.`
          : "No new devices were added (all tags already exist)."
      );
    };
    reader.readAsBinaryString(file);
  };

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(devices.filter((d) => !d.assignedTo).map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Handle individual checkbox
  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (
      selectedIds.length === 0 ||
      !window.confirm(`Delete ${selectedIds.length} selected device(s)?`)
    )
      return;
    for (const id of selectedIds) {
      await deleteDevice(id);
    }
    setSelectedIds([]);
    setSelectAll(false);
    loadDevicesAndEmployees();
  };

  return (
    <div style={styles.pageContainer}>
      <h2>Device Inventory</h2>
      <button onClick={() => setShowForm(true)}>Add New Device</button>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleImportExcel}
        style={{ marginLeft: 16 }}
      />
      {selectedIds.length > 0 && (
        <button
          onClick={handleBulkDelete}
          style={{ marginLeft: 16, color: "red" }}
        >
          Delete Selected ({selectedIds.length})
        </button>
      )}
      {showForm && (
        <DeviceFormModal
          data={form}
          onChange={handleInput}
          onSave={handleSave}
          onCancel={resetForm}
          onGenerateTag={handleGenerateTag}
          employees={employees}
          tagError={tagError}
          setTagError={setTagError} // pass setTagError to modal
          saveError={saveError}
          isValid={isFormValid()}
          useSerial={useSerial}
          setUseSerial={setUseSerial}
          onSerialToggle={handleSerialToggle} // pass serial toggle handler
          editingDevice={form._editDeviceId} // pass editing device ID
        />
      )}

      {importProgress && (
        <div style={{ margin: "12px 0", color: "#1976d2" }}>
          Importing devices: {importProgress.current}/{importProgress.total}
        </div>
      )}
      {loading && !importProgress && <p>Loading...</p>}
      {!loading && !devices.length && <p>No devices found. Please import.</p>}
      {!loading && devices.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>
                <th style={styles.th}>{fieldLabels.dateAdded}</th>{" "}
                {/* <-- add this line */}
                <th style={styles.th}>{fieldLabels.deviceType}</th>
                <th style={styles.th}>{fieldLabels.deviceTag}</th>
                <th style={styles.th}>{fieldLabels.brand}</th>
                <th style={styles.th}>{fieldLabels.model}</th>
                <th style={styles.th}>{fieldLabels.assignedTo}</th>
                <th style={styles.th}>{fieldLabels.assignmentDate}</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>{fieldLabels.condition}</th>
                <th style={styles.th}>{fieldLabels.remarks}</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices
                .filter((device) => !device.assignedTo)
                .map((device) => (
                  <tr key={device.id}>
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(device.id)}
                        onChange={() => handleSelectOne(device.id)}
                      />
                    </td>
                    <td style={styles.td}>
                      {device.dateAdded
                        ? new Date(device.dateAdded).toLocaleDateString()
                        : ""}
                    </td>
                    <td style={styles.td}>{device.deviceType}</td>
                    <td style={styles.td}>{device.deviceTag}</td>
                    <td style={styles.td}>{device.brand}</td>
                    <td style={styles.td}>{device.model}</td>
                    <td style={styles.td}>
                      {getEmployeeName(device.assignedTo)}
                    </td>
                    <td style={styles.td}>{device.assignmentDate || ""}</td>
                    <td style={styles.td}>
                      {device.assignedTo ? "In Use" : "Stock Room"}
                    </td>
                    <td style={styles.td}>{device.condition}</td>
                    <td style={styles.td}>{device.remarks}</td>
                    <td style={styles.td}>
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
                      {device.assignedTo && (
                        <button
                          style={{ marginLeft: 8, color: "red" }}
                          onClick={async () => {
                            try {
                              await updateDevice(device.id, {
                                ...device,
                                assignedTo: "",
                                assignmentDate: "",
                              });
                              loadDevicesAndEmployees();
                            } catch (err) {
                              alert(
                                "Failed to unassign device. Please try again."
                              );
                            }
                          }}
                        >
                          Unassign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {assignModalOpen && assigningDevice && (
        <div style={{ ...styles.modalOverlay, zIndex: 1100 }}>
          <div style={{ ...styles.modalContent, minWidth: 350 }}>
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

export default Inventory;

const styles = {
  pageContainer: { padding: 16, maxWidth: "100%" },
  tableContainer: { marginTop: 16, overflowX: "auto" },
  table: { width: "100%", minWidth: 800, borderCollapse: "collapse" },
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
  inputGroup: {
    marginBottom: 12,
    display: "flex",
    flexDirection: "column",
  },
  input: {
    width: "100%",
    padding: 6,
  },
  suggestionBox: {
    border: "1px solid #ccc",
    background: "#fff",
    position: "absolute",
    zIndex: 10,
    width: "100%",
    maxHeight: 120,
    overflowY: "auto",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  suggestionItem: {
    padding: "6px 12px",
    cursor: "pointer",
    borderBottom: "1px solid #eee",
  },
};
