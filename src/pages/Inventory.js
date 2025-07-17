import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { getAllEmployees } from "../services/employeeService";
import { getAllClients } from "../services/clientService";
import LoadingSpinner, {
  TableLoadingSpinner,
} from "../components/LoadingSpinner";
import {
  addDevice,
  updateDevice,
  deleteDevice,
  getAllDevices,
  addMultipleDevices,
  getNextDevId,
} from "../services/deviceService";
import { logDeviceHistory } from "../services/deviceHistoryService";
import { exportInventoryToExcel } from "../utils/exportInventoryToExcel";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import DeviceHistory from "../components/DeviceHistory";
import { useSnackbar } from "../components/Snackbar";
import undoManager from "../utils/undoManager";

const initialForm = {
  deviceType: "",
  deviceTag: "",
  brand: "",
  model: "",
  client: "",
  condition: "",
  remarks: "",
  acquisitionDate: "", // Added acquisitionDate
};

const fieldLabels = {
  deviceType: "Device Type",
  deviceTag: "Device Tag",
  brand: "Brand",
  model: "Model",
  client: "Client",
  condition: "Condition",
  remarks: "Remarks",
  acquisitionDate: "Acquisition Date", // Added label
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
  { label: "UPS", code: "UPS" },
  { label: "Webcam", code: "W" },
];

const conditions = ["BRANDNEW", "GOOD", "DEFECTIVE", "NEEDS REPAIR", "RETIRED"];

// Function to get background color based on condition
const getConditionColor = (condition) => {
  const colorMap = {
    GOOD: "#007BFF", // Blue
    BRANDNEW: "#28A745", // Green
    DEFECTIVE: "#DC3545", // Red
    "NEEDS REPAIR": "#FFC107", // Yellow
    RETIRED: "#6C757D", // Gray
  };
  return colorMap[condition] || "#6C757D"; // Default to gray
};

// Function to get text color for better contrast
const getConditionTextColor = (condition) => {
  // Yellow background needs dark text for better contrast
  return condition === "NEEDS REPAIR" ? "#000" : "#fff";
};

// Utility function to format dates as "January 23, 2025"
const formatDateToFullWord = (dateString) => {
  if (!dateString) return "";

  let date;
  if (typeof dateString === "number") {
    // Excel serial date
    date = new Date(Math.round((dateString - 25569) * 86400 * 1000));
  } else if (typeof dateString === "string") {
    date = new Date(dateString);
  } else {
    return "";
  }

  if (isNaN(date)) return "";

  // Format as "January 23, 2025"
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
};

// Utility function to format dates consistently as MM/DD/YYYY
const formatDateToMMDDYYYY = (dateString) => {
  if (!dateString) return "";

  // Handle different date formats
  let date;
  if (typeof dateString === "number") {
    // Excel serial date
    date = new Date(Math.round((dateString - 25569) * 86400 * 1000));
  } else if (typeof dateString === "string") {
    date = new Date(dateString);
  } else {
    return "";
  }

  if (isNaN(date)) return "";

  // Format as MM/DD/YYYY
  return (
    (date.getMonth() + 1).toString().padStart(2, "0") +
    "/" +
    date.getDate().toString().padStart(2, "0") +
    "/" +
    date.getFullYear()
  );
};

// Utility function to convert MM/DD/YYYY to YYYY-MM-DD for date input
const formatDateToYYYYMMDD = (dateString) => {
  if (!dateString) return "";

  // If already in YYYY-MM-DD format, return as is
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }

  // Convert MM/DD/YYYY to YYYY-MM-DD
  const parts = dateString.split("/");
  if (parts.length === 3) {
    const month = parts[0].padStart(2, "0");
    const day = parts[1].padStart(2, "0");
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  return "";
};

