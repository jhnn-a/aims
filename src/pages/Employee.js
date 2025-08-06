import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  addEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
  resignEmployee,
  undoResignation,
} from "../services/employeeService";
import { getAllClients } from "../services/clientService";
import { getAllDevices, updateDevice, addDevice } from "../services/deviceService";
import {
  getDeviceHistoryForEmployee,
  logDeviceHistory,
  deleteDeviceHistory,
} from "../services/deviceHistoryService";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useSnackbar } from "../components/Snackbar";
import LoadingSpinner, {
  TableLoadingSpinner,
} from "../components/LoadingSpinner";
import undoManager from "../utils/undoManager";
import PizZip from "pizzip"; // For DOCX file generation
import Docxtemplater from "docxtemplater"; // For DOCX template processing
import { saveAs } from "file-saver"; // File download functionality

const isValidName = (value) => /^[A-Za-zÑñ\s.'\-(),]+$/.test(value.trim());

// Simple Modal Component with CompanyAssets styling
function EmployeeFormModal({
  data,
  onChange,
  onSave,
  onCancel,
  isValid,
  clients,
}) {
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
        padding: "clamp(16px, 2vw, 20px)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: "clamp(16px, 2vw, 24px)",
          width: "100%",
          maxWidth: "min(480px, 90vw)",
          maxHeight: "95vh",
          overflow: "auto",
          fontFamily: 'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: "0 20px 32px rgba(34, 46, 58, 0.2)",
          margin: "auto",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(18px, 2vw, 22px)",
            fontWeight: 700,
            color: "#222e3a",
            marginBottom: "clamp(16px, 2vw, 20px)",
            marginTop: 0,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {data.id ? "Edit Employee" : "Add Employee"}
        </h2>
        
        {/* Hidden fields for First Name, Last Name, Middle Name */}
        <input
          name="firstName"
          value={data.firstName || ""}
          onChange={onChange}
          style={{ display: "none" }}
        />
        <input
          name="lastName"
          value={data.lastName || ""}
          onChange={onChange}
          style={{ display: "none" }}
        />
        <input
          name="middleName"
          value={data.middleName || ""}
          onChange={onChange}
          style={{ display: "none" }}
        />
        
        {/* Scrollable content area */}
        <div 
          style={{ 
            flex: 1,
            overflow: "auto",
            minHeight: 0,
            paddingRight: "4px",
            marginRight: "-4px",
          }}
        >
          <div style={{ display: "grid", gap: "clamp(10px, 1.2vw, 14px)" }}>
            <div>
              <label style={{ 
                display: "block",
                fontSize: "clamp(12px, 1.1vw, 14px)",
                fontWeight: 600,
                color: "#374151",
                marginBottom: 4,
              }}>
                Full Name:
              </label>
              <input
                name="fullName"
                value={data.fullName}
                onChange={onChange}
                style={{
                  width: "100%",
                  padding: "clamp(6px, 0.8vw, 10px)",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: "clamp(12px, 1.1vw, 14px)",
                  fontFamily: 'inherit',
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: "block",
                fontSize: "clamp(12px, 1.1vw, 14px)",
                fontWeight: 600,
                color: "#374151",
                marginBottom: 4,
              }}>
                Position:
              </label>
              <input
                name="position"
                value={data.position}
                onChange={onChange}
                style={{
                  width: "100%",
                  padding: "clamp(6px, 0.8vw, 10px)",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: "clamp(12px, 1.1vw, 14px)",
                  fontFamily: 'inherit',
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: "block",
                fontSize: "clamp(12px, 1.1vw, 14px)",
                fontWeight: 600,
                color: "#374151",
                marginBottom: 4,
              }}>
                Department:
              </label>
              <input
                name="department"
                value={data.department}
                onChange={onChange}
                style={{
                  width: "100%",
                  padding: "clamp(6px, 0.8vw, 10px)",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: "clamp(12px, 1.1vw, 14px)",
                  fontFamily: 'inherit',
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: "block",
                fontSize: "clamp(12px, 1.1vw, 14px)",
                fontWeight: 600,
                color: "#374151",
                marginBottom: 4,
              }}>
                Client:
              </label>
              <select
                name="clientId"
                value={data.clientId}
                onChange={onChange}
                style={{
                  width: "100%",
                  padding: "clamp(6px, 0.8vw, 10px)",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: "clamp(12px, 1.1vw, 14px)",
                  fontFamily: 'inherit',
                  outline: "none",
                  backgroundColor: "white",
                  boxSizing: "border-box",
                }}
              >
                <option value="" disabled>
                  Choose Client
                </option>
                {clients
                  .slice()
                  .sort((a, b) => a.clientName.localeCompare(b.clientName))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName}
                    </option>
                  ))}
              </select>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(6px, 0.8vw, 10px)" }}>
              <div>
                <label style={{ 
                  display: "block",
                  fontSize: "clamp(12px, 1.1vw, 14px)",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 4,
                }}>
                  Corporate Email:
                </label>
                <input
                  type="email"
                  name="corporateEmail"
                  value={data.corporateEmail || ""}
                  onChange={onChange}
                  style={{
                    width: "100%",
                    padding: "clamp(6px, 0.8vw, 10px)",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(12px, 1.1vw, 14px)",
                    fontFamily: 'inherit',
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: "block",
                  fontSize: "clamp(12px, 1.1vw, 14px)",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 4,
                }}>
                  Personal Email:
                </label>
                <input
                  type="email"
                  name="personalEmail"
                  value={data.personalEmail || ""}
                  onChange={onChange}
                  style={{
                    width: "100%",
                    padding: "clamp(6px, 0.8vw, 10px)",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(12px, 1.1vw, 14px)",
                    fontFamily: 'inherit',
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            
            <div>
              <label style={{ 
                display: "block",
                fontSize: "clamp(12px, 1.1vw, 14px)",
                fontWeight: 600,
                color: "#374151",
                marginBottom: 4,
              }}>
                Date Hired:
              </label>
              <input
                type="date"
                name="dateHired"
                value={data.dateHired ? data.dateHired : ""}
                onChange={onChange}
                style={{
                  width: "100%",
                  padding: "clamp(6px, 0.8vw, 10px)",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: "clamp(12px, 1.1vw, 14px)",
                  fontFamily: 'inherit',
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Fixed footer with buttons */}
        <div style={{ 
          display: "flex", 
          gap: "clamp(6px, 0.8vw, 10px)", 
          justifyContent: "flex-end",
          marginTop: "clamp(12px, 1.5vw, 16px)",
          flexWrap: "wrap",
          flexShrink: 0,
          paddingTop: "clamp(8px, 1vw, 12px)",
          borderTop: "1px solid #f3f4f6",
        }}>
          <button 
            onClick={onCancel}
            style={{
              padding: "clamp(6px, 0.8vw, 10px) clamp(10px, 1.2vw, 14px)",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "white",
              color: "#374151",
              fontSize: "clamp(12px, 1.1vw, 14px)",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: 'inherit',
              minWidth: "70px",
            }}
          >
            Cancel
          </button>
          <button 
            onClick={onSave} 
            disabled={!isValid}
            style={{
              padding: "clamp(6px, 0.8vw, 10px) clamp(10px, 1.2vw, 14px)",
              border: "none",
              borderRadius: 6,
              background: isValid ? "#2563eb" : "#9ca3af",
              color: "white",
              fontSize: "clamp(12px, 1.1vw, 14px)",
              fontWeight: 500,
              cursor: isValid ? "pointer" : "not-allowed",
              fontFamily: 'inherit',
              minWidth: "70px",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal for bulk resign confirmation
function BulkResignModal({ isOpen, onConfirm, onCancel, selectedCount, reason, setReason }) {
  if (!isOpen) return null;

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
          backgroundColor: "white",
          borderRadius: 12,
          padding: 32,
          width: "90%",
          maxWidth: 400,
          fontFamily: 'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: "0 20px 32px rgba(34, 46, 58, 0.2)",
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#222e3a",
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          Confirm Bulk Resign
        </h2>
        <p style={{ color: "#6b7280", marginBottom: 20, fontSize: 14 }}>
          Are you sure you want to resign {selectedCount} employee(s)?
        </p>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ 
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 6,
          }}>
            Reason for resignation:
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional reason..."
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'inherit',
              outline: "none",
              minHeight: 80,
              resize: "vertical",
            }}
          />
        </div>
        
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button 
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "white",
              color: "#374151",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 6,
              background: "#dc2626",
              color: "white",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: 'inherit',
            }}
          >
            Resign {selectedCount} Employee(s)
          </button>
        </div>
      </div>
    </div>
  );
}

