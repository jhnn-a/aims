// === ASSETS PAGE MAIN COMPONENT ===
// This file handles the display and management of assigned assets (devices that are assigned to employees)
// Main features: View assigned devices, bulk reassign/unassign, search/filter, device history

// === IMPORTS ===
import React, { useEffect, useState } from "react";
import {
  getAllDevices,
  updateDevice,
  deleteDevice,
} from "../services/deviceService"; // Database operations for devices
import { getAllEmployees } from "../services/employeeService"; // Employee data operations
import { getAllClients } from "../services/clientService"; // Client data operations
import { logDeviceHistory } from "../services/deviceHistoryService"; // Device history tracking
import { useTheme } from "../context/ThemeContext"; // Theme context for dark mode
import LoadingSpinner, {
  TableLoadingSpinner,
} from "../components/LoadingSpinner"; // Loading indicators
import PizZip from "pizzip"; // For DOCX file generation
import Docxtemplater from "docxtemplater"; // For DOCX template processing
import { useSnackbar } from "../components/Snackbar"; // Success/error notifications
import DeviceHistory from "../components/DeviceHistory"; // Device history modal
import {
  TextFilter,
  DropdownFilter,
  DateFilter,
  useTableFilters,
} from "../components/TableHeaderFilters"; // Table filtering components
import {
  formatDateToYYYYMMDD,
  formatDateToMMDDYYYY,
} from "../pages/InventoryUtils"; // Date formatting utilities
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore"; // Firestore database operations
import { db } from "../utils/firebase"; // Firebase configuration
import { exportInventoryToExcel } from "../utils/exportInventoryToExcel"; // Excel export utility
import { useCurrentUser } from "../CurrentUserContext"; // Current user context
import { createUserLog, ACTION_TYPES } from "../services/userLogService"; // User logging service
import { deviceTypes } from "./InventoryConstants"; // Device types configuration

// === CONDITION STYLING FUNCTIONS ===
// Function to get background color based on device condition
const getConditionColor = (condition) => {
  const colorMap = {
    GOOD: "#007BFF", // Blue for good condition
    BRANDNEW: "#28A745", // Green for brand new
    DEFECTIVE: "#DC3545", // Red for defective
    "NEEDS REPAIR": "#FFC107", // Yellow for needs repair
    RETIRED: "#6C757D", // Gray for retired
  };
  return colorMap[condition] || "#6C757D"; // Default to gray for unknown conditions
};

// Function to get text color for better contrast on condition badges
const getConditionTextColor = (condition) => {
  // Yellow background needs dark text for better contrast, others use white text
  return condition === "NEEDS REPAIR" ? "#000" : "#fff";
};

// === CELL CONTENT UTILITY FUNCTION ===
// Utility function to render cell content with text wrapping and tooltips for long text
const renderCellWithTooltip = (content, maxLength = 20, onClick = null) => {
  if (!content) return <span>-</span>;

  const shouldTruncate = content.length > maxLength;
  const displayContent = shouldTruncate
    ? content.substring(0, maxLength) + "..."
    : content;

  return (
    <span
      className={shouldTruncate ? "assets-table-cell-tooltip" : ""}
      data-tooltip={shouldTruncate ? content : ""}
      style={{
        display: "block",
        lineHeight: "1.4",
        wordWrap: "break-word",
        wordBreak: "break-word",
        whiteSpace: "normal",
        cursor: onClick ? "pointer" : "default",
        transition: onClick ? "all 0.2s ease" : "none",
        textDecoration: onClick ? "underline" : "none",
        textDecorationColor: onClick ? "transparent" : "none",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.textDecorationColor = "#3b82f6";
          e.currentTarget.style.color = "#3b82f6";
          e.currentTarget.style.fontWeight = "500";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.textDecorationColor = "transparent";
          e.currentTarget.style.color = "";
          e.currentTarget.style.fontWeight = "";
        }
      }}
      title={onClick ? "Click to view device details and history" : undefined}
    >
      {displayContent}
    </span>
  );
};