function DeviceFormModal({
  data,
  onChange,
  onSave,
  onCancel,
  onGenerateTag,
  employees,
  clients,
  tagError,
  saveError,
  isValid,
  useSerial,
  setUseSerial,
  setTagError,
  onSerialToggle,
  editingDevice,
}) {
  const handleSerialToggle = (e) => {
    const checked = e.target.checked;
    onSerialToggle(checked);
  };

  const isEditMode = Boolean(editingDevice);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div style={styles.modalOverlay}>
      <div
        className="device-form-modal"
        style={{
          ...styles.inventoryModalContent,
          border: isEditMode ? "2px solid #2563eb" : "1px solid #e5e7eb",
          backgroundColor: isEditMode ? "#fefbff" : "#ffffff",
          animation: "modalFadeIn 0.2s ease-out",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <style>{`
          @keyframes modalFadeIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          .device-form-modal input:focus,
          .device-form-modal select:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }
          
          .device-form-modal input:hover,
          .device-form-modal select:hover {
            border-color: #64748b;
          }
          
          .new-acquisitions-modal input:focus,
          .new-acquisitions-modal select:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }
          
          .new-acquisitions-modal input:hover,
          .new-acquisitions-modal select:hover {
            border-color: #64748b;
          }
        `}</style>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          {isEditMode && (
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              style={{ flexShrink: 0 }}
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          )}
          <h3
            id="modal-title"
            style={{
              ...styles.inventoryModalTitle,
              color: isEditMode ? "#2563eb" : "#374151",
            }}
          >
            {isEditMode ? "Edit Device" : "Add Device"}
          </h3>
        </div>

        {isEditMode && (
          <div
            style={{
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "6px",
              padding: "8px 12px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              color: "#1d4ed8",
            }}
          >
            <svg
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Editing existing device - modify the fields below to update the
            device information
          </div>
        )}

        {/* Row 1: Device Type and Brand */}
        <div
          style={{ display: "flex", gap: 16, width: "100%", marginBottom: 12 }}
        >
          <div
            style={{ ...styles.inventoryInputGroup, flex: 1, marginBottom: 0 }}
          >
            <label style={styles.inventoryLabel}>Device Type:</label>
            <select
              name="deviceType"
              value={data.deviceType}
              onChange={onChange}
              style={styles.inventoryInput}
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
            style={{ ...styles.inventoryInputGroup, flex: 1, marginBottom: 0 }}
          >
            <label style={styles.inventoryLabel}>Brand:</label>
            <input
              name="brand"
              value={data.brand}
              onChange={onChange}
              style={styles.inventoryInput}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Row 2: Device Tag (full width when visible) */}
        {data.deviceType && (
          <div style={{ ...styles.inventoryInputGroup, marginBottom: 12 }}>
            <label style={styles.inventoryLabel}>Device Tag:</label>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                width: "100%",
              }}
            >
              {!useSerial ? (
                <>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#2563eb",
                      minWidth: "fit-content",
                    }}
                  >{`JOII${
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
                    style={{
                      width: 70,
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1.5px solid #cbd5e1",
                      background: editingDevice ? "#f5f5f5" : "#f1f5f9",
                      fontSize: 14,
                      height: "36px",
                      boxSizing: "border-box",
                      cursor: editingDevice ? "not-allowed" : "text",
                      color: editingDevice ? "#666" : "#000",
                    }}
                    maxLength={4}
                    pattern="\\d{0,4}"
                    placeholder="0001"
                    disabled={editingDevice}
                  />
                  <button
                    type="button"
                    onClick={onGenerateTag}
                    style={{
                      ...styles.inventoryModalButtonSmall,
                      padding: "6px 12px",
                      fontSize: 13,
                      opacity: editingDevice ? 0.5 : 1,
                      cursor: editingDevice ? "not-allowed" : "pointer",
                    }}
                    disabled={editingDevice}
                  >
                    Generate
                  </button>
                </>
              ) : (
                <input
                  key={useSerial ? "serial" : "tag"}
                  name="deviceTag"
                  value={data.deviceTag}
                  onChange={onChange}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1.5px solid #cbd5e1",
                    background: editingDevice ? "#f5f5f5" : "#f1f5f9",
                    fontSize: 14,
                    height: "36px",
                    boxSizing: "border-box",
                    cursor: editingDevice ? "not-allowed" : "text",
                    color: editingDevice ? "#666" : "#000",
                  }}
                  maxLength={64}
                  placeholder="Enter Serial Number"
                  disabled={editingDevice}
                />
              )}
            </div>
            <label
              style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                fontWeight: 400,
                fontSize: 13,
                color: editingDevice ? "#999" : "#222e3a",
              }}
            >
              <input
                type="checkbox"
                checked={useSerial}
                onChange={handleSerialToggle}
                style={{
                  marginRight: 6,
                  accentColor: "#2563eb",
                  cursor: editingDevice ? "not-allowed" : "pointer",
                }}
                disabled={editingDevice}
              />
              Use Serial Number Instead
            </label>
            {tagError && (
              <span
                style={{
                  color: "#e57373",
                  fontSize: 12,
                  marginTop: 4,
                  display: "block",
                }}
              >
                {tagError}
              </span>
            )}
            {saveError && (
              <span
                style={{
                  color: "#e57373",
                  fontSize: 12,
                  marginTop: 4,
                  display: "block",
                }}
              >
                {saveError}
              </span>
            )}
          </div>
        )}

        {/* Row 3: Model and Condition */}
        <div
          style={{ display: "flex", gap: 16, width: "100%", marginBottom: 12 }}
        >
          <div
            style={{ ...styles.inventoryInputGroup, flex: 1, marginBottom: 0 }}
          >
            <label style={styles.inventoryLabel}>Model:</label>
            <input
              name="model"
              value={data.model}
              onChange={onChange}
              style={styles.inventoryInput}
            />
          </div>

          <div
            style={{ ...styles.inventoryInputGroup, flex: 1, marginBottom: 0 }}
          >
            <label style={styles.inventoryLabel}>Condition:</label>
            <select
              name="condition"
              value={data.condition}
              onChange={onChange}
              style={styles.inventoryInput}
            >
              <option value="">Select Condition</option>
              {conditions.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 4: Client */}
        <div style={{ ...styles.inventoryInputGroup, marginBottom: 12 }}>
          <label style={styles.inventoryLabel}>Client:</label>
          <input
            name="client"
            value={data.client}
            onChange={onChange}
            style={styles.inventoryInput}
            placeholder="Enter client name"
          />
        </div>

        {/* Row 5: Remarks only (removed Assigned To and Assignment Date) */}
        <div style={{ ...styles.inventoryInputGroup, marginBottom: 12 }}>
          <label style={styles.inventoryLabel}>Remarks:</label>
          <input
            name="remarks"
            value={data.remarks}
            onChange={onChange}
            style={styles.inventoryInput}
          />
        </div>
        <div style={{ ...styles.inventoryInputGroup, marginBottom: 12 }}>
          <label style={styles.inventoryLabel}>Acquisition Date:</label>
          <input
            name="acquisitionDate"
            type="date"
            value={formatDateToYYYYMMDD(data.acquisitionDate) || ""}
            onChange={onChange}
            style={styles.inventoryInput}
          />
        </div>

        {/* Buttons */}
        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "center",
            gap: 10,
            width: "100%",
          }}
        >
          <button
            onClick={onSave}
            disabled={!isValid}
            style={{
              ...styles.inventoryModalButton,
              opacity: isValid ? 1 : 0.6,
              cursor: isValid ? "pointer" : "not-allowed",
              padding: "10px 24px",
              fontSize: 14,
            }}
            aria-label={
              isEditMode ? "Update device information" : "Save new device"
            }
          >
            {isEditMode ? "Update" : "Save"}
          </button>
          <button
            onClick={onCancel}
            style={{
              ...styles.inventoryModalButtonSecondary,
              padding: "10px 24px",
              fontSize: 14,
            }}
            aria-label="Cancel and close dialog"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmationModal({ onConfirm, onCancel, deviceTag }) {
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
        zIndex: 1000,
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
        }}
      >
        <h2
          style={{
            color: "#e11d48",
            marginBottom: 12,
            margin: "0 0 18px 0",
            fontWeight: 700,
            letterSpacing: 1,
            fontSize: 22,
            textAlign: "center",
          }}
        >
          Confirm Deletion
        </h2>
        <p
          style={{
            margin: "0 0 16px 0",
            color: "#374151",
            fontSize: 16,
            textAlign: "center",
          }}
        >
          Are you sure you want to delete device <strong>{deviceTag}</strong>?
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
              background: "#e11d48",
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
              boxShadow: "0 2px 8px rgba(225,29,72,0.10)",
              outline: "none",
              opacity: 1,
              transform: "translateY(0) scale(1)",
            }}
          >
            Delete
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

function Inventory() {
  // Helper function to create truncated text with hover tooltip
  const TruncatedText = ({
    text,
    maxLength = 20,
    style = {},
    title = null,
  }) => {
    const displayText =
      text && text.length > maxLength
        ? `${text.substring(0, maxLength)}...`
        : text;

    return (
      <div
        style={{
          ...style,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          width: "100%",
          cursor: text && text.length > maxLength ? "help" : "default",
        }}
        title={title || (text && text.length > maxLength ? text : undefined)}
      >
        {displayText || ""}
      </div>
    );
  };

  // Add global styles to hide scrollbars
  React.useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      /* Hide scrollbars for webkit browsers */
      ::-webkit-scrollbar {
        display: none;
      }
      
      /* Hide scrollbars for Firefox */
      * {
        scrollbar-width: none;
      }
      
      /* Hide scrollbars for IE and Edge */
      * {
        -ms-overflow-style: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
  // Add this function inside your Inventory component, before the return statement:
  const handleTempDeployDone = async () => {
    if (!selectedAssignEmployee || !assigningDevice) return;
    try {
      // Generate docx for temporary deploy
      const response = await fetch(
        "/src/AccountabilityForms/ASSET ACCOUNTABILITY FORM - NEW ISSUE.docx"
      );
      const content = await response.arrayBuffer();
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });
      const emp = employees.find((e) => e.id === selectedAssignEmployee.id);
      // Philippine date logic
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const phTime = new Date(utc + 8 * 60 * 60000); // GMT+8
      const assignmentDate =
        phTime.getFullYear() +
        "-" +
        String(phTime.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(phTime.getDate()).padStart(2, "0");
      doc.setData({
        name: emp?.fullName || "",
        dateHired: formatDateToFullWord(emp?.dateHired) || "",
        department: emp?.department || emp?.client || "",
        position: emp?.position || "",
        devices: [
          {
            assignmentDate: (() => {
              let dateToFormat =
                assigningDevice.assignmentDate || assignmentDate;
              let formattedDate = "";
              if (dateToFormat) {
                const dateObj = new Date(dateToFormat);
                if (!isNaN(dateObj)) {
                  formattedDate = dateObj.toLocaleString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "2-digit",
                  });
                } else {
                  formattedDate = dateToFormat;
                }
              }
              return formattedDate;
            })(),
            deviceType: assigningDevice.deviceType,
            brand: assigningDevice.brand,
            deviceTag: assigningDevice.deviceTag,
            condition: assigningDevice.condition,
            remarks: "temporary deployed",
          },
        ],
        newIssueNewBoxRed: "",
        newIssueNewBoxBlack: "☐",
        newIssueStockBoxRed: "",
        newIssueStockBoxBlack: "☐",
        wfhNewBoxRed: "",
        wfhNewBoxBlack: "☐",
        wfhStockBoxRed: "",
        wfhStockBoxBlack: "☐",
      });
      doc.render();
      const out = doc.getZip().generate({ type: "blob" });
      const employeeName = emp?.fullName
        ? emp.fullName.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")
        : "Employee";
      const fileName = `${employeeName} - TEMPORARY DEPLOY.docx`;
      saveAs(out, fileName);
      await updateDevice(assigningDevice.id, {
        ...assigningDevice,
        assignedTo: selectedAssignEmployee.id,
        assignmentDate: new Date(), // Store full timestamp for precise ordering
      });
      await logDeviceHistory({
        employeeId: selectedAssignEmployee.id,
        employeeName: selectedAssignEmployee.fullName,
        deviceId: assigningDevice.id,
        deviceTag: assigningDevice.deviceTag,
        action: "assigned (temporary)",
        date: new Date(), // Store full timestamp for precise ordering
      });
      closeAssignModal();
      loadDevicesAndEmployees();
      showSuccess(
        `Device ${assigningDevice.deviceTag} temporarily deployed to ${selectedAssignEmployee.fullName}!`
      );
    } catch (err) {
      showError(
        "Failed to assign device or generate document. Please try again."
      );
    }
  };

  // --- STATE ---
  const [devices, setDevices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...initialForm });
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Snackbar notifications
  const {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showUndoNotification,
  } = useSnackbar();
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
  // Add search state
  const [deviceSearch, setDeviceSearch] = useState("");
  // Device history state
  const [showDeviceHistory, setShowDeviceHistory] = useState(false);
  const [selectedDeviceForHistory, setSelectedDeviceForHistory] =
    useState(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [devicesPerPage, setDevicesPerPage] = useState(50);

  // Assign modal state
  const [assignStep, setAssignStep] = useState(0);
  const [selectedAssignEmployee, setSelectedAssignEmployee] = useState(null);
  const [issueChecks, setIssueChecks] = useState({
    newIssueNew: false,
    newIssueStock: false,
    wfhNew: false,
    wfhStock: false,
  });
  const [showGenerateBtn, setShowGenerateBtn] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [docxBlob, setDocxBlob] = useState(null);

  // --- STATE for New Acquisitions Modal ---
  const [showNewAcqModal, setShowNewAcqModal] = useState(false);
  const [newAcqTabs, setNewAcqTabs] = useState([
    {
      id: 1,
      label: "Device Type 1",
      data: {
        deviceType: "",
        brand: "",
        model: "",
        condition: "",
        remarks: "",
        acquisitionDate: "",
        quantity: 1,
        supplier: "",
        client: "",
      },
    },
  ]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [nextTabId, setNextTabId] = useState(2);
  const [newAcqError, setNewAcqError] = useState("");
  const [newAcqLoading, setNewAcqLoading] = useState(false);
  const [assignSerialManually, setAssignSerialManually] = useState(false);
  const [manualQuantity, setManualQuantity] = useState(1);
  const [showManualSerialPanel, setShowManualSerialPanel] = useState(false);
  const [manualSerials, setManualSerials] = useState([]);
  const [activeManualTabId, setActiveManualTabId] = useState(1);
  const [importTexts, setImportTexts] = useState({}); // Track import text per tab

  // --- HANDLERS ---

  // Global TAG validation function
  const validateTagUniqueness = async (tag, editingDeviceId = null) => {
    if (!tag || tag.trim() === "") {
      return { isValid: false, message: "TAG is required" };
    }

    const trimmedTag = tag.trim();

    try {
      const allDevices = await getAllDevices();
      const existingDevice = allDevices.find(
        (device) =>
          device.deviceTag &&
          device.deviceTag.toLowerCase() === trimmedTag.toLowerCase() &&
          device.id !== editingDeviceId
      );

      if (existingDevice) {
        return {
          isValid: false,
          message: `TAG "${trimmedTag}" already exists for device ID: ${existingDevice.id}`,
        };
      }

      return { isValid: true, message: "" };
    } catch (error) {
      console.error("Error validating TAG uniqueness:", error);
      return {
        isValid: false,
        message: "Error validating TAG. Please try again.",
      };
    }
  };

  // --- HANDLERS ---

  // Helper function to get unassigned devices (for inventory display)
  const getUnassignedDevices = (devicesArray, searchQuery = "") => {
    return devicesArray
      .filter((device) => {
        // First filter: Only show devices that are NOT assigned
        const isNotAssigned = !device.assignedTo || device.assignedTo === "";
        if (!isNotAssigned) return false;

        // Second filter: Search functionality
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            device.deviceType?.toLowerCase().includes(q) ||
            device.deviceTag?.toLowerCase().includes(q) ||
            device.brand?.toLowerCase().includes(q) ||
            device.model?.toLowerCase().includes(q) ||
            device.condition?.toLowerCase().includes(q) ||
            device.remarks?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by ID in descending order so newer devices appear first
        const aNum = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
        const bNum = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
        return bNum - aNum;
      });
  };

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
        // Real-time validation for manual serial input
        if (value.trim()) {
          validateTagUniqueness(value.trim(), form._editDeviceId).then(
            (validation) => {
              if (!validation.isValid) {
                setTagError(validation.message);
              }
            }
          );
        }
        return;
      }
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
        if (value && (prev.condition === "BRANDNEW" || !prev.condition)) {
          newCondition = "GOOD";
        }
        return {
          ...prev,
          assignedTo: value,
          condition: newCondition,
        };
      });
      return;
    }
    if (name === "acquisitionDate") {
      // Convert YYYY-MM-DD to MM/DD/YYYY for storage
      const formattedDate = formatDateToMMDDYYYY(value);
      setForm((prev) => ({ ...prev, [name]: formattedDate }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateTag = async () => {
    const typeObj = deviceTypes.find((t) => t.label === form.deviceType);
    if (!typeObj) return;
    const prefix = `JOII${typeObj.code}`;
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

  useEffect(() => {
    loadDevicesAndEmployees();
  }, []);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [deviceSearch]);

  // Reset pagination when devicesPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [devicesPerPage]);

  // Focus management for modal accessibility
  useEffect(() => {
    if (showForm) {
      const firstInput = document.querySelector(
        '.device-form-modal input[type="text"]'
      );
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }, [showForm]);

  // Escape key handler for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showForm) {
        resetForm();
      }
    };

    if (showForm) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showForm]);

  const loadDevicesAndEmployees = async () => {
    setLoading(true);
    const [deviceData, employeeData, clientData] = await Promise.all([
      getAllDevices(),
      getAllEmployees(),
      getAllClients(),
    ]);
    setDevices(deviceData);
    setEmployees(employeeData);
    setClients(clientData);
    setLoading(false);
  };

  const isFormValid = () =>
    form.deviceType.trim() !== "" &&
    form.deviceTag.trim() !== "" &&
    form.brand.trim() !== "" &&
    form.condition.trim() !== "" &&
    !tagError;

  // Helper function to compare device data and generate change description
  const getDeviceChanges = (oldDevice, newDevice) => {
    const changes = [];
    const fieldLabels = {
      deviceType: "Device Type",
      deviceTag: "Device Tag",
      brand: "Brand",
      model: "Model",
      client: "Client",
      condition: "Condition",
      remarks: "Remarks",
      acquisitionDate: "Acquisition Date",
    };

    // Compare each field
    Object.keys(fieldLabels).forEach((field) => {
      const oldValue = (oldDevice && oldDevice[field]) || "";
      const newValue = (newDevice && newDevice[field]) || "";

      if (oldValue !== newValue) {
        // Format empty values for better readability
        const oldDisplay = oldValue === "" ? "(empty)" : oldValue;
        const newDisplay = newValue === "" ? "(empty)" : newValue;
        changes.push(`${fieldLabels[field]}: ${oldDisplay} → ${newDisplay}`);
      }
    });

    return changes.length > 0
      ? `Updated: ${changes.join(", ")}`
      : "No changes detected";
  };

  const handleSave = async () => {
    setSaveError("");
    if (!isFormValid()) {
      setSaveError("Please fill in all required fields.");
      showError("Please fill in all required fields.");
      return;
    }

    try {
      // Enhanced TAG validation
      const tagValidation = await validateTagUniqueness(
        form.deviceTag,
        form._editDeviceId
      );

      if (!tagValidation.isValid) {
        setSaveError(tagValidation.message);
        showError(tagValidation.message);
        return;
      }

      const allDevices = await getAllDevices();
      const typeObj = deviceTypes.find((t) => t.label === form.deviceType);
      if (!typeObj) {
        setSaveError("Invalid device type.");
        showError("Invalid device type.");
        return;
      }

      const tagPrefix = `JOII${typeObj.code}`;
      const payload = {
        ...form,
        condition: form.condition || "New",
        acquisitionDate:
          form.acquisitionDate ||
          formatDateToMMDDYYYY(new Date().toISOString().split("T")[0]),
      };

      if (useSerial) {
        if (!form._editDeviceId) {
          const newDevice = await addDevice(payload);
          // Log device creation
          await logDeviceHistory({
            employeeId: null,
            employeeName: null,
            deviceId: newDevice.id,
            deviceTag: payload.deviceTag,
            action: "added",
            date: new Date(), // Store full timestamp for precise ordering
          });
          showSuccess(`Device ${payload.deviceTag} added successfully!`);
        } else {
          // Get the original device data for comparison
          const originalDevice = allDevices.find(
            (d) => d.id === form._editDeviceId
          );
          const changeDescription = getDeviceChanges(originalDevice, payload);

          await updateDevice(form._editDeviceId, payload);

          // Log device update with change details
          await logDeviceHistory({
            employeeId: null,
            employeeName: null,
            deviceId: form._editDeviceId,
            deviceTag: payload.deviceTag,
            action: "updated",
            reason: changeDescription,
            date: new Date(),
          });

          showSuccess(`Device ${payload.deviceTag} updated successfully!`);
        }
      } else {
        if (!form._editDeviceId) {
          const newDevice = await addDevice(payload, tagPrefix);
          // Log device creation
          await logDeviceHistory({
            employeeId: null,
            employeeName: null,
            deviceId: newDevice.id,
            deviceTag: payload.deviceTag,
            action: "added",
            date: new Date(), // Store full timestamp for precise ordering
          });
          showSuccess(`Device ${payload.deviceTag} added successfully!`);
        } else {
          // Get the original device data for comparison
          const originalDevice = allDevices.find(
            (d) => d.id === form._editDeviceId
          );
          const changeDescription = getDeviceChanges(originalDevice, payload);

          await updateDevice(form._editDeviceId, payload);

          // Log device update with change details
          await logDeviceHistory({
            employeeId: null,
            employeeName: null,
            deviceId: form._editDeviceId,
            deviceTag: payload.deviceTag,
            action: "updated",
            reason: changeDescription,
            date: new Date(),
          });

          showSuccess(`Device ${payload.deviceTag} updated successfully!`);
        }
      }
      resetForm();
      loadDevicesAndEmployees();
    } catch (error) {
      console.error("Error saving device:", error);
      showError("Failed to save device. Please try again.");
    }
  };

  const handleEdit = (device) => {
    const { id, ...deviceData } = device;

    // Map all device fields to the form, ensuring all fields are included
    const formData = {
      deviceType: deviceData.deviceType || "",
      deviceTag: deviceData.deviceTag || "",
      brand: deviceData.brand || "",
      model: deviceData.model || "",
      client: deviceData.client || "",
      condition: deviceData.condition || "",
      remarks: deviceData.remarks || "",
      acquisitionDate: formatDateToMMDDYYYY(deviceData.acquisitionDate) || "",
      assignedTo: deviceData.assignedTo || "",
      assignmentDate: deviceData.assignmentDate || "",
      _editDeviceId: id,
      id: id, // Keep id for edit mode detection
    };

    setForm(formData);

    // Check if this device uses a serial number format (no JOII prefix)
    const typeObj = deviceTypes.find((t) => t.label === deviceData.deviceType);
    const expectedPrefix = typeObj ? `JOII${typeObj.code}` : "";
    const isSerialFormat =
      deviceData.deviceTag && !deviceData.deviceTag.startsWith(expectedPrefix);
    setUseSerial(isSerialFormat);

    setShowForm(true);
  };

  const handleShowDeviceHistory = (device) => {
    console.log("Opening device history for device:", device);
    console.log("Device tag:", device.deviceTag);
    console.log("Device ID:", device.id);
    setSelectedDeviceForHistory(device);
    setShowDeviceHistory(true);
  };

  const handleCloseDeviceHistory = () => {
    setShowDeviceHistory(false);
    setSelectedDeviceForHistory(null);
  };

  const handleDelete = (id) => {
    const device = devices.find((d) => d.id === id);
    setDeviceToDelete(device);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deviceToDelete) return;

    try {
      // Store the device data before deletion for undo
      const deviceData = { ...deviceToDelete };

      // Delete the device
      await deleteDevice(deviceToDelete.id);

      // Remove from UI immediately
      setDevices((prev) => prev.filter((d) => d.id !== deviceToDelete.id));

      // Show undo notification
      showUndoNotification(
        `Device ${deviceData.deviceTag} deleted successfully`,
        async () => {
          // Undo function - restore the device
          try {
            // Restore device with original ID using setDoc
            const { id: originalId, ...deviceDataToRestore } = deviceData;
            await setDoc(doc(db, "devices", originalId), deviceDataToRestore);

            await logDeviceHistory({
              employeeId: null,
              employeeName: null,
              deviceId: originalId,
              deviceTag: deviceData.deviceTag,
              action: "restored",
              date: new Date(),
            });
            loadDevicesAndEmployees();
            showSuccess(`Device ${deviceData.deviceTag} restored successfully`);
          } catch (error) {
            console.error("Error restoring device:", error);
            showError("Failed to restore device. Please try again.");
          }
        },
        5000 // 5 seconds to undo
      );

      // Clear the modal state
      setShowDeleteConfirm(false);
      setDeviceToDelete(null);
    } catch (error) {
      console.error("Error deleting device:", error);
      showError("Failed to delete device. Please try again.");
      setShowDeleteConfirm(false);
      setDeviceToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeviceToDelete(null);
  };

  const resetForm = () => {
    setForm({ ...initialForm });
    setUseSerial(false);
    setShowForm(false);
    setSaveError("");
    setTagError("");
  };

  const getEmployeeName = (id) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.fullName : id || "";
  };

  const handleSerialToggle = (checked) => {
    setUseSerial(checked);
    setForm((prev) => ({ ...prev, deviceTag: "" }));
    setTagError("");
  };

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
      rows = rows.map((row) => {
        const cleaned = {};
        Object.keys(row).forEach((key) => {
          const cleanKey = key.replace(/['"]+/g, "").trim();
          cleaned[cleanKey] = row[key];
        });
        return cleaned;
      });
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
      // Fetch all devices for duplicate check
      const allDevices = await getAllDevices();
      for (let i = 0; i < filteredRows.length; i++) {
        const row = filteredRows[i];
        setImportProgress({ current: i + 1, total: filteredRows.length });
        if (
          row["Device Type"] &&
          row["Device Tag"] &&
          row["Brand"] &&
          row["Condition"]
        ) {
          // Convert Excel serial date to mm/dd/yyyy if needed
          let acquisitionDate = formatDateToMMDDYYYY(row["Acquisition Date"]);

          // Check for duplicate deviceTag
          const existing = allDevices.find(
            (d) =>
              d.deviceTag &&
              d.deviceTag.toLowerCase() === row["Device Tag"].toLowerCase()
          );
          const devicePayload = {
            deviceType: row["Device Type"],
            deviceTag: row["Device Tag"],
            brand: row["Brand"],
            model: row["Model"] || "",
            condition: row["Condition"],
            remarks: row["Remarks"] || "",
            client: row["Client"] || "",
            assignedTo: "",
            assignmentDate: "",
            acquisitionDate,
          };
          try {
            if (existing) {
              await updateDevice(existing.id, devicePayload); // Overwrite
            } else {
              await addDevice(devicePayload);
            }
            importedCount++;
          } catch (err) {}
        }
      }
      await loadDevicesAndEmployees();
      showSuccess(
        `Import finished! Imported ${importedCount} of ${filteredRows.length} row(s).`
      );
    } catch (err) {
      showError("Failed to import. Please check your Excel file format.");
    }
    setImporting(false);
    setImportProgress({ current: 0, total: 0 });
    e.target.value = "";
  };

  // --- FILTERED DEVICES ---
  const filteredDevices = getUnassignedDevices(devices, deviceSearch);

  const handleSelectAll = (e) => {
    const checked = e.target.checked;

    // Filter devices based on search AND exclude assigned devices
    const filteredDevices = getUnassignedDevices(devices, deviceSearch);

    // Get current page devices
    const startIndex = (currentPage - 1) * devicesPerPage;
    const endIndex = startIndex + devicesPerPage;
    const currentPageDevices = filteredDevices.slice(startIndex, endIndex);

    setSelectAll(checked);
    if (checked) {
      // Add current page device IDs to selection
      const newSelectedIds = [
        ...selectedIds,
        ...currentPageDevices
          .map((d) => d.id)
          .filter((id) => !selectedIds.includes(id)),
      ];
      setSelectedIds(newSelectedIds);
    } else {
      // Remove current page device IDs from selection
      const currentPageIds = currentPageDevices.map((d) => d.id);
      setSelectedIds(selectedIds.filter((id) => !currentPageIds.includes(id)));
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      // Store selected devices data for undo
      const devicesToDelete = devices.filter((d) => selectedIds.includes(d.id));

      setDeleteProgress({ current: 0, total: selectedIds.length });

      // Delete all selected devices
      for (let i = 0; i < selectedIds.length; i++) {
        await deleteDevice(selectedIds[i]);
        setDeleteProgress({ current: i + 1, total: selectedIds.length });
      }

      // Remove from UI immediately
      setDevices((prev) => prev.filter((d) => !selectedIds.includes(d.id)));

      // Show undo notification
      showUndoNotification(
        `Successfully deleted ${selectedIds.length} device(s) from inventory`,
        async () => {
          // Undo function - restore all devices
          try {
            for (const deviceData of devicesToDelete) {
              // Restore device with original ID using setDoc
              const { id: originalId, ...deviceDataToRestore } = deviceData;
              await setDoc(doc(db, "devices", originalId), deviceDataToRestore);

              await logDeviceHistory({
                employeeId: null,
                employeeName: null,
                deviceId: originalId,
                deviceTag: deviceData.deviceTag,
                action: "restored",
                date: new Date(),
              });
            }
            loadDevicesAndEmployees();
            showSuccess(
              `${devicesToDelete.length} device(s) restored successfully`
            );
          } catch (error) {
            console.error("Error restoring devices:", error);
            showError("Failed to restore devices. Please try again.");
          }
        },
        5000 // 5 seconds to undo
      );

      // Clear selections and progress
      setSelectedIds([]);
      setSelectAll(false);
      setDeleteProgress({ current: 0, total: 0 });
    } catch (error) {
      console.error("Error deleting devices:", error);
      showError("Failed to delete devices. Please try again.");
      setDeleteProgress({ current: 0, total: 0 });
    } finally {
      setShowBulkDeleteConfirm(false);
    }
  };

  // --- ASSIGN MODAL LOGIC ---
  const [assignModalStep, setAssignModalStep] = useState(0);
  const [assignModalChecks, setAssignModalChecks] = useState({
    newIssueNew: false,
    newIssueStock: false,
    wfhNew: false,
    wfhStock: false,
    temporaryDeploy: false,
  });
  const [assignModalShowGenerate, setAssignModalShowGenerate] = useState(false);
  const [assignModalGenerating, setAssignModalGenerating] = useState(false);
  const [assignModalProgress, setAssignModalProgress] = useState(0);
  const [assignModalDocxBlob, setAssignModalDocxBlob] = useState(null);

  // Assign Modal Flow
  const openAssignModal = (device) => {
    setAssigningDevice(device);
    setAssignModalOpen(true);
    setAssignModalStep(1);
    setDocxBlob(null);
    setAssignModalDocxBlob(null); // Reset any previous document
    setAssignModalProgress(0); // Reset progress
    setAssignModalGenerating(false); // Reset generating state
    setAssignModalShowGenerate(false); // Reset show generate button
    setSelectedAssignEmployee(null); // Reset selected employee
    setAssignModalChecks({
      // Reset all checkboxes
      newIssueNew: false,
      newIssueStock: false,
      wfhNew: false,
      wfhStock: false,
      temporaryDeploy: false,
    });
    setAssignSearch("");
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssigningDevice(null);
    setAssignModalStep(0);
    setSelectedAssignEmployee(null);
    setAssignModalChecks({
      newIssueNew: false,
      newIssueStock: false,
      wfhNew: false,
      wfhStock: false,
      temporaryDeploy: false,
    });
    setAssignModalShowGenerate(false);
    setProgress(0);
    setGenerating(false);
    setDocxBlob(null);
    setAssignModalDocxBlob(null); // Reset the assign modal blob
    setAssignModalProgress(0); // Reset progress
    setAssignModalGenerating(false); // Reset generating state
    setAssignSearch("");
  };

  const handleAssignModalCheckbox = (e) => {
    setAssignModalChecks((prev) => ({
      ...prev,
      [e.target.name]: e.target.checked,
    }));
  };

  const handleAssignModalNext = () => {
    setAssignModalShowGenerate(true);
  };

  const handleAssignModalGenerateDocx = async () => {
    setAssignModalGenerating(true);
    setAssignModalProgress(10);
    try {
      const response = await fetch(
        "/src/AccountabilityForms/ASSET ACCOUNTABILITY FORM - NEW ISSUE.docx"
      );
      setAssignModalProgress(20);
      const content = await response.arrayBuffer();
      setAssignModalProgress(30);
      const zip = new PizZip(content);
      setAssignModalProgress(40);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });
      setAssignModalProgress(50);

      const emp = employees.find((e) => e.id === selectedAssignEmployee.id);
      // Get all selected devices for assignment
      const selectedDeviceObjects = devices.filter((d) =>
        selectedIds.includes(d.id)
      );
      // Philippine date logic
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const phTime = new Date(utc + 8 * 60 * 60000); // GMT+8
      const assignmentDate =
        phTime.getFullYear() +
        "-" +
        String(phTime.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(phTime.getDate()).padStart(2, "0");

      doc.setData({
        name: emp?.fullName || "",
        dateHired: formatDateToFullWord(emp?.dateHired) || "",
        department: emp?.department || emp?.client || "",
        position: emp?.position || "",
        devices: selectedDeviceObjects.map((dev) => {
          // Format assignmentDate as 'June 06, 2025'
          let dateToFormat = dev.assignmentDate || assignmentDate;
          let formattedDate = "";
          if (dateToFormat) {
            const dateObj = new Date(dateToFormat);
            if (!isNaN(dateObj)) {
              formattedDate = dateObj.toLocaleString("en-US", {
                year: "numeric",
                month: "long",
                day: "2-digit",
              });
            } else {
              formattedDate = dateToFormat;
            }
          }
          return {
            assignmentDate: formattedDate,
            deviceType: dev.deviceType,
            brand: dev.brand,
            deviceTag: dev.deviceTag,
            condition: dev.condition,
            remarks: assignModalChecks.temporaryDeploy
              ? "temporary deployed"
              : dev.remarks,
          };
        }),
        // Dual placeholders for colored checkboxes
        newIssueNewBoxRed: assignModalChecks.newIssueNew ? "◼" : "",
        newIssueNewBoxBlack: assignModalChecks.newIssueNew ? "" : "☐",
        newIssueStockBoxRed: assignModalChecks.newIssueStock ? "◼" : "",
        newIssueStockBoxBlack: assignModalChecks.newIssueStock ? "" : "☐",
        wfhNewBoxRed: assignModalChecks.wfhNew ? "◼" : "",
        wfhNewBoxBlack: assignModalChecks.wfhNew ? "" : "☐",
        wfhStockBoxRed: assignModalChecks.wfhStock ? "◼" : "",
        wfhStockBoxBlack: assignModalChecks.wfhStock ? "" : "☐",
      });

      setAssignModalProgress(60);
      doc.render();
      setAssignModalProgress(70);
      const out = doc.getZip().generate({ type: "blob" });
      setAssignModalDocxBlob(out);
      setAssignModalProgress(100);
      setAssignModalGenerating(false);
    } catch (e) {
      setAssignModalGenerating(false);
      alert("Failed to generate document. Please check the template and data.");
    }
  };

  // Download and assign devices when user clicks Download DOCX
  const handleDownloadAndAssign = async () => {
    if (!assignModalDocxBlob) return;
    const emp = employees.find((e) => e.id === selectedAssignEmployee.id);
    const employeeName = emp?.fullName
      ? emp.fullName.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")
      : "Employee";
    const fileName = `${employeeName} - NEW ISSUE.docx`;
    saveAs(assignModalDocxBlob, fileName);
    // Move assigned devices to assets (update their assignedTo, assignmentDate, remarks)
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const phTime = new Date(utc + 8 * 60 * 60000); // GMT+8
    const assignmentDate =
      phTime.getFullYear() +
      "-" +
      String(phTime.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(phTime.getDate()).padStart(2, "0");

    // Get the devices to be assigned
    const devicesToAssign = devices.filter((d) => selectedIds.includes(d.id));

    for (const dev of devicesToAssign) {
      await updateDevice(dev.id, {
        ...dev,
        assignedTo: selectedAssignEmployee.id,
        assignmentDate: new Date(), // Store full timestamp for precise ordering
        remarks: assignModalChecks.temporaryDeploy
          ? "temporary deployed"
          : dev.remarks,
      });
      await logDeviceHistory({
        employeeId: selectedAssignEmployee.id,
        employeeName: selectedAssignEmployee.fullName,
        deviceId: dev.id,
        deviceTag: dev.deviceTag,
        action: "assigned",
        date: new Date(), // Store full timestamp for precise ordering
      });
    }

    // Clear selected IDs after assignment
    setSelectedIds([]);
    closeAssignModal();
    showSuccess(
      `Successfully assigned ${devicesToAssign.length} device(s) to ${selectedAssignEmployee.fullName}`
    );
    loadDevicesAndEmployees();
  };

  // --- END ASSIGN MODAL LOGIC ---

  // Handler for bulk assign
  const handleBulkAssign = () => {
    if (selectedIds.length === 0) return;
    // For now, open assign modal for the first selected device
    const device = devices.find((d) => d.id === selectedIds[0]);
    if (device) {
      openAssignModal(device);
    }
    // If you want to support multi-assign, you can extend this logic
  };

  // Handler for export to Excel
  const handleExportToExcel = async () => {
    try {
      await exportInventoryToExcel({
        devices: filteredDevices, // Export only the filtered/displayed devices
        employees,
      });
      showSuccess("Inventory data exported successfully!");
    } catch (error) {
      showError("Failed to export inventory data. Please try again.");
    }
  };

  // --- New Acquisitions Functionality ---
  const handleNewAcquisitions = async () => {
    // Prompt for device type, brand, model, condition, remarks, acquisition date, start tag, end tag
    // (In your UI, these are already collected by the modal, so here we just handle the logic)
    // Find the modal fields by their DOM selectors if needed, or use a ref-based approach if you want to trigger from a button
    // But since your modal is already present, just implement the logic for adding devices in bulk
    // This function is to be called by the New Acquisitions button
    // This is a placeholder for the actual modal logic, which should call this function with the correct data
    // For now, you can call this function from your modal's submit handler
  };

  // Attach to the button:
  // <button style={styles.button} onClick={handleNewAcquisitions}>New Acquisitions</button>
  // In your modal, call handleNewAcquisitions with the correct data

  // The actual logic for adding devices in bulk:
  const addDevicesInBulk = async ({
    deviceType,
    brand,
    model,
    condition,
    remarks,
    acquisitionDate,
    quantity,
    client,
  }) => {
    console.log(`addDevicesInBulk called with deviceType: "${deviceType}"`);

    if (!deviceType || !brand || !condition || !quantity) {
      throw new Error("Please fill in all required fields.");
    }

    const typeObj = deviceTypes.find((t) => t.label === deviceType);
    if (!typeObj) {
      throw new Error("Invalid device type.");
    }

    const prefix = `JOII${typeObj.code}`;
    const qty = parseInt(quantity, 10);

    if (isNaN(qty) || qty < 1 || qty > 100) {
      throw new Error("Invalid quantity (must be between 1 and 99).");
    }

    // Find the next available TAG number
    const allDevices = await getAllDevices();
    const deviceTags = allDevices
      .filter(
        (device) => device.deviceTag && device.deviceTag.startsWith(prefix)
      )
      .map((device) => {
        const tagNumber = device.deviceTag.replace(prefix, "");
        return parseInt(tagNumber, 10);
      })
      .filter((num) => !isNaN(num))
      .sort((a, b) => b - a);

    const lastUsedNumber = deviceTags.length > 0 ? deviceTags[0] : 0;
    const startTag = lastUsedNumber + 1;
    const endTag = startTag + qty - 1;

    // Enhanced validation: Check all TAGs before adding any devices
    const tagsToCheck = [];
    for (let i = startTag; i <= endTag; i++) {
      const tagNum = String(i).padStart(4, "0");
      const deviceTag = `${prefix}${tagNum}`;
      tagsToCheck.push(deviceTag);
    }

    // Validate all tags for uniqueness
    for (const tag of tagsToCheck) {
      const validation = await validateTagUniqueness(tag);
      if (!validation.isValid) {
        throw new Error(`TAG validation failed: ${validation.message}`);
      }
    }

    let added = 0;
    for (let i = startTag; i <= endTag; i++) {
      const tagNum = String(i).padStart(4, "0");
      const deviceTag = `${prefix}${tagNum}`;

      const payload = {
        deviceType,
        deviceTag,
        brand,
        model: model || "",
        condition,
        remarks: remarks || "",
        client: client || "",
        assignedTo: "",
        assignmentDate: "",
        acquisitionDate:
          acquisitionDate ||
          formatDateToMMDDYYYY(new Date().toISOString().split("T")[0]),
      };

      console.log(`Creating device ${deviceTag} with type: "${deviceType}"`);
      try {
        const newDevice = await addDevice(payload);
        // Log device creation
        await logDeviceHistory({
          employeeId: null,
          employeeName: null,
          deviceId: newDevice.id,
          deviceTag: payload.deviceTag,
          action: "added",
          date: new Date(),
        });
        added++;
      } catch (error) {
        console.error(`Failed to add device ${deviceTag}:`, error);
      }
    }
    await loadDevicesAndEmployees();
    console.log(
      `addDevicesInBulk completed: added ${added} devices of type "${deviceType}"`
    );
    return added;
  };

  const handleNewAcqInput = ({ target: { name, value } }) => {
    setNewAcqTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              data: {
                ...tab.data,
                [name]:
                  name === "acquisitionDate"
                    ? formatDateToMMDDYYYY(value)
                    : value,
              },
            }
          : tab
      )
    );
    setNewAcqError("");

    // Auto-initialize TAG fields when device type is selected
    if (name === "deviceType" && value) {
      initializeTagFields(value);
    }
  };

  // Function to auto-initialize quantity field and show next available TAGs
  const initializeTagFields = async (deviceType) => {
    try {
      const typeObj = deviceTypes.find((t) => t.label === deviceType);
      if (!typeObj) return;

      const prefix = `JOII${typeObj.code}`;
      const allDevices = await getAllDevices();

      // Find all devices of this type to determine the last used TAG
      const deviceTags = allDevices
        .filter(
          (device) => device.deviceTag && device.deviceTag.startsWith(prefix)
        )
        .map((device) => {
          const tagNumber = device.deviceTag.replace(prefix, "");
          return parseInt(tagNumber, 10);
        })
        .filter((num) => !isNaN(num))
        .sort((a, b) => b - a); // Sort descending to get the highest number first

      // Get the next available TAG number
      const lastUsedNumber = deviceTags.length > 0 ? deviceTags[0] : 0;
      const nextStartTag = lastUsedNumber + 1;

      // Update the current tab with default quantity and display info
      setNewAcqTabs((prevTabs) =>
        prevTabs.map((tab) =>
          tab.id === activeTabId
            ? {
                ...tab,
                data: {
                  ...tab.data,
                  quantity: 1,
                  nextAvailableTag: nextStartTag, // For display purposes
                },
              }
            : tab
        )
      );
    } catch (error) {
      console.error("Error initializing TAG fields:", error);
    }
  };

  // Tab management functions
  const addNewTab = () => {
    const newTab = {
      id: nextTabId,
      label: `Device Type ${nextTabId}`,
      data: {
        deviceType: "",
        brand: "",
        model: "",
        condition: "",
        remarks: "",
        acquisitionDate: "",
        quantity: 1,
        supplier: "",
        client: "",
        useManualSerial: false,
        manualQuantity: 1,
        manualSerials: [],
      },
    };
    setNewAcqTabs((prev) => [...prev, newTab]);
    setActiveTabId(nextTabId);
    setNextTabId((prev) => prev + 1);
  };

  const removeTab = (tabId) => {
    if (newAcqTabs.length <= 1) return; // Don't allow removing the last tab

    setNewAcqTabs((prev) => prev.filter((tab) => tab.id !== tabId));

    // If we're removing the active tab, switch to another tab
    if (tabId === activeTabId) {
      const remainingTabs = newAcqTabs.filter((tab) => tab.id !== tabId);
      setActiveTabId(remainingTabs[0].id);
    }
  };

  const switchTab = (tabId) => {
    setActiveTabId(tabId);
    setNewAcqError("");
  };

  const getCurrentTabData = () => {
    return newAcqTabs.find((tab) => tab.id === activeTabId)?.data || {};
  };

  const handleManualSerialToggle = (e) => {
    const checked = e.target.checked;

    // Update the current tab's manual serial setting
    setNewAcqTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, data: { ...tab.data, useManualSerial: checked } }
          : tab
      )
    );

    if (!checked) {
      // Clear manual serial data for this tab
      setNewAcqTabs((prevTabs) =>
        prevTabs.map((tab) =>
          tab.id === activeTabId
            ? {
                ...tab,
                data: {
                  ...tab.data,
                  manualQuantity: 1,
                  manualSerials: [],
                },
              }
            : tab
        )
      );
    }
  };

  const handleQuantityChange = (e) => {
    const qty = parseInt(e.target.value) || 1;
    const newQuantity = Math.max(1, Math.min(99, qty));

    // Update the current tab's manual quantity and adjust the serials array
    setNewAcqTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id === activeTabId) {
          // Create new serials array with the new quantity
          const currentSerials = tab.data.manualSerials || [];
          const newSerials = Array(newQuantity)
            .fill("")
            .map((_, index) => ({
              id: index,
              serial: currentSerials[index]?.serial || "",
            }));

          return {
            ...tab,
            data: {
              ...tab.data,
              manualQuantity: newQuantity,
              manualSerials: newSerials,
            },
          };
        }
        return tab;
      })
    );
  };

  const handleProceedToManualEntry = () => {
    // Validate all tabs that require manual serial assignment
    const manualTabs = newAcqTabs.filter((tab) => tab.data.useManualSerial);

    for (const tab of manualTabs) {
      if (!tab.data.deviceType || !tab.data.brand || !tab.data.condition) {
        setNewAcqError(
          `Please fill in Device Type, Brand, and Condition for ${tab.label}.`
        );
        return;
      }
    }

    // Initialize serial inputs for all manual tabs
    const updatedTabs = newAcqTabs.map((tab) => {
      if (tab.data.useManualSerial) {
        const currentQuantity = tab.data.manualQuantity || 1;
        const currentSerials = tab.data.manualSerials || [];

        // Always create/update the serials array to match the quantity
        const serialsArray = Array(currentQuantity)
          .fill("")
          .map((_, index) => ({
            id: index,
            serial: currentSerials[index]?.serial || "",
          }));

        return {
          ...tab,
          data: {
            ...tab.data,
            manualSerials: serialsArray,
          },
        };
      }
      return tab;
    });

    setNewAcqTabs(updatedTabs);

    // Set active manual tab to the current active tab if it uses manual serial, otherwise use the first manual tab
    const currentTabUsesManualSerial = newAcqTabs.find(
      (tab) => tab.id === activeTabId
    )?.data.useManualSerial;
    if (currentTabUsesManualSerial) {
      setActiveManualTabId(activeTabId);
    } else {
      setActiveManualTabId(manualTabs[0]?.id || 1);
    }

    setShowManualSerialPanel(true);
  };

  const handleManualSerialChange = (tabId, index, value) => {
    setNewAcqTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              data: {
                ...tab.data,
                manualSerials: tab.data.manualSerials.map((item, i) =>
                  i === index ? { ...item, serial: value } : item
                ),
              },
            }
          : tab
      )
    );
  };

  const handleImportSerials = (tabId, importText) => {
    const lines = importText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    setNewAcqTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id === tabId) {
          const updatedSerials = tab.data.manualSerials.map((item, index) => ({
            ...item,
            serial: lines[index] || item.serial,
          }));

          return {
            ...tab,
            data: {
              ...tab.data,
              manualSerials: updatedSerials,
            },
          };
        }
        return tab;
      })
    );

    // Clear the import text for this tab after importing
    setImportTexts((prev) => ({ ...prev, [tabId]: "" }));
  };

  const handleManualSerialSubmit = async () => {
    setNewAcqError("");
    setNewAcqLoading(true);

    try {
      // Get all tabs with manual serial assignment
      const manualTabs = newAcqTabs.filter((tab) => tab.data.useManualSerial);

      // Validate all serials are filled for manual tabs
      for (const tab of manualTabs) {
        const emptySerials = tab.data.manualSerials.filter(
          (item) => !item.serial.trim()
        );
        if (emptySerials.length > 0) {
          setNewAcqError(`Please fill in all serial numbers for ${tab.label}.`);
          setNewAcqLoading(false);
          return;
        }
      }

      // Collect all serial values from all manual tabs
      const allSerialValues = [];
      for (const tab of manualTabs) {
        const serialValues = tab.data.manualSerials.map((item) =>
          item.serial.trim()
        );
        allSerialValues.push(...serialValues);
      }

      // Check for duplicates within the input
      const duplicateSerials = allSerialValues.filter(
        (serial, index) => allSerialValues.indexOf(serial) !== index
      );
      if (duplicateSerials.length > 0) {
        setNewAcqError(
          `Duplicate serial numbers found: ${duplicateSerials.join(", ")}`
        );
        setNewAcqLoading(false);
        return;
      }

      // Enhanced validation: Check against existing devices using global validation
      for (const serial of allSerialValues) {
        const validation = await validateTagUniqueness(serial);
        if (!validation.isValid) {
          setNewAcqError(validation.message);
          setNewAcqLoading(false);
          return;
        }
      }

      // Add devices with manual serials for each tab
      let allDeviceList = [];
      let totalAdded = 0;

      for (const tab of manualTabs) {
        const tabData = tab.data;

        // Validate required fields
        if (!tabData.deviceType || !tabData.brand || !tabData.condition) {
          setNewAcqError(
            `Please fill in Device Type, Brand, and Condition for ${tab.label}.`
          );
          setNewAcqLoading(false);
          return;
        }

        let tabDeviceList = [];
        let added = 0;

        for (const serialItem of tabData.manualSerials) {
          const payload = {
            deviceType: tabData.deviceType,
            deviceTag: serialItem.serial.trim(),
            brand: tabData.brand,
            model: tabData.model || "",
            condition: tabData.condition,
            remarks: tabData.remarks || "",
            client: tabData.client || "",
            assignedTo: "",
            assignmentDate: "",
            acquisitionDate:
              tabData.acquisitionDate ||
              formatDateToMMDDYYYY(new Date().toISOString().split("T")[0]),
          };

          tabDeviceList.push(payload);

          try {
            const newDevice = await addDevice(payload);
            // Log device creation
            await logDeviceHistory({
              employeeId: null,
              employeeName: null,
              deviceId: newDevice.id,
              deviceTag: payload.deviceTag,
              action: "added",
              date: new Date(),
            });
            added++;
          } catch (error) {
            console.error(`Failed to add device ${serialItem.serial}:`, error);
          }
        }

        allDeviceList = [...allDeviceList, ...tabDeviceList];
        totalAdded += added;
      }

      // Also process non-manual tabs (range-based)
      const rangeTabs = newAcqTabs.filter((tab) => !tab.data.useManualSerial);
      for (const tab of rangeTabs) {
        const tabData = tab.data;
        if (
          tabData.deviceType &&
          tabData.brand &&
          tabData.condition &&
          tabData.startTag &&
          tabData.endTag
        ) {
          const rangeAdded = await addDevicesInBulk(tabData);
          totalAdded += rangeAdded;

          // Add to document generation list
          const startNum = parseInt(tabData.startTag.replace(/\D/g, ""), 10);
          const endNum = parseInt(tabData.endTag.replace(/\D/g, ""), 10);
          const typeObj = deviceTypes.find(
            (t) => t.label === tabData.deviceType
          );
          const prefix = `JOII${typeObj.code}`;

          for (let i = startNum; i <= endNum; i++) {
            const deviceTag = `${prefix}${String(i).padStart(4, "0")}`;
            allDeviceList.push({
              deviceTag,
              deviceType: tabData.deviceType,
              brand: tabData.brand,
              model: tabData.model || "",
              condition: tabData.condition,
              remarks: tabData.remarks || "",
            });
          }
        }
      }

      await loadDevicesAndEmployees();

      // Generate document for all devices
      try {
        await generateAcquisitionDocument(allDeviceList, newAcqTabs[0].data);
      } catch (docError) {
        console.error("Document generation failed:", docError);
        // Continue even if document generation fails
      }

      showSuccess(`Added ${totalAdded} device(s) successfully.`);

      // Reset form
      setShowNewAcqModal(false);
      setNewAcqTabs([
        {
          id: 1,
          label: "Device Type 1",
          data: {
            deviceType: "",
            brand: "",
            model: "",
            condition: "",
            remarks: "",
            acquisitionDate: "",
            quantity: 1,
            supplier: "",
            client: "",
            useManualSerial: false,
            manualQuantity: 1,
            manualSerials: [],
          },
        },
      ]);
      setActiveTabId(1);
      setNextTabId(2);
      setShowManualSerialPanel(false);
      setImportTexts({});
    } catch (err) {
      setNewAcqError("Failed to add devices. Please try again.");
    }
    setNewAcqLoading(false);
  };

  const handleNewAcqSubmit = async () => {
    // Check if any tab uses manual serial assignment
    const hasManualTabs = newAcqTabs.some((tab) => tab.data.useManualSerial);

    if (hasManualTabs) {
      // If any tab has manual serial assignment, proceed to manual entry panel
      handleProceedToManualEntry();
      return;
    }

    // Regular bulk add workflow for all tabs (range-based only)
    setNewAcqError("");
    setNewAcqLoading(true);
    setProgress(0);

    try {
      // Validate only range-based tabs have required fields
      const rangeTabs = newAcqTabs.filter((tab) => !tab.data.useManualSerial);
      const invalidTabs = rangeTabs.filter(
        (tab) =>
          !tab.data.deviceType ||
          !tab.data.brand ||
          !tab.data.condition ||
          !tab.data.quantity ||
          parseInt(tab.data.quantity) < 1
      );

      if (invalidTabs.length > 0) {
        setNewAcqError(
          `Please fill in all required fields for range-based device types.`
        );
        setNewAcqLoading(false);
        return;
      }

      setProgress(10);

      let allDeviceList = [];
      let totalAdded = 0;

      // Process each range-based tab
      for (let i = 0; i < rangeTabs.length; i++) {
        const tabData = rangeTabs[i].data;

        console.log(
          `Processing range-based tab ${i + 1} (${
            rangeTabs[i].label
          }) with device type:`,
          tabData.deviceType
        );

        const quantity = parseInt(tabData.quantity, 10);

        if (isNaN(quantity) || quantity < 1 || quantity > 99) {
          setNewAcqError(
            `Invalid quantity in ${rangeTabs[i].label}. Must be between 1 and 99.`
          );
          setNewAcqLoading(false);
          return;
        }

        // Get device type prefix
        const typeObj = deviceTypes.find((t) => t.label === tabData.deviceType);
        if (!typeObj) {
          setNewAcqError(`Invalid device type in ${rangeTabs[i].label}.`);
          setNewAcqLoading(false);
          return;
        }
        const prefix = `JOII${typeObj.code}`;

        // Find the next available TAG number for this device type
        const allDevices = await getAllDevices();
        const deviceTags = allDevices
          .filter(
            (device) => device.deviceTag && device.deviceTag.startsWith(prefix)
          )
          .map((device) => {
            const tagNumber = device.deviceTag.replace(prefix, "");
            return parseInt(tagNumber, 10);
          })
          .filter((num) => !isNaN(num))
          .sort((a, b) => b - a);

        const lastUsedNumber = deviceTags.length > 0 ? deviceTags[0] : 0;
        const startNum = lastUsedNumber + 1;
        const endNum = startNum + quantity - 1;

        // Enhanced TAG validation: Check all TAGs in range before proceeding
        const tagsToValidate = [];
        for (let j = 0; j < quantity; j++) {
          const deviceTag = `${prefix}${String(startNum + j).padStart(4, "0")}`;
          tagsToValidate.push(deviceTag);
        }

        // Validate all TAGs for uniqueness
        for (const tag of tagsToValidate) {
          const tagValidation = await validateTagUniqueness(tag);
          if (!tagValidation.isValid) {
            setNewAcqError(`${tagValidation.message} in ${rangeTabs[i].label}`);
            setNewAcqLoading(false);
            return;
          }
        }

        // Generate device list for this tab
        const tabDeviceList = [];
        for (let j = 0; j < quantity; j++) {
          const deviceTag = `${prefix}${String(startNum + j).padStart(4, "0")}`;
          tabDeviceList.push({
            deviceTag,
            deviceType: tabData.deviceType,
            brand: tabData.brand,
            model: tabData.model,
            condition: tabData.condition,
            remarks: tabData.remarks,
          });
        }

        allDeviceList = [...allDeviceList, ...tabDeviceList];

        // Add devices to database for this tab
        console.log(
          `Adding ${quantity} devices of type "${
            tabData.deviceType
          }" from tab ${i + 1}`
        );
        const addedCount = await addDevicesInBulk({
          ...tabData,
          quantity: quantity,
        });
        totalAdded += addedCount;
        console.log(
          `Successfully added ${addedCount} devices from tab ${i + 1}`
        );

        setProgress(30 + (i + 1) * (40 / rangeTabs.length));
      }

      setProgress(70);

      // Generate single document with all devices
      try {
        // Use the first tab's common data for document metadata
        const firstTabData = newAcqTabs[0].data;
        await generateAcquisitionDocument(allDeviceList, firstTabData);
        setProgress(100);
        showSuccess(
          `Successfully added ${totalAdded} device(s) across ${rangeTabs.length} device type(s) and generated acquisition document!`
        );
      } catch (docError) {
        console.error("Document generation failed:", docError);
        showWarning(
          `Successfully added ${totalAdded} device(s), but document generation failed: ${docError.message}`
        );
      }

      // Reset all tabs
      setShowNewAcqModal(false);
      setNewAcqTabs([
        {
          id: 1,
          label: "Device Type 1",
          data: {
            deviceType: "",
            brand: "",
            model: "",
            condition: "",
            remarks: "",
            acquisitionDate: "",
            startTag: "",
            endTag: "",
            supplier: "",
            client: "",
          },
        },
      ]);
      setActiveTabId(1);
      setNextTabId(2);
      setAssignSerialManually(false);
      setShowManualSerialPanel(false);
      setManualSerials([]);
      setImportTexts({}); // Clear all import texts
      setManualQuantity(1);
      setProgress(0);
    } catch (err) {
      setNewAcqError("Failed to add devices. Please try again.");
    }
    setNewAcqLoading(false);
  };

  // Generate New Asset Acquisition Record Form document with multiple tables
  const generateAcquisitionDocument = async (devices, acquisitionData) => {
    try {
      console.log("Starting document generation...", {
        devicesCount: devices.length,
        acquisitionData,
      });

      // Load the template
      const templatePath =
        "/src/AccountabilityForms/NEW ASSET ACQUISITION RECORD FORM.docx";
      const response = await fetch(templatePath);

      if (!response.ok) {
        throw new Error(
          "Template file not found. Please ensure NEW ASSET ACQUISITION RECORD FORM.docx is in /public/src/AccountabilityForms/"
        );
      }

      console.log("Template loaded successfully");

      const arrayBuffer = await response.arrayBuffer();

      if (arrayBuffer.byteLength === 0) {
        throw new Error("Template file is empty or corrupted");
      }

      console.log("Template file size:", arrayBuffer.byteLength, "bytes");

      let zip, doc;
      try {
        zip = new PizZip(arrayBuffer);
        doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });
      } catch (zipError) {
        console.error("Error parsing template file:", zipError);
        throw new Error(
          "Template file is not a valid DOCX file. Please ensure it's a proper Word document."
        );
      }

      // Configuration: rows per table (20 rows per page as requested)
      const ROWS_PER_TABLE = 20;

      // Prepare device data with common format
      const formattedDevices = devices.map((device) => ({
        acquisitionDate:
          acquisitionData.acquisitionDate ||
          new Date().toISOString().split("T")[0],
        supplier: acquisitionData.supplier || "Not specified",
        client: device.client || acquisitionData.client || "Not specified",
        quantity: "1", // Each device is quantity 1
        deviceType: device.deviceType || acquisitionData.deviceType,
        brand: device.brand || acquisitionData.brand,
        deviceTag: device.deviceTag || device.serial,
        remarks: device.remarks || acquisitionData.remarks || "",
      }));

      console.log("Formatted devices:", formattedDevices.length);
      console.log(
        "Device clients:",
        formattedDevices.map((d) => ({ tag: d.deviceTag, client: d.client }))
      );

      // Determine the global client for the document
      const uniqueClients = [
        ...new Set(formattedDevices.map((device) => device.client)),
      ];
      const globalClient =
        uniqueClients.length === 1
          ? uniqueClients[0]
          : uniqueClients.length > 1
          ? "Multiple Clients"
          : acquisitionData.client || "Not specified";

      console.log("Unique clients found:", uniqueClients);
      console.log("Global client for document:", globalClient);

      // Split devices across multiple tables (28 rows per page)
      const devicesPage1 = formattedDevices.slice(0, ROWS_PER_TABLE);
      const devicesPage2 = formattedDevices.slice(
        ROWS_PER_TABLE,
        ROWS_PER_TABLE * 2
      );
      const devicesPage3 = formattedDevices.slice(
        ROWS_PER_TABLE * 2,
        ROWS_PER_TABLE * 3
      );
      const devicesPage4 = formattedDevices.slice(ROWS_PER_TABLE * 3);

      // Prepare template data
      const templateData = {
        // Original single table (for backward compatibility)
        devices: formattedDevices,

        // Split tables
        devicesPage1: devicesPage1,
        devicesPage2: devicesPage2,
        devicesPage3: devicesPage3,
        devicesPage4: devicesPage4,

        // Metadata
        totalDevices: formattedDevices.length,
        acquisitionDate:
          acquisitionData.acquisitionDate ||
          new Date().toISOString().split("T")[0],
        supplier: acquisitionData.supplier || "Not specified",
        client: globalClient,

        // Page indicators (for conditional display)
        hasPage2: devicesPage2.length > 0,
        hasPage3: devicesPage3.length > 0,
        hasPage4: devicesPage4.length > 0,

        // Summary counts
        page1Count: devicesPage1.length,
        page2Count: devicesPage2.length,
        page3Count: devicesPage3.length,
        page4Count: devicesPage4.length,
      };

      console.log("Template data structure:", {
        totalDevices: templateData.totalDevices,
        page1Count: templateData.page1Count,
        page2Count: templateData.page2Count,
        page3Count: templateData.page3Count,
        page4Count: templateData.page4Count,
      });

      // Render the document
      try {
        doc.render(templateData);
        console.log("Document rendered successfully");
      } catch (renderError) {
        console.error("Error rendering template:", renderError);
        console.log("Template data being used:", templateData);

        // If rendering fails, provide helpful error message
        if (renderError.message.includes("tag")) {
          throw new Error(
            "Template rendering failed. The DOCX template may be missing required placeholders. Please check the template structure."
          );
        } else {
          throw new Error(`Template rendering failed: ${renderError.message}`);
        }
      }

      // Generate and download
      const output = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const currentDate = new Date();
      const formattedDate =
        (currentDate.getMonth() + 1).toString().padStart(2, "0") +
        "." +
        currentDate.getDate().toString().padStart(2, "0") +
        "." +
        currentDate.getFullYear();
      const fileName = `${formattedDate} - NEW ASSET ACQUISITION FORM.docx`;

      console.log("Downloading document:", fileName);
      saveAs(output, fileName);

      return true;
    } catch (error) {
      console.error("Error generating document:", error);

      // Provide more specific error guidance
      if (error.message.includes("Template file not found")) {
        throw new Error(
          "Template file not found. Please ensure 'NEW ASSET ACQUISITION RECORD FORM.docx' exists in the /public/src/AccountabilityForms/ folder."
        );
      } else if (error.message.includes("not a valid DOCX")) {
        throw new Error(
          "The template file appears to be corrupted. Please replace it with a valid Word document (.docx file)."
        );
      } else {
        throw error;
      }
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
        fontFamily:
          "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          flexShrink: 0,
          background: "rgb(255, 255, 255)",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 16px",
            gap: "12px",
            flexWrap: "wrap",
          }}
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
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search inventory devices..."
              value={deviceSearch}
              onChange={(e) => setDeviceSearch(e.target.value)}
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginLeft: "auto",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "9px 16px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#2563eb";
                e.target.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#3b82f6";
                e.target.style.transform = "translateY(0)";
              }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Device
            </button>

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
                onClick={() =>
                  document
                    .querySelector('input[type="file"][accept=".xlsx,.xls"]')
                    .click()
                }
                style={{
                  background: importing ? "#9ca3af" : "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "9px 16px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: importing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!importing) {
                    e.target.style.background = "#059669";
                    e.target.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!importing) {
                    e.target.style.background = "#10b981";
                    e.target.style.transform = "translateY(0)";
                  }
                }}
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"></path>
                </svg>
                {importing
                  ? importProgress.total > 0
                    ? `Importing ${importProgress.current}/${importProgress.total}...`
                    : "Importing..."
                  : "Import Excel"}
              </button>
            </label>

            <button
              onClick={handleExportToExcel}
              title="Export all inventory data to Excel"
              style={{
                background: "#f59e0b",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "9px 16px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#d97706";
                e.target.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#f59e0b";
                e.target.style.transform = "translateY(0)";
              }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 4v12"></path>
              </svg>
              Export Excel
            </button>

            <button
              disabled={selectedIds.length === 0}
              onClick={() => handleBulkAssign()}
              style={{
                background: selectedIds.length ? "#8b5cf6" : "#9ca3af",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "9px 16px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: selectedIds.length ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (selectedIds.length) {
                  e.target.style.background = "#7c3aed";
                  e.target.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedIds.length) {
                  e.target.style.background = "#8b5cf6";
                  e.target.style.transform = "translateY(0)";
                }
              }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0zM22 11l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              Assign
            </button>

            <button
              disabled={selectedIds.length === 0 || deleteProgress.total > 0}
              onClick={handleBulkDelete}
              style={{
                background:
                  selectedIds.length && deleteProgress.total === 0
                    ? "#ef4444"
                    : "#9ca3af",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "9px 16px",
                fontSize: "14px",
                fontWeight: 500,
                cursor:
                  selectedIds.length && deleteProgress.total === 0
                    ? "pointer"
                    : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (selectedIds.length && deleteProgress.total === 0) {
                  e.target.style.background = "#dc2626";
                  e.target.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedIds.length && deleteProgress.total === 0) {
                  e.target.style.background = "#ef4444";
                  e.target.style.transform = "translateY(0)";
                }
              }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              </svg>
              Delete
            </button>

            <button
              onClick={() => setShowNewAcqModal(true)}
              style={{
                background: "#06b6d4",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "9px 16px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#0891b2";
                e.target.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#06b6d4";
                e.target.style.transform = "translateY(0)";
              }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10,9 9,9 8,9"></polyline>
              </svg>
              New Acquisitions
            </button>

            {deleteProgress.total > 0 && (
              <span
                style={{
                  fontSize: "14px",
                  color: "#ef4444",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid #ef4444",
                    borderTop: "2px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                ></div>
                Deleting {deleteProgress.current}/{deleteProgress.total}...
              </span>
            )}
          </div>
        </div>

        {/* Table Header - Fixed with search bar */}
        <div
          style={{
            padding: "0",
            background: "rgb(255, 255, 255)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              minWidth: "1200px",
              background: "#fff",
              padding: "0",
            }}
          >
            <div
              style={{
                ...styles.th,
                flex: "0 0 50px",
                textAlign: "center",
                overflow: "hidden",
              }}
            >
              <input
                type="checkbox"
                checked={(() => {
                  // Filter devices based on search AND exclude assigned devices
                  const filteredDevices = getUnassignedDevices(
                    devices,
                    deviceSearch
                  );

                  // Get current page devices
                  const startIndex = (currentPage - 1) * devicesPerPage;
                  const endIndex = startIndex + devicesPerPage;
                  const currentPageDevices = filteredDevices.slice(
                    startIndex,
                    endIndex
                  );

                  return (
                    currentPageDevices.length > 0 &&
                    currentPageDevices.every((device) =>
                      selectedIds.includes(device.id)
                    )
                  );
                })()}
                onChange={handleSelectAll}
                style={{ width: 16, height: 16, margin: 0 }}
              />
            </div>
            <div style={{ ...styles.th, flex: "0 0 60px", overflow: "hidden" }}>
              #
            </div>
            <div
              style={{ ...styles.th, flex: "0 0 150px", overflow: "hidden" }}
            >
              {fieldLabels.deviceTag}
            </div>
            <div
              style={{ ...styles.th, flex: "0 0 100px", overflow: "hidden" }}
            >
              {fieldLabels.deviceType}
            </div>
            <div
              style={{ ...styles.th, flex: "0 0 100px", overflow: "hidden" }}
            >
              {fieldLabels.brand}
            </div>
            <div
              style={{ ...styles.th, flex: "0 0 120px", overflow: "hidden" }}
            >
              {fieldLabels.model}
            </div>
            <div
              style={{ ...styles.th, flex: "0 0 100px", overflow: "hidden" }}
            >
              {fieldLabels.client}
            </div>
            <div
              style={{ ...styles.th, flex: "0 0 100px", overflow: "hidden" }}
            >
              {fieldLabels.condition}
            </div>
            <div style={{ ...styles.th, flex: "1 1 auto", overflow: "hidden" }}>
              {fieldLabels.remarks}
            </div>
            <div
              style={{ ...styles.th, flex: "0 0 140px", overflow: "hidden" }}
            >
              {fieldLabels.acquisitionDate}
            </div>
            <div
              style={{ ...styles.th, flex: "0 0 120px", overflow: "hidden" }}
            >
              Actions
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <DeviceFormModal
          data={form}
          onChange={handleInput}
          onSave={handleSave}
          onCancel={resetForm}
          onGenerateTag={handleGenerateTag}
          employees={employees}
          clients={clients}
          tagError={tagError}
          setTagError={setTagError}
          saveError={saveError}
          isValid={isFormValid()}
          useSerial={useSerial}
          setUseSerial={setUseSerial}
          onSerialToggle={handleSerialToggle}
          editingDevice={form._editDeviceId}
        />
      )}

      {loading ? (
        <TableLoadingSpinner text="Loading inventory..." />
      ) : (
        <div
          style={{
            flex: 1,
            overflow: "auto",
            background: "#fff",
            border: "1px solid #e5e7eb",
            boxShadow:
              "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitScrollbar: { display: "none" },
          }}
        >
          <div
            style={{
              overflowX: "auto",
              overflowY: "auto",
              maxHeight: "100%",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitScrollbar: { display: "none" },
            }}
          >
            <div
              style={{
                width: "100%",
                minWidth: "1200px",
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                {(() => {
                  // Filter devices based on search AND exclude assigned devices
                  const filteredDevices = getUnassignedDevices(
                    devices,
                    deviceSearch
                  );

                  // Calculate pagination
                  const totalPages = Math.ceil(
                    filteredDevices.length / devicesPerPage
                  );
                  const startIndex = (currentPage - 1) * devicesPerPage;
                  const endIndex = startIndex + devicesPerPage;
                  const currentDevices = filteredDevices.slice(
                    startIndex,
                    endIndex
                  );

                  return currentDevices.map((device, index) => (
                    <div
                      key={device.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        minWidth: "1200px",
                        borderBottom: "1px solid #f3f4f6",
                        background:
                          index % 2 === 0
                            ? "rgb(250, 250, 252)"
                            : "rgb(240, 240, 243)",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onClick={() => handleSelectOne(device.id)}
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
                      <div
                        style={{
                          flex: "0 0 50px",
                          padding: "12px 16px",
                          textAlign: "center",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(device.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectOne(device.id);
                          }}
                          style={{ width: 16, height: 16, margin: 0 }}
                        />
                      </div>
                      <div
                        style={{
                          flex: "0 0 60px",
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "rgb(55, 65, 81)",
                        }}
                      >
                        {(currentPage - 1) * devicesPerPage + index + 1}
                      </div>
                      <div
                        style={{
                          flex: "0 0 150px",
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                          overflow: "hidden",
                        }}
                      >
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowDeviceHistory(device);
                          }}
                          style={{
                            cursor: "pointer",
                            color: "rgb(107, 114, 128)",
                            textDecoration: "none",
                            fontWeight: 400,
                            transition: "color 0.2s",
                            display: "block",
                            width: "100%",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "rgb(75, 85, 99)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "rgb(107, 114, 128)")
                          }
                          title={`Click to view device history: ${device.deviceTag}`}
                        >
                          <TruncatedText
                            text={device.deviceTag}
                            maxLength={18}
                            style={{ cursor: "pointer" }}
                          />
                        </span>
                      </div>
                      <div
                        style={{
                          flex: "0 0 100px",
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                          overflow: "hidden",
                        }}
                      >
                        <TruncatedText
                          text={device.deviceType}
                          maxLength={12}
                        />
                      </div>
                      <div
                        style={{
                          flex: "0 0 100px",
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                          overflow: "hidden",
                        }}
                      >
                        <TruncatedText text={device.brand} maxLength={12} />
                      </div>
                      <div
                        style={{
                          flex: "0 0 120px",
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                          overflow: "hidden",
                        }}
                      >
                        <TruncatedText text={device.model} maxLength={14} />
                      </div>
                      <div
                        style={{
                          flex: "0 0 100px",
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                          overflow: "hidden",
                        }}
                      >
                        <TruncatedText
                          text={device.client || "-"}
                          maxLength={12}
                        />
                      </div>
                      <div
                        style={{
                          flex: "0 0 100px",
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "inline-block",
                            background: getConditionColor(device.condition),
                            color: getConditionTextColor(device.condition),
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "600",
                            textAlign: "center",
                            minWidth: "70px",
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                          }}
                        >
                          <TruncatedText
                            text={device.condition}
                            maxLength={12}
                          />
                        </div>
                      </div>
                      <div
                        style={{
                          flex: "1 1 auto",
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                          overflow: "hidden",
                        }}
                      >
                        <TruncatedText text={device.remarks} maxLength={50} />
                      </div>
                      <div
                        style={{
                          flex: "0 0 140px",
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                        }}
                      >
                        {device.acquisitionDate ? (
                          formatDateToMMDDYYYY(device.acquisitionDate)
                        ) : (
                          <span
                            style={{ color: "#9ca3af", fontStyle: "italic" }}
                          >
                            Not recorded
                          </span>
                        )}
                      </div>
                      <div style={{ flex: "0 0 120px", padding: "12px 16px" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "none",
                              outline: "none",
                              borderRadius: 6,
                              background: "transparent",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              padding: "8px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#3b82f6";
                              e.currentTarget.style.transform = "scale(1.1)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(59, 130, 246, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(device);
                            }}
                            title="Edit"
                          >
                            <svg
                              width="16"
                              height="16"
                              fill="none"
                              stroke="#6b7280"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              viewBox="0 0 24 24"
                              style={{
                                transition: "stroke 0.2s ease",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.stroke = "#ffffff")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.stroke = "#6b7280")
                              }
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                          </button>
                          <button
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "none",
                              outline: "none",
                              borderRadius: 6,
                              background: "transparent",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              padding: "8px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#ef4444";
                              e.currentTarget.style.transform = "scale(1.1)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(239, 68, 68, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(device.id);
                            }}
                            title="Delete"
                          >
                            <svg
                              width="16"
                              height="16"
                              fill="none"
                              stroke="#6b7280"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              viewBox="0 0 24 24"
                              style={{
                                transition: "stroke 0.2s ease",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.stroke = "#ffffff")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.stroke = "#6b7280")
                              }
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Fixed Pagination Footer */}
          {(() => {
            const totalPages = Math.ceil(
              filteredDevices.length / devicesPerPage
            );
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
                  padding: "12px 20px", // Reduced padding
                  background: "rgb(255, 255, 255)",
                  borderRadius: "0",
                  boxShadow: "none",
                  border: "none",
                  borderTop: "1px solid #e5e7eb",
                  position: "sticky",
                  bottom: "0",
                  zIndex: "10",
                  flexShrink: 0,
                  marginTop: "0",
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
                    Showing {startIndex} - {endIndex} of{" "}
                    {filteredDevices.length} devices
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
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
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </div>
                </div>

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
              </div>
            );
          })()}
        </div>
      )}

      {/* Assign Modal */}
      {assignModalOpen && assigningDevice && (
        <div style={styles.modalOverlay}>
          <div
            style={{
              ...styles.modalContent,
              minWidth: 420,
              maxWidth: 480,
              padding: 24,
            }}
          >
            {assignModalStep === 1 && (
              <>
                <h4 style={styles.modalTitle}>
                  Assign Device: {assigningDevice.deviceTag}
                </h4>
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: 8,
                    fontSize: 15,
                    background: "#f8fafc",
                    color: "#1f2937",
                    marginBottom: 16,
                    boxSizing: "border-box",
                    outline: "none",
                    transition: "border-color 0.2s, background 0.2s",
                    fontFamily:
                      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#2563eb";
                    e.target.style.background = "#fff";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#cbd5e1";
                    e.target.style.background = "#f8fafc";
                  }}
                />
                <div
                  style={{
                    maxHeight: 200,
                    overflowY: "auto",
                    padding: 0,
                    margin: 0,
                    width: "100%",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    background: "#f9fafb",
                    marginBottom: 16,
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    WebkitScrollbar: { display: "none" },
                  }}
                >
                  {employees
                    .filter((emp) =>
                      emp.fullName
                        .toLowerCase()
                        .includes(assignSearch.toLowerCase())
                    )
                    .map((emp) => (
                      <div key={emp.id} style={{ width: "100%" }}>
                        <button
                          style={{
                            width: "100%",
                            background: "#fff",
                            color: "#374151",
                            border: "none",
                            borderBottom: "1px solid #e5e7eb",
                            fontWeight: 500,
                            fontSize: 15,
                            padding: "12px 16px",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                            fontFamily:
                              "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = "#f3f4f6";
                            e.target.style.color = "#2563eb";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = "#fff";
                            e.target.style.color = "#374151";
                          }}
                          onClick={() => {
                            setSelectedAssignEmployee(emp);
                            setAssignModalStep(2);
                          }}
                        >
                          {emp.fullName}
                        </button>
                      </div>
                    ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                  }}
                >
                  <button
                    onClick={closeAssignModal}
                    style={styles.inventoryModalButtonSecondary}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {assignModalStep === 2 && selectedAssignEmployee && (
              <>
                <h4 style={styles.modalTitle}>
                  Asset Accountability Form Options for:{" "}
                  <span style={{ color: "#2563eb" }}>
                    {selectedAssignEmployee.fullName}
                  </span>
                </h4>
                <div
                  style={{
                    ...styles.modalSection,
                    background: "#f8fafc",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      ...styles.modalLabel,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 12,
                    }}
                  >
                    New Issue:
                  </div>
                  <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: 14,
                        color: "#475569",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        name="newIssueNew"
                        checked={assignModalChecks.newIssueNew}
                        onChange={handleAssignModalCheckbox}
                        style={{
                          ...styles.modalCheckbox,
                          accentColor: "#2563eb",
                          marginRight: 8,
                        }}
                      />{" "}
                      Newly Purchased
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: 14,
                        color: "#475569",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        name="newIssueStock"
                        checked={assignModalChecks.newIssueStock}
                        onChange={handleAssignModalCheckbox}
                        style={{
                          ...styles.modalCheckbox,
                          accentColor: "#2563eb",
                          marginRight: 8,
                        }}
                      />{" "}
                      Stock
                    </label>
                  </div>
                  <div
                    style={{
                      ...styles.modalLabel,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 12,
                    }}
                  >
                    Work From Home/Borrowed:
                  </div>
                  <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: 14,
                        color: "#475569",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        name="wfhNew"
                        checked={assignModalChecks.wfhNew}
                        onChange={handleAssignModalCheckbox}
                        style={{
                          ...styles.modalCheckbox,
                          accentColor: "#2563eb",
                          marginRight: 8,
                        }}
                      />{" "}
                      Newly Purchased
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: 14,
                        color: "#475569",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        name="wfhStock"
                        checked={assignModalChecks.wfhStock}
                        onChange={handleAssignModalCheckbox}
                        style={{
                          ...styles.modalCheckbox,
                          accentColor: "#2563eb",
                          marginRight: 8,
                        }}
                      />{" "}
                      Stock
                    </label>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#dc2626",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        name="temporaryDeploy"
                        checked={assignModalChecks.temporaryDeploy}
                        onChange={handleAssignModalCheckbox}
                        style={{
                          ...styles.modalCheckbox,
                          accentColor: "#dc2626",
                          marginRight: 8,
                        }}
                      />{" "}
                      Temporary Deploy
                    </label>
                  </div>
                </div>
                {!assignModalShowGenerate && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 12,
                      width: "100%",
                    }}
                  >
                    <button
                      style={styles.inventoryModalButton}
                      onClick={handleAssignModalNext}
                    >
                      Next
                    </button>
                    <button
                      onClick={closeAssignModal}
                      style={styles.inventoryModalButtonSecondary}
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {assignModalShowGenerate && (
                  <>
                    <div style={{ margin: "18px 0", width: "100%" }}>
                      {assignModalGenerating && (
                        <div style={{ marginBottom: 12, width: "100%" }}>
                          <div
                            style={{
                              width: "100%",
                              background: "#e2e8f0",
                              borderRadius: 8,
                              height: 8,
                              marginBottom: 8,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${assignModalProgress}%`,
                                background: "#2563eb",
                                height: 8,
                                borderRadius: 8,
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              textAlign: "center",
                              color: "#2563eb",
                              fontWeight: 600,
                              fontSize: 14,
                            }}
                          >
                            Generating:{" "}
                            {assignModalProgress < 100
                              ? `${assignModalProgress}%`
                              : "Complete"}
                          </div>
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 12,
                          width: "100%",
                        }}
                      >
                        {!assignModalGenerating && !assignModalDocxBlob && (
                          <button
                            style={{
                              ...styles.inventoryModalButton,
                              background: "#22c55e",
                              boxShadow: "0 2px 4px rgba(34, 197, 94, 0.2)",
                            }}
                            onClick={handleAssignModalGenerateDocx}
                          >
                            Generate Asset Accountability Form
                          </button>
                        )}
                        {assignModalDocxBlob && (
                          <button
                            style={{
                              ...styles.inventoryModalButton,
                              background: "#2563eb",
                              boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
                            }}
                            onClick={handleDownloadAndAssign}
                          >
                            Download DOCX
                          </button>
                        )}
                        <button
                          onClick={closeAssignModal}
                          style={styles.inventoryModalButtonSecondary}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* New Acquisitions Modal */}
      {showNewAcqModal && (
        <div style={styles.modalOverlay}>
          <div
            className="new-acquisitions-modal"
            style={styles.inventoryModalContent}
          >
            {!showManualSerialPanel ? (
              <>
                <h3 style={styles.inventoryModalTitle}>
                  New Acquisitions (Bulk Add)
                </h3>

                {/* Tab Navigation */}
                <div style={{ width: "100%", marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 2,
                        flex: 1,
                        overflowX: "auto",
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                        WebkitScrollbar: { display: "none" },
                        minWidth: 0,
                      }}
                    >
                      {newAcqTabs.map((tab, index) => (
                        <div
                          key={tab.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          <button
                            onClick={() => switchTab(tab.id)}
                            title={
                              newAcqTabs.length > 6 ? tab.label : undefined
                            }
                            style={{
                              ...styles.tabButton,
                              background:
                                tab.id === activeTabId ? "#2563eb" : "#f1f5f9",
                              color:
                                tab.id === activeTabId ? "#fff" : "#64748b",
                              borderBottomLeftRadius:
                                tab.id === activeTabId ? 0 : 6,
                              borderBottomRightRadius:
                                tab.id === activeTabId ? 0 : 6,
                              // Responsive sizing based on number of tabs
                              minWidth: Math.max(
                                80,
                                Math.min(120, 480 / newAcqTabs.length - 10)
                              ),
                              maxWidth: newAcqTabs.length > 4 ? 100 : 120,
                              fontSize: newAcqTabs.length > 6 ? 11 : 13,
                              padding:
                                newAcqTabs.length > 6 ? "6px 8px" : "8px 12px",
                            }}
                          >
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                              }}
                            >
                              {newAcqTabs.length > 6
                                ? `T${index + 1}`
                                : tab.label}
                            </span>
                            {newAcqTabs.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeTab(tab.id);
                                }}
                                style={{
                                  marginLeft: 4,
                                  background: "none",
                                  border: "none",
                                  color:
                                    tab.id === activeTabId ? "#fff" : "#64748b",
                                  cursor: "pointer",
                                  fontSize: 14,
                                  padding: 0,
                                  width: 16,
                                  height: 16,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 2,
                                  flexShrink: 0,
                                }}
                              >
                                ×
                              </button>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addNewTab}
                      style={{
                        ...styles.addTabButton,
                        marginLeft: 8,
                        flexShrink: 0,
                      }}
                      title="Add another device type"
                    >
                      +
                    </button>
                  </div>

                  {/* Tab Content Border */}
                  <div
                    style={{
                      width: "100%",
                      height: 2,
                      background: "#2563eb",
                      borderRadius: "0 6px 0 0",
                      marginBottom: 16,
                    }}
                  />
                </div>

                {/* Current Tab Content */}
                {(() => {
                  const currentData = getCurrentTabData();
                  const currentTab = newAcqTabs.find(
                    (tab) => tab.id === activeTabId
                  );
                  return (
                    <>
                      {/* Tab Info Banner */}
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 6,
                          padding: "8px 12px",
                          marginBottom: 12,
                          fontSize: 13,
                          color: "#64748b",
                        }}
                      >
                        <strong>Configuring:</strong> {currentTab?.label}
                        {currentData.deviceType && (
                          <span style={{ color: "#2563eb", marginLeft: 8 }}>
                            → {currentData.deviceType}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          width: "100%",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            ...styles.inventoryInputGroup,
                            flex: 1,
                            marginBottom: 0,
                          }}
                        >
                          <label style={styles.inventoryLabel}>
                            Device Type:
                          </label>
                          <select
                            name="deviceType"
                            value={currentData.deviceType}
                            onChange={handleNewAcqInput}
                            style={styles.inventoryInput}
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
                            ...styles.inventoryInputGroup,
                            flex: 1,
                            marginBottom: 0,
                          }}
                        >
                          <label style={styles.inventoryLabel}>Brand:</label>
                          <input
                            name="brand"
                            value={currentData.brand}
                            onChange={handleNewAcqInput}
                            style={styles.inventoryInput}
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          width: "100%",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            ...styles.inventoryInputGroup,
                            flex: 1,
                            marginBottom: 0,
                          }}
                        >
                          <label style={styles.inventoryLabel}>Model:</label>
                          <input
                            name="model"
                            value={currentData.model}
                            onChange={handleNewAcqInput}
                            style={styles.inventoryInput}
                          />
                        </div>

                        <div
                          style={{
                            ...styles.inventoryInputGroup,
                            flex: 1,
                            marginBottom: 0,
                          }}
                        >
                          <label style={styles.inventoryLabel}>
                            Condition:
                          </label>
                          <select
                            name="condition"
                            value={currentData.condition}
                            onChange={handleNewAcqInput}
                            style={styles.inventoryInput}
                          >
                            <option value="">Select Condition</option>
                            {conditions.map((cond) => (
                              <option key={cond} value={cond}>
                                {cond}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div
                        style={{
                          ...styles.inventoryInputGroup,
                          marginBottom: 10,
                        }}
                      >
                        <label style={styles.inventoryLabel}>Remarks:</label>
                        <input
                          name="remarks"
                          value={currentData.remarks}
                          onChange={handleNewAcqInput}
                          style={styles.inventoryInput}
                        />
                      </div>
                      <div
                        style={{
                          ...styles.inventoryInputGroup,
                          marginBottom: 10,
                        }}
                      >
                        <label style={styles.inventoryLabel}>
                          Acquisition Date:
                        </label>
                        <input
                          name="acquisitionDate"
                          type="date"
                          value={
                            formatDateToYYYYMMDD(currentData.acquisitionDate) ||
                            ""
                          }
                          onChange={handleNewAcqInput}
                          style={{
                            ...styles.inventoryInput,
                            borderColor: !currentData.acquisitionDate
                              ? "#f59e0b"
                              : styles.inventoryInput.borderColor,
                          }}
                          title="Select the date when these devices were acquired"
                        />
                        {!currentData.acquisitionDate && (
                          <span
                            style={{
                              color: "#f59e0b",
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
                            Acquisition date is recommended for proper record
                            keeping
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          ...styles.inventoryInputGroup,
                          marginBottom: 10,
                        }}
                      >
                        <label style={styles.inventoryLabel}>Supplier:</label>
                        <input
                          name="supplier"
                          value={currentData.supplier}
                          onChange={handleNewAcqInput}
                          style={styles.inventoryInput}
                          placeholder="Enter supplier name"
                        />
                      </div>
                      <div
                        style={{
                          ...styles.inventoryInputGroup,
                          marginBottom: 10,
                        }}
                      >
                        <label style={styles.inventoryLabel}>Client:</label>
                        <input
                          name="client"
                          value={currentData.client}
                          onChange={handleNewAcqInput}
                          style={styles.inventoryInput}
                          placeholder="Enter client name"
                        />
                      </div>

                      {/* Manual Serial Assignment Option */}
                      <div
                        style={{
                          ...styles.inventoryInputGroup,
                          marginBottom: 10,
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            fontWeight: 500,
                            fontSize: 13,
                            color: "#2563eb",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={currentData.useManualSerial || false}
                            onChange={handleManualSerialToggle}
                            style={{ marginRight: 6, accentColor: "#2563eb" }}
                          />
                          Assign Serial Manually for this Device Type
                        </label>
                      </div>

                      {currentData.useManualSerial ? (
                        <div
                          style={{
                            ...styles.inventoryInputGroup,
                            marginBottom: 10,
                          }}
                        >
                          <label style={styles.inventoryLabel}>Quantity:</label>
                          <input
                            type="number"
                            value={currentData.manualQuantity || 1}
                            onChange={handleQuantityChange}
                            style={styles.inventoryInput}
                            min="1"
                            max="99"
                            maxLength="2"
                            placeholder="Enter quantity"
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            ...styles.inventoryInputGroup,
                            marginBottom: 10,
                          }}
                        >
                          <label style={styles.inventoryLabel}>
                            Quantity (How many devices to add):
                          </label>
                          <input
                            name="quantity"
                            type="number"
                            value={currentData.quantity || 1}
                            onChange={handleNewAcqInput}
                            style={styles.inventoryInput}
                            min="1"
                            max="99"
                            maxLength="2"
                            placeholder="Enter quantity (e.g., 10)"
                          />
                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              marginTop: 4,
                            }}
                          >
                            TAGs will be automatically generated starting from
                            the next available number
                          </div>

                          {/* TAG Preview Section */}
                          {currentData.deviceType && currentData.quantity && (
                            <div
                              style={{
                                marginTop: 8,
                                padding: 8,
                                backgroundColor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: 4,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "#374151",
                                  marginBottom: 4,
                                }}
                              >
                                Preview TAGs to be generated:
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#64748b",
                                  fontFamily: "monospace",
                                }}
                              >
                                {(() => {
                                  const typeObj = deviceTypes.find(
                                    (t) => t.label === currentData.deviceType
                                  );
                                  if (typeObj) {
                                    const prefix = `JOII${typeObj.code}`;
                                    const qty =
                                      parseInt(currentData.quantity) || 1;
                                    const nextTag =
                                      currentData.nextAvailableTag || 1;
                                    const tags = [];
                                    for (let i = 0; i < Math.min(qty, 5); i++) {
                                      tags.push(
                                        `${prefix}${String(
                                          nextTag + i
                                        ).padStart(4, "0")}`
                                      );
                                    }
                                    if (qty > 5) {
                                      tags.push(`... and ${qty - 5} more`);
                                    }
                                    return tags.join(", ");
                                  }
                                  return "Select device type to preview TAGs";
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}

                {newAcqError && (
                  <div
                    style={{
                      background: "#fef2f2",
                      color: "#dc2626",
                      padding: "8px 12px",
                      borderRadius: 6,
                      marginBottom: 12,
                      border: "1px solid #fecaca",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      style={{ flexShrink: 0 }}
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    <span>{newAcqError}</span>
                  </div>
                )}

                {/* Progress bar */}
                {newAcqLoading && (
                  <div style={{ width: "100%", marginBottom: 12 }}>
                    <div
                      style={{
                        width: "100%",
                        background: "#e9eef3",
                        borderRadius: 8,
                        height: 8,
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          width: `${progress}%`,
                          background: "#2563eb",
                          height: 8,
                          borderRadius: 8,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        color: "#2563eb",
                        fontWeight: 500,
                        fontSize: 12,
                      }}
                    >
                      {progress < 40
                        ? "Preparing devices..."
                        : progress < 70
                        ? "Adding to database..."
                        : progress < 100
                        ? "Generating document..."
                        : "Complete!"}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    justifyContent: "center",
                    gap: 8,
                    width: "100%",
                  }}
                >
                  <button
                    onClick={handleNewAcqSubmit}
                    disabled={newAcqLoading}
                    style={{
                      ...styles.inventoryModalButton,
                      opacity: newAcqLoading ? 0.6 : 1,
                    }}
                  >
                    {newAcqLoading
                      ? "Adding..."
                      : newAcqTabs.some((tab) => tab.data.useManualSerial)
                      ? "Proceed to Serial Entry"
                      : "Add Devices"}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewAcqModal(false);
                      setNewAcqTabs([
                        {
                          id: 1,
                          label: "Device Type 1",
                          data: {
                            deviceType: "",
                            brand: "",
                            model: "",
                            condition: "",
                            remarks: "",
                            acquisitionDate: "",
                            quantity: 1,
                            supplier: "",
                            client: "",
                            useManualSerial: false,
                            manualQuantity: 1,
                            manualSerials: [],
                          },
                        },
                      ]);
                      setActiveTabId(1);
                      setNextTabId(2);
                      setShowManualSerialPanel(false);
                      setImportTexts({}); // Clear all import texts
                    }}
                    style={styles.inventoryModalButtonSecondary}
                    disabled={newAcqLoading}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              /* Manual Serial Entry Panel */
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                    style={{ flexShrink: 0 }}
                    aria-hidden="true"
                  >
                    <path d="M9 12l2 2 4-4" />
                    <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                    <path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                    <path d="M12 3c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                    <path d="M12 21c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                  </svg>
                  <h3
                    style={{
                      ...styles.inventoryModalTitle,
                      marginBottom: 0,
                      color: "#2563eb",
                    }}
                  >
                    Enter Serial Numbers (
                    {
                      newAcqTabs.filter((tab) => tab.data.useManualSerial)
                        .length
                    }{" "}
                    Device Type
                    {newAcqTabs.filter((tab) => tab.data.useManualSerial)
                      .length > 1
                      ? "s"
                      : ""}
                    )
                  </h3>
                </div>

                <div
                  style={{
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    color: "#1d4ed8",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Manually assign serial numbers for each device type below
                </div>

                {(() => {
                  const manualTabs = newAcqTabs.filter(
                    (tab) => tab.data.useManualSerial
                  );
                  const currentManualTab =
                    manualTabs.find((tab) => tab.id === activeManualTabId) ||
                    manualTabs[0];

                  return (
                    <>
                      {manualTabs.length > 1 && (
                        <div style={{ width: "100%", marginBottom: 16 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 2,
                                flex: 1,
                                overflowX: "auto",
                                scrollbarWidth: "none",
                                msOverflowStyle: "none",
                                WebkitScrollbar: { display: "none" },
                                minWidth: 0,
                              }}
                            >
                              {manualTabs.map((tab, index) => (
                                <div
                                  key={tab.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <button
                                    onClick={() => {
                                      setActiveManualTabId(tab.id);
                                    }}
                                    style={{
                                      ...styles.tabButton,
                                      background:
                                        tab.id === activeManualTabId
                                          ? "#2563eb"
                                          : "#f8fafc",
                                      color:
                                        tab.id === activeManualTabId
                                          ? "#fff"
                                          : "#64748b",
                                      borderTopLeftRadius: 6,
                                      borderTopRightRadius: 6,
                                      borderBottomLeftRadius:
                                        tab.id === activeManualTabId ? 0 : 6,
                                      borderBottomRightRadius:
                                        tab.id === activeManualTabId ? 0 : 6,
                                      fontWeight:
                                        tab.id === activeManualTabId
                                          ? 600
                                          : 400,
                                      transition: "all 0.2s",
                                      fontFamily:
                                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                                      minWidth: Math.max(
                                        80,
                                        Math.min(
                                          120,
                                          480 / manualTabs.length - 10
                                        )
                                      ),
                                      maxWidth:
                                        manualTabs.length > 4 ? 100 : 120,
                                      fontSize: manualTabs.length > 6 ? 11 : 13,
                                      padding:
                                        manualTabs.length > 6
                                          ? "6px 8px"
                                          : "8px 12px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        flex: 1,
                                      }}
                                    >
                                      {manualTabs.length > 6
                                        ? `T${index + 1}`
                                        : tab.data.deviceType || tab.label}
                                    </span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Tab Content Border */}
                          <div
                            style={{
                              width: "100%",
                              height: 2,
                              background: "#22c55e",
                              borderRadius: "0 4px 0 0",
                              marginBottom: 12,
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      )}

                      {currentManualTab && (
                        <>
                          <div
                            style={{
                              marginBottom: 12,
                              padding: 10,
                              background: "#f1f5f9",
                              borderRadius: 6,
                              border: "1px solid #cbd5e1",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                color: "#64748b",
                                marginBottom: 4,
                              }}
                            >
                              <strong>Device Details:</strong>
                            </div>
                            <div style={{ fontSize: 12, color: "#475569" }}>
                              Type: {currentManualTab.data.deviceType} | Brand:{" "}
                              {currentManualTab.data.brand} | Model:{" "}
                              {currentManualTab.data.model || "N/A"} |
                              Condition: {currentManualTab.data.condition} |
                              Qty:{" "}
                              {currentManualTab.data.manualSerials?.length || 0}
                            </div>
                          </div>

                          {/* Import Section */}
                          <div
                            style={{
                              width: "100%",
                              marginBottom: 12,
                              padding: 10,
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: 6,
                              boxSizing: "border-box",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#374151",
                                marginBottom: 6,
                              }}
                            >
                              Quick Import Serial Numbers
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#64748b",
                                marginBottom: 6,
                              }}
                            >
                              Paste serial numbers below (one per line) and
                              click "Import Serials":
                            </div>
                            <textarea
                              style={{
                                ...styles.inventoryInput,
                                width: "100%",
                                height: 70,
                                padding: "6px 8px",
                                border: "1.5px solid #cbd5e1",
                                borderRadius: 4,
                                fontSize: 13,
                                fontFamily: "Maax, monospace",
                                resize: "vertical",
                                boxSizing: "border-box",
                                marginBottom: 6,
                                outline: "none",
                                transition:
                                  "border-color 0.2s, box-shadow 0.2s",
                                backgroundColor: "#fff",
                              }}
                              placeholder="Serial1&#10;Serial2&#10;Serial3&#10;..."
                              value={importTexts[currentManualTab.id] || ""}
                              onChange={(e) => {
                                const importText = e.target.value;
                                // Only update the import text state, don't auto-import
                                setImportTexts((prev) => ({
                                  ...prev,
                                  [currentManualTab.id]: importText,
                                }));
                              }}
                            />
                            <button
                              onClick={() => {
                                const importText =
                                  importTexts[currentManualTab.id];
                                if (importText && importText.trim()) {
                                  handleImportSerials(
                                    currentManualTab.id,
                                    importText
                                  );
                                }
                              }}
                              style={{
                                ...styles.inventoryModalButton,
                                background: "#22c55e",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                padding: "8px 16px",
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer",
                                marginBottom: 8,
                                marginRight: 8,
                                transition: "background 0.2s",
                                fontFamily:
                                  "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                                opacity:
                                  importTexts[currentManualTab.id] &&
                                  importTexts[currentManualTab.id].trim()
                                    ? 1
                                    : 0.6,
                              }}
                              disabled={
                                !(
                                  importTexts[currentManualTab.id] &&
                                  importTexts[currentManualTab.id].trim()
                                )
                              }
                            >
                              Import Serials
                              {importTexts[currentManualTab.id] &&
                                importTexts[currentManualTab.id].trim() &&
                                ` (${
                                  importTexts[currentManualTab.id]
                                    .split("\n")
                                    .filter((line) => line.trim()).length
                                })`}
                            </button>
                            <button
                              onClick={() => {
                                setImportTexts((prev) => ({
                                  ...prev,
                                  [currentManualTab.id]: "",
                                }));
                              }}
                              style={{
                                ...styles.inventoryModalButton,
                                background: "#6b7280",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                padding: "8px 16px",
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer",
                                marginBottom: 8,
                                transition: "background 0.2s",
                                fontFamily:
                                  "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                              }}
                            >
                              Clear
                            </button>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                                fontStyle: "italic",
                              }}
                            >
                              Tip: Copy from Excel/Notepad, paste here, then
                              click "Import Serials" to fill all serial fields
                            </div>
                          </div>

                          <div
                            style={{
                              width: "100%",
                              maxHeight: 300,
                              overflowY: "auto",
                              border: "1px solid #e2e8f0",
                              borderRadius: 8,
                              padding: 12,
                              background: "#fafbfc",
                              boxSizing: "border-box",
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: 8,
                                width: "100%",
                                justifyContent: "start",
                              }}
                            >
                              {currentManualTab.data.manualSerials?.map(
                                (item, index) => (
                                  <div
                                    key={item.id}
                                    style={{
                                      background: "#fff",
                                      padding: 8,
                                      borderRadius: 6,
                                      border: "1px solid #e2e8f0",
                                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                      width: "100%",
                                      boxSizing: "border-box",
                                    }}
                                  >
                                    <label
                                      style={{
                                        ...styles.inventoryLabel,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "#374151",
                                        marginBottom: 4,
                                        display: "block",
                                      }}
                                    >
                                      Device #{index + 1}
                                    </label>
                                    <input
                                      type="text"
                                      value={item.serial || ""}
                                      onChange={(e) =>
                                        handleManualSerialChange(
                                          currentManualTab.id,
                                          index,
                                          e.target.value
                                        )
                                      }
                                      style={{
                                        ...styles.inventoryInput,
                                        width: "100%",
                                        padding: "6px 8px",
                                        fontSize: 13,
                                        height: "32px",
                                        backgroundColor: "#fff",
                                        border: "1.5px solid #cbd5e1",
                                        borderRadius: 4,
                                        outline: "none",
                                        transition:
                                          "border-color 0.2s, box-shadow 0.2s",
                                        boxSizing: "border-box",
                                        fontFamily:
                                          "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                                      }}
                                      placeholder={`Enter serial number`}
                                      maxLength={64}
                                    />
                                  </div>
                                )
                              ) || []}
                            </div>
                          </div>
                        </>
                      )}

                      {newAcqError && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: "8px 12px",
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: 6,
                            color: "#dc2626",
                            fontSize: 13,
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                          </svg>
                          <span>{newAcqError}</span>
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: 12,
                          display: "flex",
                          justifyContent: "center",
                          gap: 8,
                          width: "100%",
                          padding: "0 4px",
                          boxSizing: "border-box",
                        }}
                      >
                        <button
                          onClick={handleManualSerialSubmit}
                          disabled={newAcqLoading}
                          style={{
                            ...styles.inventoryModalButton,
                            opacity: newAcqLoading ? 0.6 : 1,
                            background: "#22c55e",
                            padding: "8px 16px",
                            fontSize: 13,
                          }}
                        >
                          {newAcqLoading
                            ? "Adding Devices..."
                            : "Add All Devices"}
                        </button>
                        <button
                          onClick={() => {
                            setShowManualSerialPanel(false);
                            setImportTexts({}); // Clear import texts when going back
                          }}
                          style={{
                            ...styles.inventoryModalButtonSecondary,
                            padding: "8px 16px",
                            fontSize: 13,
                          }}
                          disabled={newAcqLoading}
                        >
                          Back to Form
                        </button>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}

      {/* Device History Modal */}
      {showDeviceHistory && selectedDeviceForHistory && (
        <DeviceHistory
          deviceTag={selectedDeviceForHistory.deviceTag}
          deviceId={selectedDeviceForHistory.id}
          onClose={handleCloseDeviceHistory}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deviceToDelete && (
        <DeleteConfirmationModal
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          deviceTag={deviceToDelete.deviceTag}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
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
            zIndex: 1000,
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
              fontFamily: "Maax, sans-serif",
            }}
          >
            <h2
              style={{
                color: "#e11d48",
                marginBottom: 12,
                margin: "0 0 18px 0",
                fontWeight: 700,
                letterSpacing: 1,
                fontSize: 22,
                textAlign: "center",
              }}
            >
              Confirm Bulk Delete
            </h2>
            <p
              style={{
                margin: "0 0 16px 0",
                color: "#374151",
                fontSize: 16,
                textAlign: "center",
              }}
            >
              Are you sure you want to delete {selectedIds.length} selected
              device(s)?
            </p>
            <p
              style={{
                color: "#666",
                fontSize: "14px",
                marginTop: 8,
                textAlign: "center",
              }}
            >
              This action will be reversible for 5 seconds using the undo
              notification.
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
                onClick={confirmBulkDelete}
                style={{
                  background: "#e11d48",
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
                  boxShadow: "0 2px 8px rgba(225,29,72,0.10)",
                  outline: "none",
                  opacity: 1,
                  transform: "translateY(0) scale(1)",
                  fontFamily: "Maax, sans-serif",
                }}
              >
                Delete
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
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
                  fontFamily: "Maax, sans-serif",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;

const styles = {
  pageContainer: {
    padding: "0", // Remove padding for fixed layout
    maxWidth: "100%",
    background: "transparent", // Let parent handle background
    height: "100%", // Fill available height
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden", // Prevent page-level scrolling
  },
  headerBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16, // Reduced margin for fixed layout
    padding: "16px 24px", // Added consistent padding
    flexShrink: 0, // Prevent header from shrinking
    background: "#fff", // Add background for visual separation
    borderBottom: "1px solid #e5e7eb",
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#222e3a",
    letterSpacing: 1,
    margin: 0,
  },
  headerBarGoogle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 24,
    padding: "0 24px",
  },
  googleTitle: {
    color: "#233037",
    fontWeight: 800,
    fontSize: 28,
    marginBottom: 18,
    letterSpacing: 0,
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  googleSearchBar: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    borderRadius: 24,
    boxShadow: "0 2px 8px rgba(68,95,109,0.10)",
    border: "1.5px solid #e0e7ef",
    padding: "2px 16px 2px 12px",
    width: 320,
    transition: "box-shadow  0.2s, border 0.2s",
    marginBottom: 0,
  },
  googleSearchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 17,
    color: "#233037",
    padding: "10px 0 10px 8px",
    width: "100%",
    fontWeight: 500,
  },
  buttonBar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    padding: "0 24px",
  },
  button: {
    background: "#70C1B3",
    color: "#233037",
    border: "none",
    borderRadius: 8,
    padding: "10px 22px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    transition: "background 0.2s, box-shadow 0.2s",
    outline: "none",
    margin: 0,
  },
  buttonDisabled: {
    background: "#e9eef3",
    color: "#b0b8c1",
    cursor: "not-allowed",
  },
  tableContainer: {
    marginTop: 0,
    overflowX: "auto",
    overflowY: "auto", // Allow vertical scrolling
    padding: "0",
    flex: 1, // Take remaining space
    minHeight: 0, // Allow shrinking
    background: "#fff",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    WebkitScrollbar: { display: "none" },
  },
  table: {
    width: "100%",
    minWidth: 900,
    borderCollapse: "collapse",
    borderSpacing: 0,
    background: "#fff",
    overflow: "hidden",
    tableLayout: "auto",
  },
  th: {
    padding: "12px 16px",
    background: "rgb(255, 255, 255)",
    color: "rgb(55, 65, 81)",
    fontWeight: 500,
    fontSize: 12,
    border: "none",
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    position: "sticky",
    top: 0,
    zIndex: 5,
  },
  td: {
    padding: "12px 16px",
    color: "#374151",
    fontSize: 14,
    borderBottom: "1px solid #e5e7eb",
    background: "#fff",
    verticalAlign: "middle",
    wordBreak: "break-word",
  },
  iconButton: {
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: 18,
    padding: 6,
    borderRadius: 6,
    cursor: "pointer",
    marginRight: 4,
    transition: "background 0.2s, color 0.2s",
    outline: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonHover: {
    background: "#e0e7ef",
    color: "#2563eb",
  },
  deletingText: {
    marginLeft: 16,
    color: "#e57373",
    fontWeight: 500,
    fontSize: 15,
  },
  modalOverlay: {
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
  },
  modalContent: {
    background: "#fff",
    padding: 28,
    borderRadius: 14,
    minWidth: 260,
    maxWidth: 340,
    boxShadow: "0 6px 24px rgba(34,46,58,0.13)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    border: "1.5px solid #e5e7eb",
    transition: "box-shadow 0.2s",
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  inventoryModalContent: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    minWidth: 480,
    maxWidth: 520,
    width: "70vw",
    boxShadow: "0 6px 24px rgba(34,46,58,0.13)",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    position: "relative",
    border: "1.5px solid #e5e7eb",
    transition: "box-shadow 0.2s",
    maxHeight: "85vh",
    overflowY: "auto",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    WebkitScrollbar: { display: "none" },
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#2563eb",
    marginBottom: 16,
    letterSpacing: 0.5,
    textAlign: "center",
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  inventoryModalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#2563eb",
    marginBottom: 14,
    letterSpacing: 0.5,
    textAlign: "center",
    width: "100%",
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  inventoryInputGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 10,
    width: "100%",
    minWidth: 140,
  },
  inventoryLabel: {
    alignSelf: "flex-start",
    fontWeight: 500,
    color: "#222e3a",
    marginBottom: 3,
    fontSize: 13,
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  inventoryInput: {
    width: "100%",
    minWidth: 0,
    fontSize: 13,
    padding: "6px 8px",
    borderRadius: 5,
    border: "1.2px solid #cbd5e1",
    background: "#f1f5f9",
    height: "30px",
    boxSizing: "border-box",
    marginBottom: 0,
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  inventoryModalButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 20px",
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    transition: "background 0.2s, box-shadow 0.2s",
    outline: "none",
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  inventoryModalButtonSmall: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 7,
    padding: "7px 14px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    marginLeft: 4,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    transition: "background 0.2s, box-shadow 0.2s",
    outline: "none",
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  inventoryModalButtonSecondary: {
    background: "#e0e7ef",
    color: "#2563eb",
    border: "none",
    borderRadius: 8,
    padding: "9px 20px",
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    marginLeft: 4,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    transition: "background 0.2s, box-shadow 0.2s",
    outline: "none",
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  modalCheckbox: {
    accentColor: "#2563eb",
    width: 18,
    height: 18,
    marginRight: 8,
  },
  modalSection: {
    width: "100%",
    marginBottom: 14,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  modalLabel: {
    fontWeight: 500,
    color: "#222e3a",
    marginBottom: 5,
    fontSize: 15,
    textAlign: "left",
    width: "100%",
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  actionEditButton: {
    background: "transparent",
    border: "none",
    borderRadius: 4,
    padding: "6px",
    cursor: "pointer",
    transition: "background 0.18s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  actionEditButtonHover: {
    background: "#dbeafe",
  },
  actionDeleteButton: {
    background: "transparent",
    border: "none",
    borderRadius: 4,
    padding: "6px",
    cursor: "pointer",
    transition: "background 0.18s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  actionDeleteButtonHover: {
    background: "#fef2f2",
  },
  // Tab styles for the New Acquisitions modal
  tabButton: {
    border: "none",
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    borderRadius: "6px 6px 0 0",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    minWidth: 80,
    maxWidth: 120,
    justifyContent: "space-between",
    flexShrink: 0,
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  addTabButton: {
    background: "#f1f5f9",
    color: "#64748b",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    width: 32,
    height: 32,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
};
