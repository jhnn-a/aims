import { useState, useEffect } from "react";
import * as XLSX from "xlsx"; // <-- add this import
import { getAllEmployees } from "../services/employeeService";
import {
  addDevice,
  updateDevice,
  deleteDevice,
  getAllDevices,
  addMultipleDevices, // import the new function
  getNextDevId,
} from "../services/deviceService";
import { logDeviceHistory } from "../services/deviceHistoryService";

const initialForm = {
  deviceType: "",
  deviceTag: "",
  brand: "",
  model: "",
  quantity: 1, // new field
  status: "",
  condition: "", // new field
  assignedTo: "",
  assignmentDate: "", // new field
  remarks: "",
};

const fieldLabels = {
  deviceType: "Device Type",
  deviceTag: "Device Tag",
  brand: "Brand",
  model: "Model",
  quantity: "Quantity", // new label
  status: "Status",
  condition: "Condition", // new label
  assignedTo: "Assigned To",
  assignmentDate: "Assignment Date", // new label
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
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({
    current: 0,
    total: 0,
  });

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
        if (value && (prev.condition === "New" || !prev.condition)) {
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
    const payload = {
      ...form,
      status: getStatus(form.assignedTo),
      condition: form.condition || "New",
      assignmentDate,
    };
    const quantity = parseInt(form.quantity, 10) || 1;
    let newDeviceTags = [];
    // Remove id field from payload if present
    const { id, ...payloadWithoutId } = form;
    if (useSerial) {
      if (!form._editDeviceId && quantity === 1) {
        await addDevice(payloadWithoutId);
        newDeviceTags = [payload.deviceTag];
        if (payload.assignedTo) {
          // Fetch the device by tag after creation
          const allDevicesNow = await getAllDevices();
          const newDevice = allDevicesNow.find(
            (d) =>
              d.deviceTag === payload.deviceTag &&
              d.assignedTo === payload.assignedTo
          );
          if (newDevice) {
            await logDeviceHistory({
              employeeId: payload.assignedTo,
              deviceId: newDevice.id,
              deviceTag: newDevice.deviceTag,
              action: "assigned",
              date: new Date().toISOString(),
            });
          }
        }
      } else if (!form._editDeviceId) {
        await addDevice(payloadWithoutId);
        newDeviceTags = [payload.deviceTag];
      } else {
        await updateDevice(form._editDeviceId, payloadWithoutId);
        newDeviceTags = [payload.deviceTag];
      }
    } else {
      if (!form._editDeviceId && quantity === 1) {
        await addDevice(payloadWithoutId, tagPrefix);
        newDeviceTags = [payload.deviceTag];
        if (payload.assignedTo) {
          // Fetch the device by tag after creation
          const allDevicesNow = await getAllDevices();
          const newDevice = allDevicesNow.find(
            (d) =>
              d.deviceTag === payload.deviceTag &&
              d.assignedTo === payload.assignedTo
          );
          if (newDevice) {
            await logDeviceHistory({
              employeeId: payload.assignedTo,
              deviceId: newDevice.id,
              deviceTag: newDevice.deviceTag,
              action: "assigned",
              date: new Date().toISOString(),
            });
          }
        }
      } else if (!form._editDeviceId && quantity > 1) {
        await addMultipleDevices(payloadWithoutId, quantity, tagPrefix);
        // Generate all new tags
        const allDevicesAfter = await getAllDevices();
        const maxTagNum = allDevicesAfter
          .map((d) => d.deviceTag)
          .filter((tag) => tag && tag.startsWith(tagPrefix))
          .map((tag) => parseInt(tag.replace(tagPrefix, "")))
          .filter((num) => !isNaN(num));
        const newMax = Math.max(...maxTagNum);
        newDeviceTags = Array.from(
          { length: quantity },
          (_, i) =>
            `${tagPrefix}${String(newMax - quantity + 1 + i).padStart(4, "0")}`
        );
      } else {
        await updateDevice(form._editDeviceId, payloadWithoutId);
        newDeviceTags = [payload.deviceTag];
      }
    }
    // Log assignment history for all new devices if assignedTo is set (for multi-add)
    if (payload.assignedTo && newDeviceTags.length > 1) {
      const allDevicesNow = await getAllDevices();
      for (const tag of newDeviceTags) {
        const newDevice = allDevicesNow.find(
          (d) => d.deviceTag === tag && d.assignedTo === payload.assignedTo
        );
        if (newDevice) {
          await logDeviceHistory({
            employeeId: payload.assignedTo,
            deviceId: newDevice.id,
            deviceTag: newDevice.deviceTag,
            action: "assigned",
            date: new Date().toISOString(),
          });
        }
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

  // Import Excel handler
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportProgress({ current: 0, total: 0 });
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      let rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      // Clean up column names: remove leading/trailing spaces and quotes
      rows = rows.map((row) => {
        const cleaned = {};
        Object.keys(row).forEach((key) => {
          // Remove quotes and trim spaces
          const cleanKey = key.replace(/['"]+/g, "").trim();
          cleaned[cleanKey] = row[key];
        });
        return cleaned;
      });

      // Filter out empty rows (all fields empty)
      const filteredRows = rows.filter(
        (row) =>
          row["Device Type"] ||
          row["Device Tag"] ||
          row["Brand"] ||
          row["Model"] ||
          row["Condition"] ||
          row["Remarks"]
      );

      setImportProgress({ current: 0, total: filteredRows.length });

      let importedCount = 0;
      for (let i = 0; i < filteredRows.length; i++) {
        const row = filteredRows[i];
        setImportProgress({ current: i + 1, total: filteredRows.length });
        // Only import if required fields are present
        if (
          row["Device Type"] &&
          row["Device Tag"] &&
          row["Brand"] &&
          row["Condition"]
        ) {
          try {
            await addDevice({
              deviceType: row["Device Type"],
              deviceTag: row["Device Tag"],
              brand: row["Brand"],
              model: row["Model"] || "",
              condition: row["Condition"],
              remarks: row["Remarks"] || "",
              status: "Stock Room",
              assignedTo: "",
              assignmentDate: "",
            });
            importedCount++;
          } catch (err) {
            // Optionally, you can collect errors here
          }
        }
      }
      await loadDevicesAndEmployees();
      alert(
        `Import finished! Imported ${importedCount} of ${filteredRows.length} row(s).`
      );
    } catch (err) {
      alert("Failed to import. Please check your Excel file format.");
    }
    setImporting(false);
    setImportProgress({ current: 0, total: 0 });
    e.target.value = ""; // reset file input
  };

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(
        devices.filter((device) => !device.assignedTo).map((d) => d.id)
      );
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
    setDeleteProgress({ current: 0, total: selectedIds.length });
    for (let i = 0; i < selectedIds.length; i++) {
      await deleteDevice(selectedIds[i]);
      setDeleteProgress({ current: i + 1, total: selectedIds.length });
    }
    setSelectedIds([]);
    setSelectAll(false);
    setDeleteProgress({ current: 0, total: 0 });
    loadDevicesAndEmployees();
  };

  return (
    <div style={styles.pageContainer}>
      <h2>Device Inventory</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => setShowForm(true)}>Add New Device</button>
        <label>
          <input
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleImportExcel}
            disabled={importing}
          />
          <button
            type="button"
            disabled={importing}
            style={{ marginLeft: 8 }}
            onClick={() =>
              document
                .querySelector('input[type="file"][accept=".xlsx,.xls"]')
                .click()
            }
          >
            {importing
              ? importProgress.total > 0
                ? `Importing ${importProgress.current}/${importProgress.total}...`
                : "Importing..."
              : "Import Excel"}
          </button>
        </label>
        <button
          style={{ marginLeft: 8, color: "red" }}
          disabled={selectedIds.length === 0 || deleteProgress.total > 0}
          onClick={handleBulkDelete}
        >
          Delete
        </button>
        {deleteProgress.total > 0 && (
          <span style={{ marginLeft: 12, color: "#e11d48", fontWeight: 600 }}>
            Deleting {deleteProgress.current}/{deleteProgress.total}...
          </span>
        )}
      </div>

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
                    width: 32,
                    minWidth: 32,
                    maxWidth: 32,
                    textAlign: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      devices.filter((d) => !d.assignedTo).length > 0 &&
                      selectedIds.length ===
                        devices.filter((d) => !d.assignedTo).length
                    }
                    onChange={handleSelectAll}
                    style={{ width: 16, height: 16, margin: 0 }}
                  />
                </th>
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
                    <td
                      style={{
                        ...styles.td,
                        width: 32,
                        minWidth: 32,
                        maxWidth: 32,
                        textAlign: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(device.id)}
                        onChange={() => handleSelectOne(device.id)}
                        style={{ width: 16, height: 16, margin: 0 }}
                      />
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
                      {/* Only show Unassign if device is assigned */}
                      {device.assignedTo && (
                        <button
                          style={{ marginLeft: 8, color: "red" }}
                          onClick={async () => {
                            try {
                              // Remove id from payload
                              const { id, ...deviceWithoutId } = device;
                              await updateDevice(device.id, {
                                ...deviceWithoutId,
                                assignedTo: "",
                                assignmentDate: "",
                                status: getStatus(""), // Set status to 'Stock Room'
                              });
                              // Log history
                              await logDeviceHistory({
                                employeeId: device.assignedTo,
                                deviceId: device.id,
                                deviceTag: device.deviceTag,
                                action: "unassigned",
                                reason: "Unassigned from Inventory",
                                condition: device.condition,
                                date: new Date().toISOString(),
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
                          // If reassigning, log unassign for previous employee
                          if (
                            assigningDevice.assignedTo &&
                            assigningDevice.assignedTo !== emp.id
                          ) {
                            // Find previous employee name
                            const prevEmp = employees.find(
                              (e) => e.id === assigningDevice.assignedTo
                            );
                            const prevEmpName = prevEmp
                              ? prevEmp.fullName
                              : assigningDevice.assignedTo;
                            await logDeviceHistory({
                              employeeId: assigningDevice.assignedTo,
                              deviceId: assigningDevice.id,
                              deviceTag: assigningDevice.deviceTag,
                              action: "unassigned",
                              reason: `Reassigned to ${emp.fullName}`,
                              condition: assigningDevice.condition,
                              date: new Date().toISOString(),
                            });
                            // Remove id from payload
                            const { id, ...deviceWithoutId } = assigningDevice;
                            await updateDevice(assigningDevice.id, {
                              ...deviceWithoutId,
                              assignedTo: emp.id,
                              assignmentDate: new Date()
                                .toISOString()
                                .slice(0, 10),
                              status: getStatus(emp.id),
                            });
                            // Log assign history with previous employee name
                            await logDeviceHistory({
                              employeeId: emp.id,
                              deviceId: assigningDevice.id,
                              deviceTag: assigningDevice.deviceTag,
                              action: "assigned",
                              reason: `Received from reassignment (${prevEmpName})`,
                              date: new Date().toISOString(),
                            });
                          } else {
                            // Normal assign
                            const { id, ...deviceWithoutId } = assigningDevice;
                            await updateDevice(assigningDevice.id, {
                              ...deviceWithoutId,
                              assignedTo: emp.id,
                              assignmentDate: new Date()
                                .toISOString()
                                .slice(0, 10),
                              status: getStatus(emp.id),
                            });
                            await logDeviceHistory({
                              employeeId: emp.id,
                              deviceId: assigningDevice.id,
                              deviceTag: assigningDevice.deviceTag,
                              action: "assigned",
                              reason: "assigned",
                              date: new Date().toISOString(),
                            });
                          }
                          // Refresh device and employee lists
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
  pageContainer: {
    padding: "16px 0 16px 0", // Only top/bottom padding, no left/right
    maxWidth: "100%",
  },
  tableContainer: { marginTop: 16, overflowX: "auto" },
  table: {
    width: "100%",
    minWidth: 800,
    borderCollapse: "collapse",
    tableLayout: "auto", // <-- Change from "fixed" to "auto" for autofit
  },
  th: {
    border: "1px solid #ccc",
    padding: 8,
    backgroundColor: "#f5f5f5",
    textAlign: "left",
    // Remove any fixed width here except for checkbox column
  },
  td: {
    border: "1px solid #ccc",
    padding: 8,
    // Remove maxWidth/width for autofit
    whiteSpace: "nowrap", // Optional: prevents wrapping, more like Excel autofit
    overflow: "hidden",
    textOverflow: "ellipsis",
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