// === SEARCHABLE DROPDOWN COMPONENT ===
// Reusable searchable dropdown for client selection
function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder = "Search and select client...",
  displayKey = "clientName",
  valueKey = "clientName",
  style = {},
}) {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = React.useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter((option) => {
    const searchValue = option[displayKey];
    return (
      searchValue &&
      String(searchValue).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputClick = () => {
    setIsOpen(!isOpen);
    setSearchTerm("");
  };

  const handleSelectOption = (option) => {
    onChange({ target: { name: "client", value: option[valueKey] } });
    setIsOpen(false);
    setSearchTerm("");
  };

  const dropdownStyles = {
    container: {
      position: "relative",
      width: "100%",
      ...style,
    },
    inputContainer: {
      position: "relative",
      width: "100%",
    },
    input: {
      width: "100%",
      fontSize: 13,
      padding: "8px 32px 8px 12px",
      borderRadius: 5,
      border: isDarkMode ? "1.2px solid #4b5563" : "1.2px solid #cbd5e1",
      background: isDarkMode ? "#374151" : "#f1f5f9",
      color: isDarkMode ? "#f3f4f6" : "#374151",
      height: "38px",
      boxSizing: "border-box",
      fontFamily:
        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      outline: "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
      cursor: "pointer",
    },
    dropdownArrow: {
      position: "absolute",
      right: "12px",
      top: "50%",
      transform: `translateY(-50%) ${
        isOpen ? "rotate(180deg)" : "rotate(0deg)"
      }`,
      transition: "transform 0.2s",
      pointerEvents: "none",
      fontSize: "12px",
      color: isDarkMode ? "#9ca3af" : "#6b7280",
    },
    dropdown: {
      position: "absolute",
      top: "calc(100% + 2px)",
      left: 0,
      right: 0,
      background: isDarkMode ? "#1f2937" : "#fff",
      border: isDarkMode ? "1px solid #4b5563" : "1px solid #cbd5e1",
      borderRadius: 5,
      maxHeight: "140px",
      overflowY: "auto",
      zIndex: 1000,
      boxShadow: isDarkMode
        ? "0 4px 12px rgba(0, 0, 0, 0.4)"
        : "0 4px 12px rgba(0, 0, 0, 0.15)",
      minWidth: "200px",
      scrollbarWidth: "thin",
      scrollbarColor: isDarkMode ? "#4b5563 #374151" : "#cbd5e1 #f8fafc",
    },
    searchInput: {
      width: "100%",
      padding: "8px 12px",
      border: "none",
      borderBottom: isDarkMode ? "1px solid #4b5563" : "1px solid #e2e8f0",
      outline: "none",
      fontSize: 13,
      fontFamily:
        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: isDarkMode ? "#1f2937" : "#f8fafc",
      color: isDarkMode ? "#f3f4f6" : "#374151",
      boxSizing: "border-box",
    },
    option: {
      padding: "10px 12px",
      cursor: "pointer",
      fontSize: 13,
      borderBottom: isDarkMode ? "1px solid #374151" : "1px solid #f1f5f9",
      fontFamily:
        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: "background-color 0.15s",
      background: isDarkMode ? "#1f2937" : "#fff",
      color: isDarkMode ? "#f3f4f6" : "#374151",
    },
    noResults: {
      padding: "10px 12px",
      color: isDarkMode ? "#9ca3af" : "#6b7280",
      fontStyle: "italic",
      fontSize: 13,
      fontFamily:
        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
  };

  return (
    <div ref={dropdownRef} style={dropdownStyles.container}>
      <div style={dropdownStyles.inputContainer}>
        <input
          type="text"
          value={value || ""}
          onClick={handleInputClick}
          placeholder={placeholder}
          style={dropdownStyles.input}
          readOnly
        />
        <span style={dropdownStyles.dropdownArrow}>▼</span>
      </div>

      {isOpen && (
        <div style={dropdownStyles.dropdown}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to search clients..."
            style={dropdownStyles.searchInput}
            autoFocus
          />
          {filteredOptions.length === 0 ? (
            <div style={dropdownStyles.noResults}>No clients found</div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={option.id || index}
                style={dropdownStyles.option}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = isDarkMode
                    ? "#4b5563"
                    : "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = isDarkMode
                    ? "#1f2937"
                    : "#fff";
                }}
                onClick={() => handleSelectOption(option)}
              >
                {option[displayKey]}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// === DEVICE FORM MODAL COMPONENT ===
// Modal component for adding/editing device information
// Features: Device type selection, tag generation, employee assignment, validation
function DeviceFormModal({
  data, // Device data object being edited/created
  onChange, // Function to handle form field changes
  onSave, // Function to save device data
  onCancel, // Function to close modal without saving
  onGenerateTag, // Function to generate automatic asset tags
  employees, // List of employees for assignment dropdown
  clients, // List of clients for device owner dropdown
  tagError, // Error message for tag validation
  saveError, // Error message for save operation
  isValid, // Boolean indicating if form data is valid
  useSerial, // Boolean for using serial number as tag
  setUseSerial, // Function to toggle serial number usage
  setTagError, // Function to set tag error messages
  onSerialToggle, // Function to handle serial number toggle
  editingDevice, // Boolean indicating if editing existing device
  deviceTypes, // Array of device types passed from parent component
  deviceForHistory, // Device object for showing history (optional)
}) {
  // === THEME INTEGRATION ===
  const { isDarkMode } = useTheme();

  // === DEVICE HISTORY STATE ===
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // === DATE FORMATTING FUNCTIONS ===
  const formatDateToMMDDYYYY = (dateValue) => {
    if (!dateValue) return "Invalid Date";
    let date;
    if (typeof dateValue === "object" && dateValue.seconds) {
      date = new Date(dateValue.seconds * 1000);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === "string") {
      date = new Date(dateValue);
    } else {
      return "Invalid Date";
    }
    if (isNaN(date)) return "Invalid Date";

    // Check if date is January 1, 1970 (Unix epoch / invalid date marker)
    if (
      date.getFullYear() === 1970 &&
      date.getMonth() === 0 &&
      date.getDate() === 1
    ) {
      return "Invalid Date";
    }

    return (
      (date.getMonth() + 1).toString().padStart(2, "0") +
      "/" +
      date.getDate().toString().padStart(2, "0") +
      "/" +
      date.getFullYear()
    );
  };

  const formatTimeToAMPM = (dateValue) => {
    if (!dateValue) return "--:--";
    let date;
    if (typeof dateValue === "object" && dateValue.seconds) {
      date = new Date(dateValue.seconds * 1000);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === "string") {
      date = new Date(dateValue);
    } else {
      return "--:--";
    }
    if (isNaN(date)) return "--:--";

    // Check if date is January 1, 1970 (Unix epoch / invalid date marker)
    if (
      date.getFullYear() === 1970 &&
      date.getMonth() === 0 &&
      date.getDate() === 1
    ) {
      return "--:--";
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // === DEVICE CONDITION OPTIONS ===
  // Available condition states for devices
  const conditions = [
    "BRANDNEW", // New devices never used
    "GOOD", // Devices in working condition
    "DEFECTIVE", // Broken/non-functioning devices
  ];

  const isEditMode = Boolean(editingDevice);

  // === FETCH DEVICE HISTORY ===
  useEffect(() => {
    const fetchHistory = async () => {
      if (deviceForHistory && deviceForHistory.deviceTag) {
        setHistoryLoading(true);
        try {
          const { getDeviceHistoryByTag } = await import(
            "../services/deviceHistoryService"
          );
          const historyData = await getDeviceHistoryByTag(
            deviceForHistory.deviceTag
          );

          // Sort by date descending (newest first) - handle both Timestamp objects and strings
          // Invalid dates (1970 or NaN) will be pushed to the end
          const sortedHistory = (historyData || []).sort((a, b) => {
            let dateA, dateB;

            // Handle Firestore Timestamp objects
            if (a.date && typeof a.date === "object" && a.date.seconds) {
              dateA = new Date(a.date.seconds * 1000);
            } else if (a.date) {
              dateA = new Date(a.date);
            } else {
              dateA = new Date(0); // Invalid date marker
            }

            if (b.date && typeof b.date === "object" && b.date.seconds) {
              dateB = new Date(b.date.seconds * 1000);
            } else if (b.date) {
              dateB = new Date(b.date);
            } else {
              dateB = new Date(0); // Invalid date marker
            }

            // Check for 1970 dates (invalid) - push them to the end
            const isAInvalid =
              isNaN(dateA) ||
              (dateA.getFullYear() === 1970 &&
                dateA.getMonth() === 0 &&
                dateA.getDate() === 1);
            const isBInvalid =
              isNaN(dateB) ||
              (dateB.getFullYear() === 1970 &&
                dateB.getMonth() === 0 &&
                dateB.getDate() === 1);

            if (isAInvalid && !isBInvalid) return 1; // A is invalid, push to end
            if (!isAInvalid && isBInvalid) return -1; // B is invalid, push to end
            if (isAInvalid && isBInvalid) return 0; // Both invalid, keep same order

            return dateB - dateA; // Newest first
          });

          setHistory(sortedHistory);
        } catch (error) {
          console.error("Error fetching device history:", error);
          setHistory([]);
        } finally {
          setHistoryLoading(false);
        }
      }
    };
    fetchHistory();
  }, [deviceForHistory]);

  // === MODAL STYLES ===
  const styles = {
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
    inventoryModalContent: {
      backgroundColor: isDarkMode ? "#1f2937" : "white",
      borderRadius: 12,
      padding: 20,
      minWidth: 480,
      maxWidth: deviceForHistory ? 600 : 520, // Wider when showing history
      width: "70vw",
      fontFamily:
        'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      boxShadow: isDarkMode
        ? "0 6px 24px rgba(0,0,0,0.4)"
        : "0 6px 24px rgba(34,46,58,0.13)",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      position: "relative",
      border: `1.5px solid ${isDarkMode ? "#374151" : "#e5e7eb"}`,
      transition: "box-shadow 0.2s, max-width 0.3s",
      maxHeight: "90vh", // Increased from 85vh to fill more space
      height: deviceForHistory ? "90vh" : "auto", // Fixed height when showing history
      overflowY: deviceForHistory ? "hidden" : "auto", // Prevent double scrollbars
      scrollbarWidth: "none",
      msOverflowStyle: "none",
      WebkitScrollbar: { display: "none" },
      margin: "auto",
      boxSizing: "border-box",
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
      color: isDarkMode ? "#f3f4f6" : "#222e3a",
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
      border: `1.2px solid ${isDarkMode ? "#4b5563" : "#cbd5e1"}`,
      background: isDarkMode ? "#374151" : "#f1f5f9",
      color: isDarkMode ? "#f3f4f6" : "#000000",
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
  };

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

  // === MODAL RENDER ===
  return (
    <div style={styles.modalOverlay}>
      <div
        style={{
          ...styles.inventoryModalContent,
          border: isEditMode ? "2px solid #2563eb" : "1px solid #e5e7eb",
          backgroundColor: isEditMode
            ? isDarkMode
              ? "#1e293b"
              : "#fefbff"
            : isDarkMode
            ? "#1f2937"
            : "#ffffff",
          maxWidth: deviceForHistory ? "1400px" : "600px", // Wider modal when showing history
          display: "flex",
          flexDirection: deviceForHistory ? "row" : "column", // Side-by-side when history is shown
          gap: deviceForHistory ? "24px" : "0",
          padding: deviceForHistory ? "32px" : "24px",
          // Dynamic height based on device type when showing history
          height: deviceForHistory
            ? data.deviceType === "PC" || data.deviceType === "Laptop"
              ? "auto"
              : "auto"
            : "auto",
          maxHeight: deviceForHistory
            ? data.deviceType === "PC" || data.deviceType === "Laptop"
              ? "125vh"
              : "75vh"
            : "85vh",
        }}
      >
        <style>{`
          .new-acquisitions-modal input:focus,
          .new-acquisitions-modal select:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(71, 33, 39, 0.1);
          }
          
          .new-acquisitions-modal input:hover,
          .new-acquisitions-modal select:hover {
            border-color: #64748b;
          }
        `}</style>

        {/* LEFT SIDE: Edit Device Form */}
        <div
          style={{
            flex: deviceForHistory ? "1" : "none",
            minWidth: deviceForHistory ? "500px" : "auto",
            width: deviceForHistory ? "auto" : "100%",
          }}
        >
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
                color: isEditMode
                  ? "#2563eb"
                  : isDarkMode
                  ? "#3b82f6"
                  : "#2563eb",
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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
            style={{ width: "100%" }}
          >
            {/* Row 1: Device Type and Brand */}
            <div
              style={{
                display: "flex",
                gap: 16,
                width: "100%",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  ...styles.inventoryInputGroup,
                  flex: 1,
                  marginBottom: 0,
                }}
              >
                <label style={styles.inventoryLabel}>Device Type:</label>
                <select
                  name="deviceType"
                  value={(() => {
                    // Find the matching device type from the available options
                    const currentType = data.deviceType;
                    if (!currentType) return "";

                    // Check if it exactly matches any available device type
                    const exactMatch = deviceTypes.find(
                      (type) => type.label === currentType
                    );
                    if (exactMatch) return currentType;

                    // Try case-insensitive match
                    const matchedType = deviceTypes.find(
                      (type) =>
                        type.label.toLowerCase() === currentType.toLowerCase()
                    );

                    return matchedType ? matchedType.label : currentType;
                  })()}
                  onChange={onChange}
                  disabled
                  style={{
                    ...styles.inventoryInput,
                    backgroundColor: isDarkMode ? "#374151" : "#f5f5f5",
                    color: isDarkMode ? "#9ca3af" : "#666",
                    cursor: "not-allowed",
                  }}
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
                  value={data.brand || ""}
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
                <input
                  name="deviceTag"
                  value={data.deviceTag || ""}
                  onChange={onChange}
                  disabled
                  style={{
                    ...styles.inventoryInput,
                    backgroundColor: isDarkMode ? "#374151" : "#f5f5f5",
                    color: isDarkMode ? "#9ca3af" : "#666",
                    cursor: "not-allowed",
                  }}
                  placeholder="Device tag cannot be changed"
                />
              </div>
            )}

            {/* Row 3: Model and Condition */}
            <div
              style={{
                display: "flex",
                gap: 16,
                width: "100%",
                marginBottom: 12,
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
                  value={data.model || ""}
                  onChange={onChange}
                  style={styles.inventoryInput}
                  autoComplete="off"
                />
              </div>

              <div
                style={{
                  ...styles.inventoryInputGroup,
                  flex: 1,
                  marginBottom: 0,
                }}
              >
                <label style={styles.inventoryLabel}>Condition:</label>
                <select
                  name="condition"
                  value={data.condition || ""}
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

            {/* Row 4: Acquisition Date (full width) */}
            <div style={{ ...styles.inventoryInputGroup, marginBottom: 12 }}>
              <label style={styles.inventoryLabel}>Acquisition Date:</label>
              <input
                name="acquisitionDate"
                type="date"
                value={formatDateToYYYYMMDD(data.acquisitionDate) || ""}
                onChange={onChange}
                style={{
                  ...styles.inventoryInput,
                  colorScheme: isDarkMode ? "dark" : "light",
                }}
              />
            </div>

            {/* Row 5: Device Owner (Client) */}
            <div style={{ ...styles.inventoryInputGroup, marginBottom: 12 }}>
              <label style={styles.inventoryLabel}>Device Owner:</label>
              <SearchableDropdown
                value={data.client}
                onChange={onChange}
                options={clients || []}
                placeholder="Search and select device owner..."
                displayKey="clientName"
                valueKey="clientName"
              />
            </div>

            {/* Conditional PC/Laptop Specifications */}
            {(data.deviceType === "PC" || data.deviceType === "Laptop") && (
              <div style={{ gridColumn: "1 / -1", marginBottom: 20 }}>
                <div
                  style={{
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #d1d5db",
                    borderRadius: "8px",
                    padding: "16px",
                    background: isDarkMode ? "#374151" : "#f9fafb",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v1h12v-1l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z" />
                    </svg>
                    {data.deviceType} Specifications
                  </h4>

                  {/* Row 1: CPU Gen and RAM */}
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      marginBottom: "12px",
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
                        CPU - System Unit:
                      </label>
                      <input
                        type="text"
                        name="cpuGen"
                        value={data.cpuGen || ""}
                        onChange={onChange}
                        placeholder="Enter CPU System Unit (e.g., i3, i5, i7, i9)"
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
                      <label style={styles.inventoryLabel}>RAM:</label>
                      <select
                        name="ram"
                        value={data.ram || ""}
                        onChange={onChange}
                        style={styles.inventoryInput}
                      >
                        <option value="">Select RAM</option>
                        <option value="4GB">4GB</option>
                        <option value="8GB">8GB</option>
                        <option value="16GB">16GB</option>
                        <option value="32GB">32GB</option>
                        <option value="64GB">64GB</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Drive 1 and Drive 2 */}
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      marginBottom: "12px",
                    }}
                  >
                    <div
                      style={{
                        ...styles.inventoryInputGroup,
                        flex: 1,
                        marginBottom: 0,
                      }}
                    >
                      <label style={styles.inventoryLabel}>Drive 1:</label>
                      <input
                        name="drive1"
                        value={data.drive1 || ""}
                        onChange={onChange}
                        placeholder="e.g., 256 GB SSD"
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
                        Drive 2 (Optional):
                      </label>
                      <input
                        name="drive2"
                        value={data.drive2 || ""}
                        onChange={onChange}
                        placeholder="e.g., 1 TB HDD"
                        style={styles.inventoryInput}
                      />
                    </div>
                  </div>

                  {/* Row 3: GPU and OS */}
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      marginBottom: 0,
                    }}
                  >
                    <div
                      style={{
                        ...styles.inventoryInputGroup,
                        flex: 1,
                        marginBottom: 0,
                      }}
                    >
                      <label style={styles.inventoryLabel}>GPU:</label>
                      <input
                        name="gpu"
                        value={data.gpu || ""}
                        onChange={onChange}
                        placeholder="e.g., Integrated / GTX 1650"
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
                      <label style={styles.inventoryLabel}>OS:</label>
                      <select
                        name="os"
                        value={data.os || ""}
                        onChange={onChange}
                        style={styles.inventoryInput}
                      >
                        <option value="">Select OS</option>
                        <option value="Windows 10">Windows 10</option>
                        <option value="Windows 11">Windows 11</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Row 6: Remarks (full width) */}
            <div style={{ ...styles.inventoryInputGroup, marginBottom: 12 }}>
              <label style={styles.inventoryLabel}>Remarks:</label>
              <textarea
                name="remarks"
                value={data.remarks || ""}
                onChange={onChange}
                rows={3}
                style={{
                  ...styles.inventoryInput,
                  resize: "vertical",
                }}
              />
            </div>
          </form>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "flex-end",
              marginTop: 32,
            }}
          >
            <button
              onClick={onCancel}
              style={{
                padding: "12px 24px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                borderRadius: 8,
                background: isDarkMode ? "#374151" : "white",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!isValid}
              style={{
                padding: "12px 24px",
                border: "none",
                borderRadius: 8,
                background: isValid ? "#2563eb" : "#9ca3af",
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                cursor: isValid ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              Save Device
            </button>
          </div>

          {saveError && (
            <div
              style={{
                color: "#e57373",
                marginTop: 16,
                fontWeight: 600,
                textAlign: "center",
                fontSize: 14,
              }}
            >
              {saveError}
            </div>
          )}
        </div>
        {/* END LEFT SIDE */}

        {/* RIGHT SIDE: Asset History */}
        {deviceForHistory && (
          <div
            style={{
              flex: "1",
              minWidth: "450px",
              maxWidth: "600px",
              borderLeft: isDarkMode
                ? "2px solid #374151"
                : "2px solid #e5e7eb",
              paddingLeft: "24px",
              display: "flex",
              flexDirection: "column",
              // Auto height for natural sizing
              height: "auto",
            }}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: isDarkMode ? "#f3f4f6" : "#1f2937",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Asset History
            </h3>

            {historyLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "40px 20px",
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                }}
              >
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                  fontSize: 14,
                }}
              >
                No history available for this device.
              </div>
            ) : (
              <div
                style={{
                  // All devices: auto to fit content naturally
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  paddingRight: "8px",
                  maxHeight:
                    data.deviceType === "PC" || data.deviceType === "Laptop"
                      ? "600px"
                      : "400px",
                }}
                className="assets-main-scroll"
              >
                {history.map((item, index) => {
                  // Format the history entry
                  const formatHistoryEntry = (historyItem) => {
                    const {
                      action,
                      employeeName,
                      changes,
                      reason,
                      condition,
                      remarks,
                    } = historyItem;
                    let title = "";
                    let details = [];

                    switch (action) {
                      case "created":
                        title = "Asset Created";
                        details.push("Device added to inventory");
                        if (remarks) details.push(`Notes: ${remarks}`);
                        break;
                      case "assigned":
                        title = "Asset Assigned";
                        if (employeeName)
                          details.push(`Assigned to: ${employeeName}`);
                        if (condition) details.push(`Condition: ${condition}`);
                        if (remarks) details.push(`Notes: ${remarks}`);
                        break;
                      case "unassigned":
                      case "returned":
                        title =
                          action === "returned"
                            ? "Asset Returned"
                            : "Asset Unassigned";
                        if (employeeName)
                          details.push(`Returned by: ${employeeName}`);
                        if (reason) details.push(`Reason: ${reason}`);
                        if (condition) details.push(`Condition: ${condition}`);
                        if (remarks) details.push(`Notes: ${remarks}`);
                        break;
                      case "reassigned":
                        title = "Asset Reassigned";
                        if (employeeName)
                          details.push(`Reassigned to: ${employeeName}`);
                        if (changes && changes.previousEmployee)
                          details.push(`From: ${changes.previousEmployee}`);
                        if (condition) details.push(`Condition: ${condition}`);
                        break;
                      case "updated":
                        title = "Asset Information Updated";
                        if (changes && typeof changes === "object") {
                          Object.entries(changes).forEach(([field, change]) => {
                            if (
                              change &&
                              typeof change === "object" &&
                              "old" in change &&
                              "new" in change
                            ) {
                              const oldVal = change.old || "(empty)";
                              const newVal = change.new || "(empty)";
                              const fieldName =
                                field.charAt(0).toUpperCase() +
                                field.slice(1).replace(/([A-Z])/g, " $1");
                              details.push(
                                `${fieldName}: "${oldVal}" → "${newVal}"`
                              );
                            }
                          });
                        }
                        if (remarks) details.push(`Notes: ${remarks}`);
                        break;
                      case "retired":
                        title = "Asset Retired";
                        if (reason) details.push(`Reason: ${reason}`);
                        if (condition)
                          details.push(`Final Condition: ${condition}`);
                        break;
                      case "added":
                        title = "Remarks Added";
                        if (remarks) details.push(remarks);
                        break;
                      case "removed":
                        title = "Information Removed";
                        if (remarks) details.push(remarks);
                        break;
                      default:
                        title = action || "Unknown Action";
                        if (employeeName)
                          details.push(`Employee: ${employeeName}`);
                        if (remarks) details.push(remarks);
                    }

                    return { title, details, hasDetails: details.length > 0 };
                  };

                  const formatted = formatHistoryEntry(item);

                  return (
                    <div
                      key={index}
                      style={{
                        background: isDarkMode ? "#374151" : "#fafafa",
                        border: isDarkMode
                          ? "1px solid #4b5563"
                          : "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: "12px 16px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: isDarkMode ? "#f3f4f6" : "#111827",
                            marginRight: 8,
                          }}
                        >
                          {formatted.title}
                        </div>
                        {item.employeeName &&
                          !formatted.details.some((d) =>
                            d.includes(item.employeeName)
                          ) && (
                            <div
                              style={{
                                fontSize: 13,
                                color: isDarkMode ? "#e5e7eb" : "#374151",
                                backgroundColor: isDarkMode
                                  ? "#1f2937"
                                  : "#f3f4f6",
                                padding: "2px 8px",
                                borderRadius: 4,
                              }}
                            >
                              {item.employeeName}
                            </div>
                          )}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: isDarkMode ? "#9ca3af" : "#6b7280",
                          marginBottom: 8,
                        }}
                      >
                        {item.date
                          ? formatDateToMMDDYYYY(item.date)
                          : "Invalid Date"}{" "}
                        at {item.date ? formatTimeToAMPM(item.date) : "--:--"}
                      </div>
                      {formatted.hasDetails && (
                        <div
                          style={{
                            fontSize: 13,
                            color: isDarkMode ? "#d1d5db" : "#4b5563",
                            lineHeight: "1.5",
                          }}
                        >
                          {formatted.details.map((detail, idx) => (
                            <div key={idx} style={{ marginBottom: 4 }}>
                              • {detail}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// === MAIN ASSETS PAGE COMPONENT ===
// This component manages the display and operations for assigned devices
function Assets() {
  // === THEME HOOK ===
  const { isDarkMode } = useTheme(); // Get dark mode state from theme context
  const { currentUser } = useCurrentUser(); // Get current user for logging

  // === DYNAMIC STYLES OBJECT ===
  const styles = {
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
    inventoryModalContent: {
      background: isDarkMode ? "#1f2937" : "#fff",
      padding: 20,
      borderRadius: 12,
      minWidth: 480,
      maxWidth: 520,
      width: "70vw",
      boxShadow: isDarkMode
        ? "0 6px 24px rgba(0,0,0,0.4)"
        : "0 6px 24px rgba(34,46,58,0.13)",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      position: "relative",
      border: `1.5px solid ${isDarkMode ? "#374151" : "#e5e7eb"}`,
      transition: "box-shadow 0.2s",
      maxHeight: "85vh",
      overflowY: "auto",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
      WebkitScrollbar: { display: "none" },
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
      color: isDarkMode ? "#f3f4f6" : "#222e3a",
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
      border: `1.2px solid ${isDarkMode ? "#4b5563" : "#cbd5e1"}`,
      background: isDarkMode ? "#374151" : "#f1f5f9",
      color: isDarkMode ? "#f3f4f6" : "#000000",
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
  };

  // === NOTIFICATION HOOKS ===
  // Added showUndoNotification for bulk delete undo snackbar (mirrors Inventory.js usage)
  const {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showUndoNotification,
  } = useSnackbar(); // User feedback notifications including undo

  // === CORE DATA STATE ===
  const [devices, setDevices] = useState([]); // List of assigned devices from database
  const [employees, setEmployees] = useState([]); // List of all employees for reassignment
  const [clients, setClients] = useState([]); // List of all clients for department resolution
  const [loading, setLoading] = useState(true); // Main page loading state
  const [showForm, setShowForm] = useState(false); // Controls device add/edit modal visibility

  // === UTILITY FUNCTIONS ===
  // Helper function to extract first and last name only for document forms
  const getFirstLastName = (firstName, lastName) => {
    if (!firstName && !lastName) return "Employee";
    if (!firstName) return lastName || "Employee";
    if (!lastName) return firstName || "Employee";
    return `${firstName} ${lastName}`;
  };

  // === DEVICE FORM STATE ===
  const [form, setForm] = useState({}); // Form data for device operations
  const [tagError, setTagError] = useState(""); // Asset tag validation errors
  const [saveError, setSaveError] = useState(""); // Form save error messages
  const [useSerial, setUseSerial] = useState(false); // Toggle for using serial as asset tag

  // === DEVICE ASSIGNMENT STATE ===
  const [assigningDevice, setAssigningDevice] = useState(null); // Device being assigned to employee
  const [assignModalOpen, setAssignModalOpen] = useState(false); // Assignment modal visibility
  const [assignSearch, setAssignSearch] = useState(""); // Search for employees in assignment modal
  const [showUnassignModal, setShowUnassignModal] = useState(false); // Unassignment modal visibility
  const [unassignDevice, setUnassignDevice] = useState(null); // Device being unassigned
  const [unassignReason, setUnassignReason] = useState(""); // Reason for device unassignment

  // === SEARCH AND SELECTION STATE ===
  const [search, setSearch] = useState(""); // Global search across all device fields
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]); // Device IDs selected for bulk operations

  // === BULK OPERATIONS STATE ===
  const [bulkReassignModalOpen, setBulkReassignModalOpen] = useState(false); // Bulk reassignment modal
  const [bulkUnassignModalOpen, setBulkUnassignModalOpen] = useState(false); // Bulk unassignment modal
  const [bulkAssignSearch, setBulkAssignSearch] = useState(""); // Employee search in bulk assign modal
  const [bulkUnassignReason, setBulkUnassignReason] = useState(""); // Reason for bulk unassignment
  // Bulk delete state (deployed assets)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({
    current: 0,
    total: 0,
  });
  const UNDO_WINDOW_MS = 5000; // Undo window for deletion

  // === TABLE FILTERING SYSTEM ===
  // Advanced filtering system for table headers with multiple filter types
  const {
    filters: headerFilters, // Object containing all active filter values
    updateFilter: updateHeaderFilter, // Function to update specific filter
    clearAllFilters: clearAllHeaderFilters, // Function to reset all filters
    hasActiveFilters: hasActiveHeaderFilters, // Boolean indicating if any filters are active
  } = useTableFilters();
  const [showTransferPrompt, setShowTransferPrompt] = useState(false); // Transfer confirmation dialog

  // === DEVICE CONDITION OPTIONS ===
  // Available condition states for asset tracking
  const conditions = [
    "BRANDNEW", // Never used devices
    "GOOD", // Working condition devices
    "DEFECTIVE", // Non-functional devices
  ];

  // === TRANSFER AND PROGRESS STATE ===
  const [selectedTransferEmployee, setSelectedTransferEmployee] =
    useState(null); // Employee selected for device transfer
  const [progress, setProgress] = useState(0); // Progress tracking for bulk operations
  const [generatingForm, setGeneratingForm] = useState(false); // Progress indicator visibility
  const [unassignGenerating, setUnassignGenerating] = useState(false); // Unassign operation in progress
  const [unassignProgress, setUnassignProgress] = useState(0); // Unassign progress percentage
  const [bulkUnassignWarning, setBulkUnassignWarning] = useState(""); // Warning messages for bulk unassign

  // === SELECTION WARNING STATE ===
  const [showSelectionWarning, setShowSelectionWarning] = useState(false); // Selection warning modal visibility
  const [selectionWarningMessage, setSelectionWarningMessage] = useState(""); // Warning message content

  // === PAGINATION STATE ===
  const [currentPage, setCurrentPage] = useState(1); // Current page number for device table
  const [devicesPerPage, setDevicesPerPage] = useState(50); // Number of devices displayed per page

  // === DEVICE HISTORY STATE ===
  const [selectedDeviceForHistory, setSelectedDeviceForHistory] =
    useState(null); // Device selected for history view

  // === COMPONENT INITIALIZATION ===
  // Load devices and employees data when component mounts
  useEffect(() => {
    loadDevicesAndEmployees();
  }, []);

  // === DATA REFRESH ON PAGE FOCUS ===
  // Automatically refresh data when user navigates back to this page or when page becomes visible
  // This ensures that newly assigned devices from Inventory page appear immediately in Assets
  useEffect(() => {
    const handleFocus = () => {
      // Refresh data when window gets focus (user switched back to tab/app)
      loadDevicesAndEmployees(true); // true = auto-refresh mode
    };

    const handleVisibilityChange = () => {
      // Refresh data when page becomes visible (user switched tabs)
      if (!document.hidden) {
        loadDevicesAndEmployees(true); // true = auto-refresh mode
      }
    };

    // Add event listeners for focus and visibility changes
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup event listeners
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // === PAGINATION RESET EFFECTS ===
  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Reset to first page when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [devicesPerPage]);

  // === DATA LOADING FUNCTIONS ===
  // Main function to fetch devices and employees from database
  const loadDevicesAndEmployees = async (isAutoRefresh = false) => {
    // Set appropriate loading state - don't show main spinner for auto-refresh
    if (!isAutoRefresh) {
      setLoading(true);
    }

    try {
      const [allDevices, allEmployees, allClients] = await Promise.all([
        getAllDevices(), // Fetch all devices from database
        getAllEmployees(), // Fetch all employees for assignment dropdowns
        getAllClients(), // Fetch all clients for department resolution
      ]);
      // Filter to only show assigned devices (devices with assignedTo value)
      const assignedDevices = allDevices.filter(
        (device) => device.assignedTo && device.assignedTo.trim() !== ""
      );
      setDevices(assignedDevices);
      setEmployees(allEmployees);
      setClients(allClients);
    } catch (error) {
      showError(
        "Failed to load devices and employees. Please refresh the page."
      );
    } finally {
      setLoading(false);
    }
  };

  // === UTILITY FUNCTIONS ===
  // Get employee display name from ID
  const getEmployeeName = (id) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.fullName : id || "";
  };

  // Get client name from client ID
  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.clientName : "";
  };

  // Get device owner (client field from device, or empty if not set)
  const getDeviceOwner = (device) => {
    if (!device) return "";
    return device.client || "";
  };

  // Get client name for assigned employee
  const getEmployeeClient = (employeeId) => {
    if (!employeeId) return "";
    const employee = employees.find((emp) => emp.id === employeeId);
    if (!employee || !employee.clientId) return "";
    return getClientName(employee.clientId);
  };

  // Get department/client field for forms (prioritizes client name if available)
  const getDepartmentForForm = (employee) => {
    if (!employee) return "";

    // If employee has clientId, use client name; otherwise use department field
    const clientName = employee.clientId
      ? getClientName(employee.clientId)
      : "";
    return clientName || employee.department || "";
  };

  const handleEdit = (device) => {
    const { id, ...rest } = device;
    setForm({ ...rest, _editDeviceId: id });
    setSelectedDeviceForHistory(device); // Also set device for history display
    setShowForm(true);
  };

  const handleInput = ({ target: { name, value, type } }) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // === CHANGE TRACKING FUNCTION ===
  // Compares old and new device data to track specific field changes
  const getDeviceChanges = (oldDevice, newDevice) => {
    const changes = {};
    const fieldLabels = {
      deviceType: "Device Type",
      deviceTag: "Device Tag",
      brand: "Brand",
      model: "Model",
      client: "Client",
      condition: "Condition",
      remarks: "Remarks",
      acquisitionDate: "Acquisition Date",
      assignedTo: "Assigned To",
      cpu: "CPU",
      cpuGen: "CPU Generation",
      ram: "RAM",
      drive1: "Primary Drive",
      drive2: "Secondary Drive",
      gpu: "GPU",
      os: "Operating System",
      serialNumber: "Serial Number",
      category: "Category",
      lifespan: "Lifespan",
    };

    // Compare each field
    Object.keys(fieldLabels).forEach((field) => {
      const oldValue = (oldDevice && oldDevice[field]) || "";
      const newValue = (newDevice && newDevice[field]) || "";

      if (oldValue !== newValue) {
        changes[field] = {
          old: oldValue === "" ? "(empty)" : oldValue,
          new: newValue === "" ? "(empty)" : newValue,
        };
      }
    });

    return Object.keys(changes).length > 0 ? changes : null;
  };

  const handleSave = async () => {
    setShowForm(false); // Close modal immediately to prevent multiple clicks
    setSaveError("");
    if (!form.deviceType || !form.deviceTag || !form.brand || !form.condition) {
      setSaveError("Please fill in all required fields.");
      showError("Please fill in all required fields.");
      setShowForm(true); // Reopen modal if validation fails
      return;
    }
    try {
      // Get the original device data for comparison
      const originalDevice = devices.find((d) => d.id === form._editDeviceId);
      const { id, ...payloadWithoutId } = form;

      // Track changes
      const changes = getDeviceChanges(originalDevice, payloadWithoutId);

      await updateDevice(form._editDeviceId, payloadWithoutId);

      // Log device update with change details
      if (changes) {
        await logDeviceHistory({
          employeeId: payloadWithoutId.assignedTo || null,
          employeeName: payloadWithoutId.assignedTo
            ? getEmployeeName(payloadWithoutId.assignedTo)
            : null,
          deviceId: form._editDeviceId,
          deviceTag: payloadWithoutId.deviceTag,
          action: "updated",
          date: new Date().toISOString(),
          changes: changes,
        });
      }

      setForm({});
      loadDevicesAndEmployees();
      showSuccess("Device updated successfully!");
    } catch (error) {
      showError("Failed to update device. Please try again.");
    }
  };

  const handleShowDeviceHistory = (device) => {
    // Open the edit modal with history section
    const { id, ...rest } = device;
    setForm({ ...rest, _editDeviceId: id });
    setSelectedDeviceForHistory(device);
    setShowForm(true);
  };

  // === EXPORT HANDLER ===
  // Exports the currently filtered deployed assets list to Excel
  const handleExportToExcel = async () => {
    try {
      await exportInventoryToExcel({ devices: filteredDevices, employees });

      // Log to User Logs
      await createUserLog(
        currentUser?.uid,
        currentUser?.username || currentUser?.email,
        currentUser?.email,
        ACTION_TYPES.DEVICE_EXPORT,
        `Exported ${filteredDevices.length} deployed asset(s) to Excel`,
        {
          deviceCount: filteredDevices.length,
        }
      );

      showSuccess("Deployed assets exported successfully!");
    } catch (err) {
      console.error("Export failed:", err);
      showError("Failed to export deployed assets. Please try again.");
    }
  };

  // === UNITSPECS SYNC FUNCTIONS ===
  // Helper functions to extract data for UnitSpecs
  const extractCpuGen = (cpuString) => {
    if (!cpuString) return "";
    const match = cpuString.match(/(i[357])/i);
    return match ? match[1].toLowerCase() : "";
  };

  const extractCpuModel = (cpuString) => {
    if (!cpuString) return "";
    return cpuString
      .replace(/(i[357])/i, "")
      .replace(/^[\s-]+/, "")
      .trim();
  };

  const extractRamSize = (ramString) => {
    if (!ramString) return "";
    const match = ramString.match(/(\d+)/);
    return match ? match[1] : "";
  };

  // Function to sync PC/Laptop data to UnitSpecs
  const syncToUnitSpecs = async (deviceData, targetCollection = null) => {
    try {
      // Only sync PC and Laptop devices
      if (
        !deviceData.deviceType ||
        !["PC", "Laptop", "Desktop", "Notebook"].includes(deviceData.deviceType)
      ) {
        return; // Skip non-PC/Laptop devices
      }

      // Map inventory fields to UnitSpecs format
      const unitSpecData = {
        Tag: deviceData.deviceTag || "",
        deviceType: deviceData.deviceType || "",
        category: deviceData.category || "",
        cpuGen: extractCpuGen(deviceData.cpuGen || deviceData.cpu || ""),
        cpuModel: extractCpuModel(deviceData.cpuGen || deviceData.cpu || ""),
        CPU: deviceData.cpuGen || deviceData.cpu || "",
        RAM: extractRamSize(deviceData.ram) || "",
        Drive: deviceData.drive1 || deviceData.mainDrive || "",
        GPU: deviceData.gpu || "",
        Status: deviceData.condition || "",
        OS: deviceData.os || deviceData.operatingSystem || "",
        Remarks: deviceData.remarks || "",
        lifespan: deviceData.lifespan || "",
      };

      // Determine target collection based on assignment status or explicit target
      let collection = targetCollection;
      if (!collection) {
        collection =
          deviceData.assignedTo && deviceData.assignedTo.trim() !== ""
            ? "DeployedUnits"
            : "InventoryUnits";
      }

      // Add to appropriate UnitSpecs collection
      await setDoc(doc(db, collection, deviceData.deviceTag), unitSpecData);

      console.log(
        `Synced ${deviceData.deviceType} ${deviceData.deviceTag} to UnitSpecs ${collection}`
      );
    } catch (error) {
      console.error("Error syncing to UnitSpecs:", error);
      // Don't throw error to prevent blocking main operation
    }
  };

  // Helper function to move device between UnitSpecs collections
  const moveDeviceInUnitSpecs = async (
    deviceTag,
    fromCollection,
    toCollection
  ) => {
    try {
      // Get the device data from the source collection
      const sourceDocRef = doc(db, fromCollection, deviceTag);
      const sourceDoc = await getDoc(sourceDocRef);

      if (sourceDoc.exists()) {
        const deviceData = sourceDoc.data();

        // Add to target collection
        await setDoc(doc(db, toCollection, deviceTag), deviceData);

        // Remove from source collection
        await deleteDoc(sourceDocRef);

        console.log(
          `Moved ${deviceTag} from ${fromCollection} to ${toCollection} in UnitSpecs`
        );
      }
    } catch (error) {
      console.error(
        `Error moving device in UnitSpecs from ${fromCollection} to ${toCollection}:`,
        error
      );
    }
  };

  const handleUnassign = (device) => {
    setUnassignDevice(device);
    setUnassignReason("working");
    setShowUnassignModal(true);
  };

  const confirmUnassign = async () => {
    setShowUnassignModal(false); // Close modal immediately to prevent multiple clicks
    if (!unassignDevice) return;
    let condition = "GOOD";
    let reason = "Normal unassign (still working)";
    if (unassignReason === "defective") {
      condition = "DEFECTIVE";
      reason = "Defective";
    }
    try {
      const { id, ...deviceWithoutId } = unassignDevice;
      const updatedDevice = {
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
      };

      await updateDevice(unassignDevice.id, updatedDevice);

      // Sync to UnitSpecs InventoryUnits if it's a PC or Laptop
      await syncToUnitSpecs(updatedDevice, "InventoryUnits");

      // Move from DeployedUnits to InventoryUnits in UnitSpecs if it exists there
      await moveDeviceInUnitSpecs(
        unassignDevice.deviceTag,
        "DeployedUnits",
        "InventoryUnits"
      );

      await logDeviceHistory({
        employeeId: unassignDevice.assignedTo,
        deviceId: unassignDevice.id,
        deviceTag: unassignDevice.deviceTag,
        action: "unassigned",
        reason,
        condition,
        date: new Date().toISOString(),
      });

      // Log to User Logs
      try {
        console.log("Attempting to log device unassignment (Assets):", {
          user: currentUser?.uid,
          deviceTag: unassignDevice.deviceTag,
          previousEmployee: getEmployeeName(unassignDevice.assignedTo),
        });
        await createUserLog(
          currentUser?.uid,
          currentUser?.username || currentUser?.email,
          currentUser?.email,
          ACTION_TYPES.DEVICE_UNASSIGN,
          `Unassigned device ${unassignDevice.deviceTag} from ${getEmployeeName(
            unassignDevice.assignedTo
          )}`,
          {
            deviceTag: unassignDevice.deviceTag,
            deviceType: unassignDevice.deviceType,
            previousEmployee: getEmployeeName(unassignDevice.assignedTo),
            reason: reason,
          }
        );
        console.log("Device unassignment logged successfully (Assets)");
      } catch (logError) {
        console.error("Error logging device unassignment (Assets):", logError);
      }

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

      // Global search filter
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesSearch =
          (device.deviceTag || "").toLowerCase().includes(q) ||
          (device.deviceType || "").toLowerCase().includes(q) ||
          (device.brand || "").toLowerCase().includes(q) ||
          (device.model || "").toLowerCase().includes(q) ||
          (getEmployeeName(device.assignedTo) || "")
            .toLowerCase()
            .includes(q) ||
          (device.condition || "").toLowerCase().includes(q) ||
          (device.remarks || "").toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Header filters
      if (headerFilters && Object.keys(headerFilters).length > 0) {
        // Apply header filters with special handling for assignedTo
        const filtersToApply = { ...headerFilters };

        // Handle assignedTo filter separately since it needs employee name matching
        if (filtersToApply.assignedTo) {
          const assignedToFilter = filtersToApply.assignedTo.toLowerCase();
          const employeeName = getEmployeeName(device.assignedTo);
          if (!employeeName.toLowerCase().includes(assignedToFilter)) {
            return false;
          }
          delete filtersToApply.assignedTo;
        }

        // Handle client filter separately since it uses device owner
        if (filtersToApply.client) {
          const clientFilter = filtersToApply.client.toLowerCase();
          const deviceOwner = getDeviceOwner(device);
          if (!deviceOwner.toLowerCase().includes(clientFilter)) {
            return false;
          }
          delete filtersToApply.client;
        }

        // Apply remaining filters
        const matchesHeaderFilters = Object.entries(filtersToApply).every(
          ([key, filterValue]) => {
            if (!filterValue) return true;

            const itemValue = device[key];
            if (itemValue === undefined || itemValue === null) return false;

            // For string comparisons (case-insensitive)
            if (typeof filterValue === "string") {
              return String(itemValue)
                .toLowerCase()
                .includes(filterValue.toLowerCase());
            }

            // For exact matches (numbers, dates, etc.)
            return itemValue === filterValue;
          }
        );

        if (!matchesHeaderFilters) return false;
      }

      return true;
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

  const toggleDeselectAll = () => {
    // Always unselect all devices on current page
    setSelectedDeviceIds((prev) =>
      prev.filter(
        (id) => !currentPageDevices.some((device) => device.id === id)
      )
    );
  };

  const isAnySelectedOnPage = currentPageDevices.some((device) =>
    selectedDeviceIds.includes(device.id)
  );

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
      setSelectionWarningMessage(
        `You can only select devices assigned to the same employee for bulk operations.\n\nFirst selected: ${
          firstName || "Unassigned"
        }\nTried to select: ${thisName || "Unassigned"}`
      );
      setShowSelectionWarning(true);
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

  // Bulk Delete Handlers
  const handleBulkDelete = () => {
    if (!selectedDeviceIds.length) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    setShowBulkDeleteConfirm(false);
    if (!selectedDeviceIds.length) return;
    try {
      const devicesToDelete = devices.filter((d) =>
        selectedDeviceIds.includes(d.id)
      );
      setBulkDeleteProgress({ current: 0, total: devicesToDelete.length });
      for (let i = 0; i < devicesToDelete.length; i++) {
        const device = devicesToDelete[i];
        try {
          await logDeviceHistory({
            employeeId: device.assignedTo || null,
            employeeName: device.assignedToName || null,
            deviceId: device.id,
            deviceTag: device.deviceTag,
            action: "deleted",
            date: new Date(),
          });
        } catch (err) {
          console.error(
            "Failed to log deletion history for",
            device.deviceTag,
            err
          );
        }
        await deleteDevice(device.id);
        setBulkDeleteProgress({
          current: i + 1,
          total: devicesToDelete.length,
        });
      }
      setDevices((prev) =>
        prev.filter((d) => !selectedDeviceIds.includes(d.id))
      );
      const deletedCount = devicesToDelete.length;

      // Log to User Logs
      try {
        console.log("Attempting to log bulk delete (Assets):", {
          user: currentUser?.uid,
          deviceCount: deletedCount,
        });
        await createUserLog(
          currentUser?.uid,
          currentUser?.username || currentUser?.email,
          currentUser?.email,
          ACTION_TYPES.DEVICE_DELETE,
          `Deleted ${deletedCount} deployed device(s)`,
          {
            deviceCount: deletedCount,
            deviceTags: devicesToDelete.map((d) => d.deviceTag).join(", "),
          }
        );
        console.log("Bulk delete logged successfully (Assets)");
      } catch (logError) {
        console.error("Error logging bulk delete (Assets):", logError);
      }

      showUndoNotification(
        `${deletedCount} deployed device(s) deleted`,
        async () => {
          try {
            for (const deviceData of devicesToDelete) {
              const { id: originalId, ...rest } = deviceData;
              await setDoc(doc(db, "devices", originalId), rest);
              await logDeviceHistory({
                employeeId: deviceData.assignedTo || null,
                employeeName: deviceData.assignedToName || null,
                deviceId: originalId,
                deviceTag: deviceData.deviceTag,
                action: "restored",
                date: new Date(),
              });
            }
            // Refresh devices list after restoration to keep UI in sync
            await loadDevicesAndEmployees();
            showSuccess(`${deletedCount} device(s) restored`);
          } catch (undoErr) {
            console.error("Undo restore failed:", undoErr);
            showError("Failed to restore some devices");
          }
        },
        UNDO_WINDOW_MS
      );
      setSelectedDeviceIds([]);
      setBulkDeleteProgress({ current: 0, total: 0 });
    } catch (error) {
      console.error("Bulk delete failed:", error);
      showError("Failed to delete devices.");
      setBulkDeleteProgress({ current: 0, total: 0 });
    }
  };

  const cancelBulkDelete = () => setShowBulkDeleteConfirm(false);

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
      const updatedDevice = {
        ...deviceWithoutId,
        assignedTo: emp.id,
        assignmentDate: new Date().toISOString().slice(0, 10),
      };

      await updateDevice(device.id, updatedDevice);

      // Sync to UnitSpecs DeployedUnits if it's a PC or Laptop
      await syncToUnitSpecs(updatedDevice, "DeployedUnits");

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

    // Log to User Logs
    try {
      console.log("Attempting to log bulk reassignment:", {
        user: currentUser?.uid,
        deviceCount: selectedDeviceIds.length,
        transfereeName: emp.fullName,
      });
      await createUserLog(
        currentUser?.uid,
        currentUser?.username || currentUser?.email,
        currentUser?.email,
        ACTION_TYPES.DEVICE_TRANSFER,
        `Reassigned ${selectedDeviceIds.length} device(s) to ${emp.fullName}`,
        {
          deviceCount: selectedDeviceIds.length,
          transfereeId: emp.id,
          transfereeName: emp.fullName,
          deviceTags: devices
            .filter((d) => selectedDeviceIds.includes(d.id))
            .map((d) => d.deviceTag)
            .join(", "),
        }
      );
      console.log("Bulk reassignment logged successfully");
    } catch (logError) {
      console.error("Error logging bulk reassignment:", logError);
    }

    setSelectedDeviceIds([]);
    showSuccess(
      `Successfully reassigned ${selectedDeviceIds.length} device(s) to ${emp.fullName}`
    );
    loadDevicesAndEmployees();
  };

  const confirmBulkUnassign = async () => {
    setBulkUnassignModalOpen(false); // Close modal immediately to prevent multiple clicks
    // Only allow if all selected devices have the same assignedTo
    const selected = devices.filter((d) => selectedDeviceIds.includes(d.id));
    const assignedToSet = new Set(selected.map((d) => d.assignedTo));
    if (assignedToSet.size > 1) {
      setBulkUnassignWarning(
        "You can only unassign devices assigned to the same employee."
      );
      setBulkUnassignModalOpen(true); // Reopen modal if validation fails
      return;
    }
    let condition = "GOOD";
    let reason = "Normal unassign (still working)";
    if (bulkUnassignReason === "defective") {
      condition = "DEFECTIVE";
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
      const updatedDevice = {
        ...deviceWithoutId,
        assignedTo: "",
        assignmentDate: "",
        status: "Stock Room",
        condition,
        remarks:
          (deviceWithoutId.remarks || "").toLowerCase() === "temporary deployed"
            ? ""
            : deviceWithoutId.remarks,
      };

      await updateDevice(device.id, updatedDevice);

      // Sync to UnitSpecs InventoryUnits if it's a PC or Laptop
      await syncToUnitSpecs(updatedDevice, "InventoryUnits");

      // Move from DeployedUnits to InventoryUnits in UnitSpecs if it exists there
      await moveDeviceInUnitSpecs(
        device.deviceTag,
        "DeployedUnits",
        "InventoryUnits"
      );

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

    // Log to User Logs
    try {
      console.log("Attempting to log bulk unassignment:", {
        user: currentUser?.uid,
        deviceCount: selected.length,
        employeeName: emp.fullName,
      });
      await createUserLog(
        currentUser?.uid,
        currentUser?.username || currentUser?.email,
        currentUser?.email,
        ACTION_TYPES.DEVICE_UNASSIGN,
        `Bulk unassigned ${selected.length} device(s) from ${
          emp.fullName || "employee"
        }`,
        {
          deviceCount: selected.length,
          employeeId: empId,
          employeeName: emp.fullName,
          reason: reason,
          deviceTags: selected.map((d) => d.deviceTag).join(", "),
        }
      );
      console.log("Bulk unassignment logged successfully");
    } catch (logError) {
      console.error("Error logging bulk unassignment:", logError);
    }

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
    return d.toLocaleDateString("en-GB", {
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
        transferor_name:
          getFirstLastName(transferor.firstName, transferor.lastName) || "",
        transferor_department: getDepartmentForForm(transferor),
        transferor_date_hired: transferor.dateHired
          ? formatTransferDate(transferor.dateHired)
          : "",
        transferor_position: transferor.position || "",
        transferee_name:
          getFirstLastName(transferee.firstName, transferee.lastName) || "",
        transferee_department: getDepartmentForForm(transferee),
        transferee_date_hired: transferee.dateHired
          ? formatTransferDate(transferee.dateHired)
          : "",
        transferee_position: transferee.position || "",
        devices: devices.map((device) => ({
          TransferDate: formatTransferDate(new Date()), // Use current date for transfer
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
      // Use current date for return document (not original assignment date)
      const currentDate = formatTransferDate(new Date());
      const data = {
        name: getFirstLastName(employee.firstName, employee.lastName) || "",
        department: getDepartmentForForm(employee),
        position: employee.position || "",
        dateHired: employee.dateHired
          ? formatTransferDate(employee.dateHired)
          : "",
        devices: [
          {
            assignmentDate: currentDate, // Use current date for return
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
      const employeeName = getFirstLastName(
        employee.firstName,
        employee.lastName
      )
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "_");
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
      // Use current date for return document (not original assignment date)
      const currentDate = formatTransferDate(new Date());
      const data = {
        name: getFirstLastName(employee.firstName, employee.lastName) || "",
        department: getDepartmentForForm(employee),
        position: employee.position || "",
        dateHired: employee.dateHired
          ? formatTransferDate(employee.dateHired)
          : "",
        devices: devices.map((device) => ({
          assignmentDate: currentDate, // Use current date for return
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
      const employeeName = getFirstLastName(
        employee.firstName,
        employee.lastName
      )
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "_");
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
          .assets-table {
            min-width: 1500px;
          }
          @media (min-width: 1600px) {
            .assets-table-container {
              overflow-x: visible !important;
            }
          }
          
          /* Text wrapping styles for long content */
          .assets-table-cell {
            word-wrap: break-word;
            word-break: break-word;
            white-space: normal;
            line-height: 1.4;
            vertical-align: top;
          }
          
          .assets-table-cell-tag {
            max-width: 200px;
            min-width: 180px;
          }
          
          .assets-table-cell-model {
            max-width: 180px;
            min-width: 150px;
          }
          
          .assets-table-cell-assigned {
            max-width: 200px;
            min-width: 180px;
          }
          
          .assets-table-cell-brand {
            max-width: 150px;
            min-width: 120px;
          }
          
          .assets-table-cell-type {
            max-width: 130px;
            min-width: 110px;
          }
          
          .assets-table-cell-remarks {
            max-width: 120px;
            min-width: 100px;
          }
          
          /* Tooltip styles for truncated content */
          .assets-table-cell-tooltip {
            position: relative;
            cursor: help;
          }
          
          .assets-table-cell-tooltip:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            max-width: 300px;
            word-wrap: break-word;
            white-space: normal;
            pointer-events: none;
          }
          
          .assets-table-cell-tooltip:hover::before {
            content: '';
            position: absolute;
            bottom: 94%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: rgba(0, 0, 0, 0.9);
            z-index: 1000;
            pointer-events: none;
          }
          
          /* Responsive adjustments */
          @media (max-width: 1200px) {
            .assets-table-cell-tag {
              max-width: 160px;
              min-width: 140px;
            }
            
            .assets-table-cell-model {
              max-width: 150px;
              min-width: 120px;
            }
            
            .assets-table-cell-assigned {
              max-width: 170px;
              min-width: 150px;
            }
            
            .assets-table-cell-brand {
              max-width: 120px;
              min-width: 100px;
            }
            
            .assets-table-cell-type {
              max-width: 110px;
              min-width: 90px;
            }
            
            .assets-table-cell-remarks {
              max-width: 100px;
              min-width: 80px;
            }
          }

          /* Custom scrollbar with transparent background */
          .assets-main-scroll::-webkit-scrollbar {
            width: 10px;
          }

          .assets-main-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .assets-main-scroll::-webkit-scrollbar-thumb {
            background: ${
              isDarkMode
                ? "rgba(156, 163, 175, 0.3)"
                : "rgba(209, 213, 219, 0.5)"
            };
            border-radius: 5px;
          }

          .assets-main-scroll::-webkit-scrollbar-thumb:hover {
            background: ${
              isDarkMode
                ? "rgba(156, 163, 175, 0.5)"
                : "rgba(209, 213, 219, 0.8)"
            };
          }

          /* Firefox scrollbar */
          .assets-main-scroll {
            scrollbar-width: thin;
            scrollbar-color: ${
              isDarkMode
                ? "rgba(156, 163, 175, 0.3)"
                : "rgba(209, 213, 219, 0.5)"
            } transparent;
          }
        `}
      </style>
      <div
        className="assets-container assets-main-scroll"
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "transparent",
          fontFamily:
            "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          overflow: "hidden",
          boxSizing: "border-box",
          color: isDarkMode ? "#f3f4f6" : "#222e3a",
        }}
      >
        {/* Fixed Header - Search bar and buttons section */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            flexShrink: 0,
            background: isDarkMode ? "#1f2937" : "rgb(255, 255, 255)",
            borderBottom: `1px solid ${isDarkMode ? "#374151" : "#e5e7eb"}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px 20px",
              borderBottom: `1px solid ${isDarkMode ? "#374151" : "#e5e7eb"}`,
              gap: "12px",
              flexWrap: "wrap",
            }}
            className="assets-search-container"
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: isDarkMode ? "#374151" : "#f9fafb",
                borderRadius: "6px",
                border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                padding: "10px 14px",
                flex: 1,
                maxWidth: "400px",
                minWidth: "280px",
              }}
            >
              <svg
                width="18"
                height="18"
                style={{
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                  opacity: 0.8,
                }}
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
                className={
                  isDarkMode ? "search-input-dark" : "search-input-light"
                }
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "14px",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
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
                disabled={
                  !selectedDeviceIds.length || bulkDeleteProgress.total > 0
                }
                onClick={handleBulkDelete}
                style={{
                  padding: "9px 16px",
                  border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                  borderRadius: "6px",
                  background:
                    selectedDeviceIds.length && bulkDeleteProgress.total === 0
                      ? "#dc2626"
                      : isDarkMode
                      ? "#374151"
                      : "#f3f4f6",
                  color:
                    selectedDeviceIds.length && bulkDeleteProgress.total === 0
                      ? "#fff"
                      : isDarkMode
                      ? "#6b7280"
                      : "#9ca3af",
                  cursor:
                    selectedDeviceIds.length && bulkDeleteProgress.total === 0
                      ? "pointer"
                      : "not-allowed",
                  fontSize: "14px",
                  fontWeight: 500,
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                  minWidth: "80px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  position: "relative",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                </svg>
                Delete
                {bulkDeleteProgress.total > 0 && (
                  <span style={{ fontSize: 11, marginLeft: 6 }}>
                    {bulkDeleteProgress.current}/{bulkDeleteProgress.total}
                  </span>
                )}
              </button>
              <button
                disabled={!selectedDeviceIds.length}
                onClick={handleBulkReassign}
                style={{
                  padding: "9px 16px",
                  border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                  borderRadius: "6px",
                  background: selectedDeviceIds.length
                    ? "#3b82f6"
                    : isDarkMode
                    ? "#374151"
                    : "#f3f4f6",
                  color: selectedDeviceIds.length
                    ? "#fff"
                    : isDarkMode
                    ? "#6b7280"
                    : "#9ca3af",
                  cursor: selectedDeviceIds.length ? "pointer" : "not-allowed",
                  fontSize: "14px",
                  fontWeight: 500,
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                  minWidth: "80px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
                Reassign
              </button>
              <button
                disabled={!selectedDeviceIds.length}
                onClick={handleBulkUnassign}
                style={{
                  padding: "9px 16px",
                  border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                  borderRadius: "6px",
                  background: selectedDeviceIds.length
                    ? "#ef4444"
                    : isDarkMode
                    ? "#374151"
                    : "#f3f4f6",
                  color: selectedDeviceIds.length
                    ? "#fff"
                    : isDarkMode
                    ? "#6b7280"
                    : "#9ca3af",
                  cursor: selectedDeviceIds.length ? "pointer" : "not-allowed",
                  fontSize: "14px",
                  fontWeight: 500,
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                  minWidth: "80px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                Unassign
              </button>
              <button
                onClick={handleExportToExcel}
                style={{
                  padding: "9px 16px",
                  border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                  borderRadius: "6px",
                  background: isDarkMode ? "#374151" : "#f3f4f6",
                  color: isDarkMode ? "#e5e7eb" : "#374151",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 500,
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                  minWidth: "80px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                title="Export current list to Excel"
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Filter Status Display */}
        {hasActiveHeaderFilters && (
          <div
            style={{
              background: isDarkMode ? "#1e293b" : "#f0f9ff",
              border: `1px solid ${isDarkMode ? "#475569" : "#0ea5e9"}`,
              borderRadius: "6px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "14px",
              fontFamily:
                "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: isDarkMode ? "#60a5fa" : "#0369a1",
              }}
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
                <path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.586a1 1 0 0 1-.293.707l-6.414 6.414a1 1 0 0 0-.293.707V17l-4 4v-6.586a1 1 0 0 0-.293-.707L3.293 7.293A1 1 0 0 1 3 6.586V4z" />
              </svg>
              <span style={{ fontWeight: 500 }}>
                {Object.values(headerFilters).filter(Boolean).length} active
                filter(s)
              </span>
            </div>

            <div style={{ flex: 1 }}>
              {Object.entries(headerFilters)
                .filter(([key, value]) => value)
                .map(([key, value]) => (
                  <span
                    key={key}
                    style={{
                      display: "inline-block",
                      background: isDarkMode ? "#374151" : "#ffffff",
                      border: `1px solid ${isDarkMode ? "#60a5fa" : "#0ea5e9"}`,
                      borderRadius: "4px",
                      padding: "4px 8px",
                      margin: "0 4px 4px 0",
                      fontSize: "12px",
                      color: isDarkMode ? "#60a5fa" : "#0369a1",
                    }}
                  >
                    {key}: {value}
                  </span>
                ))}
            </div>

            <button
              onClick={clearAllHeaderFilters}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                border: `1px solid ${isDarkMode ? "#60a5fa" : "#0ea5e9"}`,
                borderRadius: "4px",
                background: isDarkMode ? "#374151" : "#ffffff",
                color: isDarkMode ? "#60a5fa" : "#0369a1",
                fontFamily:
                  "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                cursor: "pointer",
                transition: "all 0.2s",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = isDarkMode ? "#60a5fa" : "#0ea5e9";
                e.target.style.color = isDarkMode ? "#111827" : "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = isDarkMode ? "#374151" : "#ffffff";
                e.target.style.color = isDarkMode ? "#60a5fa" : "#0369a1";
              }}
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
              Clear All Filters
            </button>
          </div>
        )}

        {/* Scrollable Table Container */}
        <div
          style={{
            background: isDarkMode ? "#1f2937" : "#fff",
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
                background: isDarkMode ? "#1f2937" : "#fff",
                fontSize: "14px",
                border: `1px solid ${isDarkMode ? "#374151" : "#d1d5db"}`,
              }}
            >
              <thead style={{ position: "sticky", top: "0", zIndex: "10" }}>
                {/* Header Row with Column Titles */}
                <tr
                  style={{
                    background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                    borderBottom: `1px solid ${
                      isDarkMode ? "#4b5563" : "#e5e7eb"
                    }`,
                  }}
                >
                  <th
                    style={{
                      padding: "8px 16px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      width: "40px",
                      textAlign: "center",
                      fontWeight: 500,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      zIndex: 10,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={false} // never show a checkmark
                      ref={(el) => {
                        if (!el) return;
                        // show "-" only when something is selected
                        el.indeterminate = isAnySelectedOnPage;
                      }}
                      onChange={toggleDeselectAll}
                      style={{
                        width: 16,
                        height: 16,
                        accentColor: "#6b7280",
                        border: `1px solid ${
                          isDarkMode ? "#4b5563" : "#d1d5db"
                        }`,
                        borderRadius: "3px",
                        colorScheme: isDarkMode ? "dark" : "light",
                      }}
                      title="Deselect all"
                    />
                  </th>
                  <th
                    style={{
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      zIndex: 10,
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "120px",
                      maxWidth: "120px",
                      minWidth: "100px",
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      zIndex: 10,
                    }}
                  >
                    Device Tag
                  </th>
                  <th
                    style={{
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "130px",
                      maxWidth: "130px",
                      minWidth: "110px",
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      zIndex: 10,
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "150px",
                      maxWidth: "150px",
                      minWidth: "120px",
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      zIndex: 10,
                    }}
                  >
                    Brand
                  </th>
                  <th
                    style={{
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "180px",
                      maxWidth: "180px",
                      minWidth: "150px",
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      zIndex: 10,
                    }}
                  >
                    Model
                  </th>
                  <th
                    style={{
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "200px",
                      maxWidth: "200px",
                      minWidth: "180px",
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      zIndex: 10,
                    }}
                  >
                    Assigned To
                  </th>
                  <th
                    style={{
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "130px",
                      maxWidth: "130px",
                      minWidth: "110px",
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      zIndex: 10,
                    }}
                  >
                    Device Owner
                  </th>
                  <th
                    style={{
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "120px",
                      maxWidth: "120px",
                      minWidth: "100px",
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      zIndex: 10,
                    }}
                  >
                    Date Assigned
                  </th>
                  <th
                    style={{
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "120px",
                      maxWidth: "120px",
                      minWidth: "70px",
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      zIndex: 10,
                    }}
                  >
                    Condition
                  </th>
                  <th
                    style={{
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "180px",
                      maxWidth: "180px",
                      minWidth: "150px",
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      zIndex: 10,
                    }}
                  >
                    Remarks
                  </th>
                  <th
                    style={{
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "100px",
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      zIndex: 10,
                    }}
                  >
                    Actions
                  </th>
                </tr>

                {/* Filter Row */}
                <tr
                  style={{
                    background: isDarkMode ? "#374151" : "#f8fafc",
                    borderBottom: `2px solid ${
                      isDarkMode ? "#4b5563" : "#e5e7eb"
                    }`,
                  }}
                >
                  <th
                    style={{
                      padding: "8px 12px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      width: "40px",
                      textAlign: "center",
                      position: "sticky",
                      top: "40px",
                      background: isDarkMode ? "#374151" : "#f8fafc",
                      zIndex: 10,
                    }}
                  >
                    {hasActiveHeaderFilters && (
                      <button
                        onClick={clearAllHeaderFilters}
                        style={{
                          padding: "2px 4px",
                          fontSize: "10px",
                          border: `1px solid ${
                            isDarkMode ? "#ef4444" : "#dc2626"
                          }`,
                          borderRadius: "3px",
                          background: isDarkMode ? "#374151" : "#ffffff",
                          color: isDarkMode ? "#ef4444" : "#dc2626",
                          fontFamily:
                            "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = isDarkMode
                            ? "#ef4444"
                            : "#dc2626";
                          e.target.style.color = "#ffffff";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = isDarkMode
                            ? "#374151"
                            : "#ffffff";
                          e.target.style.color = isDarkMode
                            ? "#ef4444"
                            : "#dc2626";
                        }}
                        title="Clear all filters"
                      >
                        Clear
                      </button>
                    )}
                  </th>
                  <th
                    style={{
                      padding: "8px 12px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      textAlign: "center",
                      position: "sticky",
                      top: "40px",
                      background: isDarkMode ? "#374151" : "#f8fafc",
                      zIndex: 10,
                    }}
                  >
                    {/* No filter for row number */}
                  </th>
                  <th
                    style={{
                      padding: "8px 12px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      width: "120px",
                      maxWidth: "120px",
                      minWidth: "100px",
                      textAlign: "center",
                      position: "sticky",
                      top: "40px",
                      background: isDarkMode ? "#374151" : "#f8fafc",
                      zIndex: 10,
                    }}
                  >
                    <TextFilter
                      value={headerFilters.deviceTag || ""}
                      onChange={(value) =>
                        updateHeaderFilter("deviceTag", value)
                      }
                      placeholder="Filter by tag..."
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 12px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      width: "130px",
                      maxWidth: "130px",
                      minWidth: "110px",
                      textAlign: "center",
                      position: "sticky",
                      top: "40px",
                      background: isDarkMode ? "#374151" : "#f8fafc",
                      zIndex: 10,
                    }}
                  >
                    <DropdownFilter
                      value={headerFilters.deviceType || ""}
                      onChange={(value) =>
                        updateHeaderFilter("deviceType", value)
                      }
                      options={deviceTypes.map((type) => type.label)}
                      placeholder="All Types"
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 12px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      width: "150px",
                      maxWidth: "150px",
                      minWidth: "120px",
                      textAlign: "center",
                      position: "sticky",
                      top: "40px",
                      background: isDarkMode ? "#374151" : "#f8fafc",
                      zIndex: 10,
                    }}
                  >
                    <TextFilter
                      value={headerFilters.brand || ""}
                      onChange={(value) => updateHeaderFilter("brand", value)}
                      placeholder="Filter by brand..."
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 12px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      width: "180px",
                      maxWidth: "180px",
                      minWidth: "150px",
                      textAlign: "center",
                      position: "sticky",
                      top: "40px",
                      background: isDarkMode ? "#374151" : "#f8fafc",
                      zIndex: 10,
                    }}
                  >
                    <TextFilter
                      value={headerFilters.model || ""}
                      onChange={(value) => updateHeaderFilter("model", value)}
                      placeholder="Filter by model..."
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 12px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      width: "200px",
                      maxWidth: "200px",
                      minWidth: "180px",
                      textAlign: "center",
                      position: "sticky",
                      top: "40px",
                      background: isDarkMode ? "#374151" : "#f8fafc",
                      zIndex: 10,
                    }}
                  >
                    <TextFilter
                      value={headerFilters.assignedTo || ""}
                      onChange={(value) =>
                        updateHeaderFilter("assignedTo", value)
                      }
                      placeholder="Filter by employee..."
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 12px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      width: "130px",
                      maxWidth: "130px",
                      minWidth: "110px",
                      textAlign: "center",
                      position: "sticky",
                      top: "40px",
                      background: isDarkMode ? "#374151" : "#f8fafc",
                      zIndex: 10,
                    }}
                  >
                    <DropdownFilter
                      value={headerFilters.client || ""}
                      onChange={(value) => updateHeaderFilter("client", value)}
                      options={clients.map((client) => client.clientName)}
                      placeholder="All Owners"
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 12px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      width: "110px",
                      maxWidth: "110px",
                      minWidth: "90px",
                      textAlign: "center",
                      position: "sticky",
                      top: "40px",
                      background: isDarkMode ? "#374151" : "#f8fafc",
                      zIndex: 10,
                    }}
                  >
                    <DateFilter
                      value={headerFilters.assignmentDate || ""}
                      onChange={(value) =>
                        updateHeaderFilter("assignmentDate", value)
                      }
                      placeholder="Filter by date..."
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 12px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      width: "110px",
                      maxWidth: "110px",
                      minWidth: "65px",
                      textAlign: "center",
                      position: "sticky",
                      top: "40px",
                      background: isDarkMode ? "#374151" : "#f8fafc",
                      zIndex: 10,
                    }}
                  >
                    <DropdownFilter
                      value={headerFilters.condition || ""}
                      onChange={(value) =>
                        updateHeaderFilter("condition", value)
                      }
                      options={conditions}
                      placeholder="All Conditions"
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 12px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      width: "110px",
                      maxWidth: "110px",
                      minWidth: "90px",
                      textAlign: "center",
                      position: "sticky",
                      top: "40px",
                      background: isDarkMode ? "#374151" : "#f8fafc",
                      zIndex: 10,
                    }}
                  >
                    <TextFilter
                      value={headerFilters.remarks || ""}
                      onChange={(value) => updateHeaderFilter("remarks", value)}
                      placeholder="Filter by remarks..."
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 12px",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                      width: "100px",
                      textAlign: "center",
                      position: "sticky",
                      top: "40px",
                      background: isDarkMode ? "#374151" : "#f8fafc",
                      zIndex: 10,
                    }}
                  >
                    {/* No filter for actions */}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="12" style={{ padding: "0", border: "none" }}>
                      <TableLoadingSpinner text="Loading assigned assets..." />
                    </td>
                  </tr>
                ) : currentPageDevices.length === 0 ? (
                  <tr>
                    <td
                      colSpan="12"
                      style={{
                        padding: "40px 20px",
                        textAlign: "center",
                        color: isDarkMode ? "#6b7280" : "#9ca3af",
                        fontSize: "14px",
                        fontWeight: "400",
                        border: `1px solid ${
                          isDarkMode ? "#4b5563" : "#d1d5db"
                        }`,
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
                              ? isDarkMode
                                ? "#1f2937"
                                : "rgb(250, 250, 252)"
                              : isDarkMode
                              ? "#111827"
                              : "rgb(240, 240, 243)",
                          cursor: "pointer",
                          transition: "background 0.15s",
                          borderBottom: `1px solid ${
                            isDarkMode ? "#374151" : "#f3f4f6"
                          }`,
                        }}
                        onClick={(e) => {
                          if (e.target.type !== "checkbox") {
                            toggleSelectDevice(device.id);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (index % 2 === 0) {
                            e.currentTarget.style.background = isDarkMode
                              ? "#374151"
                              : "rgb(235, 235, 240)";
                          } else {
                            e.currentTarget.style.background = isDarkMode
                              ? "#4b5563"
                              : "rgb(225, 225, 235)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            index % 2 === 0
                              ? isDarkMode
                                ? "#1f2937"
                                : "rgb(250, 250, 252)"
                              : isDarkMode
                              ? "#111827"
                              : "rgb(240, 240, 243)";
                        }}
                      >
                        <td
                          style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            border: `1px solid ${
                              isDarkMode ? "#4b5563" : "#d1d5db"
                            }`,
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
                              accentColor: "#6b7280",
                              border: `1px solid ${
                                isDarkMode ? "#6b7280" : "#d1d5db"
                              }`,
                              borderRadius: "3px",
                              colorScheme: isDarkMode ? "dark" : "light",
                            }}
                            title="Select device"
                          />
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            color: isDarkMode ? "#9ca3af" : "#6b7280",
                            fontSize: "14px",
                            fontWeight: "500",
                            border: `1px solid ${
                              isDarkMode ? "#4b5563" : "#d1d5db"
                            }`,
                            textAlign: "center",
                          }}
                        >
                          {rowIndex}
                        </td>
                        <td
                          className="assets-table-cell assets-table-cell-tag"
                          style={{
                            padding: "8px 12px",
                            color: isDarkMode
                              ? "#d1d5db"
                              : "rgb(107, 114, 128)",
                            fontSize: "14px",
                            border: `1px solid ${
                              isDarkMode ? "#4b5563" : "#d1d5db"
                            }`,
                            verticalAlign: "top",
                            textAlign: "center",
                          }}
                        >
                          {renderCellWithTooltip(device.deviceTag, 35, (e) => {
                            e.stopPropagation();
                            handleShowDeviceHistory(device);
                          })}
                        </td>
                        <td
                          className="assets-table-cell assets-table-cell-type"
                          style={{
                            padding: "8px 12px",
                            color: isDarkMode ? "#d1d5db" : "#6b7280",
                            fontSize: "14px",
                            border: `1px solid ${
                              isDarkMode ? "#4b5563" : "#d1d5db"
                            }`,
                            verticalAlign: "top",
                            textAlign: "center",
                          }}
                        >
                          {renderCellWithTooltip(device.deviceType, 18)}
                        </td>
                        <td
                          className="assets-table-cell assets-table-cell-brand"
                          style={{
                            padding: "8px 12px",
                            color: isDarkMode ? "#d1d5db" : "#6b7280",
                            fontSize: "14px",
                            border: `1px solid ${
                              isDarkMode ? "#4b5563" : "#d1d5db"
                            }`,
                            verticalAlign: "top",
                            textAlign: "center",
                          }}
                        >
                          {renderCellWithTooltip(device.brand, 20)}
                        </td>
                        <td
                          className="assets-table-cell assets-table-cell-model"
                          style={{
                            padding: "8px 12px",
                            color: isDarkMode ? "#d1d5db" : "#6b7280",
                            fontSize: "14px",
                            border: `1px solid ${
                              isDarkMode ? "#4b5563" : "#d1d5db"
                            }`,
                            verticalAlign: "top",
                            textAlign: "center",
                          }}
                        >
                          {renderCellWithTooltip(device.model, 25)}
                        </td>
                        <td
                          className="assets-table-cell assets-table-cell-assigned"
                          style={{
                            padding: "8px 12px",
                            color: isDarkMode ? "#d1d5db" : "#6b7280",
                            fontSize: "14px",
                            border: `1px solid ${
                              isDarkMode ? "#4b5563" : "#d1d5db"
                            }`,
                            verticalAlign: "top",
                            textAlign: "center",
                          }}
                        >
                          {renderCellWithTooltip(
                            getEmployeeName(device.assignedTo),
                            30
                          )}
                        </td>
                        <td
                          className="assets-table-cell"
                          style={{
                            padding: "8px 12px",
                            color: isDarkMode ? "#d1d5db" : "#6b7280",
                            fontSize: "14px",
                            border: `1px solid ${
                              isDarkMode ? "#4b5563" : "#d1d5db"
                            }`,
                            verticalAlign: "top",
                            width: "130px",
                            maxWidth: "130px",
                            minWidth: "110px",
                            textAlign: "center",
                          }}
                        >
                          {renderCellWithTooltip(
                            getDeviceOwner(device) || "-",
                            18
                          )}
                        </td>
                        <td
                          className="assets-table-cell"
                          style={{
                            padding: "8px 12px",
                            color: isDarkMode ? "#d1d5db" : "#6b7280",
                            fontSize: "14px",
                            border: `1px solid ${
                              isDarkMode ? "#4b5563" : "#d1d5db"
                            }`,
                            verticalAlign: "top",
                            maxWidth: "110px",
                            minWidth: "90px",
                            textAlign: "center",
                          }}
                        >
                          <span style={{ display: "block", lineHeight: "1.4" }}>
                            {device.assignmentDate
                              ? new Date(
                                  device.assignmentDate.seconds
                                    ? device.assignmentDate.seconds * 1000
                                    : device.assignmentDate
                                ).toLocaleDateString()
                              : ""}
                          </span>
                        </td>
                        <td
                          className="assets-table-cell"
                          style={{
                            padding: "8px 12px",
                            fontSize: "14px",
                            border: `1px solid ${
                              isDarkMode ? "#4b5563" : "#d1d5db"
                            }`,
                            verticalAlign: "top",
                            maxWidth: "110px",
                            minWidth: "65px",
                            textAlign: "center",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: "4px", // Rounded border style instead of oval
                              fontSize: "12px",
                              fontWeight: "600",
                              color: getConditionTextColor(device.condition),
                              backgroundColor: getConditionColor(
                                device.condition
                              ),
                              lineHeight: "1.2",
                              whiteSpace: "nowrap",
                              minWidth: "70px",
                              textAlign: "center",
                            }}
                          >
                            {device.condition || "UNKNOWN"}
                          </span>
                        </td>
                        <td
                          className="assets-table-cell assets-table-cell-remarks"
                          style={{
                            padding: "8px 12px",
                            color: isDarkMode ? "#d1d5db" : "#6b7280",
                            fontSize: "14px",
                            border: `1px solid ${
                              isDarkMode ? "#4b5563" : "#d1d5db"
                            }`,
                            verticalAlign: "top",
                            maxWidth: "110px",
                            minWidth: "90px",
                            textAlign: "center",
                          }}
                        >
                          {renderCellWithTooltip(device.remarks, 15)}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            textAlign: "center",
                            border: `1px solid ${
                              isDarkMode ? "#4b5563" : "#d1d5db"
                            }`,
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
                                padding: "3px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                                color: isDarkMode ? "#9ca3af" : "#6b7280",
                                minWidth: "24px",
                                minHeight: "24px",
                              }}
                              title="Edit"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(device);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#3b82f6";
                                e.currentTarget.style.color = "#ffffff";
                                e.currentTarget.style.transform = "scale(1.1)";
                                e.currentTarget.style.boxShadow =
                                  "0 4px 12px rgba(59, 130, 246, 0.3)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "transparent";
                                e.currentTarget.style.color = isDarkMode
                                  ? "#9ca3af"
                                  : "#6b7280";
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              <svg
                                width="14"
                                height="14"
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
                background: isDarkMode ? "#1f2937" : "#fff",
                borderRadius: "0",
                boxShadow: "none",
                border: "none",
                borderTop: isDarkMode
                  ? "1px solid #374151"
                  : "1px solid #e5e7eb",
                position: "sticky",
                bottom: "0",
                zIndex: "10",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  color: isDarkMode ? "#f3f4f6" : "#445F6D",
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
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #e0e7ef",
                      fontSize: "13px",
                      background: isDarkMode ? "#374151" : "#fff",
                      color: isDarkMode ? "#f3f4f6" : "#445F6D",
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
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #e0e7ef",
                      background:
                        currentPage === 1
                          ? isDarkMode
                            ? "#374151"
                            : "#f5f7fa"
                          : isDarkMode
                          ? "#1f2937"
                          : "#fff",
                      color:
                        currentPage === 1
                          ? isDarkMode
                            ? "#6b7280"
                            : "#9ca3af"
                          : isDarkMode
                          ? "#f3f4f6"
                          : "#445F6D",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
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
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #e0e7ef",
                      background:
                        currentPage === 1
                          ? isDarkMode
                            ? "#374151"
                            : "#f5f7fa"
                          : isDarkMode
                          ? "#1f2937"
                          : "#fff",
                      color:
                        currentPage === 1
                          ? isDarkMode
                            ? "#6b7280"
                            : "#9ca3af"
                          : isDarkMode
                          ? "#f3f4f6"
                          : "#445F6D",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
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
                            border: isDarkMode
                              ? "1px solid #4b5563"
                              : "1px solid #e0e7ef",
                            background:
                              i === currentPage
                                ? "#2563eb"
                                : isDarkMode
                                ? "#1f2937"
                                : "#fff",
                            color:
                              i === currentPage
                                ? "#fff"
                                : isDarkMode
                                ? "#f3f4f6"
                                : "#445F6D",
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
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #e0e7ef",
                      background:
                        currentPage === totalPages
                          ? isDarkMode
                            ? "#374151"
                            : "#f5f7fa"
                          : isDarkMode
                          ? "#1f2937"
                          : "#fff",
                      color:
                        currentPage === totalPages
                          ? isDarkMode
                            ? "#6b7280"
                            : "#9ca3af"
                          : isDarkMode
                          ? "#f3f4f6"
                          : "#445F6D",
                      cursor:
                        currentPage === totalPages ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
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
                    disabled={currentPage === totalPages}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #e0e7ef",
                      background:
                        currentPage === totalPages
                          ? isDarkMode
                            ? "#374151"
                            : "#f5f7fa"
                          : isDarkMode
                          ? "#1f2937"
                          : "#fff",
                      color:
                        currentPage === totalPages
                          ? isDarkMode
                            ? "#6b7280"
                            : "#9ca3af"
                          : isDarkMode
                          ? "#f3f4f6"
                          : "#445F6D",
                      cursor:
                        currentPage === totalPages ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
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
                background: isDarkMode ? "#1f2937" : "#fff",
                padding: 24,
                borderRadius: 8,
                minWidth: 350,
                maxWidth: 480,
                width: "96vw",
                border: isDarkMode ? "1px solid #374151" : "none",
              }}
            >
              {!selectedTransferEmployee ? (
                <>
                  <h4
                    style={{
                      color: isDarkMode ? "#f3f4f6" : "#1f2937",
                      marginBottom: 16,
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  >
                    Reassign {selectedDeviceIds.length} Devices
                  </h4>
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={bulkAssignSearch}
                    onChange={(e) => setBulkAssignSearch(e.target.value)}
                    style={{
                      width: "100%",
                      marginBottom: 12,
                      padding: "12px 16px",
                      border: isDarkMode
                        ? "1.5px solid #4b5563"
                        : "1.5px solid #cbd5e1",
                      borderRadius: 8,
                      fontSize: 14,
                      background: isDarkMode ? "#374151" : "#f8fafc",
                      color: isDarkMode ? "#f3f4f6" : "#1f2937",
                      outline: "none",
                      transition: "border-color 0.2s, background 0.2s",
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      boxSizing: "border-box",
                    }}
                  />
                  <div
                    style={{
                      maxHeight: 200,
                      overflowY: "auto",
                      padding: 0,
                      margin: 0,
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #e2e8f0",
                      borderRadius: 8,
                      background: isDarkMode ? "#374151" : "#f9fafb",
                      marginBottom: 16,
                    }}
                  >
                    {(() => {
                      const filteredEmployees = employees.filter(
                        (emp) =>
                          emp.fullName
                            .toLowerCase()
                            .includes(bulkAssignSearch.toLowerCase()) &&
                          !emp.isResigned
                      );

                      if (filteredEmployees.length === 0) {
                        return (
                          <div
                            style={{
                              width: "100%",
                              padding: "20px 16px",
                              textAlign: "center",
                              color: isDarkMode ? "#9ca3af" : "#6b7280",
                              fontSize: 14,
                              fontWeight: 500,
                            }}
                          >
                            No employee found
                          </div>
                        );
                      }

                      return filteredEmployees.map((emp) => (
                        <div key={emp.id} style={{ width: "100%" }}>
                          <button
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "12px 16px",
                              background: isDarkMode ? "#1f2937" : "#fff",
                              color: isDarkMode ? "#f3f4f6" : "#374151",
                              border: "none",
                              borderBottom: isDarkMode
                                ? "1px solid #4b5563"
                                : "1px solid #e5e7eb",
                              fontWeight: 500,
                              fontSize: 14,
                              cursor: "pointer",
                              transition: "all 0.2s",
                              fontFamily:
                                "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = isDarkMode
                                ? "#374151"
                                : "#f3f4f6";
                              e.target.style.color = "#2563eb";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = isDarkMode
                                ? "#1f2937"
                                : "#fff";
                              e.target.style.color = isDarkMode
                                ? "#f3f4f6"
                                : "#374151";
                            }}
                            onClick={() => {
                              setSelectedTransferEmployee(emp);
                            }}
                          >
                            {emp.fullName}
                          </button>
                        </div>
                      ));
                    })()}
                  </div>
                  <button
                    onClick={() => setBulkReassignModalOpen(false)}
                    style={{
                      marginTop: 12,
                      background: isDarkMode ? "#6b7280" : "#e5e7eb",
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 16px",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "background 0.2s",
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <h4
                    style={{
                      marginBottom: 12,
                      color: isDarkMode ? "#f3f4f6" : "#1f2937",
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
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
                      background: isDarkMode ? "#374151" : "#f7f9fb",
                      borderRadius: 8,
                      padding: 8,
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #e0e7ef",
                    }}
                  >
                    <table style={{ width: "100%", fontSize: 14 }}>
                      <thead>
                        <tr
                          style={{
                            color: isDarkMode ? "#d1d5db" : "#445F6D",
                            fontWeight: 700,
                          }}
                        >
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
                      <tbody
                        style={{ color: isDarkMode ? "#f3f4f6" : "#374151" }}
                      >
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
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
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
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10,9 9,9 8,9" />
                      </svg>
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
                background: isDarkMode ? "#1f2937" : "#fff",
                padding: 24,
                borderRadius: 8,
                minWidth: 350,
                border: isDarkMode ? "1px solid #374151" : "none",
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
                        style={{ marginRight: 8, accentColor: "#6b7280" }}
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
                        style={{ marginRight: 8, accentColor: "#6b7280" }}
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
              setSelectedDeviceForHistory(null); // Clear history device when closing
            }}
            onGenerateTag={() => {}}
            employees={employees}
            clients={clients}
            tagError={tagError}
            setTagError={setTagError}
            saveError={saveError}
            isValid={true}
            useSerial={useSerial}
            setUseSerial={setUseSerial}
            onSerialToggle={() => setUseSerial(!useSerial)}
            editingDevice={form._editDeviceId}
            deviceTypes={deviceTypes}
            deviceForHistory={selectedDeviceForHistory} // Pass device for history display
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
                background: isDarkMode ? "#1f2937" : "#fff",
                padding: 24,
                borderRadius: 8,
                minWidth: 350,
                border: isDarkMode ? "1px solid #374151" : "none",
              }}
            >
              <h4
                style={{
                  color: isDarkMode ? "#f3f4f6" : "#000",
                }}
              >
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
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    disabled={generatingForm}
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
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10,9 9,9 8,9" />
                    </svg>
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
                background: isDarkMode ? "#1f2937" : "#fff",
                padding: 24,
                borderRadius: 8,
                minWidth: 350,
                border: isDarkMode ? "1px solid #374151" : "none",
              }}
            >
              <h4 style={{ color: isDarkMode ? "#f3f4f6" : "#000" }}>
                Unassign Device: {unassignDevice.deviceTag}
              </h4>
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
                        style={{ marginRight: 8, accentColor: "#6b7280" }}
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
                        style={{ marginRight: 8, accentColor: "#6b7280" }}
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
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                  disabled={unassignGenerating || !unassignReason}
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
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10,9 9,9 8,9" />
                  </svg>
                  {unassignGenerating
                    ? "Generating..."
                    : "Generate Return Form"}
                </button>
                <button
                  onClick={confirmUnassign}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: !unassignReason ? "not-allowed" : "pointer",
                    marginRight: 8,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    transition: "background 0.2s, box-shadow 0.2s",
                    opacity: !unassignReason ? 0.7 : 1,
                  }}
                  disabled={!unassignReason}
                >
                  Unassign Device
                </button>
                <button
                  onClick={() => setShowUnassignModal(false)}
                  style={{
                    background: "#6b7280",
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

        {/* Selection Warning Modal */}
        {showSelectionWarning && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowSelectionWarning(false)}
          >
            <div
              style={{
                backgroundColor: isDarkMode ? "#1f2937" : "white",
                padding: 30,
                borderRadius: 8,
                minWidth: 400,
                maxWidth: 500,
                boxShadow: isDarkMode
                  ? "0 10px 25px rgba(0, 0, 0, 0.5)"
                  : "0 4px 6px rgba(0, 0, 0, 0.1)",
                border: isDarkMode ? "1px solid #374151" : "none",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  margin: "0 0 20px 0",
                  color: "#d32f2f",
                  fontSize: "18px",
                  fontWeight: "600",
                }}
              >
                Selection Not Allowed
              </h3>
              <p
                style={{
                  margin: "0 0 20px 0",
                  lineHeight: 1.5,
                  whiteSpace: "pre-line",
                  color: isDarkMode ? "#e5e7eb" : "#374151",
                  fontSize: "14px",
                }}
              >
                {selectionWarningMessage}
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowSelectionWarning(false)}
                  style={{
                    padding: "8px 20px",
                    backgroundColor: "#1976d2",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: 600,
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#1565c0";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#1976d2";
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Device History Modal - Now combined with Edit Modal */}
        {/* History is now shown inside the Edit Device Modal */}
      </div>
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
            zIndex: 2500,
          }}
        >
          <div
            style={{
              background: isDarkMode ? "#1f2937" : "#fff",
              padding: "32px 36px",
              borderRadius: 18,
              minWidth: "min(420px, 92vw)",
              maxWidth: "min(520px, 95vw)",
              boxShadow: isDarkMode
                ? "0 12px 48px rgba(0,0,0,0.4)"
                : "0 12px 48px rgba(0,0,0,0.15)",
              border: isDarkMode ? "1px solid #374151" : "none",
              fontFamily: "Maax, sans-serif",
              position: "relative",
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: 16,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: "#dc2626",
                textAlign: "center",
              }}
            >
              Confirm Delete
            </h2>
            <p
              style={{
                margin: "0 0 14px 0",
                fontSize: 15,
                textAlign: "center",
                color: isDarkMode ? "#f3f4f6" : "#374151",
              }}
            >
              Delete {selectedDeviceIds.length} deployed device(s)?
            </p>
            {selectedDeviceIds.length > 0 && (
              <div
                style={{
                  maxHeight: 140,
                  overflowY: selectedDeviceIds.length > 10 ? "auto" : "visible",
                  background: isDarkMode ? "#111827" : "#f8fafc",
                  border: isDarkMode
                    ? "1px solid #374151"
                    : "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "10px 14px 12px 14px",
                  margin: "0 0 14px 0",
                  fontFamily: "Maax, sans-serif",
                  fontSize: 13,
                  lineHeight: 1.4,
                  color: isDarkMode ? "#e5e7eb" : "#1f2937",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedDeviceIds.slice(0, 10).map((id) => {
                    const d = devices.find((dev) => dev.id === id);
                    const tag = d?.deviceTag || id;
                    return (
                      <span
                        key={id}
                        style={{
                          background: isDarkMode ? "#1f2937" : "#fff",
                          border: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #d1d5db",
                          padding: "4px 8px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          letterSpacing: 0.3,
                          color: isDarkMode ? "#f3f4f6" : "#374151",
                        }}
                      >
                        {tag}
                      </span>
                    );
                  })}
                  {selectedDeviceIds.length > 10 && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isDarkMode ? "#9ca3af" : "#6b7280",
                        padding: "4px 6px",
                      }}
                    >
                      +{selectedDeviceIds.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}
            <p
              style={{
                margin: 0,
                marginTop: 4,
                fontSize: 13,
                textAlign: "center",
                color: isDarkMode ? "#9ca3af" : "#6b7280",
              }}
            >
              You can undo for {UNDO_WINDOW_MS / 1000} seconds after deleting.
            </p>
            <div
              style={{
                marginTop: 24,
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                onClick={confirmBulkDelete}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
              <button
                onClick={cancelBulkDelete}
                style={{
                  background: isDarkMode ? "#374151" : "#e5e7eb",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

export default Assets;
