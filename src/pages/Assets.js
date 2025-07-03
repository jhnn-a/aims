import { useEffect, useState } from "react";
import {
  getAllDevices,
  deleteDevice,
  updateDevice,
} from "../services/deviceService";
import { getAllEmployees } from "../services/employeeService";
import { logDeviceHistory } from "../services/deviceHistoryService";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

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
  const [selectedTransferEmployee, setSelectedTransferEmployee] = useState(null);
  const [progress, setProgress] = useState(0); // Progress bar state
  const [generatingForm, setGeneratingForm] = useState(false); // Show/hide progress
  const [unassignGenerating, setUnassignGenerating] = useState(false);
  const [unassignProgress, setUnassignProgress] = useState(0);
  const [bulkUnassignWarning, setBulkUnassignWarning] = useState(""); // Warning state for bulk unassign

  useEffect(() => {
    loadDevicesAndEmployees();
  }, []);

  const loadDevicesAndEmployees = async () => {
    setLoading(true);
    const [allDevices, allEmployees] = await Promise.all([
      getAllDevices(),
      getAllEmployees(),
    ]);
    setDevices(allDevices); // Show all devices, not just assigned
    setEmployees(allEmployees);
    setLoading(false);
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
      return;
    }
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
    if (unassignReason === "defective") {
      condition = "Defective";
      reason = "Defective";
    }
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
  };

  const cancelUnassign = () => {
    setShowUnassignModal(false);
    setUnassignDevice(null);
  };

  // Checklist logic
  const isAllSelected = devices.length > 0 && selectedDeviceIds.length === devices.length;
  const isIndeterminate = selectedDeviceIds.length > 0 && selectedDeviceIds.length < devices.length;

  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedDeviceIds([]);
    else setSelectedDeviceIds(devices.map(d => d.id));
  };
  const toggleSelectDevice = (id) => {
    const device = devices.find(d => d.id === id);
    if (!device) return;
    // If nothing selected, allow any selection
    if (selectedDeviceIds.length === 0) {
      setSelectedDeviceIds([id]);
      setBulkUnassignWarning("");
      return;
    }
    // Get assignedTo of first selected device
    const firstDevice = devices.find(d => d.id === selectedDeviceIds[0]);
    if (firstDevice && device.assignedTo !== firstDevice.assignedTo) {
      const firstName = getEmployeeName(firstDevice.assignedTo);
      const thisName = getEmployeeName(device.assignedTo);
      window.alert(`You can only select devices assigned to the same employee for bulk unassign.\nFirst selected: ${firstName || 'Unassigned'}\nTried: ${thisName || 'Unassigned'}`);
      setBulkUnassignWarning("You can only select devices assigned to the same employee for bulk unassign.");
      return;
    }
    setBulkUnassignWarning("");
    setSelectedDeviceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Bulk reassign logic
  const handleBulkReassign = () => {
    if (selectedDeviceIds.length === 0) return alert("Select at least one device.");
    setBulkReassignModalOpen(true);
    setBulkAssignSearch("");
  };
  const handleBulkUnassign = () => {
    if (selectedDeviceIds.length === 0) return alert("Select at least one device.");
    // Check if all selected devices have the same assignedTo
    const selected = devices.filter(d => selectedDeviceIds.includes(d.id));
    const assignedToSet = new Set(selected.map(d => d.assignedTo));
    if (assignedToSet.size > 1) {
      setBulkUnassignWarning("You can only bulk unassign devices assigned to the same employee.");
      return;
    }
    setBulkUnassignWarning("");
    setBulkUnassignModalOpen(true);
    setBulkUnassignReason("working");
  };

  const confirmBulkReassign = async (emp) => {
    for (const id of selectedDeviceIds) {
      const device = devices.find(d => d.id === id);
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
    const transferors = [...new Set(selectedDeviceIds.map(id => {
      const device = devices.find(d => d.id === id);
      return device && device.assignedTo ? device.assignedTo : null;
    }).filter(Boolean))];
    // Use the first transferor's info for the form (or blank if mixed)
    let transferorEmp = employees.find(e => e.id === transferors[0]);
    if (!transferorEmp) transferorEmp = { fullName: '', department: '', dateHired: '', position: '' };
    await handleGenerateTransferForm({
      transferor: transferorEmp,
      transferee: emp,
      devices: devices.filter(d => selectedDeviceIds.includes(d.id)),
      docxFileName: `${emp.fullName || 'Employee'} - Transfer.docx`,
    });
    setBulkReassignModalOpen(false);
    setSelectedDeviceIds([]);
    loadDevicesAndEmployees();
  };

  const confirmBulkUnassign = async () => {
    // Only allow if all selected devices have the same assignedTo
    const selected = devices.filter(d => selectedDeviceIds.includes(d.id));
    const assignedToSet = new Set(selected.map(d => d.assignedTo));
    if (assignedToSet.size > 1) {
      setBulkUnassignWarning("You can only unassign devices assigned to the same employee.");
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
    const emp = employees.find(e => e.id === empId) || { fullName: '', department: '', position: '' };
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
    await handleGenerateBulkUnassignDocx({ employee: emp, devices: selected, reason: bulkUnassignReason });
    setBulkUnassignModalOpen(false);
    setSelectedDeviceIds([]);
    loadDevicesAndEmployees();
  };

  // Helper to format date as "June 23, 2025"
  function formatTransferDate(date) {
    if (!date) return '';
    let d;
    if (typeof date === 'object' && date.seconds) {
      d = new Date(date.seconds * 1000);
    } else {
      d = new Date(date);
    }
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
  }

  // Handler for generating the Asset Accountability Form (Transfer of Assets)
  async function handleGenerateTransferForm({
    transferor, transferee, devices, templatePath = '/AccountabilityForms/ASSET ACCOUNTABILITY FORM - TRANSFER.docx', docxFileName
  }) {
    try {
      setGeneratingForm(true);
      setProgress(10);

      // Fetch the docx template
      const response = await fetch(templatePath);
      if (!response.ok) throw new Error('Failed to fetch template');
      setProgress(30);

      const arrayBuffer = await response.arrayBuffer();
      setProgress(50);

      const zip = new PizZip(arrayBuffer);
      setProgress(65);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter() { return ''; }
      });
      setProgress(80);

      // Data object: must match template placeholders exactly
      const data = {
        transferor_name: transferor.fullName || '',
        transferor_department: transferor.department || '',
        transferor_date_hired: transferor.dateHired ? formatTransferDate(transferor.dateHired) : '',
        transferor_position: transferor.position || '',
        transferee_name: transferee.fullName || '',
        transferee_department: transferee.department || '',
        transferee_date_hired: transferee.dateHired ? formatTransferDate(transferee.dateHired) : '',
        transferee_position: transferee.position || '',
        devices: devices.map(device => ({
          TransferDate: formatTransferDate(device.assignmentDate || new Date()),
          deviceType: device.deviceType || '',
          brand: device.brand || '',
          deviceTag: device.deviceTag || '',
          condition: device.condition || ''
        }))
      };

      // Render the document
      doc.render(data);
      setProgress(90);

      const out = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
      let errorMsg = 'Error generating transfer form.';
      if (error && error.properties && error.properties.errors instanceof Array) {
        // Docxtemplater multi error (template issues)
        errorMsg += '\nTemplate errors:';
        error.properties.errors.forEach(function (e, i) {
          errorMsg += `\n${i + 1}. ${e.properties && e.properties.explanation ? e.properties.explanation : e.message}`;
        });
      } else if (error && error.message) {
        errorMsg += `\n${error.message}`;
      }
      console.error('Error generating transfer form:', error);
      setGeneratingForm(false);
      setProgress(0);
      alert(errorMsg + '\nPlease check the console for details.');
    }
  }

  async function handleGenerateUnassignDocx({ employee, device, reason }) {
    setUnassignGenerating(true);
    setUnassignProgress(10);
    try {
      // Use correct fetch path for public folder
      const response = await fetch('/AccountabilityForms/ASSET ACCOUNTABILITY FORM - RETURN.docx');
      setUnassignProgress(30);
      const arrayBuffer = await response.arrayBuffer();
      setUnassignProgress(50);
      const zip = new PizZip(arrayBuffer);
      setUnassignProgress(65);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      setUnassignProgress(80);
      // Checkbox logic for 4 checkboxes (checkBox1Checked, checkBox1Unchecked, ...)
      // Working: 1 and 3 checked, Defective: 2 and 4 checked
      const isWorking = reason === 'working';
      const isDefective = reason === 'defective';
      // If defective, set device condition to 'Defective' in docx
      const docxCondition = isDefective ? 'Defective' : (device.condition || '');
      const data = {
        name: employee.fullName || '',
        department: employee.department || '',
        position: employee.position || '',
        dateHired: employee.dateHired ? formatTransferDate(employee.dateHired) : '',
        devices: [{
          assignmentDate: device.assignmentDate ? formatTransferDate(device.assignmentDate) : '',
          deviceType: device.deviceType || '',
          brand: device.brand || '',
          deviceTag: device.deviceTag || '',
          condition: docxCondition
        }],
        checkBox1Checked: isWorking ? '◼' : '',
        checkBox1Unchecked: isWorking ? '' : '☐',
        checkBox2Checked: isDefective ? '◼' : '',
        checkBox2Unchecked: isDefective ? '' : '☐',
        checkBox3Checked: isWorking ? '◼' : '',
        checkBox3Unchecked: isWorking ? '' : '☐',
        checkBox4Checked: isDefective ? '◼' : '',
        checkBox4Unchecked: isDefective ? '' : '☐',
        remarks: device.remarks || '',
        model: device.model || '',
      };
      doc.render(data);
      setUnassignProgress(90);
      const out = doc.getZip().generate({ type: 'blob' });
      const employeeName = employee.fullName ? employee.fullName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_') : 'Employee';
      const fileName = `${employeeName} - Return.docx`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(out);
      link.download = fileName;
      link.click();
      setUnassignProgress(100);
      setTimeout(() => setUnassignGenerating(false), 800);
    } catch (err) {
      setUnassignGenerating(false);
      alert('Failed to generate return document.');
    }
  }

  // Bulk unassign docx generation
  async function handleGenerateBulkUnassignDocx({ employee, devices, reason }) {
    setUnassignGenerating(true);
    setUnassignProgress(10);
    try {
      // Use correct fetch path for public folder
      const response = await fetch('/AccountabilityForms/ASSET ACCOUNTABILITY FORM - RETURN.docx');
      setUnassignProgress(30);
      const arrayBuffer = await response.arrayBuffer();
      setUnassignProgress(50);
      const zip = new PizZip(arrayBuffer);
      setUnassignProgress(65);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      setUnassignProgress(80);
      // Checkbox logic for 4 checkboxes (checkBox1Checked, checkBox1Unchecked, ...)
      // Working: 1 and 3 checked, Defective: 2 and 4 checked
      const isWorking = reason === 'working';
      const isDefective = reason === 'defective';
      // If defective, set device condition to 'Defective' in docx
      const docxCondition = isDefective ? 'Defective' : '';
      const data = {
        name: employee.fullName || '',
        department: employee.department || '',
        position: employee.position || '',
        dateHired: employee.dateHired ? formatTransferDate(employee.dateHired) : '',
        devices: devices.map(device => ({
          assignmentDate: device.assignmentDate ? formatTransferDate(device.assignmentDate) : '',
          deviceType: device.deviceType || '',
          brand: device.brand || '',
          deviceTag: device.deviceTag || '',
          condition: docxCondition || device.condition || ''
        })),
        checkBox1Checked: isWorking ? '◼' : '',
        checkBox1Unchecked: isWorking ? '' : '☐',
        checkBox2Checked: isDefective ? '◼' : '',
        checkBox2Unchecked: isDefective ? '' : '☐',
        checkBox3Checked: isWorking ? '◼' : '',
        checkBox3Unchecked: isWorking ? '' : '☐',
        checkBox4Checked: isDefective ? '◼' : '',
        checkBox4Unchecked: isDefective ? '' : '☐',
        remarks: devices[0]?.remarks || '',
        model: devices[0]?.model || '',
      };
      doc.render(data);
      setUnassignProgress(90);
      const out = doc.getZip().generate({ type: 'blob' });
      const employeeName = employee.fullName ? employee.fullName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_') : 'Employee';
      const fileName = `${employeeName} - Return.docx`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(out);
      link.download = fileName;
      link.click();
      setUnassignProgress(100);
      setTimeout(() => setUnassignGenerating(false), 800);
    } catch (err) {
      setUnassignGenerating(false);
      alert('Failed to generate return document.');
    }
  }

  return (
    <div
      style={{
        padding: '16px',
        background: "#f7f9fb",
        minHeight: "100vh",
        fontFamily: 'Segoe UI, Arial, sans-serif',
        width: '100%',
        maxWidth: '100%',
        margin: 0,
        boxSizing: 'border-box',
      }}
    >
      <h2
        style={{
          color: "#233037",
          fontWeight: 800,
          fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
          marginBottom: 18,
          wordBreak: 'break-word',
        }}
      >
        Assets
      </h2>
      {/* Outlined Multiple Devices section with search and buttons */}
      <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 24, marginTop: 8, maxWidth: 900, width: '100%' }}>
        {/* Search bar (outside outline, left-aligned) */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', minHeight: 60 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#fff',
              borderRadius: 24,
              boxShadow: '0 2px 8px rgba(68,95,109,0.10)',
              border: '1.5px solid #e0e7ef',
              padding: '2px 16px 2px 12px',
              width: 400,
              minWidth: 0,
              transition: 'box-shadow 0.2s, border 0.2s',
            }}
          >
            <svg
              width="22"
              height="22"
              style={{ color: '#445F6D', opacity: 0.7 }}
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
              placeholder="Search by tag, type, brand, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '1.1rem',
                color: '#233037',
                padding: '10px 0 10px 8px',
                width: '100%',
                fontWeight: 500,
                minWidth: 0,
              }}
            />
          </div>
        </div>
        {/* Outlined button group, right-aligned */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            marginLeft: 18,
            minWidth: 180,
            justifyContent: 'flex-end',
          }}
        >
          <span style={{
            fontWeight: 700,
            fontSize: 13,
            color: '#1b7f6b',
            marginBottom: 4,
            letterSpacing: 0.5,
            textAlign: 'right',
            opacity: 0.85,
          }}>
            
          </span>
          <div
            style={{
              display: 'flex',
              gap: 10,
              border: '2.5px solid #70C1B3',
              borderRadius: 18,
              background: '#f8fffc',
              padding: '10px 18px',
              boxShadow: '0 2px 8px rgba(112,193,179,0.08)',
              justifyContent: 'flex-end',
              minWidth: 160,
            }}
          >
            <button
              style={{
                background: selectedDeviceIds.length ? '#70C1B3' : '#e0e7ef',
                color: selectedDeviceIds.length ? '#233037' : '#888',
                border: 'none',
                borderRadius: 8,
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 15,
                cursor: selectedDeviceIds.length ? 'pointer' : 'not-allowed',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'background 0.2s, box-shadow 0.2s',
              }}
              disabled={!selectedDeviceIds.length}
              onClick={handleBulkReassign}
            >
              Reassign
            </button>
            <button
              style={{
                background: selectedDeviceIds.length ? '#445F6D' : '#e0e7ef',
                color: selectedDeviceIds.length ? '#fff' : '#888',
                border: 'none',
                borderRadius: 8,
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 15,
                cursor: selectedDeviceIds.length ? 'pointer' : 'not-allowed',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'background 0.2s, box-shadow 0.2s',
              }}
              disabled={!selectedDeviceIds.length}
              onClick={handleBulkUnassign}
            >
              Unassign
            </button>
          </div>
        </div>
      </div>
      <div style={{ width: '100%' }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(68,95,109,0.08)",
            overflow: "hidden",
            tableLayout: 'auto',
          }}
        >
          <thead>
            <tr style={{ background: "#445F6D" }}>
              <th style={{ padding: 12, border: "none" }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                  onChange={toggleSelectAll}
                  style={{ width: 18, height: 18, accentColor: "#70C1B3" }}
                  title="Select all"
                />
              </th>
              <th
                style={{
                  color: "#fff",
                  fontWeight: 600,
                  padding: 12,
                  border: "none",
                }}
              >
                Device Tag
              </th>
              <th
                style={{
                  color: "#fff",
                  fontWeight: 600,
                  padding: 12,
                  border: "none",
                }}
              >
                Type
              </th>
              <th
                style={{
                  color: "#fff",
                  fontWeight: 600,
                  padding: 12,
                  border: "none",
                }}
              >
                Brand
              </th>
              <th
                style={{
                  color: "#fff",
                  fontWeight: 600,
                  padding: 12,
                  border: "none",
                }}
              >
                Model
              </th>
              <th
                style={{
                  color: "#fff",
                  fontWeight: 600,
                  padding: 12,
                  border: "none",
                }}
              >
                Assigned To
              </th>
              <th
                style={{
                  color: "#fff",
                  fontWeight: 600,
                  padding: 12,
                  border: "none",
                }}
              >
                Condition
              </th>
              <th
                style={{
                  color: "#fff",
                  fontWeight: 600,
                  padding: 12,
                  border: "none",
                }}
              >
                Status
              </th>
              <th
                style={{
                  color: "#fff",
                  fontWeight: 600,
                  padding: 12,
                  border: "none",
                }}
              >
                Assignment Date
              </th>
              <th
                style={{
                  color: "#fff",
                  fontWeight: 600,
                  padding: 12,
                  border: "none",
                }}
              >
                Remarks
              </th>
              <th
                style={{
                  color: "#fff",
                  fontWeight: 600,
                  padding: 12,
                  border: "none",
                  minWidth: 60, // Minimize width
                  maxWidth: 70,
                  textAlign: 'center',
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {devices
              .filter(device => {
                const q = search.trim().toLowerCase();
                if (!q) return true;
                return (
                  (device.deviceTag || '').toLowerCase().includes(q) ||
                  (device.deviceType || '').toLowerCase().includes(q) ||
                  (device.brand || '').toLowerCase().includes(q) ||
                  (device.model || '').toLowerCase().includes(q) ||
                  (getEmployeeName(device.assignedTo) || '').toLowerCase().includes(q) ||
                  (device.condition || '').toLowerCase().includes(q) ||
                  (device.status || '').toLowerCase().includes(q) ||
                  (device.remarks || '').toLowerCase().includes(q)
                );
              })
              .map((device) => {
                return (
                  <tr key={device.id}>
                    <td style={{ padding: '0.7em 0.5em', borderBottom: "1px solid #e0e7ef" }}>
                      <input
                        type="checkbox"
                        checked={selectedDeviceIds.includes(device.id)}
                        onChange={() => toggleSelectDevice(device.id)}
                        style={{ width: 18, height: 18, accentColor: "#70C1B3" }}
                        title="Select device"
                      />
                    </td>
                    <td style={{ padding: '0.7em 0.5em', borderBottom: "1px solid #e0e7ef", color: "#233037", wordBreak: 'break-word', fontSize: '1em' }}>{device.deviceTag}</td>
                    <td style={{ padding: '0.7em 0.5em', borderBottom: "1px solid #e0e7ef", color: "#233037", wordBreak: 'break-word', fontSize: '1em' }}>{device.deviceType}</td>
                    <td style={{ padding: '0.7em 0.5em', borderBottom: "1px solid #e0e7ef", color: "#233037", wordBreak: 'break-word', fontSize: '1em' }}>{device.brand}</td>
                    <td style={{ padding: '0.7em 0.5em', borderBottom: "1px solid #e0e7ef", color: "#233037", wordBreak: 'break-word', fontSize: '1em' }}>{device.model}</td>
                    <td style={{ padding: '0.7em 0.5em', borderBottom: "1px solid #e0e7ef", color: "#233037", wordBreak: 'break-word', fontSize: '1em' }}>{getEmployeeName(device.assignedTo)}</td>
                    <td style={{ padding: '0.7em 0.5em', borderBottom: "1px solid #e0e7ef", color: "#233037", wordBreak: 'break-word', fontSize: '1em' }}>{device.condition}</td>
                    <td style={{ padding: '0.7em 0.5em', borderBottom: "1px solid #e0e7ef", color: "#233037", wordBreak: 'break-word', fontSize: '1em' }}>{device.status}</td>
                    <td style={{ padding: '0.7em 0.5em', borderBottom: "1px solid #e0e7ef", color: "#233037", wordBreak: 'break-word', fontSize: '1em' }}>{device.assignmentDate ? new Date(device.assignmentDate.seconds ? device.assignmentDate.seconds * 1000 : device.assignmentDate).toLocaleDateString() : ""}</td>
                    <td style={{ padding: '0.7em 0.5em', borderBottom: "1px solid #e0e7ef", color: "#233037", wordBreak: 'break-word', fontSize: '1em' }}>{device.remarks || ""}</td>
                    <td
                      style={{
                        padding: '0.7em 0.5em',
                        borderBottom: "1px solid #e0e7ef",
                        minWidth: 60, // Minimize width
                        maxWidth: 70,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                        <button
                          style={{ background: "#e0f2f1", border: "none", borderRadius: 6, padding: 6, cursor: "pointer", display: "flex", alignItems: "center", transition: "background 0.2s" }}
                          title="Edit"
                          onClick={() => handleEdit(device)}
                          onMouseEnter={e => e.currentTarget.style.background = '#b2dfdb'}
                          onMouseLeave={e => e.currentTarget.style.background = '#e0f2f1'}
                        >
                          <svg width="18" height="18" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                        </button>
                        <button
                          style={{ background: "#ffebee", border: "none", borderRadius: 6, padding: 6, cursor: "pointer", display: "flex", alignItems: "center", transition: "background 0.2s" }}
                          title="Delete"
                          onClick={() => handleDelete(device.id)}
                          onMouseEnter={e => e.currentTarget.style.background = '#ffcdd2'}
                          onMouseLeave={e => e.currentTarget.style.background = '#ffebee'}
                        >
                          <svg width="18" height="18" fill="none" stroke="#e57373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

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
              width: '96vw',
            }}
          >
            {!selectedTransferEmployee ? (
              <>
                <h4>Reassign {selectedDeviceIds.length} Devices</h4>
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={bulkAssignSearch}
                  onChange={e => setBulkAssignSearch(e.target.value)}
                  style={{ width: "100%", marginBottom: 8, padding: 6 }}
                />
                <ul style={{ maxHeight: 200, overflowY: "auto", padding: 0, margin: 0 }}>
                  {employees
                    .filter(emp => emp.fullName.toLowerCase().includes(bulkAssignSearch.toLowerCase()))
                    .map(emp => (
                      <li key={emp.id} style={{ listStyle: "none", marginBottom: 8 }}>
                        <button
                          style={{ width: "100%", textAlign: "left", padding: 8 }}
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
                  Reassign Device(s) to <span style={{ color: '#2563eb' }}>{selectedTransferEmployee.fullName}</span>:
                </h4>
                <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 16, background: '#f7f9fb', borderRadius: 8, padding: 8, border: '1px solid #e0e7ef' }}>
                  <table style={{ width: '100%', fontSize: 14 }}>
                    <thead>
                      <tr style={{ color: '#445F6D', fontWeight: 700 }}>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Tag</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Type</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Brand</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Model</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.filter(d => selectedDeviceIds.includes(d.id)).map(device => (
                        <tr key={device.id}>
                          <td style={{ padding: '4px 8px' }}>{device.deviceTag}</td>
                          <td style={{ padding: '4px 8px' }}>{device.deviceType}</td>
                          <td style={{ padding: '4px 8px' }}>{device.brand}</td>
                          <td style={{ padding: '4px 8px' }}>{device.model}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    onClick={() => {
                      setSelectedTransferEmployee(null);
                    }}
                    style={{ background: '#e0e7ef', color: '#233037', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await confirmBulkReassign(selectedTransferEmployee);
                      setSelectedTransferEmployee(null);
                    }}
                    style={{ background: '#70C1B3', color: '#233037', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
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
              <div style={{ color: 'red', marginBottom: 8, fontWeight: 600 }}>{bulkUnassignWarning}</div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600, display: "block", marginBottom: 8, color: "#445F6D" }}>
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
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
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
                  cursor: bulkUnassignReason && !bulkUnassignWarning ? "pointer" : "not-allowed",
                  marginRight: 8,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "background 0.2s, box-shadow 0.2s",
                  opacity: bulkUnassignReason && !bulkUnassignWarning ? 1 : 0.7,
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
            <h4>{assigningDevice && assigningDevice.assignedTo ? "Reassign Device" : "Assign Device"}</h4>
            {!showTransferPrompt && (
              <>
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  style={{ width: "100%", marginBottom: 8, padding: 6 }}
                />
                <ul style={{ maxHeight: 200, overflowY: "auto", padding: 0, margin: 0 }}>
                  {employees
                    .filter(emp => emp.fullName.toLowerCase().includes(assignSearch.toLowerCase()))
                    .map(emp => (
                      <li key={emp.id} style={{ listStyle: "none", marginBottom: 8 }}>
                        <button
                          style={{ width: "100%", textAlign: "left", padding: 8 }}
                          onClick={async () => {
                            // Log unassign if reassigning
                            if (assigningDevice.assignedTo && assigningDevice.assignedTo !== emp.id) {
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
                            const { id: _id, ...deviceWithoutId } = assigningDevice;
                            await updateDevice(assigningDevice.id, {
                              ...deviceWithoutId,
                              assignedTo: emp.id,
                              reason: "assigned",
                              date: new Date().toISOString(),
                            });
                            setSelectedTransferEmployee(emp);
                            setShowTransferPrompt(true);
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 16 }}>
                <div style={{ marginBottom: 18, fontWeight: 600, color: '#233037', fontSize: 16, textAlign: 'center' }}>
                  Device successfully reassigned to <span style={{ color: '#70C1B3' }}>{selectedTransferEmployee.fullName}</span>.
                </div>
                <button
                  onClick={async () => {
                    // Find transferor (previous assigned employee)
                    const transferor = employees.find(e => e.id === (assigningDevice?.assignedTo || assigningDevice?.prevAssignedTo));
                    const transferee = selectedTransferEmployee;
                    // For single device
                    await handleGenerateTransferForm({
                      transferor: transferor || { fullName: '', department: '', dateHired: '', position: '' },
                      transferee,
                      devices: [assigningDevice],
                      // Pass custom filename
                      docxFileName: `${transferee.fullName || 'Employee'} - Transfer.docx`,
                    });
                  }}
                  style={{
                    background: '#70C1B3',
                    color: '#233037',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 28px',
                    fontWeight: 700,
                    fontSize: 17,
                    cursor: generatingForm ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    transition: 'background 0.2s, box-shadow 0.2s',
                    opacity: generatingForm ? 0.7 : 1,
                  }}
                  disabled={generatingForm}
                >
                  {generatingForm ? 'Generating...' : 'Generate Transfer Form'}
                </button>
                {generatingForm && (
                  <div style={{ width: 220, margin: '18px 0 0 0', height: 8, background: '#e0e7ef', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: '#70C1B3', transition: 'width 0.3s' }} />
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
                  style={{ marginTop: 18, background: '#445F6D', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
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
              <label style={{ fontWeight: 600, display: "block", marginBottom: 8, color: "#445F6D" }}>
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
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={async () => {
                  if (!unassignReason) return;
                  const emp = employees.find(e => e.id === unassignDevice.assignedTo);
                  await handleGenerateUnassignDocx({ employee: emp || { fullName: '', department: '', position: '' }, device: unassignDevice, reason: unassignReason });
                }}
                style={{
                  background: "#FFE066",
                  color: "#233037",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 22px",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: unassignGenerating || !unassignReason ? "not-allowed" : "pointer",
                  marginRight: 8,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "background 0.2s, box-shadow 0.2s",
                  opacity: unassignGenerating || !unassignReason ? 0.7 : 1,
                }}
                disabled={unassignGenerating || !unassignReason}
              >
                {unassignGenerating ? 'Generating...' : 'Generate Return Form'}
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
              <div style={{ width: 220, margin: '18px 0 0 0', height: 8, background: '#e0e7ef', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: `${unassignProgress}%`, height: '100%', background: '#FFE066', transition: 'width 0.3s' }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Assets;