// Modern Confirmation Modal for Individual Actions
function ConfirmationModal({ isOpen, onConfirm, onCancel, title, message, confirmText, confirmColor = "#dc2626" }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "36px 40px",
          borderRadius: 18,
          minWidth: "min(400px, 90vw)",
          maxWidth: "min(500px, 95vw)",
          width: "auto",
          boxShadow: "0 12px 48px rgba(37,99,235,0.18)",
          position: "relative",
          margin: "20px",
          boxSizing: "border-box",
          fontFamily: 'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <h2
          style={{
            color: confirmColor,
            marginBottom: 12,
            margin: "0 0 18px 0",
            fontWeight: 700,
            letterSpacing: 1,
            fontSize: 22,
            textAlign: "center",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: "0 0 16px 0",
            color: "#374151",
            fontSize: 16,
            textAlign: "center",
          }}
        >
          {message}
        </p>
        <div
          style={{
            marginTop: 24,
            textAlign: "right",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            onClick={onConfirm}
            style={{
              background: confirmColor,
              color: "#fff",
              border: "none",
              borderRadius: 7,
              padding: "7px 16px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.3s ease",
              minWidth: 36,
              minHeight: 28,
              display: "inline-block",
              boxShadow: `0 2px 8px ${confirmColor}20`,
              outline: "none",
              opacity: 1,
              transform: "translateY(0) scale(1)",
            }}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            style={{
              background: "#e0e7ef",
              color: "#233037",
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              fontWeight: 700,
              fontSize: 14,
              marginLeft: 8,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Employee Assets Modal
function EmployeeAssetsModal({ isOpen, onClose, employee, devices, deviceHistory = [], onDeviceUpdate }) {
  const { showSuccess, showError } = useSnackbar();
  
  // Modal states for action confirmations
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: '', // 'unassign' or 'reassign'
    device: null,
    devices: [], // for bulk actions
    newEmployee: null, // for reassign
    isGenerating: false,
    progress: 0,
    docxBlob: null,
    isBulk: false,
    selectedCondition: '', // 'GOOD' or 'DEFECTIVE' for single unassign operations
    deviceConditions: {} // Object to store individual device conditions for bulk operations: {deviceId: 'GOOD'|'DEFECTIVE'}
  });
  
  // State for reassign employee selection
  const [allEmployees, setAllEmployees] = useState([]);
  
  // Bulk selection state
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Load employees for reassignment
  useEffect(() => {
    if (isOpen) {
      const loadEmployees = async () => {
        try {
          const employeeList = await getAllEmployees();
          setAllEmployees(employeeList.filter(emp => !emp.isResigned && emp.id !== employee?.id));
        } catch (error) {
          console.error("Error loading employees:", error);
        }
      };
      loadEmployees();
      // Reset bulk selection when modal opens
      setSelectedDeviceIds([]);
      setShowBulkActions(false);
    }
  }, [isOpen, employee?.id]);

  // Bulk selection handlers
  const handleSelectAllDevices = (checked) => {
    if (checked) {
      setSelectedDeviceIds(deployedAssets.map(device => device.id));
    } else {
      setSelectedDeviceIds([]);
    }
    setShowBulkActions(checked && deployedAssets.length > 0);
  };

  const handleSelectDevice = (deviceId, checked) => {
    let newSelection;
    if (checked) {
      newSelection = [...selectedDeviceIds, deviceId];
    } else {
      newSelection = selectedDeviceIds.filter(id => id !== deviceId);
    }
    setSelectedDeviceIds(newSelection);
    setShowBulkActions(newSelection.length > 0);
  };

  // Bulk action handlers
  const handleBulkUnassign = () => {
    const selectedDevices = deployedAssets.filter(device => selectedDeviceIds.includes(device.id));
    setActionModal({
      isOpen: true,
      type: 'unassign',
      device: null,
      devices: selectedDevices,
      newEmployee: null,
      isGenerating: false,
      progress: 0,
      docxBlob: null,
      isBulk: true,
      selectedCondition: '',
      deviceConditions: {} // Initialize empty - user will select for each device
    });
  };

  const handleBulkReassign = () => {
    const selectedDevices = deployedAssets.filter(device => selectedDeviceIds.includes(device.id));
    setActionModal({
      isOpen: true,
      type: 'reassign',
      device: null,
      devices: selectedDevices,
      newEmployee: null,
      isGenerating: false,
      progress: 0,
      docxBlob: null,
      isBulk: true,
      selectedCondition: '',
      deviceConditions: {}
    });
  };

  // Action handlers
  const handleUnassign = (device) => {
    setActionModal({
      isOpen: true,
      type: 'unassign',
      device,
      devices: [device],
      newEmployee: null,
      isGenerating: false,
      progress: 0,
      docxBlob: null,
      isBulk: false,
      selectedCondition: '',
      deviceConditions: {}
    });
  };

  const handleReassign = (device) => {
    setActionModal({
      isOpen: true,
      type: 'reassign',
      device,
      devices: [device],
      newEmployee: null,
      isGenerating: false,
      progress: 0,
      docxBlob: null,
      isBulk: false,
      selectedCondition: '',
      deviceConditions: {}
    });
  };

  const handleConfirmAction = async () => {
    const { type, devices, newEmployee, isBulk, selectedCondition, deviceConditions } = actionModal;
    
    try {
      setActionModal(prev => ({ ...prev, isGenerating: true, progress: 10 }));
      
      const progressStep = 70 / devices.length; // Distribute progress across devices
      let currentProgress = 10;
      
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        
        if (type === 'unassign') {
          // Get condition for this specific device (bulk) or use single condition
          const deviceCondition = isBulk ? deviceConditions[device.id] : selectedCondition;
          
          // Unassign device with updated condition
          await updateDevice(device.id, {
            assignedTo: null,
            assignmentDate: null,
            status: "AVAILABLE",
            condition: deviceCondition // Update condition based on user selection
          });
          
          // Log device history
          await logDeviceHistory({
            employeeId: employee.id,
            employeeName: employee.fullName,
            deviceId: device.id,
            deviceTag: device.deviceTag,
            action: 'unassigned',
            date: new Date().toISOString(),
            reason: isBulk ? 'Bulk unassignment from Employee page' : 'Manual unassignment from Employee page',
            condition: deviceCondition
          });
          
        } else if (type === 'reassign' && newEmployee) {
          // Reassign device - automatically change BRANDNEW to GOOD when reassigning
          const newCondition = device.condition === 'BRANDNEW' ? 'GOOD' : device.condition;
          
          await updateDevice(device.id, {
            assignedTo: newEmployee.id,
            assignmentDate: new Date().toISOString().slice(0, 10),
            status: "DEPLOYED",
            condition: newCondition
          });
          
          // Log device history for unassignment from current employee
          await logDeviceHistory({
            employeeId: employee.id,
            employeeName: employee.fullName,
            deviceId: device.id,
            deviceTag: device.deviceTag,
            action: 'unassigned',
            date: new Date().toISOString(),
            reason: isBulk ? `Bulk reassigned to ${newEmployee.fullName}` : `Reassigned to ${newEmployee.fullName}`,
            condition: device.condition // Original condition before reassignment
          });
          
          // Log device history for assignment to new employee
          await logDeviceHistory({
            employeeId: newEmployee.id,
            employeeName: newEmployee.fullName,
            deviceId: device.id,
            deviceTag: device.deviceTag,
            action: 'assigned',
            date: new Date().toISOString(),
            reason: isBulk ? `Bulk reassigned from ${employee.fullName}` : `Reassigned from ${employee.fullName}`,
            condition: newCondition // New condition after reassignment
          });
        }
        
        currentProgress += progressStep;
        setActionModal(prev => ({ ...prev, progress: Math.min(currentProgress, 80) }));
      }
      
      setActionModal(prev => ({ ...prev, progress: 85 }));
      await generateBulkDocx(type, devices, employee, newEmployee);
      
      // Clear bulk selection
      setSelectedDeviceIds([]);
      setShowBulkActions(false);
      
      // Refresh device data
      if (onDeviceUpdate) {
        onDeviceUpdate();
      }
      
      const deviceCount = devices.length;
      const actionText = type === 'unassign' ? 'unassigned' : 'reassigned';
      showSuccess(`${deviceCount} device${deviceCount > 1 ? 's' : ''} ${actionText} successfully!`);
      
    } catch (error) {
      console.error(`Error ${type}ing devices:`, error);
      showError(`Error ${type}ing devices: ${error.message}`);
      setActionModal(prev => ({ ...prev, isGenerating: false, progress: 0 }));
    }
  };

  const generateDocx = async (actionType, device, fromEmployee, toEmployee = null) => {
    try {
      setActionModal(prev => ({ ...prev, progress: 40 }));
      
      const templatePath = actionType === 'unassign' 
        ? "/src/AccountabilityForms/ASSET ACCOUNTABILITY FORM - RETURN.docx"
        : "/src/AccountabilityForms/ASSET ACCOUNTABILITY FORM - TRANSFER.docx";
      
      const response = await fetch(templatePath);
      setActionModal(prev => ({ ...prev, progress: 50 }));
      
      const content = await response.arrayBuffer();
      setActionModal(prev => ({ ...prev, progress: 60 }));
      
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter() {
          return "";
        },
      });
      setActionModal(prev => ({ ...prev, progress: 70 }));

      // Format date helper to match Assets.js implementation
      const formatTransferDate = (dateStr) => {
        if (!dateStr) return "";
        try {
          // Handle Firestore timestamp object
          if (dateStr && typeof dateStr === "object" && dateStr.seconds) {
            return new Date(dateStr.seconds * 1000).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "2-digit",
            });
          }
          
          // Handle regular date
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return "";
          
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "2-digit",
          });
        } catch (error) {
          console.error("Error formatting date:", error);
          return "";
        }
      };

      let templateData;

      if (actionType === 'unassign') {
        // For return forms - match Assets.js structure
        const { selectedCondition } = actionModal;
        const isWorking = selectedCondition === 'GOOD';
        const isDefective = selectedCondition === 'DEFECTIVE';
        
        templateData = {
          name: fromEmployee.fullName || "",
          department: fromEmployee.department || "",
          position: fromEmployee.position || "",
          dateHired: formatTransferDate(fromEmployee.dateHired) || "",
          devices: [
            {
              assignmentDate: formatTransferDate(device.assignmentDate) || "",
              deviceType: device.deviceType || "",
              brand: device.brand || "",
              model: device.model || "",
              deviceTag: device.deviceTag || "",
              condition: selectedCondition || device.condition || "",
            }
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
      } else {
        // For transfer forms - match Assets.js structure
        templateData = {
          transferor_name: fromEmployee.fullName || "",
          transferor_department: fromEmployee.department || "",
          transferor_date_hired: formatTransferDate(fromEmployee.dateHired) || "",
          transferor_position: fromEmployee.position || "",
          transferee_name: toEmployee ? toEmployee.fullName || "" : "",
          transferee_department: toEmployee ? toEmployee.department || "" : "",
          transferee_date_hired: toEmployee ? formatTransferDate(toEmployee.dateHired) || "" : "",
          transferee_position: toEmployee ? toEmployee.position || "" : "",
          devices: [
            {
              TransferDate: formatTransferDate(device.assignmentDate || new Date()),
              deviceType: device.deviceType || "",
              brand: device.brand || "",
              model: device.model || "",
              deviceTag: device.deviceTag || "",
              condition: device.condition === 'BRANDNEW' ? 'GOOD' : (device.condition || ""), // Auto-change BRANDNEW to GOOD for reassignment
            }
          ],
        };
      }

      doc.setData(templateData);
      setActionModal(prev => ({ ...prev, progress: 80 }));
      
      doc.render();
      setActionModal(prev => ({ ...prev, progress: 90 }));
      
      const out = doc.getZip().generate({ 
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      setActionModal(prev => ({ 
        ...prev, 
        progress: 100,
        isGenerating: false,
        docxBlob: out 
      }));
      
    } catch (error) {
      console.error("Error generating docx:", error);
      showError("Error generating document: " + error.message);
      setActionModal(prev => ({ ...prev, isGenerating: false, progress: 0 }));
    }
  };

  const generateBulkDocx = async (actionType, devices, fromEmployee, toEmployee = null) => {
    try {
      setActionModal(prev => ({ ...prev, progress: 85 }));
      
      const templatePath = actionType === 'unassign' 
        ? "/src/AccountabilityForms/ASSET ACCOUNTABILITY FORM - RETURN.docx"
        : "/src/AccountabilityForms/ASSET ACCOUNTABILITY FORM - TRANSFER.docx";
      
      const response = await fetch(templatePath);
      setActionModal(prev => ({ ...prev, progress: 87 }));
      
      const content = await response.arrayBuffer();
      setActionModal(prev => ({ ...prev, progress: 90 }));
      
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter() {
          return "";
        },
      });
      setActionModal(prev => ({ ...prev, progress: 92 }));

      // Format date helper to match Assets.js implementation
      const formatTransferDate = (dateStr) => {
        if (!dateStr) return "";
        try {
          // Handle Firestore timestamp object
          if (dateStr && typeof dateStr === "object" && dateStr.seconds) {
            return new Date(dateStr.seconds * 1000).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "2-digit",
            });
          }
          
          // Handle regular date
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return "";
          
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "2-digit",
          });
        } catch (error) {
          console.error("Error formatting date:", error);
          return "";
        }
      };

      let templateData;

      if (actionType === 'unassign') {
        // For return forms - match Assets.js structure
        const { selectedCondition, deviceConditions, isBulk } = actionModal;
        
        // For bulk operations, determine overall condition for checkboxes
        // If all devices have the same condition, use that; otherwise default to working
        let overallCondition = 'GOOD';
        if (isBulk) {
          const conditions = devices.map(device => deviceConditions[device.id]).filter(Boolean);
          const allSame = conditions.length > 0 && conditions.every(c => c === conditions[0]);
          overallCondition = allSame ? conditions[0] : 'GOOD';
        } else {
          overallCondition = selectedCondition;
        }
        
        const isWorking = overallCondition === 'GOOD';
        const isDefective = overallCondition === 'DEFECTIVE';
        
        templateData = {
          name: fromEmployee.fullName || "",
          department: fromEmployee.department || "",
          position: fromEmployee.position || "",
          dateHired: formatTransferDate(fromEmployee.dateHired) || "",
          devices: devices.map(device => ({
            assignmentDate: formatTransferDate(device.assignmentDate) || "",
            deviceType: device.deviceType || "",
            brand: device.brand || "",
            model: device.model || "",
            deviceTag: device.deviceTag || "",
            condition: isBulk ? (deviceConditions[device.id] || device.condition || "") : (selectedCondition || device.condition || ""),
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
        };
      } else {
        // For transfer forms - match Assets.js structure
        templateData = {
          transferor_name: fromEmployee.fullName || "",
          transferor_department: fromEmployee.department || "",
          transferor_date_hired: formatTransferDate(fromEmployee.dateHired) || "",
          transferor_position: fromEmployee.position || "",
          transferee_name: toEmployee ? toEmployee.fullName || "" : "",
          transferee_department: toEmployee ? toEmployee.department || "" : "",
          transferee_date_hired: toEmployee ? formatTransferDate(toEmployee.dateHired) || "" : "",
          transferee_position: toEmployee ? toEmployee.position || "" : "",
          devices: devices.map(device => ({
            TransferDate: formatTransferDate(device.assignmentDate || new Date()),
            deviceType: device.deviceType || "",
            brand: device.brand || "",
            model: device.model || "",
            deviceTag: device.deviceTag || "",
            condition: device.condition === 'BRANDNEW' ? 'GOOD' : (device.condition || ""), // Auto-change BRANDNEW to GOOD for reassignment
          })),
        };
      }

      doc.setData(templateData);
      setActionModal(prev => ({ ...prev, progress: 95 }));
      
      doc.render();
      setActionModal(prev => ({ ...prev, progress: 98 }));
      
      const out = doc.getZip().generate({ 
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      setActionModal(prev => ({ 
        ...prev, 
        progress: 100,
        isGenerating: false,
        docxBlob: out 
      }));
      
    } catch (error) {
      console.error("Error generating bulk docx:", error);
      showError("Error generating bulk document: " + error.message);
      setActionModal(prev => ({ ...prev, isGenerating: false, progress: 0 }));
    }
  };

  const handleDownloadDocx = () => {
    if (!actionModal.docxBlob) return;
    
    const { type, device, devices, isBulk } = actionModal;
    const employeeName = employee.fullName
      ? employee.fullName.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")
      : "Employee";
    
    let fileName;
    if (isBulk) {
      const deviceCount = devices.length;
      const actionText = type === 'unassign' ? 'RETURN' : 'TRANSFER';
      fileName = `${employeeName}_BULK_${deviceCount}_DEVICES_${actionText}.docx`;
    } else {
      const deviceTag = device.deviceTag || "Device";
      const actionText = type === 'unassign' ? 'RETURN' : 'TRANSFER';
      fileName = `${employeeName}_${deviceTag}_${actionText}.docx`;
    }
    
    saveAs(actionModal.docxBlob, fileName);
    
    // Close modal after download
    setActionModal({
      isOpen: false,
      type: '',
      device: null,
      devices: [],
      newEmployee: null,
      isGenerating: false,
      progress: 0,
      docxBlob: null,
      isBulk: false
    });
  };

  const closeActionModal = () => {
    setActionModal({
      isOpen: false,
      type: '',
      device: null,
      devices: [],
      newEmployee: null,
      isGenerating: false,
      progress: 0,
      docxBlob: null,
      isBulk: false,
      selectedCondition: '',
      deviceConditions: {}
    });
  };

  if (!isOpen || !employee) return null;

  // Filter devices currently assigned to this employee (deployed)
  const deployedAssets = devices.filter(device => device.assignedTo === employee.id);

  // Get returned assets from device history
  // Find devices that were assigned to this employee but are no longer assigned
  const returnedAssets = deviceHistory
    .filter(history => 
      history.action === 'returned' || 
      (history.action === 'unassigned' && history.employeeId === employee.id)
    )
    .map(history => {
      // Find the corresponding device
      const device = devices.find(d => d.id === history.deviceId);
      if (device) {
        return {
          ...device,
          returnDate: history.date,
          returnReason: history.reason,
          returnCondition: history.condition
        };
      }
      // If device not found in current devices, create a basic record from history
      return {
        id: history.deviceId,
        deviceTag: history.deviceTag,
        deviceType: 'Unknown',
        brand: 'Unknown',
        model: 'Unknown',
        serialNumber: 'Unknown',
        condition: history.condition || 'Unknown',
        returnDate: history.date,
        returnReason: history.reason,
        returnCondition: history.condition
      };
    })
    // Remove duplicates (keep the most recent return record for each device)
    .filter((asset, index, self) => 
      index === self.findIndex(a => a.id === asset.id)
    );

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      // Handle Firestore timestamp object
      if (dateStr && typeof dateStr === "object" && dateStr.seconds) {
        const date = new Date(dateStr.seconds * 1000);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
      
      // Handle Firestore timestamp with nanoseconds
      if (dateStr && typeof dateStr === "object" && dateStr.toDate) {
        const date = dateStr.toDate();
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
      
      // Handle different date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "-";
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.log("Date formatting error:", error, "Input:", dateStr);
      return dateStr || "-";
    }
  };

  // Common table header component
  const TableHeader = ({ isReturned = false }) => (
    <thead>
      <tr
        style={{
          background: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        {!isReturned && (
          <th
            style={{
              padding: "12px 16px",
              textAlign: "center",
              fontWeight: 600,
              color: "#374151",
              fontSize: 12,
              width: "40px",
            }}
          >
            <input
              type="checkbox"
              checked={deployedAssets.length > 0 && selectedDeviceIds.length === deployedAssets.length}
              ref={(el) => {
                if (el) el.indeterminate = selectedDeviceIds.length > 0 && selectedDeviceIds.length < deployedAssets.length;
              }}
              onChange={(e) => handleSelectAllDevices(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
          </th>
        )}
        <th
          style={{
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: 600,
            color: "#374151",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Device Tag
        </th>
        <th
          style={{
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: 600,
            color: "#374151",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Type
        </th>
        <th
          style={{
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: 600,
            color: "#374151",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Brand
        </th>
        <th
          style={{
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: 600,
            color: "#374151",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Model
        </th>
        <th
          style={{
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: 600,
            color: "#374151",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Condition
        </th>
        <th
          style={{
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: 600,
            color: "#374151",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {isReturned ? "Date Returned" : "Date Assigned"}
        </th>
        {!isReturned && (
          <th
            style={{
              padding: "12px 16px",
              textAlign: "center",
              fontWeight: 600,
              color: "#374151",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Actions
          </th>
        )}
      </tr>
    </thead>
  );

  // Common table row component
  const TableRow = ({ device, isReturned = false, onUnassign, onReassign }) => (
    <tr
      style={{
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      {!isReturned && (
        <td
          style={{
            padding: "12px 16px",
            textAlign: "center",
          }}
        >
          <input
            type="checkbox"
            checked={selectedDeviceIds.includes(device.id)}
            onChange={(e) => handleSelectDevice(device.id, e.target.checked)}
            style={{ cursor: "pointer" }}
          />
        </td>
      )}
      <td
        style={{
          padding: "12px 16px",
          fontSize: 14,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "120px",
        }}
      >
        {device.deviceTag || "-"}
      </td>
      <td
        style={{
          padding: "12px 16px",
          fontSize: 14,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "100px",
        }}
      >
        {device.deviceType || "-"}
      </td>
      <td
        style={{
          padding: "12px 16px",
          fontSize: 14,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "100px",
        }}
      >
        {device.brand || "-"}
      </td>
      <td
        style={{
          padding: "12px 16px",
          fontSize: 14,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "120px",
        }}
      >
        {device.model || "-"}
      </td>
      <td
        style={{
          padding: "12px 16px",
          fontSize: 14,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "80px",
        }}
      >
        <span
          style={{
            padding: "3px 6px",
            borderRadius: 3,
            fontSize: 11,
            fontWeight: 500,
            background: 
              (isReturned ? device.returnCondition || device.condition : device.condition) === "BRANDNEW" ? "rgb(40, 167, 69)" :
              (isReturned ? device.returnCondition || device.condition : device.condition) === "GOOD" ? "rgb(0, 123, 255)" :
              (isReturned ? device.returnCondition || device.condition : device.condition) === "DEFECTIVE" ? "rgb(220, 53, 69)" :
              (isReturned ? device.returnCondition || device.condition : device.condition) === "Poor" ? "#fee2e2" : "#f3f4f6",
            color:
              (isReturned ? device.returnCondition || device.condition : device.condition) === "BRANDNEW" ? "rgb(255, 255, 255)" :
              (isReturned ? device.returnCondition || device.condition : device.condition) === "GOOD" ? "rgb(255, 255, 255)" :
              (isReturned ? device.returnCondition || device.condition : device.condition) === "DEFECTIVE" ? "rgb(255, 255, 255)" :
              (isReturned ? device.returnCondition || device.condition : device.condition) === "Poor" ? "rgb(255, 255, 255)" : "#374151",
          }}
        >
          {(isReturned ? device.returnCondition || device.condition : device.condition) || "Unknown"}   
        </span>
      </td>
      <td
        style={{
          padding: "12px 16px",
          fontSize: 14,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "100px",
        }}
      >
        {isReturned 
          ? formatDate(device.returnDate) 
          : formatDate(device.assignmentDate)
        }
      </td>
      {!isReturned && (
        <td
          style={{
            padding: "12px 16px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
            <button
              onClick={() => onUnassign(device)}
              style={{
                padding: "4px 8px",
                border: "1px solid #dc2626",
                borderRadius: 4,
                background: "white",
                color: "#dc2626",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: 'inherit',
                whiteSpace: "nowrap",
              }}
            >
              Unassign
            </button>
            <button
              onClick={() => onReassign(device)}
              style={{
                padding: "4px 8px",
                border: "1px solid #2563eb",
                borderRadius: 4,
                background: "white",
                color: "#2563eb",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: 'inherit',
                whiteSpace: "nowrap",
              }}
            >
              Reassign
            </button>
          </div>
        </td>
      )}
    </tr>
  );

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
          backgroundColor: "white",
          borderRadius: 12,
          width: "95%",
          maxWidth: 1200,
          maxHeight: "95vh",
          overflow: "hidden",
          fontFamily: 'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: "0 20px 32px rgba(34, 46, 58, 0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#222e3a",
                marginBottom: 4,
                marginTop: 0,
              }}
            >
              Asset History
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "#6b7280",
                margin: 0,
              }}
            >
              {employee.fullName} • {deployedAssets.length} deployed, {returnedAssets.length} returned
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 24,
              color: "#6b7280",
              cursor: "pointer",
              padding: "8px",
              borderRadius: 6,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "24px 32px",
            display: "flex",
            flexDirection: "column",
            gap: "32px",
          }}
        >
          {/* Deployed Assets Section */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#222e3a",
                    margin: 0,
                  }}
                >
                  Deployed Assets
                </h3>
                <span
                  style={{
                    backgroundColor: "#059669",
                    color: "white",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {deployedAssets.length} active
                </span>
                {selectedDeviceIds.length > 0 && (
                  <span
                    style={{
                      backgroundColor: "#2563eb",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {selectedDeviceIds.length} selected
                  </span>
                )}
              </div>
              
              {/* Bulk Action Buttons */}
              {showBulkActions && selectedDeviceIds.length > 0 && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleBulkUnassign}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #dc2626",
                      borderRadius: 6,
                      background: "white",
                      color: "#dc2626",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: 'inherit',
                      whiteSpace: "nowrap",
                    }}
                  >
                    Bulk Unassign ({selectedDeviceIds.length})
                  </button>
                  <button
                    onClick={handleBulkReassign}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #2563eb",
                      borderRadius: 6,
                      background: "white",
                      color: "#2563eb",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: 'inherit',
                      whiteSpace: "nowrap",
                    }}
                  >
                    Bulk Reassign ({selectedDeviceIds.length})
                  </button>
                </div>
              )}
            </div>
            
            {deployedAssets.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: 14,
                  padding: "32px 16px",
                  backgroundColor: "#f9fafb",
                  borderRadius: 8,
                  border: "1px dashed #d1d5db",
                }}
              >
                No assets currently deployed to this employee
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 14,
                    color: "#374151",
                  }}
                >
                  <TableHeader isReturned={false} />
                  <tbody>
                    {deployedAssets.map((device) => (
                      <TableRow 
                        key={`deployed-${device.id}`} 
                        device={device} 
                        isReturned={false}
                        onUnassign={handleUnassign}
                        onReassign={handleReassign}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Returned Assets Section */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "16px",
                gap: "12px",
              }}
            >
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#222e3a",
                  margin: 0,
                }}
              >
                Returned Assets
              </h3>
              <span
                style={{
                  backgroundColor: "#6b7280",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {returnedAssets.length} returned
              </span>
            </div>
            
            {returnedAssets.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: 14,
                  padding: "32px 16px",
                  backgroundColor: "#f9fafb",
                  borderRadius: 8,
                  border: "1px dashed #d1d5db",
                }}
              >
                No assets have been returned by this employee
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 14,
                    color: "#374151",
                  }}
                >
                  <TableHeader isReturned={true} />
                  <tbody>
                    {returnedAssets.map((device) => (
                      <TableRow key={`returned-${device.id}`} device={device} isReturned={true} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 32px",
            borderTop: "1px solid #e5e7eb",
            textAlign: "right",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "white",
              color: "#374151",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: 'inherit',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Action Confirmation Modal */}
      {actionModal.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(34, 46, 58, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2100,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              width: "100%",
              maxWidth: 480,
              fontFamily: 'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              boxShadow: "0 20px 32px rgba(34, 46, 58, 0.3)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "24px 32px 20px 32px",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#222e3a",
                  margin: 0,
                  marginBottom: 8,
                }}
              >
                {actionModal.isBulk 
                  ? `Bulk ${actionModal.type === 'unassign' ? 'Unassign' : 'Reassign'} Devices`
                  : `${actionModal.type === 'unassign' ? 'Unassign' : 'Reassign'} Device`
                }
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                {actionModal.isBulk 
                  ? `This will ${actionModal.type} ${actionModal.devices.length} devices and generate a ${actionModal.type === 'unassign' ? 'bulk return' : 'bulk transfer'} form.`
                  : `This will ${actionModal.type} the device and generate a ${actionModal.type === 'unassign' ? 'return' : 'transfer'} form.`
                }
              </p>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "24px 32px" }}>
              {/* Device Information */}
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#f9fafb",
                  borderRadius: 8,
                  marginBottom: 20,
                }}
              >
                <h4
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#374151",
                    margin: 0,
                    marginBottom: 8,
                  }}
                >
                  {actionModal.isBulk ? 'Selected Devices' : 'Device Information'}
                </h4>
                {actionModal.isBulk ? (
                  <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                    <div><strong>Count:</strong> {actionModal.devices.length} devices</div>
                    <div style={{ maxHeight: "120px", overflowY: "auto", marginTop: 8 }}>
                      {actionModal.devices.map((device, index) => (
                        <div key={device.id} style={{ 
                          padding: "4px 8px", 
                          backgroundColor: "#fff", 
                          borderRadius: 4, 
                          marginBottom: 4,
                          border: "1px solid #e5e7eb"
                        }}>
                          <strong>{device.deviceTag}</strong> - {device.deviceType} ({device.brand})
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                    <div><strong>Tag:</strong> {actionModal.device?.deviceTag}</div>
                    <div><strong>Type:</strong> {actionModal.device?.deviceType}</div>
                    <div><strong>Brand:</strong> {actionModal.device?.brand}</div>
                    <div><strong>Model:</strong> {actionModal.device?.model}</div>
                  </div>
                )}
              </div>

              {/* Employee Information */}
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#fef3c7",
                  borderRadius: 8,
                  marginBottom: actionModal.type === 'reassign' ? 20 : 0,
                }}
              >
                <h4
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#374151",
                    margin: 0,
                    marginBottom: 8,
                  }}
                >
                  {actionModal.type === 'unassign' ? 'Returning from' : 'Transferring from'}
                </h4>
                <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                  <div><strong>Name:</strong> {employee.fullName}</div>
                  <div><strong>Position:</strong> {employee.position}</div>
                  <div><strong>Department:</strong> {employee.department}</div>
                </div>
              </div>

              {/* Condition Selection for Unassign */}
              {actionModal.type === 'unassign' && (
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#fef3c7",
                    borderRadius: 8,
                    marginTop: 20,
                  }}
                >
                  <h4
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#374151",
                      margin: 0,
                      marginBottom: 12,
                    }}
                  >
                    Device Condition After Return
                  </h4>
                  
                  {!actionModal.isBulk ? (
                    /* Single Device Condition Selection */
                    <>
                      <p
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          margin: "0 0 12px 0",
                        }}
                      >
                        Please select the condition of the device being returned:
                      </p>
                      <div style={{ display: "flex", gap: 16 }}>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 500,
                            color: "#374151",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={actionModal.selectedCondition === 'GOOD'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setActionModal(prev => ({ ...prev, selectedCondition: 'GOOD' }));
                              } else {
                                setActionModal(prev => ({ ...prev, selectedCondition: '' }));
                              }
                            }}
                            style={{
                              width: 16,
                              height: 16,
                              cursor: "pointer",
                            }}
                          />
                          <span style={{ color: "#059669" }}>GOOD Condition</span>
                        </label>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 500,
                            color: "#374151",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={actionModal.selectedCondition === 'DEFECTIVE'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setActionModal(prev => ({ ...prev, selectedCondition: 'DEFECTIVE' }));
                              } else {
                                setActionModal(prev => ({ ...prev, selectedCondition: '' }));
                              }
                            }}
                            style={{
                              width: 16,
                              height: 16,
                              cursor: "pointer",
                            }}
                          />
                          <span style={{ color: "#dc2626" }}>DEFECTIVE Condition</span>
                        </label>
                      </div>
                    </>
                  ) : (
                    /* Bulk Device Condition Selection */
                    <>
                      <p
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          margin: "0 0 12px 0",
                        }}
                      >
                        Please select the condition for each device being returned:
                      </p>
                      <div 
                        style={{ 
                          maxHeight: "300px", 
                          overflowY: "auto",
                          border: "1px solid #e5e7eb",
                          borderRadius: 6,
                          backgroundColor: "#fff"
                        }}
                      >
                        {actionModal.devices.map((device, index) => (
                          <div 
                            key={device.id} 
                            style={{ 
                              padding: "12px 16px",
                              borderBottom: index < actionModal.devices.length - 1 ? "1px solid #f3f4f6" : "none",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>
                                {device.deviceTag}
                              </div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>
                                {device.deviceType} - {device.brand}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: "#374151",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={actionModal.deviceConditions[device.id] === 'GOOD'}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setActionModal(prev => ({ 
                                        ...prev, 
                                        deviceConditions: {
                                          ...prev.deviceConditions,
                                          [device.id]: 'GOOD'
                                        }
                                      }));
                                    } else {
                                      setActionModal(prev => ({ 
                                        ...prev, 
                                        deviceConditions: {
                                          ...prev.deviceConditions,
                                          [device.id]: ''
                                        }
                                      }));
                                    }
                                  }}
                                  style={{
                                    width: 14,
                                    height: 14,
                                    cursor: "pointer",
                                  }}
                                />
                                <span style={{ color: "#059669" }}>GOOD</span>
                              </label>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: "#374151",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={actionModal.deviceConditions[device.id] === 'DEFECTIVE'}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setActionModal(prev => ({ 
                                        ...prev, 
                                        deviceConditions: {
                                          ...prev.deviceConditions,
                                          [device.id]: 'DEFECTIVE'
                                        }
                                      }));
                                    } else {
                                      setActionModal(prev => ({ 
                                        ...prev, 
                                        deviceConditions: {
                                          ...prev.deviceConditions,
                                          [device.id]: ''
                                        }
                                      }));
                                    }
                                  }}
                                  style={{
                                    width: 14,
                                    height: 14,
                                    cursor: "pointer",
                                  }}
                                />
                                <span style={{ color: "#dc2626" }}>DEFECTIVE</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Reassign Employee Selection */}
              {actionModal.type === 'reassign' && (
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#dcfce7",
                    borderRadius: 8,
                  }}
                >
                  <h4
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#374151",
                      margin: 0,
                      marginBottom: 12,
                    }}
                  >
                    Assign to Employee
                  </h4>
                  <select
                    value={actionModal.newEmployee?.id || ''}
                    onChange={(e) => {
                      const selectedEmployee = allEmployees.find(emp => emp.id === e.target.value);
                      setActionModal(prev => ({ ...prev, newEmployee: selectedEmployee }));
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: 14,
                      fontFamily: 'inherit',
                      outline: "none",
                      backgroundColor: "white",
                    }}
                  >
                    <option value="">Select employee...</option>
                    {allEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} - {emp.position}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 32px 24px 32px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              {!actionModal.isGenerating && !actionModal.docxBlob && (
                <>
                  <button
                    onClick={closeActionModal}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      background: "white",
                      color: "#374151",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: 'inherit',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    disabled={
                      (actionModal.type === 'reassign' && !actionModal.newEmployee) ||
                      (actionModal.type === 'unassign' && !actionModal.isBulk && !actionModal.selectedCondition) ||
                      (actionModal.type === 'unassign' && actionModal.isBulk && !actionModal.devices.every(device => actionModal.deviceConditions[device.id]))
                    }
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: 6,
                      background: (
                        (actionModal.type === 'reassign' && !actionModal.newEmployee) ||
                        (actionModal.type === 'unassign' && !actionModal.isBulk && !actionModal.selectedCondition) ||
                        (actionModal.type === 'unassign' && actionModal.isBulk && !actionModal.devices.every(device => actionModal.deviceConditions[device.id]))
                      ) 
                        ? "#9ca3af" 
                        : (actionModal.type === 'unassign' ? "#dc2626" : "#2563eb"),
                      color: "white",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: (
                        (actionModal.type === 'reassign' && !actionModal.newEmployee) ||
                        (actionModal.type === 'unassign' && !actionModal.isBulk && !actionModal.selectedCondition) ||
                        (actionModal.type === 'unassign' && actionModal.isBulk && !actionModal.devices.every(device => actionModal.deviceConditions[device.id]))
                      ) ? "not-allowed" : "pointer",
                      fontFamily: 'inherit',
                    }}
                  >
                    Confirm {actionModal.type === 'unassign' ? 'Unassign' : 'Reassign'}
                  </button>
                </>
              )}
              
              {actionModal.isGenerating && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 200,
                      height: 4,
                      backgroundColor: "#e5e7eb",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${actionModal.progress}%`,
                        height: "100%",
                        backgroundColor: "#2563eb",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 14, color: "#6b7280" }}>
                    Generating document...
                  </span>
                </div>
              )}
              
              {actionModal.docxBlob && (
                <button
                  onClick={handleDownloadDocx}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: 6,
                    background: "#059669",
                    color: "white",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: 'inherit',
                  }}
                >
                  Download {actionModal.isBulk ? 'Bulk ' : ''}{actionModal.type === 'unassign' ? 'Return' : 'Transfer'} Form
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to format date as MM-DD-YYYY
function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

// Helper to format assignment date (handles Firestore timestamps)
function formatAssignmentDate(dateValue) {
  if (!dateValue) return "";

  // Handle Firestore timestamp object
  if (dateValue && typeof dateValue === "object" && dateValue.seconds) {
    const date = new Date(dateValue.seconds * 1000);
    return formatDisplayDate(date.toISOString().slice(0, 10));
  }

  // Handle regular date string or Date object
  if (typeof dateValue === "string" || dateValue instanceof Date) {
    return formatDisplayDate(dateValue);
  }

  return "";
}

// Helper to format history date (handles Firestore timestamps)
function formatHistoryDate(dateValue) {
  if (!dateValue) return "";

  // Handle Firestore timestamp object
  if (dateValue && typeof dateValue === "object" && dateValue.seconds) {
    const date = new Date(dateValue.seconds * 1000);
    return date.toLocaleString();
  }

  // Handle regular date string or Date object
  if (typeof dateValue === "string" || dateValue instanceof Date) {
    return new Date(dateValue).toLocaleString();
  }

  return "";
}

export default function Employee() {
  const [employees, setEmployees] = useState([]);
  const [resignedEmployees, setResignedEmployees] = useState([]);
  const [form, setForm] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState([]);
  const [devices, setDevices] = useState([]);
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [activeTab, setActiveTab] = useState("active");
  const { showSuccess, showError, showUndoNotification } = useSnackbar();
  
  // Assets modal state
  const [assetsModal, setAssetsModal] = useState({
    isOpen: false,
    employee: null,
  });
  const [employeeDeviceHistory, setEmployeeDeviceHistory] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [employeesPerPage, setEmployeesPerPage] = useState(50);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkResignModal, setShowBulkResignModal] = useState(false);
  const [bulkResignReason, setBulkResignReason] = useState("");
  
  // Confirmation modal states
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [employeeToResign, setEmployeeToResign] = useState(null);
  const [employeeToUndo, setEmployeeToUndo] = useState(null);

  // Load clients and employees
  const loadClientsAndEmployees = async () => {
    setIsTableLoading(true);
    try {
      const [clientsData, employeesData, devicesData] = await Promise.all([
        getAllClients(),
        getAllEmployees(),
        getAllDevices(),
      ]);
      setClients(clientsData);
      setDevices(devicesData);
      
      // Separate active and resigned employees
      const activeEmployees = employeesData.filter(emp => !emp.isResigned);
      const resignedEmployees = employeesData.filter(emp => emp.isResigned);
      
      setEmployees(activeEmployees);
      setResignedEmployees(resignedEmployees);
    } catch (error) {
      showError("Error loading data: " + error.message);
    } finally {
      setIsTableLoading(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClientsAndEmployees();
  }, []);

  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Reset pagination when employeesPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [employeesPerPage]);

  // Load device history for a specific employee
  const loadEmployeeDeviceHistory = async (employeeId) => {
    try {
      const history = await getDeviceHistoryForEmployee(employeeId);
      setEmployeeDeviceHistory(history);
    } catch (error) {
      console.error("Error loading device history:", error);
      setEmployeeDeviceHistory([]);
    }
  };

  // Handle employee name click to show assets modal
  const handleEmployeeNameClick = async (employee) => {
    setAssetsModal({ isOpen: true, employee });
    await loadEmployeeDeviceHistory(employee.id);
  };

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    console.log("Form field changed:", { name, value });
    setForm((prev) => {
      const newForm = { ...prev, [name]: value };
      console.log("Updated form state:", newForm);
      return newForm;
    });
  };

  const handleSave = async () => {
    console.log("handleSave called with form:", form);
    console.log("Is form valid?", isFormValid());
    
    // Close modal immediately
    setForm({});
    setShowForm(false);
    
    try {
      setIsTableLoading(true);
      const dataToSave = { ...form };

      if (form.id) {
        console.log("Updating employee with ID:", form.id, "Data:", dataToSave);
        await updateEmployee(form.id, dataToSave);
        showSuccess("Employee updated successfully!");
      } else {
        console.log("Adding new employee with data:", dataToSave);
        await addEmployee(dataToSave);
        showSuccess("Employee added successfully!");
      }

      loadClientsAndEmployees();
    } catch (error) {
      console.error("Error in handleSave:", error);
      showError("Error saving employee: " + error.message);
    } finally {
      setIsTableLoading(false);
    }
  };

  // Resign employee with undo capability
  const handleResignEmployee = (id, reason = "") => {
    const employee = employees.find(emp => emp.id === id);
    setEmployeeToResign({ id, reason, employee });
    setShowResignConfirm(true);
  };
  
  const confirmResignEmployee = async () => {
    if (!employeeToResign) return;
    
    const { id, reason, employee } = employeeToResign;
    
    // Close modal immediately
    setShowResignConfirm(false);
    setEmployeeToResign(null);
    
    try {
      setIsTableLoading(true);
      
      // Store original state for undo
      const originalState = { ...employee };
      
      // Add to undo manager
      undoManager.addDeletedItem(
        id,
        originalState,
        async (originalData) => {
          try {
            // Restore the employee by removing resignation fields
            await undoResignation(id);
            loadClientsAndEmployees();
            showSuccess("Employee resignation undone successfully!");
          } catch (error) {
            showError("Failed to undo resignation: " + error.message);
          }
        },
        8000 // 8 seconds to undo
      );

      // Perform the resignation
      await resignEmployee(id, reason);
      loadClientsAndEmployees();
      
      // Show undo notification
      showUndoNotification(
        "Employee resigned successfully",
        () => {
          undoManager.restoreItem(id);
        }
      );
    } catch (error) {
      showError("Error resigning employee: " + error.message);
    } finally {
      setIsTableLoading(false);
    }
  };

  // Undo resignation - restore employee to active status
  const handleUndoResignation = (id) => {
    const employee = resignedEmployees.find(emp => emp.id === id);
    setEmployeeToUndo({ id, employee });
    setShowUndoConfirm(true);
  };
  
  const confirmUndoResignation = async () => {
    if (!employeeToUndo) return;
    
    const { id } = employeeToUndo;
    
    // Close modal immediately
    setShowUndoConfirm(false);
    setEmployeeToUndo(null);
    
    try {
      setIsTableLoading(true);
      await undoResignation(id);
      showSuccess("Employee restored to active status successfully!");
      loadClientsAndEmployees();
    } catch (error) {
      showError("Error restoring employee: " + error.message);
    } finally {
      setIsTableLoading(false);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(currentEmployees.map(emp => emp.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectEmployee = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedIds([]); // Clear selection when switching tabs
    setSortBy("default"); // Reset sort when switching tabs
    setSearchTerm(""); // Clear search when switching tabs
  };

  // Bulk resign with undo capability
  const handleBulkResign = async () => {
    // Close modal immediately
    setShowBulkResignModal(false);
    setBulkResignReason("");
    
    try {
      setIsTableLoading(true);
      
      // Store original states and selected IDs for undo
      const employeesToResign = employees.filter(emp => selectedIds.includes(emp.id));
      const originalStates = employeesToResign.map(emp => ({ ...emp }));
      const resignedIds = [...selectedIds]; // Copy the array before clearing
      
      // Clear selection immediately after copying
      setSelectedIds([]);
      
      // Add each employee to undo manager
      resignedIds.forEach((id, index) => {
        undoManager.addDeletedItem(
          id,
          originalStates[index],
          async (originalData) => {
            try {
              await undoResignation(id);
              loadClientsAndEmployees();
            } catch (error) {
              console.error(`Failed to undo resignation for employee ${id}:`, error);
            }
          },
          10000 // 10 seconds for bulk operations
        );
      });

      // Perform bulk resignation
      for (const id of resignedIds) {
        await resignEmployee(id, bulkResignReason);
      }
      
      const resignedCount = resignedIds.length;
      loadClientsAndEmployees();
      
      // Show undo notification for bulk operation
      showUndoNotification(
        `Successfully resigned ${resignedCount} employee(s)`,
        () => {
          // Restore all resigned employees
          resignedIds.forEach(id => {
            undoManager.restoreItem(id);
          });
        }
      );
    } catch (error) {
      showError("Failed to resign employees: " + error.message);
    } finally {
      setIsTableLoading(false);
    }
  };

  // Excel import
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsTableLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        console.log("Parsed Excel rows:", rows); // Debug log

        if (rows.length === 0) {
          showError("Excel file is empty or has no valid data");
          setIsTableLoading(false);
          return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const row of rows) {
          try {
            // Build full name from first, middle, and last name
            const firstName = row["FIRST NAME"] || "";
            const middleName = row["MIDDLE NAME"] || "";
            const lastName = row["LAST NAME"] || "";
            const fullName = [firstName, middleName, lastName].filter(name => name.trim()).join(' ');

            const employeeData = {
              fullName: fullName,
              position: row["POSITION"] || "",
              department: "", // You might want to add DEPARTMENT column to your Excel or set a default
              clientId: findClientIdByName(row["CLIENT"] || ""),
              corporateEmail: row["CORPORATE EMAIL"] || "",
              personalEmail: row["PERSONAL EMAIL"] || "",
              dateHired: row["DATE HIRED"] || "",
              firstName: firstName,
              lastName: lastName,
              middleName: middleName,
            };

            console.log("Processing employee:", employeeData); // Debug log

            // Validate required fields (fullName and position are minimum requirements)
            if (employeeData.fullName && employeeData.position) {
              await addEmployee(employeeData);
              successCount++;
            } else {
              console.log("Skipping invalid row (missing fullName or position):", row);
              errorCount++;
            }
          } catch (error) {
            console.error("Error adding employee:", error);
            errorCount++;
          }
        }

        if (successCount > 0) {
          showSuccess(`Successfully imported ${successCount} employee(s)${errorCount > 0 ? ` (${errorCount} failed)` : ""}`);
          await loadClientsAndEmployees();
        } else {
          showError("No valid employees found to import. Please check your Excel format and ensure FIRST NAME, LAST NAME, and POSITION columns have data.");
        }
      } catch (error) {
        console.error("Error importing Excel file:", error);
        showError("Error importing Excel file: " + error.message);
      } finally {
        setIsTableLoading(false);
      }
    };

    reader.onerror = () => {
      showError("Error reading the Excel file");
      setIsTableLoading(false);
    };

    reader.readAsArrayBuffer(file);
    e.target.value = ""; // Reset file input
  };

  // Asset import handler
  const handleImportDeployedAssets = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsTableLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        console.log("Parsed Asset Excel rows:", rows); // Debug log

        if (rows.length === 0) {
          showError("Excel file is empty or has no valid data");
          setIsTableLoading(false);
          return;
        }

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        const errors = [];

        // Get all existing devices to check for duplicate device tags
        const existingDevices = await getAllDevices();
        const existingTags = new Set(existingDevices.map(d => d.deviceTag?.toLowerCase()));

        // Device type mapping for tag generation with JOII prefix for generated tags
        const deviceTypeMap = {
          'headset': 'JOIIHS',
          'keyboard': 'JOIIKB', 
          'laptop': 'JOIILPT',
          'monitor': 'JOIIMN',
          'mouse': 'JOIIM',
          'pc': 'JOIIPC',
          'psu': 'JOIIPSU',
          'ram': 'JOIIRAM',
          'ssd': 'JOIISSD',
          'ups': 'JOIIUPS',
          'webcam': 'JOIIW'
        };

        // Helper function to generate unique device tag with JOII prefix
        const generateDeviceTag = (deviceType) => {
          const normalizedType = deviceType?.toLowerCase() || 'dev';
          const prefix = deviceTypeMap[normalizedType] || 'JOIIDEV';
          
          // Find highest existing number for this JOII prefix (including in-memory additions)
          let maxNum = 0;
          existingDevices.forEach(device => {
            if (device.deviceTag && device.deviceTag.startsWith(prefix)) {
              const num = parseInt(device.deviceTag.replace(prefix, ''), 10);
              if (!isNaN(num) && num > maxNum) maxNum = num;
            }
          });
          
          // Also check tags that have been generated in this import session
          existingTags.forEach(tag => {
            if (tag.startsWith(prefix.toLowerCase())) {
              const num = parseInt(tag.replace(prefix.toLowerCase(), ''), 10);
              if (!isNaN(num) && num > maxNum) maxNum = num;
            }
          });
          
          const newTag = `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
          return newTag;
        };

        for (const row of rows) {
          try {
            // Extract data from Excel columns
            const employeeName = (row["Employee"] || "").toString().trim();
            const deviceType = (row["TYPE"] || "").toString().trim();
            const brand = (row["BRAND"] || "").toString().trim();
            let deviceTag = (row["DEVICE TAG"] || "").toString().trim();
            const dateDeployed = row["DATE DEPLOYED"];
            const employeeId = (row["EMPLOYEE ID"] || "").toString().trim();

            console.log("Processing asset row:", { employeeName, deviceType, brand, deviceTag, dateDeployed, employeeId });

            // Validate required fields and device type
            if (!deviceType || !brand) {
              errorCount++;
              errors.push(`Row with Employee "${employeeName}": Missing required fields (TYPE or BRAND)`);
              continue;
            }

            // Validate device type against system device types
            const validDeviceTypes = [
              "Headset", "Keyboard", "Laptop", "Monitor", "Mouse", "PC", 
              "PSU", "RAM", "SSD", "UPS", "Webcam"
            ];
            const validDeviceType = validDeviceTypes.find(
              (type) => type.toLowerCase() === deviceType.toLowerCase()
            );
            
            if (!validDeviceType) {
              errorCount++;
              errors.push(`Row with Employee "${employeeName}": Invalid device type "${deviceType}". Valid types: ${validDeviceTypes.join(', ')}`);
              continue;
            }

            // Find employee by Employee ID (primary) or name (fallback)
            let employee = null;
            if (employeeId) {
              employee = employees.find(emp => emp.id === employeeId);
            }
            
            if (!employee && employeeName) {
              employee = employees.find(emp => 
                emp.fullName?.toLowerCase() === employeeName.toLowerCase()
              );
            }

            if (!employee) {
              skippedCount++;
              errors.push(`Row with Employee "${employeeName}" (ID: ${employeeId}): Employee not found in system`);
              continue;
            }

            // Generate device tag if blank or if duplicate exists
            if (!deviceTag || existingTags.has(deviceTag.toLowerCase())) {
              const originalTag = deviceTag;
              deviceTag = generateDeviceTag(deviceType);
              if (originalTag) {
                console.log(`Duplicate device tag "${originalTag}" found, generated new tag: ${deviceTag}`);
              } else {
                console.log(`Generated device tag for ${deviceType}: ${deviceTag}`);
              }
            }

            // Handle date deployed
            let assignmentDate = "";
            if (dateDeployed) {
              try {
                const date = new Date(dateDeployed);
                if (!isNaN(date.getTime())) {
                  assignmentDate = date.toISOString().slice(0, 10);
                } else {
                  assignmentDate = "-"; // Placeholder for invalid date
                }
              } catch (error) {
                assignmentDate = "-"; // Placeholder for date parsing errors
              }
            } else {
              assignmentDate = "-"; // Placeholder for missing date
            }

            // Create device data
            const deviceData = {
              deviceType: validDeviceType, // Use validated device type
              brand: brand,
              model: row["MODEL"] || "",
              serialNumber: row["SERIAL NUMBER"] || "",
              deviceTag: deviceTag,
              condition: "GOOD", // Default condition for deployed assets
              status: "GOOD", // Status set to GOOD since asset is deployed to employee
              assignedTo: employee.id,
              assignmentDate: assignmentDate,
              remarks: `Imported deployed asset for ${employee.fullName}`,
              specifications: row["SPECIFICATIONS"] || "",
              warranty: row["WARRANTY"] || "",
              purchaseDate: row["PURCHASE DATE"] || "",
              supplier: row["SUPPLIER"] || ""
            };

            console.log("Creating device:", deviceData);

            // Add device to database
            const createdDevice = await addDevice(deviceData);

            // Log device history for assignment
            await logDeviceHistory({
              employeeId: employee.id,
              employeeName: employee.fullName,
              deviceId: createdDevice.id,
              deviceTag: deviceTag,
              action: 'assigned',
              date: assignmentDate === "-" ? new Date().toISOString() : new Date(assignmentDate).toISOString(),
              reason: 'Bulk import of deployed assets'
            });

            // Add to existing tags set to prevent duplicates in this import
            existingTags.add(deviceTag.toLowerCase());
            
            successCount++;

          } catch (error) {
            console.error("Error processing asset row:", error);
            errorCount++;
            errors.push(`Row with Employee "${row["Employee"] || 'Unknown'}": ${error.message}`);
          }
        }

        // Show results
        const totalProcessed = successCount + errorCount + skippedCount;
        let message = `Asset import completed: ${successCount} successful`;
        if (errorCount > 0) message += `, ${errorCount} errors`;
        if (skippedCount > 0) message += `, ${skippedCount} skipped`;
        
        if (successCount > 0) {
          showSuccess(message);
          await loadClientsAndEmployees(); // Refresh data
        } else {
          showError(`No assets were imported. ${message}`);
        }

        // Log errors for debugging
        if (errors.length > 0) {
          console.log("Asset import errors:", errors);
          if (errors.length <= 5) {
            // Show first few errors in UI
            showError(`Import issues: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`);
          }
        }

      } catch (error) {
        console.error("Error importing assets:", error);
        showError("Error importing assets: " + error.message);
      } finally {
        setIsTableLoading(false);
      }
    };

    reader.onerror = () => {
      showError("Error reading the asset Excel file");
      setIsTableLoading(false);
    };

    reader.readAsArrayBuffer(file);
    e.target.value = ""; // Reset file input
  };

  // Helper function to find client ID by name
  const findClientIdByName = (clientName) => {
    if (!clientName) return "";
    const client = clients.find(c => c.clientName === clientName);
    return client ? client.id : "";
  };

  // Helper function to extract first, middle, and last names from fullName
  const extractNames = (fullName) => {
    if (!fullName) return { firstName: "", middleName: "", lastName: "" };
    const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
    
    if (nameParts.length === 0) return { firstName: "", middleName: "", lastName: "" };
    if (nameParts.length === 1) return { firstName: nameParts[0], middleName: "", lastName: "" };
    if (nameParts.length === 2) return { firstName: nameParts[0], middleName: "", lastName: nameParts[1] };
    
    // For 3+ parts: first name, middle name(s), last name
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1]; // Last part is the last name
    const middleName = nameParts.slice(1, -1).join(' '); // Everything between first and last
    
    return { firstName, middleName, lastName };
  };

  // Excel export
  const exportToExcel = () => {
    // Use allEmployees (filtered/searched data) instead of currentEmployees (paginated data)
    // This ensures we export all data that matches current filters, not just the visible page
    const exportData = allEmployees.map((emp, index) => {
      const { firstName, middleName, lastName } = extractNames(emp.fullName);
      return {
        "Employee ID": emp.id || `EMP-${index + 1}`, // Use actual employee ID
        "DATE HIRED": formatDisplayDate(emp.dateHired),
        "CLIENT": getClientName(emp.clientId),
        "LAST NAME": lastName,
        "FIRST NAME": firstName,
        "MIDDLE NAME": middleName, // Now properly extracted middle name
        "POSITION": emp.position,
        "CORPORATE EMAIL": emp.corporateEmail || "",
        "PERSONAL EMAIL": emp.personalEmail || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    
    // Update filename and success message to reflect what was actually exported
    const filterInfo = searchTerm ? `filtered_${searchTerm.replace(/[^\w]/g, '_')}_` : '';
    XLSX.writeFile(wb, `employees_${activeTab}_${filterInfo}${new Date().toISOString().split('T')[0]}.xlsx`);
    
    const message = searchTerm 
      ? `Excel file exported successfully! (${exportData.length} ${activeTab} employees matching "${searchTerm}")` 
      : `Excel file exported successfully! (${exportData.length} ${activeTab} employees)`;
    showSuccess(message);
  };

  // Helper to format date for input field (YYYY-MM-DD format)
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return "";
    
    // Handle Firestore timestamp object
    if (dateValue && typeof dateValue === "object" && dateValue.seconds) {
      const date = new Date(dateValue.seconds * 1000);
      return date.toISOString().slice(0, 10);
    }
    
    // Handle Date object
    if (dateValue instanceof Date) {
      return dateValue.toISOString().slice(0, 10);
    }
    
    // Handle date string
    if (typeof dateValue === "string") {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      // Try to parse other formats
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
    
    return "";
  };

  // Utility functions
  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.clientName : "No Client";
  };

  const isFormValid = () => {
    console.log("Form validation check:", {
      fullName: form.fullName,
      position: form.position,
      department: form.department,
      clientId: form.clientId,
      allFormData: form,
      isValid: form.fullName && form.position && form.clientId
    });
    // Only require fullName, position, and clientId for now
    // Department can be optional to allow editing existing employees
    return form.fullName && form.position && form.clientId;
  };

  // Sort employees
  const sortEmployees = (employeeList) => {
    return [...employeeList].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.fullName.localeCompare(b.fullName);
        case "position":
          return a.position.localeCompare(b.position);
        default:
          return 0;
      }
    });
  };

  // Search function
  const searchEmployees = (employeeList, searchTerm) => {
    if (!searchTerm.trim()) return employeeList;
    
    const term = searchTerm.toLowerCase().trim();
    console.log("Searching for term:", term); // Debug log
    
    return employeeList.filter(employee => {
      const fullName = (employee.fullName || "").toLowerCase();
      const position = (employee.position || "").toLowerCase();
      const department = (employee.department || "").toLowerCase();
      const corporateEmail = (employee.corporateEmail || "").toLowerCase();
      const personalEmail = (employee.personalEmail || "").toLowerCase();
      const clientName = getClientName(employee.clientId).toLowerCase();
      const employeeId = (employee.id || "").toLowerCase();
      
      // Debug logging for employee ID search
      if (term.length > 0) {
        console.log("Employee:", employee.fullName, "ID:", employee.id, "Searching for:", term, "Match:", employeeId.includes(term));
      }
      
      const matches = fullName.includes(term) ||
             position.includes(term) ||
             department.includes(term) ||
             corporateEmail.includes(term) ||
             personalEmail.includes(term) ||
             clientName.includes(term) ||
             employeeId.includes(term);
             
      return matches;
    });
  };

  // Apply search and sort
  const baseEmployees = activeTab === "active" ? employees : resignedEmployees;
  const searchedEmployees = searchEmployees(baseEmployees, searchTerm);
  const allEmployees = sortEmployees(searchedEmployees);
  
  // Calculate pagination
  const totalPages = Math.ceil(allEmployees.length / employeesPerPage);
  
  // Ensure current page is within valid bounds to prevent empty states
  // when changing items per page or when filters reduce the total count
  const validCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  if (validCurrentPage !== currentPage && allEmployees.length > 0) {
    setCurrentPage(validCurrentPage);
  }
  
  const startIndex = (validCurrentPage - 1) * employeesPerPage;
  const endIndex = startIndex + employeesPerPage;
  const currentEmployees = allEmployees.slice(startIndex, endIndex);
  
  const isAllSelected = currentEmployees.length > 0 && selectedIds.length === currentEmployees.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < currentEmployees.length;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100vh",
      background: "#f7f9fb",
      fontFamily: 'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: "hidden",
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        color: "#222e3a",
        letterSpacing: 1,
        padding: "20px 24px 0px 24px",
        flexShrink: 0,
      }}>
        EMPLOYEE MANAGEMENT
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: "flex",
        padding: "16px 24px 0px 24px",
        flexShrink: 0,
      }}>
        <button
          onClick={() => handleTabChange("active")}
          style={{
            padding: "12px 20px",
            border: "none",
            background: "transparent",
            color: activeTab === "active" ? "#2563eb" : "#6b7280",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: 'inherit',
            borderBottom: activeTab === "active" ? "2px solid #2563eb" : "2px solid transparent",
            transition: "all 0.2s ease",
          }}
        >
          Active Employees ({employees.length})
        </button>
        <button
          onClick={() => handleTabChange("resigned")}
          style={{
            padding: "12px 20px",
            border: "none",
            background: "transparent",
            color: activeTab === "resigned" ? "#2563eb" : "#6b7280",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: 'inherit',
            borderBottom: activeTab === "resigned" ? "2px solid #2563eb" : "2px solid transparent",
            transition: "all 0.2s ease",
          }}
        >
          Resigned Employees ({resignedEmployees.length})
        </button>
      </div>

      {/* Controls */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 24px 16px 24px",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Search Bar */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchTerm("");
                }
              }}
              style={{
                padding: "8px 12px 8px 36px",
                paddingRight: searchTerm ? "36px" : "12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                fontFamily: 'inherit',
                outline: "none",
                width: 200,
                backgroundColor: "white",
              }}
            />
            <div style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#6b7280",
              fontSize: 16,
            }}>
              🔍
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#6b7280",
                  fontSize: 16,
                  cursor: "pointer",
                  padding: "2px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'inherit',
              outline: "none",
              backgroundColor: "white",
            }}
          >
            <option value="default">Sort: Default</option>
            <option value="name">Sort: Name A-Z</option>
            <option value="position">Sort: Position</option>
          </select>
          
          {/* Show bulk resign only for active employees */}
          {selectedIds.length > 0 && activeTab === "active" && (
            <button
              onClick={() => setShowBulkResignModal(true)}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 6,
                background: "#dc2626",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: 'inherit',
              }}
            >
              Resign Selected ({selectedIds.length})
            </button>
          )}
        </div>
        
        <div style={{ display: "flex", gap: 12 }}>
          {/* Show Import Excel only for active tab */}
          {activeTab === "active" && (
            <label
              style={{
                padding: "8px 16px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                background: "white",
                color: "#374151",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: 'inherit',
                display: "inline-block",
              }}
            >
              Import Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                style={{ display: "none" }}
              />
            </label>
          )}
          {/* Asset Import Button */}
          {activeTab === "active" && (
            <label
              style={{
                padding: "8px 16px",
                border: "1px solid #10b981",
                borderRadius: 6,
                background: "#10b981",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: 'inherit',
                display: "inline-block",
              }}
            >
              Import Deployed Assets
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportDeployedAssets}
                style={{ display: "none" }}
              />
            </label>
          )}
          <button
            onClick={exportToExcel}
            style={{
              padding: "8px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "white",
              color: "#374151",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: 'inherit',
            }}
          >
            Export Excel
          </button>
          {/* Show Add Employee only for active tab */}
          {activeTab === "active" && (
            <button
              onClick={() => {
                setForm({});
                setShowForm(true);
              }}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 6,
                background: "#2563eb",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: 'inherit',
              }}
            >
              Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
        <div style={{
          flex: 1,
          margin: "0 24px",
          background: "white",
          // borderRadius: "12px 12px 0 0", // Only top corners rounded
          border: "1px solid #e5e7eb",
          borderBottom: "none", // Remove bottom border to connect with pagination
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        }}>
          <div style={{
            flex: 1,
            overflow: "auto",
            minHeight: 0,
          }}>
            <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "clamp(12px, 1vw, 14px)",
          color: "#374151",
          tableLayout: "fixed", // Fixed layout for better control
          border: "1px solid #e5e7eb", // Add outer border
            }}>
          <thead>
            <tr style={{
              background: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
              position: "sticky",
              top: 0,
              zIndex: 10,
            }}>
              <th style={{
                padding: "clamp(8px, 1vw, 16px)",
                textAlign: "left",
                fontWeight: 600,
                color: "#374151",
                width: "3%",
                minWidth: "40px",
                border: "1px solid #e5e7eb", // Add cell borders
              }}>
            {activeTab === "active" && (
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
              if (el) el.indeterminate = isIndeterminate;
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
            )}
              </th>
              <th style={{ 
                padding: "clamp(8px, 1vw, 16px)", 
                textAlign: "left", 
                fontWeight: 600, 
                color: "#374151",
                width: activeTab === "active" ? "8%" : "8%",
                fontSize: "clamp(11px, 0.9vw, 14px)",
                border: "1px solid #e5e7eb", // Add cell borders
              }}>
                Employee ID
              </th>
              <th style={{ 
                padding: "clamp(8px, 1vw, 16px)", 
                textAlign: "left", 
                fontWeight: 600, 
                color: "#374151",
                width: activeTab === "active" ? "16%" : "15%",
                fontSize: "clamp(11px, 0.9vw, 14px)",
                border: "1px solid #e5e7eb", // Add cell borders
              }}>
                Full Name
              </th>
              <th style={{ 
                padding: "clamp(8px, 1vw, 16px)", 
                textAlign: "left", 
                fontWeight: 600, 
                color: "#374151",
                width: activeTab === "active" ? "13%" : "12%",
                fontSize: "clamp(11px, 0.9vw, 14px)",
                border: "1px solid #e5e7eb", // Add cell borders
              }}>
                Position
              </th>
              <th style={{ 
                padding: "clamp(8px, 1vw, 16px)", 
                textAlign: "left", 
                fontWeight: 600, 
                color: "#374151",
                width: activeTab === "active" ? "10%" : "9%",
                fontSize: "clamp(11px, 0.9vw, 14px)",
                border: "1px solid #e5e7eb", // Add cell borders
              }}>
                Department
              </th>
              <th style={{ 
                padding: "clamp(8px, 1vw, 16px)", 
                textAlign: "left", 
                fontWeight: 600, 
                color: "#374151",
                width: activeTab === "active" ? "11%" : "10%",
                fontSize: "clamp(11px, 0.9vw, 14px)",
                border: "1px solid #e5e7eb", // Add cell borders
              }}>
                Client
              </th>
              <th style={{ 
                padding: "clamp(8px, 1vw, 16px)", 
                textAlign: "left", 
                fontWeight: 600, 
                color: "#374151",
                width: activeTab === "active" ? "16%" : "15%",
                fontSize: "clamp(11px, 0.9vw, 14px)",
                border: "1px solid #e5e7eb", // Add cell borders
              }}>
                Corporate Email
              </th>
              <th style={{ 
            padding: "clamp(8px, 1vw, 16px)", 
            textAlign: "left", 
            fontWeight: 600, 
            color: "#9c2b2bff",
            width: activeTab === "active" ? "10%" : "9%",
            fontSize: "clamp(11px, 0.9vw, 14px)",
            border: "1px solid #e5e7eb", // Add cell borders
              }}>
            {activeTab === "active" ? "Date Hired" : "Date Resigned"}
              </th>
              {activeTab === "resigned" && (
            <th style={{ 
              padding: "clamp(8px, 1vw, 16px)", 
              textAlign: "left", 
              fontWeight: 600, 
              color: "#374151",
              width: "12%",
              fontSize: "clamp(11px, 0.9vw, 14px)",
              border: "1px solid #e5e7eb", // Add cell borders
            }}>
              Resignation Reason
            </th>
              )}
              {activeTab === "resigned" && (
            <th style={{ 
              padding: "clamp(8px, 1vw, 16px)", 
              textAlign: "center", 
              fontWeight: 600, 
              color: "#374151",
              width: "10%",
              fontSize: "clamp(11px, 0.9vw, 14px)",
              border: "1px solid #e5e7eb", // Add cell borders
            }}>
              Actions
            </th>
              )}
              {activeTab === "active" && (
            <th style={{ 
              padding: "clamp(8px, 1vw, 16px)", 
              textAlign: "center", 
              fontWeight: 600, 
              color: "#374151",
              width: "10%",
              fontSize: "clamp(11px, 0.9vw, 14px)",
              border: "1px solid #e5e7eb", // Add cell borders
            }}>
              Actions
            </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isTableLoading ? (
              <tr>
            <td colSpan={activeTab === "active" ? "8" : "9"} style={{ padding: 40, textAlign: "center", border: "1px solid #e5e7eb" }}>
              <TableLoadingSpinner />
            </td>
              </tr>
            ) : currentEmployees.length === 0 ? (
              <tr>
            <td colSpan={activeTab === "active" ? "8" : "9"} style={{ padding: 40, textAlign: "center", color: "#6b7280", border: "1px solid #e5e7eb" }}>
              {searchTerm ? (
                <>
              No {activeTab} employees found matching "{searchTerm}"
              <br />
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  marginTop: 8,
                  padding: "4px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: "white",
                  color: "#374151",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: 'inherit',
                }}
              >
                Clear search
              </button>
                </>
              ) : (
                activeTab === "active" ? "No active employees found" : "No resigned employees found"
              )}
            </td>
              </tr>
            ) : (
              currentEmployees.map((employee) => (
            <tr
              key={employee.id}
              style={{
                borderBottom: "1px solid #f3f4f6",
                ":hover": { backgroundColor: "#f9fafb" },
              }}
            >
              <td style={{ 
                padding: "clamp(8px, 1vw, 16px)",
                overflow: "hidden",
                border: "1px solid #e5e7eb", // Add cell borders
              }}>
                {activeTab === "active" && (
              <input
                type="checkbox"
                checked={selectedIds.includes(employee.id)}
                onChange={(e) => handleSelectEmployee(employee.id, e.target.checked)}
                style={{ cursor: "pointer" }}
              />
                )}
              </td>
              <td style={{ 
                padding: "clamp(8px, 1vw, 16px)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "clamp(12px, 1vw, 14px)",
                color: "#6b7280",
                fontFamily: "monospace",
                border: "1px solid #e5e7eb", // Add cell borders
              }} title={employee.id}>
                {employee.id ? employee.id.substring(0, 8) : 'Record Not Found'}
              </td>
              <td style={{ 
                padding: "clamp(8px, 1vw, 16px)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                border: "1px solid #e5e7eb", // Add cell borders
              }}>
                <span
                  onClick={() => handleEmployeeNameClick(employee)}
                  style={{
                    color: "#2563eb",
                    cursor: "pointer",
                    textDecoration: "underline",
                    textDecorationColor: "transparent",
                    transition: "all 0.2s ease",
                    fontSize: "clamp(12px, 1vw, 14px)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.textDecorationColor = "#2563eb";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.textDecorationColor = "transparent";
                  }}
                  title={employee.fullName} // Show full name on hover
                >
                  {employee.fullName}
                </span>
              </td>
              <td style={{ 
                padding: "clamp(8px, 1vw, 16px)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "clamp(12px, 1vw, 14px)",
                border: "1px solid #e5e7eb", // Add cell borders
              }} title={employee.position}>
                {employee.position}
              </td>
              <td style={{ 
                padding: "clamp(8px, 1vw, 16px)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "clamp(12px, 1vw, 14px)",
                border: "1px solid #e5e7eb", // Add cell borders
              }} title={employee.department}>
                {employee.department}
              </td>
              <td style={{ 
                padding: "clamp(8px, 1vw, 16px)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "clamp(12px, 1vw, 14px)",
                border: "1px solid #e5e7eb", // Add cell borders
              }} title={getClientName(employee.clientId)}>
                {getClientName(employee.clientId)}
              </td>
              <td style={{ 
                padding: "clamp(8px, 1vw, 16px)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "clamp(12px, 1vw, 14px)",
                border: "1px solid #e5e7eb", // Add cell borders
              }} title={employee.corporateEmail || "-"}>
                {employee.corporateEmail || "-"}
              </td>
              <td style={{ 
                padding: "clamp(8px, 1vw, 16px)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "clamp(12px, 1vw, 14px)",
              }}>
                {activeTab === "active" 
              ? formatDisplayDate(employee.dateHired)
              : formatDisplayDate(employee.dateResigned || employee.dateHired)
                }
              </td>
              {activeTab === "resigned" && (
                <td style={{ 
              padding: "clamp(8px, 1vw, 16px)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "clamp(12px, 1vw, 14px)",
                }} title={employee.resignationReason || "-"}>
              {employee.resignationReason || "-"}
                </td>
              )}
              {activeTab === "resigned" && (
                <td style={{ 
              padding: "clamp(8px, 1vw, 16px)", 
              textAlign: "center",
              overflow: "hidden",
                }}>
              <button
                onClick={() => handleUndoResignation(employee.id)}
                style={{
                  padding: "clamp(3px, 0.5vw, 4px) clamp(6px, 0.8vw, 8px)",
                  border: "1px solid #059669",
                  borderRadius: 4,
                  background: "white",
                  color: "#059669",
                  fontSize: "clamp(10px, 0.8vw, 12px)",
                  cursor: "pointer",
                  fontFamily: 'inherit',
                  whiteSpace: "nowrap",
                }}
              >
                Undo
              </button>
                </td>
              )}
              {activeTab === "active" && (
                <td style={{ 
              padding: "clamp(8px, 1vw, 16px)", 
              textAlign: "center",
              overflow: "hidden",
                }}>
              <div style={{ display: "flex", gap: "clamp(4px, 0.5vw, 8px)", justifyContent: "center" }}>
                <button
                  onClick={() => {
                console.log("Edit button clicked for employee:", employee);
                
                // Properly format the employee data for editing
                const formattedEmployee = {
                  ...employee,
                  dateHired: formatDateForInput(employee.dateHired),
                  // Ensure required fields have default values
                  department: employee.department || "",
                  clientId: employee.clientId || "",
                  fullName: employee.fullName || "",
                  position: employee.position || "",
                };
                
                console.log("Formatted employee data for form:", formattedEmployee);
                setForm(formattedEmployee);
                setShowForm(true);
                  }}
                  style={{
                padding: "clamp(3px, 0.5vw, 4px) clamp(6px, 0.8vw, 8px)",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                background: "white",
                color: "#374151",
                fontSize: "clamp(10px, 0.8vw, 12px)",
                cursor: "pointer",
                fontFamily: 'inherit',
                whiteSpace: "nowrap",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleResignEmployee(employee.id)}
                  style={{
                padding: "clamp(3px, 0.5vw, 4px) clamp(6px, 0.8vw, 8px)",
                border: "1px solid #dc2626",
                borderRadius: 4,
                background: "white",
                color: "#dc2626",
                fontSize: "clamp(10px, 0.8vw, 12px)",
                cursor: "pointer",
                fontFamily: 'inherit',
                whiteSpace: "nowrap",
                  }}
                >
                  Resign
                </button>
              </div>
                </td>
              )}
            </tr>
              ))
            )}
          </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Footer */}
      {allEmployees.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            background: "#fff",
            borderTop: "1px solid #e5e7eb",
            margin: "0 24px",
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            marginTop: -1, // To merge with table border
          }}
        >
          {/* Left side - Results info and items per page */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "14px", color: "#6b7280" }}>
              Showing {startIndex + 1}-{Math.min(endIndex, allEmployees.length)} of {allEmployees.length} {activeTab} employees
              {searchTerm && (
                <span style={{ fontStyle: "italic", marginLeft: "8px" }}>
                  (filtered by "{searchTerm}")
                </span>
              )}
            </span>
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Show:</span>
              <select
                value={employeesPerPage}
                onChange={(e) => setEmployeesPerPage(Number(e.target.value))}
                style={{
                  padding: "6px 8px",
                  border: "1px solid #e0e7ef",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontFamily: 'inherit',
                  outline: "none",
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

          {/* Right side - Pagination controls */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={validCurrentPage === 1}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e0e7ef",
                  background: validCurrentPage === 1 ? "#f5f7fa" : "#fff",
                  color: validCurrentPage === 1 ? "#9ca3af" : "#445F6D",
                  cursor: validCurrentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: 'inherit',
                }}
              >
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polyline points="11,17 6,12 11,7" />
                  <polyline points="18,17 13,12 18,7" />
                </svg>
                First
              </button>

              <button
                onClick={() => setCurrentPage(validCurrentPage - 1)}
                disabled={validCurrentPage === 1}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e0e7ef",
                  background: validCurrentPage === 1 ? "#f5f7fa" : "#fff",
                  color: validCurrentPage === 1 ? "#9ca3af" : "#445F6D",
                  cursor: validCurrentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: 'inherit',
                }}
              >
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polyline points="15,18 9,12 15,6" />
                </svg>
                Previous
              </button>

              {/* Page Numbers */}
              {(() => {
                const pageNumbers = [];
                const maxVisiblePages = 5;
                let startPage = Math.max(
                  1,
                  validCurrentPage - Math.floor(maxVisiblePages / 2)
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
                        background: i === validCurrentPage ? "#2563eb" : "#fff",
                        color: i === validCurrentPage ? "#fff" : "#445F6D",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        minWidth: "40px",
                        fontFamily: 'inherit',
                      }}
                    >
                      {i}
                    </button>
                  );
                }

                return pageNumbers;
              })()}

              <button
                onClick={() => setCurrentPage(validCurrentPage + 1)}
                disabled={validCurrentPage === totalPages}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e0e7ef",
                  background: validCurrentPage === totalPages ? "#f5f7fa" : "#fff",
                  color: validCurrentPage === totalPages ? "#9ca3af" : "#445F6D",
                  cursor: validCurrentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: 'inherit',
                }}
              >
                Next
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polyline points="9,18 15,12 9,6" />
                </svg>
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={validCurrentPage === totalPages}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e0e7ef",
                  background: validCurrentPage === totalPages ? "#f5f7fa" : "#fff",
                  color: validCurrentPage === totalPages ? "#9ca3af" : "#445F6D",
                  cursor: validCurrentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: 'inherit',
                }}
              >
                Last
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polyline points="13,17 18,12 13,7" />
                  <polyline points="6,17 11,12 6,7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer spacing */}
      <div style={{ height: 24, flexShrink: 0 }} />

      {/* Modals */}
      {showForm && (
        <EmployeeFormModal
          data={form}
          onChange={handleFormChange}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          isValid={isFormValid()}
          clients={clients}
        />
      )}

      {/* Only show bulk resign modal for active employees */}
      {activeTab === "active" && (
        <BulkResignModal
          isOpen={showBulkResignModal}
          onConfirm={handleBulkResign}
          onCancel={() => setShowBulkResignModal(false)}
          selectedCount={selectedIds.length}
          reason={bulkResignReason}
          setReason={setBulkResignReason}
        />
      )}

      {/* Individual Resign Confirmation */}
      <ConfirmationModal
        isOpen={showResignConfirm}
        onConfirm={confirmResignEmployee}
        onCancel={() => {
          setShowResignConfirm(false);
          setEmployeeToResign(null);
        }}
        title="Confirm Resignation"
        message={
          employeeToResign?.employee 
            ? `Are you sure you want to resign ${employeeToResign.employee.fullName}?`
            : "Are you sure you want to resign this employee?"
        }
        confirmText="Resign"
        confirmColor="#dc2626"
      />

      {/* Undo Resignation Confirmation */}
      <ConfirmationModal
        isOpen={showUndoConfirm}
        onConfirm={confirmUndoResignation}
        onCancel={() => {
          setShowUndoConfirm(false);
          setEmployeeToUndo(null);
        }}
        title="Restore Employee"
        message={
          employeeToUndo?.employee 
            ? `Are you sure you want to restore ${employeeToUndo.employee.fullName} to active status?`
            : "Are you sure you want to restore this employee to active status?"
        }
        confirmText="Restore"
        confirmColor="#059669"
      />

      {/* Employee Assets Modal */}
      <EmployeeAssetsModal
        isOpen={assetsModal.isOpen}
        onClose={() => {
          setAssetsModal({ isOpen: false, employee: null });
          setEmployeeDeviceHistory([]);
        }}
        employee={assetsModal.employee}
        devices={devices}
        deviceHistory={employeeDeviceHistory}
        onDeviceUpdate={async () => {
          // Refresh devices and employee device history
          await loadClientsAndEmployees();
          if (assetsModal.employee) {
            await loadEmployeeDeviceHistory(assetsModal.employee.id);
          }
        }}
      />

      {isLoading && <LoadingSpinner />}
    </div>
  );
}
