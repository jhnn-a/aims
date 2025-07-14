import React, { useEffect, useState } from "react";
import {
  getAllDevices,
  deleteDevice,
  updateDevice,
} from "../services/deviceService";
import { getAllEmployees } from "../services/employeeService";
import { logDeviceHistory } from "../services/deviceHistoryService";
import LoadingSpinner, {
  TableLoadingSpinner,
} from "../components/LoadingSpinner";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { useSnackbar } from "../components/Snackbar";

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
        backgroundColor: "rgba(34, 46, 58, 0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 28,
          borderRadius: 14,
          minWidth: 260,
          maxWidth: 340,
          boxShadow: "0 4px 16px rgba(68,95,109,0.14)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center", // Center all children
          position: "relative",
          border: "2px solid #70C1B3",
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#233037",
            marginBottom: 12,
            letterSpacing: 0.3,
            textAlign: "center",
            textShadow: "0 1px 4px #FFE06622",
            width: "100%",
          }}
        >
          {editingDevice ? "Edit Device" : "Add Device"}
        </h3>
        <form
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div
            style={{
              marginBottom: 10,
              width: "90%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <label
              style={{
                color: "#445F6D",
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
                fontSize: 13,
                alignSelf: "flex-start",
              }}
            >
              Device Tag:
            </label>
            <input
              name="deviceTag"
              value={data.deviceTag || ""}
              onChange={onChange}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1.5px solid #445F6D",
                fontSize: 14,
                background: "#f7f9fb",
                color: "#233037",
                marginTop: 2,
                marginBottom: 4,
                textAlign: "center",
              }}
              disabled
            />
          </div>
          <div
            style={{
              marginBottom: 10,
              width: "90%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <label
              style={{
                color: "#445F6D",
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
                fontSize: 13,
                alignSelf: "flex-start",
              }}
            >
              Device Type:
            </label>
            <select
              name="deviceType"
              value={data.deviceType || ""}
              onChange={onChange}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1.5px solid #445F6D",
                fontSize: 14,
                background: "#f7f9fb",
                color: "#233037",
                marginTop: 2,
                marginBottom: 4,
                textAlign: "center",
              }}
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
          <div
            style={{
              marginBottom: 10,
              width: "90%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <label
              style={{
                color: "#445F6D",
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
                fontSize: 13,
                alignSelf: "flex-start",
              }}
            >
              Brand:
            </label>
            <input
              name="brand"
              value={data.brand || ""}
              onChange={onChange}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1.5px solid #445F6D",
                fontSize: 14,
                background: "#f7f9fb",
                color: "#233037",
                marginTop: 2,
                marginBottom: 4,
                textAlign: "center",
              }}
            />
          </div>
          <div
            style={{
              marginBottom: 10,
              width: "90%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <label
              style={{
                color: "#445F6D",
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
                fontSize: 13,
                alignSelf: "flex-start",
              }}
            >
              Model:
            </label>
            <input
              name="model"
              value={data.model || ""}
              onChange={onChange}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1.5px solid #445F6D",
                fontSize: 14,
                background: "#f7f9fb",
                color: "#233037",
                marginTop: 2,
                marginBottom: 4,
                textAlign: "center",
              }}
            />
          </div>
          <div
            style={{
              marginBottom: 10,
              width: "90%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <label
              style={{
                color: "#445F6D",
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
                fontSize: 13,
                alignSelf: "flex-start",
              }}
            >
              Condition:
            </label>
            <select
              name="condition"
              value={data.condition || ""}
              onChange={onChange}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1.5px solid #445F6D",
                fontSize: 14,
                background: "#f7f9fb",
                color: "#233037",
                marginTop: 2,
                marginBottom: 4,
                textAlign: "center",
              }}
            >
              <option value="">Select Condition</option>
              {conditions.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
          </div>
          <div
            style={{
              marginBottom: 10,
              width: "90%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <label
              style={{
                color: "#445F6D",
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
                fontSize: 13,
                alignSelf: "flex-start",
              }}
            >
              Remarks:
            </label>
            <input
              name="remarks"
              value={data.remarks || ""}
              onChange={onChange}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1.5px solid #445F6D",
                fontSize: 14,
                background: "#f7f9fb",
                color: "#233037",
                marginTop: 2,
                marginBottom: 4,
                textAlign: "center",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 12,
              width: "90%",
              display: "flex",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <button
              type="submit"
              style={{
                background: "#70C1B3",
                color: "#233037",
                border: "none",
                borderRadius: 7,
                padding: "8px 18px",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                marginRight: 0,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                transition: "background 0.2s, box-shadow 0.2s",
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: "#445F6D",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                padding: "8px 18px",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                transition: "background 0.2s, box-shadow 0.2s",
              }}
            >
              Cancel
            </button>
          </div>
          {saveError && (
            <div
              style={{
                color: "#F25F5C",
                marginTop: 8,
                fontWeight: 600,
                textAlign: "center",
                fontSize: 13,
              }}
            >
              {saveError}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function Assets() {
  const { showSuccess, showError, showWarning, showInfo } = useSnackbar();
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
  const [unassignReason, setUnassignReason] = useState(""); // No default
  const [search, setSearch] = useState("");
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [bulkReassignModalOpen, setBulkReassignModalOpen] = useState(false);
  const [bulkUnassignModalOpen, setBulkUnassignModalOpen] = useState(false);
  const [bulkAssignSearch, setBulkAssignSearch] = useState("");
  const [bulkUnassignReason, setBulkUnassignReason] = useState(""); // No default
  const [showTransferPrompt, setShowTransferPrompt] = useState(false);
  const [selectedTransferEmployee, setSelectedTransferEmployee] =
    useState(null);
  const [progress, setProgress] = useState(0); // Progress bar state
  const [generatingForm, setGeneratingForm] = useState(false); // Show/hide progress
  const [unassignGenerating, setUnassignGenerating] = useState(false);
  const [unassignProgress, setUnassignProgress] = useState(0);
  const [bulkUnassignWarning, setBulkUnassignWarning] = useState(""); // Warning state for bulk unassign
  const [currentPage, setCurrentPage] = useState(1);
  const [devicesPerPage, setDevicesPerPage] = useState(50);

  useEffect(() => {
    loadDevicesAndEmployees();
  }, []);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Reset to first page when devices per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [devicesPerPage]);

  const loadDevicesAndEmployees = async () => {
    setLoading(true);
    try {
      const [allDevices, allEmployees] = await Promise.all([
        getAllDevices(),
        getAllEmployees(),
      ]);
      // Filter to only show assigned devices (devices with assignedTo value)
      const assignedDevices = allDevices.filter(
        (device) => device.assignedTo && device.assignedTo.trim() !== ""
      );
      setDevices(assignedDevices);
      setEmployees(allEmployees);
    } catch (error) {
      showError(
        "Failed to load devices and employees. Please refresh the page."
      );
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (id) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.fullName : id || "";
  };

  const handleEdit = (device) => {
    const { id, ...rest } = device;
    setForm({ ...rest, _editDeviceId: id });
    setShowForm(true);
  };

  const handleInput = ({ target: { name, value, type } }) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaveError("");
    if (!form.deviceType || !form.deviceTag || !form.brand || !form.condition) {
      setSaveError("Please fill in all required fields.");
      showError("Please fill in all required fields.");
      return;
    }
    try {
      const { id, ...payloadWithoutId } = form;
      await updateDevice(form._editDeviceId, payloadWithoutId);
      setShowForm(false);
      setForm({});
      loadDevicesAndEmployees();
      showSuccess("Device updated successfully!");
    } catch (error) {
      showError("Failed to update device. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this device?")) {
      try {
        await deleteDevice(id);
        loadDevicesAndEmployees();
        showSuccess("Device deleted successfully!");
      } catch (error) {
        showError("Failed to delete device. Please try again.");
      }
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
    if (unassignReason === "defective") {
      condition = "Defective";
      reason = "Defective";
    }
    try {
      const { id, ...deviceWithoutId } = unassignDevice;
      await updateDevice(unassignDevice.id, {
        ...deviceWithoutId,
        assignedTo: "",
        assignmentDate: "",
        status: "Stock Room",
        condition,
        // Remove 'Temporary Deployed' remark if present (case-insensitive)
        remarks:
          (deviceWithoutId.remarks || "").toLowerCase() === "temporary deployed"
            ? ""
            : deviceWithoutId.remarks,
      });
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
      showSuccess(
        `Device ${unassignDevice.deviceTag} unassigned successfully!`
      );
    } catch (error) {
      showError("Failed to unassign device. Please try again.");
    }
  };

  const cancelUnassign = () => {
    setShowUnassignModal(false);
    setUnassignDevice(null);
  };

  // Checklist logic
  const filteredDevices = devices
    .filter((device) => {
      // Only show assigned devices
      if (!device.assignedTo) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (device.deviceTag || "").toLowerCase().includes(q) ||
        (device.deviceType || "").toLowerCase().includes(q) ||
        (device.brand || "").toLowerCase().includes(q) ||
        (device.model || "").toLowerCase().includes(q) ||
        (getEmployeeName(device.assignedTo) || "").toLowerCase().includes(q) ||
        (device.condition || "").toLowerCase().includes(q) ||
        (device.remarks || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Sort by assignment date (newest first), then by device ID (newest first)

      // First, try to sort by assignment date
      const dateA = a.assignmentDate
        ? new Date(
            a.assignmentDate.seconds
              ? a.assignmentDate.seconds * 1000
              : a.assignmentDate
          )
        : new Date(0);

      const dateB = b.assignmentDate
        ? new Date(
            b.assignmentDate.seconds
              ? b.assignmentDate.seconds * 1000
              : b.assignmentDate
          )
        : new Date(0);

      // If assignment dates are different, sort by date (newest first)
      if (dateB.getTime() !== dateA.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }

      // If assignment dates are the same or missing, sort by device ID (newest first)
      const aNum = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
      const bNum = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
      return bNum - aNum;
    });

  const currentPageDevices = filteredDevices.slice(
    (currentPage - 1) * devicesPerPage,
    currentPage * devicesPerPage
  );

  const isAllSelected =
    currentPageDevices.length > 0 &&
    currentPageDevices.every((device) => selectedDeviceIds.includes(device.id));
  const isIndeterminate =
    currentPageDevices.some((device) =>
      selectedDeviceIds.includes(device.id)
    ) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Unselect all devices on current page
      setSelectedDeviceIds((prev) =>
        prev.filter(
          (id) => !currentPageDevices.some((device) => device.id === id)
        )
      );
    } else {
      // Select all devices on current page
      const currentPageIds = currentPageDevices.map((d) => d.id);
      setSelectedDeviceIds((prev) => [
        ...new Set([...prev, ...currentPageIds]),
      ]);
    }
  };
  const toggleSelectDevice = (id) => {
    const device = devices.find((d) => d.id === id);
    if (!device) return;
    // If nothing selected, allow any selection
    if (selectedDeviceIds.length === 0) {
      setSelectedDeviceIds([id]);
      setBulkUnassignWarning("");
      return;
    }
    // Get assignedTo of first selected device
    const firstDevice = devices.find((d) => d.id === selectedDeviceIds[0]);
    if (firstDevice && device.assignedTo !== firstDevice.assignedTo) {
      const firstName = getEmployeeName(firstDevice.assignedTo);
      const thisName = getEmployeeName(device.assignedTo);
      window.alert(
        `You can only select devices assigned to the same employee for bulk unassign.\nFirst selected: ${
          firstName || "Unassigned"
        }\nTried: ${thisName || "Unassigned"}`
      );
      setBulkUnassignWarning(
        "You can only select devices assigned to the same employee for bulk unassign."
      );
      return;
    }
    setBulkUnassignWarning("");
    setSelectedDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Bulk reassign logic
  const handleBulkReassign = () => {
    if (selectedDeviceIds.length === 0)
      return alert("Select at least one device.");
    setBulkReassignModalOpen(true);
    setBulkAssignSearch("");
  };
  const handleBulkUnassign = () => {
    if (selectedDeviceIds.length === 0)
      return alert("Select at least one device.");
    // Check if all selected devices have the same assignedTo
    const selected = devices.filter((d) => selectedDeviceIds.includes(d.id));
    const assignedToSet = new Set(selected.map((d) => d.assignedTo));
    if (assignedToSet.size > 1) {
      setBulkUnassignWarning(
        "You can only bulk unassign devices assigned to the same employee."
      );
      return;
    }
    setBulkUnassignWarning("");
    setBulkUnassignModalOpen(true);
    setBulkUnassignReason("working");
  };

  const confirmBulkReassign = async (emp) => {
    for (const id of selectedDeviceIds) {
      const device = devices.find((d) => d.id === id);
      if (!device) continue;
      if (device.assignedTo && device.assignedTo !== emp.id) {
        await logDeviceHistory({
          employeeId: device.assignedTo,
          deviceId: device.id,
          deviceTag: device.deviceTag,
          action: "unassigned",
          reason: "Reassigned to another employee (bulk)",
          condition: device.condition,
          date: new Date().toISOString(),
        });
      }
      const { id: _id, ...deviceWithoutId } = device;
      await updateDevice(device.id, {
        ...deviceWithoutId,
        assignedTo: emp.id,
        assignmentDate: new Date().toISOString().slice(0, 10),
      });
      await logDeviceHistory({
        employeeId: emp.id,
        deviceId: device.id,
        deviceTag: device.deviceTag,
        action: "assigned",
        reason: "assigned (bulk)",
        date: new Date().toISOString(),
      });
    }
    // Generate transfer form for all selected devices
    const transferors = [
      ...new Set(
        selectedDeviceIds
          .map((id) => {
            const device = devices.find((d) => d.id === id);
            return device && device.assignedTo ? device.assignedTo : null;
          })
          .filter(Boolean)
      ),
    ];
    // Use the first transferor's info for the form (or blank if mixed)
    let transferorEmp = employees.find((e) => e.id === transferors[0]);
    if (!transferorEmp)
      transferorEmp = {
        fullName: "",
        department: "",
        dateHired: "",
        position: "",
      };
    await handleGenerateTransferForm({
      transferor: transferorEmp,
      transferee: emp,
      devices: devices.filter((d) => selectedDeviceIds.includes(d.id)),
      docxFileName: `${emp.fullName || "Employee"} - Transfer.docx`,
    });
    setBulkReassignModalOpen(false);
    setSelectedDeviceIds([]);
    showSuccess(
      `Successfully reassigned ${selectedDeviceIds.length} device(s) to ${emp.fullName}`
    );
    loadDevicesAndEmployees();
  };

  const confirmBulkUnassign = async () => {
    // Only allow if all selected devices have the same assignedTo
    const selected = devices.filter((d) => selectedDeviceIds.includes(d.id));
    const assignedToSet = new Set(selected.map((d) => d.assignedTo));
    if (assignedToSet.size > 1) {
      setBulkUnassignWarning(
        "You can only unassign devices assigned to the same employee."
      );
      return;
    }
    let condition = "Working";
    let reason = "Normal unassign (still working)";
    if (bulkUnassignReason === "defective") {
      condition = "Defective";
      reason = "Defective (bulk)";
    }
    // Get the employee
    const empId = selected[0]?.assignedTo;
    const emp = employees.find((e) => e.id === empId) || {
      fullName: "",
      department: "",
      position: "",
    };
    // Update all devices and log history
    for (const device of selected) {
      const { id: _id, ...deviceWithoutId } = device;
      await updateDevice(device.id, {
        ...deviceWithoutId,
        assignedTo: "",
        assignmentDate: "",
        status: "Stock Room",
        condition,
        remarks:
          (deviceWithoutId.remarks || "").toLowerCase() === "temporary deployed"
            ? ""
            : deviceWithoutId.remarks,
      });
      await logDeviceHistory({
        employeeId: device.assignedTo,
        deviceId: device.id,
        deviceTag: device.deviceTag,
        action: "unassigned",
        reason,
        condition,
        date: new Date().toISOString(),
      });
    }
    // Generate docx for all selected devices
    await handleGenerateBulkUnassignDocx({
      employee: emp,
      devices: selected,
      reason: bulkUnassignReason,
    });
    setBulkUnassignModalOpen(false);
    setSelectedDeviceIds([]);
    showSuccess(
      `Successfully unassigned ${selected.length} device(s) from ${
        emp.fullName || "employee"
      }`
    );
    loadDevicesAndEmployees();
  };

  // Helper to format date as "June 23, 2025"
  function formatTransferDate(date) {
    if (!date) return "";
    let d;
    if (typeof date === "object" && date.seconds) {
      d = new Date(date.seconds * 1000);
    } else {
      d = new Date(date);
    }
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  }

  // Handler for generating the Asset Accountability Form (Transfer of Assets)
  async function handleGenerateTransferForm({
    transferor,
    transferee,
    devices,
    templatePath = "/src/AccountabilityForms/ASSET ACCOUNTABILITY FORM - TRANSFER.docx",
    docxFileName,
  }) {
    try {
      setGeneratingForm(true);
      setProgress(10);

      // Fetch the docx template
      const response = await fetch(templatePath);
      if (!response.ok) throw new Error("Failed to fetch template");
      setProgress(30);

      const arrayBuffer = await response.arrayBuffer();
      setProgress(50);

      const zip = new PizZip(arrayBuffer);
      setProgress(65);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter() {
          return "";
        },
      });
      setProgress(80);

      // Data object: must match template placeholders exactly
      const data = {
        transferor_name: transferor.fullName || "",
        transferor_department: transferor.department || "",
        transferor_date_hired: transferor.dateHired
          ? formatTransferDate(transferor.dateHired)
          : "",
        transferor_position: transferor.position || "",
        transferee_name: transferee.fullName || "",
        transferee_department: transferee.department || "",
        transferee_date_hired: transferee.dateHired
          ? formatTransferDate(transferee.dateHired)
          : "",
        transferee_position: transferee.position || "",
        devices: devices.map((device) => ({
          TransferDate: formatTransferDate(device.assignmentDate || new Date()),
          deviceType: device.deviceType || "",
          brand: device.brand || "",
          deviceTag: device.deviceTag || "",
          condition: device.condition || "",
        })),
      };

      // Render the document
      doc.render(data);
      setProgress(90);

      const out = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Download the generated docx
      const link = document.createElement("a");
      link.href = URL.createObjectURL(out);
      link.download = docxFileName || "transfer_of_assets.docx";
      link.click();

      setProgress(100);
      setTimeout(() => {
        setGeneratingForm(false);
        setProgress(0);
      }, 800);
    } catch (error) {
      // Robust error handling for docxtemplater errors
      let errorMsg = "Error generating transfer form.";
      if (
        error &&
        error.properties &&
        error.properties.errors instanceof Array
      ) {
        // Docxtemplater multi error (template issues)
        errorMsg += "\nTemplate errors:";
        error.properties.errors.forEach(function (e, i) {
          errorMsg += `\n${i + 1}. ${
            e.properties && e.properties.explanation
              ? e.properties.explanation
              : e.message
          }`;
        });
      } else if (error && error.message) {
        errorMsg += `\n${error.message}`;
      }
      console.error("Error generating transfer form:", error);
      setGeneratingForm(false);
      setProgress(0);
      alert(errorMsg + "\nPlease check the console for details.");
    }
  }

  async function handleGenerateUnassignDocx({ employee, device, reason }) {
    setUnassignGenerating(true);
    setUnassignProgress(10);
    try {
      // Use correct fetch path for public folder
      const response = await fetch(
        "/src/AccountabilityForms/ASSET ACCOUNTABILITY FORM - RETURN.docx"
      );
      setUnassignProgress(30);
      const arrayBuffer = await response.arrayBuffer();
      setUnassignProgress(50);
      const zip = new PizZip(arrayBuffer);
      setUnassignProgress(65);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });
      setUnassignProgress(80);
      // Checkbox logic for 4 checkboxes (checkBox1Checked, checkBox1Unchecked, ...)
      // Working: 1 and 3 checked, Defective: 2 and 4 checked
      const isWorking = reason === "working";
      const isDefective = reason === "defective";
      // If defective, set device condition to 'Defective' in docx
      const docxCondition = isDefective ? "Defective" : device.condition || "";
      const data = {
        name: employee.fullName || "",
        department: employee.department || "",
        position: employee.position || "",
        dateHired: employee.dateHired
          ? formatTransferDate(employee.dateHired)
          : "",
        devices: [
          {
            assignmentDate: device.assignmentDate
              ? formatTransferDate(device.assignmentDate)
              : "",
            deviceType: device.deviceType || "",
            brand: device.brand || "",
            deviceTag: device.deviceTag || "",
            condition: docxCondition,
          },
        ],
        checkBox1Checked: isWorking ? "◼" : "",
        checkBox1Unchecked: isWorking ? "" : "☐",
        checkBox2Checked: isDefective ? "◼" : "",
        checkBox2Unchecked: isDefective ? "" : "☐",
        checkBox3Checked: isWorking ? "◼" : "",
        checkBox3Unchecked: isWorking ? "" : "☐",
        checkBox4Checked: isDefective ? "◼" : "",
        checkBox4Unchecked: isDefective ? "" : "☐",
        remarks: device.remarks || "",
        model: device.model || "",
      };
      doc.render(data);
      setUnassignProgress(90);
      const out = doc.getZip().generate({ type: "blob" });
      const employeeName = employee.fullName
        ? employee.fullName.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")
        : "Employee";
      const fileName = `${employeeName} - Return.docx`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(out);
      link.download = fileName;
      link.click();
      setUnassignProgress(100);
      setTimeout(() => setUnassignGenerating(false), 800);
    } catch (err) {
      setUnassignGenerating(false);
      alert("Failed to generate return document.");
    }
  }

  // Bulk unassign docx generation
  async function handleGenerateBulkUnassignDocx({ employee, devices, reason }) {
    setUnassignGenerating(true);
    setUnassignProgress(10);
    try {
      // Use correct fetch path for public folder
      const response = await fetch(
        "/src/AccountabilityForms/ASSET ACCOUNTABILITY FORM - RETURN.docx"
      );
      setUnassignProgress(30);
      const arrayBuffer = await response.arrayBuffer();
      setUnassignProgress(50);
      const zip = new PizZip(arrayBuffer);
      setUnassignProgress(65);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });
      setUnassignProgress(80);
      // Checkbox logic for 4 checkboxes (checkBox1Checked, checkBox1Unchecked, ...)
      // Working: 1 and 3 checked, Defective: 2 and 4 checked
      const isWorking = reason === "working";
      const isDefective = reason === "defective";
      // If defective, set device condition to 'Defective' in docx
      const docxCondition = isDefective ? "Defective" : "";
      const data = {
        name: employee.fullName || "",
        department: employee.department || "",
        position: employee.position || "",
        dateHired: employee.dateHired
          ? formatTransferDate(employee.dateHired)
          : "",
        devices: devices.map((device) => ({
          assignmentDate: device.assignmentDate
            ? formatTransferDate(device.assignmentDate)
            : "",
          deviceType: device.deviceType || "",
          brand: device.brand || "",
          deviceTag: device.deviceTag || "",
          condition: docxCondition || device.condition || "",
        })),
        checkBox1Checked: isWorking ? "◼" : "",
        checkBox1Unchecked: isWorking ? "" : "☐",
        checkBox2Checked: isDefective ? "◼" : "",
        checkBox2Unchecked: isDefective ? "" : "☐",
        checkBox3Checked: isWorking ? "◼" : "",
        checkBox3Unchecked: isWorking ? "" : "☐",
        checkBox4Checked: isDefective ? "◼" : "",
        checkBox4Unchecked: isDefective ? "" : "☐",
        remarks: devices[0]?.remarks || "",
        model: devices[0]?.model || "",
      };
      doc.render(data);
      setUnassignProgress(90);
      const out = doc.getZip().generate({ type: "blob" });
      const employeeName = employee.fullName
        ? employee.fullName.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")
        : "Employee";
      const fileName = `${employeeName} - Return.docx`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(out);
      link.download = fileName;
      link.click();
      setUnassignProgress(100);
      setTimeout(() => setUnassignGenerating(false), 800);
    } catch (err) {
      setUnassignGenerating(false);
      alert("Failed to generate return document.");
    }
  }

  return (
    <React.Fragment>
      <style>
        {`
          @media (min-width: 1366px) {
            .assets-container {
              padding: 24px !important;
            }
            .assets-search-container {
              flex-wrap: nowrap !important;
              gap: 16px !important;
            }
            .assets-table {
              min-width: 100% !important;
            }
          }
          @media (min-width: 1920px) {
            .assets-container {
              padding: 32px !important;
              max-width: 1800px !important;
              margin: 0 auto !important;
            }
          }
          @media (min-width: 1600px) {
            .assets-table-container {
              overflow-x: visible !important;
            }
          }
          .assets-table {
            min-width: 1200px;
          }
        `}
      </style>
      <div
        className="assets-container"
        style={{
          padding: "0", // Remove padding to maximize space
          background: "transparent", // Let parent handle background
          height: "100%", // Fill available height
          fontFamily:
            "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden", // Prevent overflow on main container
        }}
      >
        {/* Fixed Header - Search bar and buttons section */}
        <div
          style={{
            background: "#fff",
            borderRadius: "0",
            boxShadow: "none",
            border: "none",
            borderBottom: "1px solid #e5e7eb",
            position: "sticky",
            top: "0",
            zIndex: "10",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px 20px",
              borderBottom: "1px solid #e5e7eb",
              gap: "12px",
              flexWrap: "wrap",
            }}
            className="assets-search-container"
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#f9fafb",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                padding: "10px 14px",
                flex: 1,
                maxWidth: "400px",
                minWidth: "280px",
              }}
            >
              <svg
                width="18"
                height="18"
                style={{ color: "#6b7280", opacity: 0.8 }}
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
                placeholder="Search assigned assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "14px",
                  color: "#374151",
                  padding: "0 0 0 10px",
                  width: "100%",
                  fontWeight: 400,
                }}
              />
            </div>
            <button
              disabled={!selectedDeviceIds.length}
              onClick={handleBulkReassign}
              style={{
                padding: "10px 16px",
                border: "1px solid #3b82f6",
                borderRadius: "6px",
                background: selectedDeviceIds.length ? "#3b82f6" : "#f9fafb",
                color: selectedDeviceIds.length ? "#fff" : "#6b7280",
                cursor: selectedDeviceIds.length ? "pointer" : "not-allowed",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
                minWidth: "90px",
              }}
            >
              Reassign
            </button>
            <button
              disabled={!selectedDeviceIds.length}
              onClick={handleBulkUnassign}
              style={{
                padding: "10px 16px",
                border: "1px solid #ef4444",
                borderRadius: "6px",
                background: selectedDeviceIds.length ? "#ef4444" : "#f9fafb",
                color: selectedDeviceIds.length ? "#fff" : "#6b7280",
                cursor: selectedDeviceIds.length ? "pointer" : "not-allowed",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
                minWidth: "90px",
              }}
            >
              Unassign
            </button>
          </div>
        </div>

        {/* Scrollable Table Container */}
        <div
          style={{
            background: "#fff",
            border: "none",
            flex: "1",
            overflow: "auto",
            minHeight: "0",
          }}
        >
          <div
            style={{ overflowX: "auto", width: "100%", height: "100%" }}
            className="assets-table-container"
          >
            <table
              className="assets-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#fff",
                fontSize: "14px",
              }}
            >
              <thead style={{ position: "sticky", top: "0", zIndex: "5" }}>
                <tr
                  style={{
                    background: "rgb(255, 255, 255)",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <th
                    style={{
                      padding: "12px 16px",
                      border: "none",
                      width: "40px",
                      textAlign: "center",
                      fontWeight: 500,
                      color: "#374151",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={toggleSelectAll}
                      style={{
                        width: 16,
                        height: 16,
                        accentColor: "#3b82f6",
                        border: "1px solid #d1d5db",
                        borderRadius: "3px",
                      }}
                      title="Select all"
                    />
                  </th>
                  <th
                    style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "12px 16px",
                      border: "none",
                      textAlign: "left",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "12px 16px",
                      border: "none",
                      textAlign: "left",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Device Tag
                  </th>
                  <th
                    style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "12px 16px",
                      border: "none",
                      textAlign: "left",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "12px 16px",
                      border: "none",
                      textAlign: "left",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Brand
                  </th>
                  <th
                    style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "12px 16px",
                      border: "none",
                      textAlign: "left",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Model
                  </th>
                  <th
                    style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "12px 16px",
                      border: "none",
                      textAlign: "left",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Assigned To
                  </th>
                  <th
                    style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "12px 16px",
                      border: "none",
                      textAlign: "left",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Date Assigned
                  </th>
                  <th
                    style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "12px 16px",
                      border: "none",
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "100px",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ padding: "0", border: "none" }}>
                      <TableLoadingSpinner text="Loading assigned assets..." />
                    </td>
                  </tr>
                ) : currentPageDevices.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      style={{
                        padding: "40px 20px",
                        textAlign: "center",
                        color: "#9ca3af",
                        fontSize: "14px",
                        fontWeight: "400",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {search
                        ? "No assigned devices found matching your search."
                        : "No assigned devices to display."}
                    </td>
                  </tr>
                ) : (
                  currentPageDevices.map((device, index) => {
                    const isSelected = selectedDeviceIds.includes(device.id);
                    const rowIndex =
                      (currentPage - 1) * devicesPerPage + index + 1;
                    return (
                      <tr
                        key={device.id}
                        style={{
                          background:
                            index % 2 === 0
                              ? "rgb(250, 250, 252)"
                              : "rgb(240, 240, 243)",
                          cursor: "pointer",
                          transition: "background 0.15s",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                        onClick={(e) => {
                          if (e.target.type !== "checkbox") {
                            toggleSelectDevice(device.id);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (index % 2 === 0) {
                            e.currentTarget.style.background =
                              "rgb(235, 235, 240)";
                          } else {
                            e.currentTarget.style.background =
                              "rgb(225, 225, 235)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            index % 2 === 0
                              ? "rgb(250, 250, 252)"
                              : "rgb(240, 240, 243)";
                        }}
                      >
                        <td
                          style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            borderBottom: "none",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectDevice(device.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: 16,
                              height: 16,
                              accentColor: "#3b82f6",
                              border: "1px solid #d1d5db",
                              borderRadius: "3px",
                            }}
                            title="Select device"
                          />
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#6b7280",
                            fontSize: "14px",
                            fontWeight: "500",
                            borderBottom: "none",
                          }}
                        >
                          {rowIndex}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#1f2937",
                            fontSize: "14px",
                            fontWeight: "500",
                            borderBottom: "none",
                          }}
                        >
                          <span
                            style={{
                              color: "#3b82f6",
                              textDecoration: "underline",
                              cursor: "pointer",
                            }}
                          >
                            {device.deviceTag}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#6b7280",
                            fontSize: "14px",
                            borderBottom: "none",
                          }}
                        >
                          {device.deviceType}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#6b7280",
                            fontSize: "14px",
                            borderBottom: "none",
                          }}
                        >
                          {device.brand}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#6b7280",
                            fontSize: "14px",
                            borderBottom: "none",
                          }}
                        >
                          {device.model}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#6b7280",
                            fontSize: "14px",
                            borderBottom: "none",
                          }}
                        >
                          {getEmployeeName(device.assignedTo)}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#6b7280",
                            fontSize: "14px",
                            borderBottom: "none",
                          }}
                        >
                          {device.assignmentDate
                            ? new Date(
                                device.assignmentDate.seconds
                                  ? device.assignmentDate.seconds * 1000
                                  : device.assignmentDate
                              ).toLocaleDateString()
                            : ""}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            borderBottom: "none",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <button
                              style={{
                                background: "transparent",
                                border: "none",
                                borderRadius: "4px",
                                padding: "6px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "background 0.2s",
                                color: "#3b82f6",
                              }}
                              title="Edit"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(device);
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#dbeafe")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <svg
                                width="16"
                                height="16"
                                fill="none"
                                stroke="currentColor"
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
                                background: "transparent",
                                border: "none",
                                borderRadius: "4px",
                                padding: "6px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "background 0.2s",
                                color: "#ef4444",
                              }}
                              title="Delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(device.id);
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#fef2f2")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <svg
                                width="16"
                                height="16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                viewBox="0 0 24 24"
                              >
                                <polyline points="3,6 5,6 21,6" />
                                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fixed Pagination Footer */}
        {(() => {
          const totalPages = Math.ceil(filteredDevices.length / devicesPerPage);
          const startIndex = (currentPage - 1) * devicesPerPage + 1;
          const endIndex = Math.min(
            currentPage * devicesPerPage,
            filteredDevices.length
          );

          return (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 20px", // Reduced padding for fixed layout
                background: "#fff",
                borderRadius: "0",
                boxShadow: "none",
                border: "none",
                borderTop: "1px solid #e5e7eb",
                position: "sticky",
                bottom: "0",
                zIndex: "10",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  color: "#445F6D",
                  fontSize: "14px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span>
                  Showing {filteredDevices.length === 0 ? 0 : startIndex} -{" "}
                  {filteredDevices.length === 0 ? 0 : endIndex} of{" "}
                  {filteredDevices.length} devices
                </span>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontSize: "13px" }}>Show:</span>
                  <select
                    value={devicesPerPage}
                    onChange={(e) => {
                      setDevicesPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #e0e7ef",
                      fontSize: "13px",
                      background: "#fff",
                      color: "#445F6D",
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #e0e7ef",
                      background: currentPage === 1 ? "#f5f7fa" : "#fff",
                      color: currentPage === 1 ? "#9ca3af" : "#445F6D",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    First
                  </button>

                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #e0e7ef",
                      background: currentPage === 1 ? "#f5f7fa" : "#fff",
                      color: currentPage === 1 ? "#9ca3af" : "#445F6D",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  {(() => {
                    const pageNumbers = [];
                    const maxVisiblePages = 5;
                    let startPage = Math.max(
                      1,
                      currentPage - Math.floor(maxVisiblePages / 2)
                    );
                    let endPage = Math.min(
                      totalPages,
                      startPage + maxVisiblePages - 1
                    );

                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pageNumbers.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: "1px solid #e0e7ef",
                            background: i === currentPage ? "#70C1B3" : "#fff",
                            color: i === currentPage ? "#fff" : "#445F6D",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "500",
                            minWidth: "40px",
                          }}
                        >
                          {i}
                        </button>
                      );
                    }

                    return pageNumbers;
                  })()}

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #e0e7ef",
                      background:
                        currentPage === totalPages ? "#f5f7fa" : "#fff",
                      color: currentPage === totalPages ? "#9ca3af" : "#445F6D",
                      cursor:
                        currentPage === totalPages ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Next
                  </button>

                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #e0e7ef",
                      background:
                        currentPage === totalPages ? "#f5f7fa" : "#fff",
                      color: currentPage === totalPages ? "#9ca3af" : "#445F6D",
                      cursor:
                        currentPage === totalPages ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Last
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Bulk Reassign/Unassign Modal */}
        {bulkReassignModalOpen && (
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
              zIndex: 1300,
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 24,
                borderRadius: 8,
                minWidth: 350,
                maxWidth: 480,
                width: "96vw",
              }}
            >
              {!selectedTransferEmployee ? (
                <>
                  <h4>Reassign {selectedDeviceIds.length} Devices</h4>
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={bulkAssignSearch}
                    onChange={(e) => setBulkAssignSearch(e.target.value)}
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
                          .includes(bulkAssignSearch.toLowerCase())
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
                            onClick={() => {
                              setSelectedTransferEmployee(emp);
                            }}
                          >
                            {emp.fullName}
                          </button>
                        </li>
                      ))}
                  </ul>
                  <button
                    onClick={() => setBulkReassignModalOpen(false)}
                    style={{ marginTop: 12 }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <h4 style={{ marginBottom: 12 }}>
                    Reassign Device(s) to{" "}
                    <span style={{ color: "#2563eb" }}>
                      {selectedTransferEmployee.fullName}
                    </span>
                    :
                  </h4>
                  <div
                    style={{
                      maxHeight: 180,
                      overflowY: "auto",
                      marginBottom: 16,
                      background: "#f7f9fb",
                      borderRadius: 8,
                      padding: 8,
                      border: "1px solid #e0e7ef",
                    }}
                  >
                    <table style={{ width: "100%", fontSize: 14 }}>
                      <thead>
                        <tr style={{ color: "#445F6D", fontWeight: 700 }}>
                          <th style={{ textAlign: "left", padding: "4px 8px" }}>
                            Tag
                          </th>
                          <th style={{ textAlign: "left", padding: "4px 8px" }}>
                            Type
                          </th>
                          <th style={{ textAlign: "left", padding: "4px 8px" }}>
                            Brand
                          </th>
                          <th style={{ textAlign: "left", padding: "4px 8px" }}>
                            Model
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {devices
                          .filter((d) => selectedDeviceIds.includes(d.id))
                          .map((device) => (
                            <tr key={device.id}>
                              <td style={{ padding: "4px 8px" }}>
                                {device.deviceTag}
                              </td>
                              <td style={{ padding: "4px 8px" }}>
                                {device.deviceType}
                              </td>
                              <td style={{ padding: "4px 8px" }}>
                                {device.brand}
                              </td>
                              <td style={{ padding: "4px 8px" }}>
                                {device.model}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                    }}
                  >
                    <button
                      onClick={() => {
                        setSelectedTransferEmployee(null);
                      }}
                      style={{
                        background: "#e0e7ef",
                        color: "#233037",
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 22px",
                        fontWeight: 700,
                        fontSize: 16,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        await confirmBulkReassign(selectedTransferEmployee);
                        setSelectedTransferEmployee(null);
                      }}
                      style={{
                        background: "#70C1B3",
                        color: "#233037",
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 22px",
                        fontWeight: 700,
                        fontSize: 16,
                        cursor: "pointer",
                      }}
                    >
                      Confirm & Generate Transfer Form
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {/* Bulk Unassign Modal */}
        {bulkUnassignModalOpen && (
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
              zIndex: 1300,
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 24,
                borderRadius: 8,
                minWidth: 350,
              }}
            >
              <h4>Unassign {selectedDeviceIds.length} Devices</h4>
              {bulkUnassignWarning && (
                <div style={{ color: "red", marginBottom: 8, fontWeight: 600 }}>
                  {bulkUnassignWarning}
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 8,
                    color: "#445F6D",
                  }}
                >
                  Reason for unassigning:
                </label>
                <>
                  <div style={{ marginTop: 8 }}>
                    <label>
                      <input
                        type="radio"
                        name="bulkUnassignReason"
                        value="working"
                        checked={bulkUnassignReason === "working"}
                        onChange={() => setBulkUnassignReason("working")}
                        style={{ marginRight: 8, accentColor: "#70C1B3" }}
                      />
                      Working
                    </label>
                  </div>
                  <div>
                    <label>
                      <input
                        type="radio"
                        name="bulkUnassignReason"
                        value="defective"
                        checked={bulkUnassignReason === "defective"}
                        onChange={() => setBulkUnassignReason("defective")}
                        style={{ marginRight: 8, accentColor: "#70C1B3" }}
                      />
                      Defective
                    </label>
                  </div>
                </>
              </div>
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={confirmBulkUnassign}
                  style={{
                    background: "#70C1B3",
                    color: "#233037",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor:
                      bulkUnassignReason && !bulkUnassignWarning
                        ? "pointer"
                        : "not-allowed",
                    marginRight: 8,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    transition: "background 0.2s, box-shadow 0.2s",
                    opacity:
                      bulkUnassignReason && !bulkUnassignWarning ? 1 : 0.7,
                  }}
                  disabled={!bulkUnassignReason || !!bulkUnassignWarning}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setBulkUnassignModalOpen(false)}
                  style={{
                    background: "#445F6D",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    transition: "background 0.2s, box-shadow 0.2s",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* Assign/Reassign Modal */}
        {assignModalOpen && (
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
              zIndex: 1300,
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 24,
                borderRadius: 8,
                minWidth: 350,
              }}
            >
              <h4>
                {assigningDevice && assigningDevice.assignedTo
                  ? "Reassign Device"
                  : "Assign Device"}
              </h4>
              {!showTransferPrompt && (
                <>
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
                              // Log unassign if reassigning
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
                              const { id: _id, ...deviceWithoutId } =
                                assigningDevice;
                              await updateDevice(assigningDevice.id, {
                                ...deviceWithoutId,
                                assignedTo: emp.id,
                                reason: "assigned",
                                date: new Date().toISOString(),
                              });

                              // Log the assignment action
                              await logDeviceHistory({
                                employeeId: emp.id,
                                deviceId: assigningDevice.id,
                                deviceTag: assigningDevice.deviceTag,
                                action: "assigned",
                                reason: "Reassigned from another employee",
                                condition: assigningDevice.condition,
                                date: new Date(), // Store full timestamp for precise ordering
                              });

                              // Add a small delay to ensure database changes are reflected
                              await new Promise((resolve) =>
                                setTimeout(resolve, 100)
                              );

                              setSelectedTransferEmployee(emp);
                              setShowTransferPrompt(true);
                              showSuccess(
                                `Device ${assigningDevice.deviceTag} successfully assigned to ${emp.fullName}`
                              );
                              loadDevicesAndEmployees();
                            }}
                          >
                            {emp.fullName}
                          </button>
                        </li>
                      ))}
                  </ul>
                </>
              )}
              {showTransferPrompt && selectedTransferEmployee && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginTop: 16,
                  }}
                >
                  <div
                    style={{
                      marginBottom: 18,
                      fontWeight: 600,
                      color: "#233037",
                      fontSize: 16,
                      textAlign: "center",
                    }}
                  >
                    Device successfully reassigned to{" "}
                    <span style={{ color: "#70C1B3" }}>
                      {selectedTransferEmployee.fullName}
                    </span>
                    .
                  </div>
                  <button
                    onClick={async () => {
                      // Find transferor (previous assigned employee)
                      const transferor = employees.find(
                        (e) =>
                          e.id ===
                          (assigningDevice?.assignedTo ||
                            assigningDevice?.prevAssignedTo)
                      );
                      const transferee = selectedTransferEmployee;
                      // For single device
                      await handleGenerateTransferForm({
                        transferor: transferor || {
                          fullName: "",
                          department: "",
                          dateHired: "",
                          position: "",
                        },
                        transferee,
                        devices: [assigningDevice],
                        // Pass custom filename
                        docxFileName: `${
                          transferee.fullName || "Employee"
                        } - Transfer.docx`,
                      });
                    }}
                    style={{
                      background: "#70C1B3",
                      color: "#233037",
                      border: "none",
                      borderRadius: 8,
                      padding: "12px 28px",
                      fontWeight: 700,
                      fontSize: 17,
                      cursor: generatingForm ? "not-allowed" : "pointer",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      transition: "background 0.2s, box-shadow 0.2s",
                      opacity: generatingForm ? 0.7 : 1,
                    }}
                    disabled={generatingForm}
                  >
                    {generatingForm
                      ? "Generating..."
                      : "Generate Transfer Form"}
                  </button>
                  {generatingForm && (
                    <div
                      style={{
                        width: 220,
                        margin: "18px 0 0 0",
                        height: 8,
                        background: "#e0e7ef",
                        borderRadius: 6,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${progress}%`,
                          height: "100%",
                          background: "#70C1B3",
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setAssignModalOpen(false);
                      setAssigningDevice(null);
                      setAssignSearch("");
                      setShowTransferPrompt(false);
                      setSelectedTransferEmployee(null);
                    }}
                    style={{
                      marginTop: 18,
                      background: "#445F6D",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 22px",
                      fontWeight: 700,
                      fontSize: 16,
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </div>
              )}
              {!showTransferPrompt && (
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
              )}
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
              zIndex: 1300,
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 24,
                borderRadius: 8,
                minWidth: 350,
              }}
            >
              <h4>Unassign Device: {unassignDevice.deviceTag}</h4>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 8,
                    color: "#445F6D",
                  }}
                >
                  Reason for unassigning:
                </label>
                <>
                  <div style={{ marginTop: 8 }}>
                    <label>
                      <input
                        type="radio"
                        name="bulkUnassignReason"
                        value="working"
                        checked={unassignReason === "working"}
                        onChange={() => setUnassignReason("working")}
                        style={{ marginRight: 8, accentColor: "#70C1B3" }}
                      />
                      Working
                    </label>
                  </div>
                  <div>
                    <label>
                      <input
                        type="radio"
                        name="bulkUnassignReason"
                        value="defective"
                        checked={unassignReason === "defective"}
                        onChange={() => setUnassignReason("defective")}
                        style={{ marginRight: 8, accentColor: "#70C1B3" }}
                      />
                      Defective
                    </label>
                  </div>
                </>
              </div>
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <button
                  onClick={async () => {
                    if (!unassignReason) return;
                    const emp = employees.find(
                      (e) => e.id === unassignDevice.assignedTo
                    );
                    await handleGenerateUnassignDocx({
                      employee: emp || {
                        fullName: "",
                        department: "",
                        position: "",
                      },
                      device: unassignDevice,
                      reason: unassignReason,
                    });
                  }}
                  style={{
                    background: "#FFE066",
                    color: "#233037",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor:
                      unassignGenerating || !unassignReason
                        ? "not-allowed"
                        : "pointer",
                    marginRight: 8,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    transition: "background 0.2s, box-shadow 0.2s",
                    opacity: unassignGenerating || !unassignReason ? 0.7 : 1,
                  }}
                  disabled={unassignGenerating || !unassignReason}
                >
                  {unassignGenerating
                    ? "Generating..."
                    : "Generate Return Form"}
                </button>
                <button
                  onClick={confirmUnassign}
                  style={{
                    background: "#70C1B3",
                    color: "#233037",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: "pointer",
                    marginRight: 8,
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    transition: "background 0.2s, box-shadow 0.2s",
                  }}
                >
                  Cancel
                </button>
              </div>
              {unassignGenerating && (
                <div
                  style={{
                    width: 220,
                    margin: "18px 0 0 0",
                    height: 8,
                    background: "#e0e7ef",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${unassignProgress}%`,
                      height: "100%",
                      background: "#FFE066",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </React.Fragment>
  );
}

export default Assets;
