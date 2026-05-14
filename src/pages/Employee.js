import { useState, useEffect, useRef } from "react";
import ExcelJS from "exceljs";
import {
  addEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
  resignEmployee,
  undoResignation,
} from "../services/employeeService";
import { getAllClients } from "../services/clientService";
import {
  getAllDevices,
  updateDevice,
  addDevice,
} from "../services/deviceService";
import {
  getDeviceHistoryForEmployee,
  logDeviceHistory,
  deleteDeviceHistory,
} from "../services/deviceHistoryService";
import {
  normalizeDeviceTypeWithLegacy,
  CANONICAL_DEVICE_TYPES,
} from "../utils/deviceTypeUtils";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useSnackbar } from "../components/Snackbar";
import LoadingSpinner, {
  TableLoadingSpinner,
} from "../components/LoadingSpinner";
import undoManager from "../utils/undoManager";
import { useTheme } from "../context/ThemeContext";
import PizZip from "pizzip"; // For DOCX file generation
import Docxtemplater from "docxtemplater"; // For DOCX template processing
import { saveAs } from "file-saver"; // File download functionality
import { useCurrentUser } from "../CurrentUserContext"; // Current user context
import { createUserLog, ACTION_TYPES } from "../services/userLogService"; // User logging service

// Defensive wrapper for createUserLog to prevent undefined actionType errors
const safeCreateUserLog = async (
  userId,
  userName,
  userEmail,
  actionType,
  description,
  affectedData = {}
) => {
  try {
    // Debug: Log ACTION_TYPES object to check if it's properly imported (only log once)
    if (!window.ACTION_TYPES_LOGGED) {
      console.log("ACTION_TYPES object:", ACTION_TYPES);
      window.ACTION_TYPES_LOGGED = true;
    }

    // Validate all required parameters
    if (!actionType || actionType === undefined || actionType === null) {
      console.error(
        "CRITICAL ERROR: actionType is invalid in safeCreateUserLog",
        {
          actionType,
          typeOfActionType: typeof actionType,
          userId,
          userName,
          userEmail,
          description,
          affectedData,
          stack: new Error().stack,
        }
      );

      // Try to determine which action type should be used based on description
      let fallbackActionType = ACTION_TYPES.SYSTEM_ERROR;
      if (description && description.toLowerCase().includes("import")) {
        fallbackActionType = ACTION_TYPES.DEVICE_IMPORT;
      } else if (
        description &&
        description.toLowerCase().includes("employee")
      ) {
        if (
          description.toLowerCase().includes("create") ||
          description.toLowerCase().includes("add")
        ) {
          fallbackActionType = ACTION_TYPES.EMPLOYEE_CREATE;
        } else if (description.toLowerCase().includes("update")) {
          fallbackActionType = ACTION_TYPES.EMPLOYEE_UPDATE;
        }
      }

      console.warn(`Using fallback actionType: ${fallbackActionType}`);
      actionType = fallbackActionType;
    }

    // Ensure all parameters are valid
    const safeUserId = userId || "system";
    const safeUserName = userName || "System User";
    const safeUserEmail = userEmail || "system@aims.local";
    const safeDescription = description || "No description provided";
    const safeAffectedData = affectedData || {};

    console.log("Calling createUserLog with validated parameters:", {
      userId: safeUserId,
      userName: safeUserName,
      userEmail: safeUserEmail,
      actionType,
      description: safeDescription,
    });

    return await createUserLog(
      safeUserId,
      safeUserName,
      safeUserEmail,
      actionType,
      safeDescription,
      safeAffectedData
    );
  } catch (error) {
    console.error("Error in safeCreateUserLog:", error);
    console.error("Full error details:", {
      error: error.message,
      stack: error.stack,
      userId,
      userName,
      userEmail,
      actionType,
      description,
      affectedData,
    });

    // Don't re-throw the error to prevent breaking the main functionality
    console.warn("User logging failed, but continuing with main operation");
    return null;
  }
};

const isValidName = (value) => /^[A-Za-zÑñ\s.'\-(),]+$/.test(value.trim());

// Helper: produce a YYYY-MM-DD string based on the local date (avoids UTC shift)
const toLocalISODate = (input) => {
  // Accept Date object or parsable value
  const date = input ? new Date(input) : new Date();
  if (isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Helper function to get current date in YYYY-MM-DD format (local)
const getCurrentDate = () => toLocalISODate(new Date());

// Helper function to convert MM/DD/YYYY to YYYY-MM-DD for date input
const convertToInputFormat = (dateStr) => {
  if (!dateStr) return "";

  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Handle MM/DD/YYYY format
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return "";
};

// Helper function to convert YYYY-MM-DD to MM/DD/YYYY for storage
const convertToStorageFormat = (dateStr) => {
  if (!dateStr) return "";

  // If already in MM/DD/YYYY format, return as-is
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  // Handle YYYY-MM-DD format
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
  }

  return "";
};

// === SEARCHABLE DROPDOWN COMPONENT ===
// Reusable searchable dropdown for client selection
function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder = "Search and select client...",
  displayKey = "clientName",
  valueKey = "id",
  formatDisplay = null,
  style = {},
}) {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter((option) => {
    const searchValue = option[displayKey];
    return (
      searchValue &&
      searchValue.toLowerCase().includes(searchTerm.toLowerCase())
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
    try {
      if (typeof onChange === "function") {
        // Always pass an event-like object so downstream handlers can destructure safely
        onChange({
          target: { name: valueKey || "value", value: option[valueKey] },
        });
      } else if (onChange && typeof onChange === "object") {
        // Fallback legacy behavior
        onChange({
          target: { name: valueKey || "value", value: option[valueKey] },
        });
      } else {
        console.warn(
          "handleSelectOption: onChange prop is not callable",
          onChange
        );
      }
    } catch (err) {
      console.error("Error in handleSelectOption", err);
    }
    setIsOpen(false);
    setSearchTerm("");
  };

  // Find the selected option to display its name
  const selectedOption = options.find((option) => option[valueKey] === value);

  // Get display text for selected option
  const getDisplayText = (option) => {
    if (formatDisplay) {
      return formatDisplay(option);
    }
    return option[displayKey];
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
      fontSize: "clamp(12px, 1.1vw, 14px)",
      padding: "clamp(6px, 0.8vw, 10px)",
      paddingRight: "32px",
      borderRadius: 6,
      border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
      background: isDarkMode ? "#374151" : "white",
      color: isDarkMode ? "#f3f4f6" : "#374151",
      height: "auto",
      boxSizing: "border-box",
      fontFamily: "inherit",
      outline: "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
      cursor: "pointer",
    },
    dropdownArrow: {
      position: "absolute",
      right: "8px",
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
      borderRadius: 6,
      maxHeight: "140px",
      overflowY: "auto",
      zIndex: 1000,
      boxShadow: isDarkMode
        ? "0 4px 12px rgba(0, 0, 0, 0.4)"
        : "0 4px 12px rgba(0, 0, 0, 0.15)",
      minWidth: "200px",
    },
    searchInput: {
      width: "100%",
      padding: "8px 12px",
      border: "none",
      borderBottom: isDarkMode ? "1px solid #4b5563" : "1px solid #e2e8f0",
      outline: "none",
      fontSize: "clamp(12px, 1.1vw, 14px)",
      fontFamily: "inherit",
      background: isDarkMode ? "#1f2937" : "#f8fafc",
      color: isDarkMode ? "#f3f4f6" : "#374151",
      boxSizing: "border-box",
    },
    option: {
      padding: "8px 12px",
      cursor: "pointer",
      fontSize: "clamp(12px, 1.1vw, 14px)",
      borderBottom: isDarkMode ? "1px solid #374151" : "1px solid #f1f5f9",
      fontFamily: "inherit",
      transition: "background-color 0.15s",
      background: isDarkMode ? "#1f2937" : "#fff",
      color: isDarkMode ? "#f3f4f6" : "#374151",
    },
    noResults: {
      padding: "8px 12px",
      color: isDarkMode ? "#9ca3af" : "#6b7280",
      fontStyle: "italic",
      fontSize: "clamp(12px, 1.1vw, 14px)",
      fontFamily: "inherit",
    },
  };

  return (
    <div ref={dropdownRef} style={dropdownStyles.container}>
      <div style={dropdownStyles.inputContainer}>
        <input
          type="text"
          value={selectedOption ? getDisplayText(selectedOption) : ""}
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
            placeholder="Type to search..."
            style={dropdownStyles.searchInput}
            autoFocus
          />
          {filteredOptions.length === 0 ? (
            <div style={dropdownStyles.noResults}>No options found</div>
          ) : (
            filteredOptions
              .slice()
              .sort((a, b) => a[displayKey].localeCompare(b[displayKey]))
              .map((option, index) => (
                <div
                  key={option[valueKey] || index}
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
                  {getDisplayText(option)}
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}

// Simple Modal Component with CompanyAssets styling
function EmployeeFormModal({
  data,
  onChange,
  onSave,
  onCancel,
  isValid,
  clients,
}) {
  const { isDarkMode } = useTheme();

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
          backgroundColor: isDarkMode ? "#1f2937" : "white",
          borderRadius: 12,
          padding: "clamp(16px, 2vw, 24px)",
          width: "100%",
          maxWidth: "min(480px, 90vw)",
          maxHeight: "95vh",
          overflow: "auto",
          fontFamily:
            'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
            color: isDarkMode ? "#f3f4f6" : "#222e3a",
            marginBottom: "clamp(16px, 2vw, 20px)",
            marginTop: 0,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {data.id
            ? data.isEntity
              ? "Edit Entity"
              : "Edit Employee"
            : data.isEntity
            ? "Add Entity"
            : "Add Employee"}
        </h2>

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
            {/* Only show name fields for employees, not entities */}
            {!data.isEntity && (
              <>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "clamp(12px, 1.1vw, 14px)",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      marginBottom: 4,
                    }}
                  >
                    First Name:
                  </label>
                  <input
                    name="firstName"
                    value={data.firstName || ""}
                    onChange={onChange}
                    style={{
                      width: "100%",
                      padding: "clamp(6px, 0.8vw, 10px)",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: "clamp(12px, 1.1vw, 14px)",
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box",
                      backgroundColor: isDarkMode ? "#374151" : "white",
                      color: isDarkMode ? "#f3f4f6" : "black",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "clamp(12px, 1.1vw, 14px)",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      marginBottom: 4,
                    }}
                  >
                    Middle Name:
                  </label>
                  <input
                    name="middleName"
                    value={data.middleName || ""}
                    onChange={onChange}
                    placeholder="Optional"
                    style={{
                      width: "100%",
                      padding: "clamp(6px, 0.8vw, 10px)",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: "clamp(12px, 1.1vw, 14px)",
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box",
                      backgroundColor: isDarkMode ? "#374151" : "white",
                      color: isDarkMode ? "#f3f4f6" : "black",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "clamp(12px, 1.1vw, 14px)",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      marginBottom: 4,
                    }}
                  >
                    Last Name:
                  </label>
                  <input
                    name="lastName"
                    value={data.lastName || ""}
                    onChange={onChange}
                    style={{
                      width: "100%",
                      padding: "clamp(6px, 0.8vw, 10px)",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: "clamp(12px, 1.1vw, 14px)",
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box",
                      backgroundColor: isDarkMode ? "#374151" : "white",
                      color: isDarkMode ? "#f3f4f6" : "black",
                    }}
                  />
                </div>
              </>
            )}

            {/* Show description field for entities only */}
            {data.isEntity && (
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "clamp(12px, 1.1vw, 14px)",
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    marginBottom: 4,
                  }}
                >
                  Description:
                </label>
                <input
                  name="description"
                  value={data.description || ""}
                  onChange={onChange}
                  placeholder="Entity Name or Room Name"
                  style={{
                    width: "100%",
                    padding: "clamp(6px, 0.8vw, 10px)",
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(12px, 1.1vw, 14px)",
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                    backgroundColor: isDarkMode ? "#374151" : "white",
                    color: isDarkMode ? "#f3f4f6" : "black",
                  }}
                />
              </div>
            )}

            {/* Show position field for employees only */}
            {!data.isEntity && (
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "clamp(12px, 1.1vw, 14px)",
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    marginBottom: 4,
                  }}
                >
                  Position:
                </label>
                <input
                  name="position"
                  value={data.position}
                  onChange={onChange}
                  style={{
                    width: "100%",
                    padding: "clamp(6px, 0.8vw, 10px)",
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(12px, 1.1vw, 14px)",
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                    backgroundColor: isDarkMode ? "#374151" : "white",
                    color: isDarkMode ? "#f3f4f6" : "black",
                  }}
                />
              </div>
            )}

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "clamp(12px, 1.1vw, 14px)",
                  fontWeight: 600,
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  marginBottom: 4,
                }}
              >
                Department:
              </label>
              <input
                name="department"
                value={data.department}
                onChange={onChange}
                style={{
                  width: "100%",
                  padding: "clamp(6px, 0.8vw, 10px)",
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: "clamp(12px, 1.1vw, 14px)",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: isDarkMode ? "#374151" : "white",
                  color: isDarkMode ? "#f3f4f6" : "black",
                }}
              />
            </div>

            {/* Show client and email fields for employees only */}
            {!data.isEntity && (
              <>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "clamp(12px, 1.1vw, 14px)",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      marginBottom: 4,
                    }}
                  >
                    Client:
                  </label>
                  <SearchableDropdown
                    value={data.clientId}
                    onChange={(evtOrValue) => {
                      const newValue =
                        evtOrValue && evtOrValue.target
                          ? evtOrValue.target.value
                          : evtOrValue;
                      // Use the provided onChange handler (handleFormChange in parent) with an event-like object
                      if (typeof onChange === "function") {
                        onChange({
                          target: { name: "clientId", value: newValue },
                        });
                      }
                    }}
                    options={clients}
                    placeholder="Search and select client..."
                    displayKey="clientName"
                    valueKey="id"
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "clamp(6px, 0.8vw, 10px)",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "clamp(12px, 1.1vw, 14px)",
                        fontWeight: 600,
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        marginBottom: 4,
                      }}
                    >
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
                        border: isDarkMode
                          ? "1px solid #4b5563"
                          : "1px solid #d1d5db",
                        borderRadius: 6,
                        fontSize: "clamp(12px, 1.1vw, 14px)",
                        fontFamily: "inherit",
                        outline: "none",
                        boxSizing: "border-box",
                        backgroundColor: isDarkMode ? "#374151" : "white",
                        color: isDarkMode ? "#f3f4f6" : "black",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "clamp(12px, 1.1vw, 14px)",
                        fontWeight: 600,
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        marginBottom: 4,
                      }}
                    >
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
                        border: isDarkMode
                          ? "1px solid #4b5563"
                          : "1px solid #d1d5db",
                        borderRadius: 6,
                        fontSize: "clamp(12px, 1.1vw, 14px)",
                        fontFamily: "inherit",
                        outline: "none",
                        boxSizing: "border-box",
                        backgroundColor: isDarkMode ? "#374151" : "white",
                        color: isDarkMode ? "#f3f4f6" : "black",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "clamp(12px, 1.1vw, 14px)",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      marginBottom: 4,
                    }}
                  >
                    Date Hired:
                  </label>
                  <input
                    type="date"
                    name="dateHired"
                    value={
                      data.dateHired ? convertToInputFormat(data.dateHired) : ""
                    }
                    onChange={(e) => {
                      const convertedDate = convertToStorageFormat(
                        e.target.value
                      );
                      onChange({
                        target: { name: "dateHired", value: convertedDate },
                      });
                    }}
                    lang="en-US"
                    style={{
                      width: "100%",
                      padding: "clamp(6px, 0.8vw, 10px)",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: "clamp(12px, 1.1vw, 14px)",
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box",
                      backgroundColor: isDarkMode ? "#374151" : "white",
                      color: isDarkMode ? "#f3f4f6" : "black",
                      colorScheme: isDarkMode ? "dark" : "light",
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Fixed footer with buttons */}
        <div
          style={{
            display: "flex",
            gap: "clamp(6px, 0.8vw, 10px)",
            justifyContent: "flex-end",
            marginTop: "clamp(12px, 1.5vw, 16px)",
            flexWrap: "wrap",
            flexShrink: 0,
            paddingTop: "clamp(8px, 1vw, 12px)",
            borderTop: isDarkMode ? "1px solid #4b5563" : "1px solid #f3f4f6",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "clamp(6px, 0.8vw, 10px) clamp(10px, 1.2vw, 14px)",
              border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
              borderRadius: 6,
              background: isDarkMode ? "#374151" : "white",
              color: isDarkMode ? "#f3f4f6" : "#374151",
              fontSize: "clamp(12px, 1.1vw, 14px)",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
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
              fontFamily: "inherit",
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
function BulkResignModal({ isOpen, onConfirm, onCancel, selectedCount }) {
  const { isDarkMode } = useTheme();

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
          backgroundColor: isDarkMode ? "#374151" : "white",
          borderRadius: 12,
          padding: 32,
          width: "90%",
          maxWidth: 400,
          fontFamily:
            'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: "0 20px 32px rgba(34, 46, 58, 0.2)",
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: isDarkMode ? "#f3f4f6" : "#222e3a",
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          Confirm Bulk Resign
        </h2>
        <p
          style={{
            color: isDarkMode ? "#d1d5db" : "#6b7280",
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          Are you sure you want to resign {selectedCount} employee(s)?
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              border: isDarkMode ? "1px solid #6b7280" : "1px solid #d1d5db",
              borderRadius: 6,
              background: isDarkMode ? "#4b5563" : "white",
              color: isDarkMode ? "#f3f4f6" : "#374151",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
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
              fontFamily: "inherit",
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
function ConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText,
  confirmColor = "#dc2626",
}) {
  const { isDarkMode } = useTheme();

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
          background: isDarkMode ? "#374151" : "#fff",
          padding: "36px 40px",
          borderRadius: 18,
          minWidth: "min(400px, 90vw)",
          maxWidth: "min(500px, 95vw)",
          width: "auto",
          boxShadow: "0 12px 48px rgba(37,99,235,0.18)",
          position: "relative",
          margin: "20px",
          boxSizing: "border-box",
          fontFamily:
            'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
            color: isDarkMode ? "#d1d5db" : "#374151",
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
              background: isDarkMode ? "#6b7280" : "#e0e7ef",
              color: isDarkMode ? "#f3f4f6" : "#233037",
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
function EmployeeAssetsModal({
  isOpen,
  onClose,
  employee,
  devices,
  deviceHistory = [],
  clients = [],
  getDepartmentForForm,
  currentUser,
  onDeviceUpdate,
}) {
  const { isDarkMode } = useTheme();
  const { showSuccess, showError } = useSnackbar();

  // Modal states for action confirmations
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: "", // 'unassign' or 'reassign'
    device: null,
    devices: [], // for bulk actions
    newEmployee: null, // for reassign
    isGenerating: false,
    progress: 0,
    docxBlob: null,
    isBulk: false,
    selectedCondition: "", // 'GOOD' or 'DEFECTIVE' for single unassign operations
    deviceConditions: {}, // Object to store individual device conditions for bulk operations: {deviceId: 'GOOD'|'DEFECTIVE'}
  });

  // State for reassign employee selection
  const [reassignEmployees, setReassignEmployees] = useState([]);

  // === UTILITY FUNCTIONS ===
  // Helper function to extract first and last name only for document forms
  const getFirstLastName = (firstName, lastName) => {
    if (!firstName && !lastName) return "";
    if (!firstName) return lastName || "";
    if (!lastName) return firstName || "";
    return `${firstName} ${lastName}`;
  };

  // Bulk selection state - separate for deployed and work from home assets
  const [selectedDeployedIds, setSelectedDeployedIds] = useState([]);
  const [selectedWfhIds, setSelectedWfhIds] = useState([]);
  const [showDeployedBulkActions, setShowDeployedBulkActions] = useState(false);
  const [showWfhBulkActions, setShowWfhBulkActions] = useState(false);

  // Load employees for reassignment
  useEffect(() => {
    if (actionModal.isOpen) {
      const loadEmployees = async () => {
        try {
          const employeeList = await getAllEmployees();
          const filteredEmployees = employeeList.filter(
            (emp) => !emp.isResigned && emp.id !== employee?.id
          );
          console.log("Loaded employees for reassignment:", filteredEmployees);
          console.log(
            "reassignEmployees will be set to:",
            filteredEmployees.length,
            "employees"
          );
          setReassignEmployees(filteredEmployees);
        } catch (error) {
          console.error("Error loading employees:", error);
        }
      };
      loadEmployees();
      // Reset bulk selection when modal opens
      setSelectedDeployedIds([]);
      setSelectedWfhIds([]);
      setShowDeployedBulkActions(false);
      setShowWfhBulkActions(false);
    }
  }, [actionModal.isOpen, employee?.id]);

  // Bulk selection handlers for deployed assets
  const handleSelectAllDeployedDevices = (checked) => {
    if (checked) {
      setSelectedDeployedIds(deployedAssets.map((device) => device.id));
    } else {
      setSelectedDeployedIds([]);
    }
    setShowDeployedBulkActions(checked && deployedAssets.length > 0);
  };

  const handleSelectDeployedDevice = (deviceId, checked) => {
    let newSelection;
    if (checked) {
      newSelection = [...selectedDeployedIds, deviceId];
    } else {
      newSelection = selectedDeployedIds.filter((id) => id !== deviceId);
    }
    setSelectedDeployedIds(newSelection);
    setShowDeployedBulkActions(newSelection.length > 0);
  };

  // Bulk selection handlers for work from home assets
  const handleSelectAllWfhDevices = (checked) => {
    if (checked) {
      setSelectedWfhIds(workFromHomeAssets.map((device) => device.id));
    } else {
      setSelectedWfhIds([]);
    }
    setShowWfhBulkActions(checked && workFromHomeAssets.length > 0);
  };

  const handleSelectWfhDevice = (deviceId, checked) => {
    let newSelection;
    if (checked) {
      newSelection = [...selectedWfhIds, deviceId];
    } else {
      newSelection = selectedWfhIds.filter((id) => id !== deviceId);
    }
    setSelectedWfhIds(newSelection);
    setShowWfhBulkActions(newSelection.length > 0);
  };

  // Bulk action handlers for deployed assets
  const handleDeployedBulkUnassign = () => {
    const selectedDevices = deployedAssets.filter((device) =>
      selectedDeployedIds.includes(device.id)
    );
    setActionModal({
      isOpen: true,
      type: "unassign",
      device: null,
      devices: selectedDevices,
      newEmployee: null,
      isGenerating: false,
      progress: 0,
      docxBlob: null,
      isBulk: true,
      selectedCondition: "",
      deviceConditions: {}, // Initialize empty - user will select for each device
    });
  };

  const handleDeployedBulkReassign = () => {
    const selectedDevices = deployedAssets.filter((device) =>
      selectedDeployedIds.includes(device.id)
    );
    setActionModal({
      isOpen: true,
      type: "reassign",
      device: null,
      devices: selectedDevices,
      newEmployee: null,
      isGenerating: false,
      progress: 0,
      docxBlob: null,
      isBulk: true,
      selectedCondition: "",
      deviceConditions: {},
    });
  };

  // Bulk action handlers for work from home assets
  const handleWfhBulkUnassign = () => {
    const selectedDevices = workFromHomeAssets.filter((device) =>
      selectedWfhIds.includes(device.id)
    );
    setActionModal({
      isOpen: true,
      type: "unassign",
      device: null,
      devices: selectedDevices,
      newEmployee: null,
      isGenerating: false,
      progress: 0,
      docxBlob: null,
      isBulk: true,
      selectedCondition: "",
      deviceConditions: {},
    });
  };

  const handleWfhBulkReassign = () => {
    const selectedDevices = workFromHomeAssets.filter((device) =>
      selectedWfhIds.includes(device.id)
    );
    setActionModal({
      isOpen: true,
      type: "reassign",
      device: null,
      devices: selectedDevices,
      newEmployee: null,
      isGenerating: false,
      progress: 0,
      docxBlob: null,
      isBulk: true,
      selectedCondition: "",
      deviceConditions: {},
    });
  };

  // Action handlers
  const handleUnassign = (device) => {
    setActionModal({
      isOpen: true,
      type: "unassign",
      device,
      devices: [device],
      newEmployee: null,
      isGenerating: false,
      progress: 0,
      docxBlob: null,
      isBulk: false,
      selectedCondition: "",
      deviceConditions: {},
    });
  };

  const handleReassign = (device) => {
    setActionModal({
      isOpen: true,
      type: "reassign",
      device,
      devices: [device],
      newEmployee: null,
      isGenerating: false,
      progress: 0,
      docxBlob: null,
      isBulk: false,
      selectedCondition: "",
      deviceConditions: {},
    });
  };

  const handleConfirmAction = async () => {
    const {
      type,
      devices,
      newEmployee,
      isBulk,
      selectedCondition,
      deviceConditions,
    } = actionModal;

    try {
      setActionModal((prev) => ({ ...prev, isGenerating: true, progress: 10 }));

      const progressStep = 70 / devices.length; // Distribute progress across devices
      let currentProgress = 10;

      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];

        if (type === "unassign") {
          // Get condition for this specific device (bulk) or use single condition
          const deviceCondition = isBulk
            ? deviceConditions[device.id]
            : selectedCondition;

          // Unassign device with updated condition
          await updateDevice(device.id, {
            assignedTo: null,
            assignmentDate: null,
            status: "AVAILABLE",
            condition: deviceCondition, // Update condition based on user selection
          });

          // Log device history
          await logDeviceHistory({
            employeeId: employee.id,
            employeeName: employee.fullName,
            deviceId: device.id,
            deviceTag: device.deviceTag,
            action: "unassigned",
            date: new Date().toISOString(),
            reason: isBulk
              ? "Bulk unassignment from Employee page"
              : "Manual unassignment from Employee page",
            condition: deviceCondition,
          });

          // Log to User Logs
          try {
            console.log("Attempting to log device unassignment:", {
              user: currentUser?.uid,
              deviceTag: device.deviceTag,
              employeeName: employee.fullName,
            });
            await createUserLog(
              currentUser?.uid,
              currentUser?.username || currentUser?.email,
              currentUser?.email,
              ACTION_TYPES.DEVICE_UNASSIGN,
              `Unassigned device ${device.deviceTag} from ${employee.fullName}`,
              {
                deviceTag: device.deviceTag,
                deviceType: device.deviceType,
                employeeId: employee.id,
                employeeName: employee.fullName,
                condition: deviceCondition,
                source: isBulk ? "bulk" : "single",
              }
            );
            console.log("Device unassignment logged successfully");
          } catch (logError) {
            console.error("Error logging device unassignment:", logError);
          }
        } else if (type === "reassign" && newEmployee) {
          // Reassign device - automatically change BRANDNEW to GOOD when reassigning
          const newCondition =
            device.condition === "BRANDNEW" ? "GOOD" : device.condition;

          await updateDevice(device.id, {
            assignedTo: newEmployee.id,
            assignmentDate: toLocalISODate(new Date()),
            status: "DEPLOYED",
            condition: newCondition,
          });

          // Log device history for unassignment from current employee
          await logDeviceHistory({
            employeeId: employee.id,
            employeeName: employee.fullName,
            deviceId: device.id,
            deviceTag: device.deviceTag,
            action: "unassigned",
            date: new Date().toISOString(),
            reason: isBulk
              ? `Bulk reassigned to ${newEmployee.fullName}`
              : `Reassigned to ${newEmployee.fullName}`,
            condition: device.condition, // Original condition before reassignment
          });

          // Log device history for assignment to new employee
          await logDeviceHistory({
            employeeId: newEmployee.id,
            employeeName: newEmployee.fullName,
            deviceId: device.id,
            deviceTag: device.deviceTag,
            action: "assigned",
            date: new Date().toISOString(),
            reason: isBulk
              ? `Bulk reassigned from ${employee.fullName}`
              : `Reassigned from ${employee.fullName}`,
            condition: newCondition, // New condition after reassignment
          });

          // Log to User Logs
          try {
            console.log("Attempting to log device reassignment:", {
              user: currentUser?.uid,
              deviceTag: device.deviceTag,
              fromEmployee: employee.fullName,
              toEmployee: newEmployee.fullName,
            });
            await createUserLog(
              currentUser?.uid,
              currentUser?.username || currentUser?.email,
              currentUser?.email,
              ACTION_TYPES.DEVICE_TRANSFER,
              `Reassigned device ${device.deviceTag} from ${employee.fullName} to ${newEmployee.fullName}`,
              {
                deviceTag: device.deviceTag,
                deviceType: device.deviceType,
                fromEmployeeId: employee.id,
                fromEmployeeName: employee.fullName,
                toEmployeeId: newEmployee.id,
                toEmployeeName: newEmployee.fullName,
                source: isBulk ? "bulk" : "single",
              }
            );
            console.log("Device reassignment logged successfully");
          } catch (logError) {
            console.error("Error logging device reassignment:", logError);
          }
        }

        currentProgress += progressStep;
        setActionModal((prev) => ({
          ...prev,
          progress: Math.min(currentProgress, 80),
        }));
      }

      setActionModal((prev) => ({ ...prev, progress: 85 }));
      await generateBulkDocx(type, devices, employee, newEmployee);

      // Clear bulk selection
      setSelectedDeployedIds([]);
      setSelectedWfhIds([]);
      setShowDeployedBulkActions(false);
      setShowWfhBulkActions(false);

      // Refresh device data
      if (onDeviceUpdate) {
        onDeviceUpdate();
      }

      const deviceCount = devices.length;
      const actionText = type === "unassign" ? "unassigned" : "reassigned";
      showSuccess(
        `${deviceCount} device${
          deviceCount > 1 ? "s" : ""
        } ${actionText} successfully!`
      );
    } catch (error) {
      console.error(`Error ${type}ing devices:`, error);
      showError(`Error ${type}ing devices: ${error.message}`);
      setActionModal((prev) => ({ ...prev, isGenerating: false, progress: 0 }));
    }
  };

  const generateDocx = async (
    actionType,
    device,
    fromEmployee,
    toEmployee = null
  ) => {
    try {
      setActionModal((prev) => ({ ...prev, progress: 40 }));

      const templatePath =
        actionType === "unassign"
          ? "/src/AccountabilityForms/ASSET ACCOUNTABILITY FORM - RETURN.docx"
          : "/src/AccountabilityForms/ASSET ACCOUNTABILITY FORM - TRANSFER.docx";

      const response = await fetch(templatePath);
      setActionModal((prev) => ({ ...prev, progress: 50 }));

      const content = await response.arrayBuffer();
      setActionModal((prev) => ({ ...prev, progress: 60 }));

      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter() {
          return "";
        },
      });
      setActionModal((prev) => ({ ...prev, progress: 70 }));

      // Format date helper to match Assets.js implementation
      const formatTransferDate = (dateStr) => {
        if (!dateStr) return "";
        try {
          // Handle Firestore timestamp object
          if (dateStr && typeof dateStr === "object" && dateStr.seconds) {
            return new Date(dateStr.seconds * 1000).toLocaleDateString(
              "en-GB",
              {
                year: "numeric",
                month: "long",
                day: "2-digit",
              }
            );
          }

          // Handle regular date
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return "";

          return date.toLocaleDateString("en-GB", {
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

      if (actionType === "unassign") {
        // For return forms - match Assets.js structure
        const { selectedCondition } = actionModal;
        const isWorking = selectedCondition === "GOOD";
        const isDefective = selectedCondition === "DEFECTIVE";

        templateData = {
          name: getFirstLastName(fromEmployee.firstName, fromEmployee.lastName) || "",
          department: getDepartmentForForm(fromEmployee),
          position: fromEmployee.position || "",
          dateHired: formatTransferDate(fromEmployee.dateHired) || "",
          devices: [
            {
              assignmentDate: formatTransferDate(new Date()), // Use current date for return
              deviceType: device.deviceType || "",
              brand: device.brand || "",
              model: device.model || "",
              deviceTag: device.deviceTag || "",
              condition: selectedCondition || device.condition || "",
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
      } else {
        // For transfer forms - match Assets.js structure
        templateData = {
          transferor_name: getFirstLastName(fromEmployee.firstName, fromEmployee.lastName) || "",
          transferor_department: getDepartmentForForm(fromEmployee),
          transferor_date_hired:
            formatTransferDate(fromEmployee.dateHired) || "",
          transferor_position: fromEmployee.position || "",
          transferee_name: toEmployee
            ? getFirstLastName(toEmployee.firstName, toEmployee.lastName) || ""
            : "",
          transferee_department: toEmployee
            ? getDepartmentForForm(toEmployee)
            : "",
          transferee_date_hired: toEmployee
            ? formatTransferDate(toEmployee.dateHired) || ""
            : "",
          transferee_position: toEmployee ? toEmployee.position || "" : "",
          devices: [
            {
              TransferDate: formatTransferDate(new Date()), // Use current date for transfer
              deviceType: device.deviceType || "",
              brand: device.brand || "",
              model: device.model || "",
              deviceTag: device.deviceTag || "",
              condition:
                device.condition === "BRANDNEW"
                  ? "GOOD"
                  : device.condition || "", // Auto-change BRANDNEW to GOOD for reassignment
            },
          ],
        };
      }

      doc.setData(templateData);
      setActionModal((prev) => ({ ...prev, progress: 80 }));

      doc.render();
      setActionModal((prev) => ({ ...prev, progress: 90 }));

      const out = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      setActionModal((prev) => ({
        ...prev,
        progress: 100,
        isGenerating: false,
        docxBlob: out,
      }));
    } catch (error) {
      console.error("Error generating docx:", error);
      showError("Error generating document: " + error.message);
      setActionModal((prev) => ({ ...prev, isGenerating: false, progress: 0 }));
    }
  };

  const generateBulkDocx = async (
    actionType,
    devices,
    fromEmployee,
    toEmployee = null
  ) => {
    try {
      setActionModal((prev) => ({ ...prev, progress: 85 }));

      const templatePath =
        actionType === "unassign"
          ? "/src/AccountabilityForms/ASSET ACCOUNTABILITY FORM - RETURN.docx"
          : "/src/AccountabilityForms/ASSET ACCOUNTABILITY FORM - TRANSFER.docx";

      const response = await fetch(templatePath);
      setActionModal((prev) => ({ ...prev, progress: 87 }));

      const content = await response.arrayBuffer();
      setActionModal((prev) => ({ ...prev, progress: 90 }));

      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter() {
          return "";
        },
      });
      setActionModal((prev) => ({ ...prev, progress: 92 }));

      // Format date helper to match Assets.js implementation
      const formatTransferDate = (dateStr) => {
        if (!dateStr) return "";
        try {
          // Handle Firestore timestamp object
          if (dateStr && typeof dateStr === "object" && dateStr.seconds) {
            return new Date(dateStr.seconds * 1000).toLocaleDateString(
              "en-GB",
              {
                year: "numeric",
                month: "long",
                day: "2-digit",
              }
            );
          }

          // Handle regular date
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return "";

          return date.toLocaleDateString("en-GB", {
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

      if (actionType === "unassign") {
        // For return forms - match Assets.js structure
        const { selectedCondition, deviceConditions, isBulk } = actionModal;

        // For bulk operations, determine overall condition for checkboxes
        // If all devices have the same condition, use that; otherwise default to working
        let overallCondition = "GOOD";
        if (isBulk) {
          const conditions = devices
            .map((device) => deviceConditions[device.id])
            .filter(Boolean);
          const allSame =
            conditions.length > 0 &&
            conditions.every((c) => c === conditions[0]);
          overallCondition = allSame ? conditions[0] : "GOOD";
        } else {
          overallCondition = selectedCondition;
        }

        const isWorking = overallCondition === "GOOD";
        const isDefective = overallCondition === "DEFECTIVE";

        templateData = {
          name: getFirstLastName(fromEmployee.firstName, fromEmployee.lastName) || "",
          department: getDepartmentForForm(fromEmployee),
          position: fromEmployee.position || "",
          dateHired: formatTransferDate(fromEmployee.dateHired) || "",
          devices: devices.map((device) => ({
            assignmentDate: formatTransferDate(new Date()), // Use current date for return
            deviceType: device.deviceType || "",
            brand: device.brand || "",
            model: device.model || "",
            deviceTag: device.deviceTag || "",
            condition: isBulk
              ? deviceConditions[device.id] || device.condition || ""
              : selectedCondition || device.condition || "",
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
          transferor_name: getFirstLastName(fromEmployee.firstName, fromEmployee.lastName) || "",
          transferor_department: getDepartmentForForm(fromEmployee),
          transferor_date_hired:
            formatTransferDate(fromEmployee.dateHired) || "",
          transferor_position: fromEmployee.position || "",
          transferee_name: toEmployee
            ? getFirstLastName(toEmployee.firstName, toEmployee.lastName) || ""
            : "",
          transferee_department: toEmployee
            ? getDepartmentForForm(toEmployee)
            : "",
          transferee_date_hired: toEmployee
            ? formatTransferDate(toEmployee.dateHired) || ""
            : "",
          transferee_position: toEmployee ? toEmployee.position || "" : "",
          devices: devices.map((device) => ({
            TransferDate: formatTransferDate(new Date()), // Use current date for transfer
            deviceType: device.deviceType || "",
            brand: device.brand || "",
            model: device.model || "",
            deviceTag: device.deviceTag || "",
            condition:
              device.condition === "BRANDNEW" ? "GOOD" : device.condition || "", // Auto-change BRANDNEW to GOOD for reassignment
          })),
        };
      }

      doc.setData(templateData);
      setActionModal((prev) => ({ ...prev, progress: 95 }));

      doc.render();
      setActionModal((prev) => ({ ...prev, progress: 98 }));

      const out = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      setActionModal((prev) => ({
        ...prev,
        progress: 100,
        isGenerating: false,
        docxBlob: out,
      }));
    } catch (error) {
      console.error("Error generating bulk docx:", error);
      showError("Error generating bulk document: " + error.message);
      setActionModal((prev) => ({ ...prev, isGenerating: false, progress: 0 }));
    }
  };

  const handleDownloadDocx = () => {
    if (!actionModal.docxBlob) return;

    const { type, device, devices, isBulk } = actionModal;
    const employeeName = getFirstLastName(employee.firstName, employee.lastName)
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "_");

    let fileName;
    if (isBulk) {
      const deviceCount = devices.length;
      const actionText = type === "unassign" ? "RETURN" : "TRANSFER";
      fileName = `${employeeName}_BULK_${deviceCount}_DEVICES_${actionText}.docx`;
    } else {
      const actionText = type === "unassign" ? "Return" : "Transfer";
      fileName = `${employeeName} - ${actionText}.docx`;
    }

    saveAs(actionModal.docxBlob, fileName);

    // Close modal after download
    setActionModal({
      isOpen: false,
      type: "",
      device: null,
      devices: [],
      newEmployee: null,
      isGenerating: false,
      progress: 0,
      docxBlob: null,
      isBulk: false,
    });
  };

  const closeActionModal = () => {
    setActionModal({
      isOpen: false,
      type: "",
      device: null,
      devices: [],
      newEmployee: null,
      isGenerating: false,
      progress: 0,
      docxBlob: null,
      isBulk: false,
      selectedCondition: "",
      deviceConditions: {},
    });
  };

  if (!isOpen || !employee) return null;

  // Filter devices currently assigned to this employee (deployed)
  // Split assigned devices into deployed vs work-from-home using assignmentType
  const deployedAssets = devices.filter(
    (device) => device.assignedTo === employee.id && device.assignmentType !== "wfh"
  );

  // Filter work from home/borrowed assets assigned to this employee
  // Devices marked with assignmentType === 'wfh' are considered WFH/borrowed
  const workFromHomeAssets = devices.filter(
    (device) => device.assignedTo === employee.id && device.assignmentType === "wfh"
  );

  // Get returned assets from device history
  // Find devices that were assigned to this employee but are no longer assigned
  const returnedAssets = deviceHistory
    .filter(
      (history) =>
        history.action === "returned" ||
        (history.action === "unassigned" && history.employeeId === employee.id)
    )
    .map((history) => {
      // Find the corresponding device
      const device = devices.find((d) => d.id === history.deviceId);
      if (device) {
        return {
          ...device,
          returnDate: history.date,
          returnReason: history.reason,
          returnCondition: history.condition,
        };
      }
      // If device not found in current devices, create a basic record from history
      return {
        id: history.deviceId,
        deviceTag: history.deviceTag,
        deviceType: "Unknown",
        brand: "Unknown",
        model: "Unknown",
        serialNumber: "Unknown",
        condition: history.condition || "Unknown",
        returnDate: history.date,
        returnReason: history.reason,
        returnCondition: history.condition,
      };
    })
    // Remove duplicates (keep the most recent return record for each device)
    .filter(
      (asset, index, self) => index === self.findIndex((a) => a.id === asset.id)
    );

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      // Handle Firestore timestamp object
      if (dateStr && typeof dateStr === "object" && dateStr.seconds) {
        const date = new Date(dateStr.seconds * 1000);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      }

      // Handle Firestore timestamp with nanoseconds
      if (dateStr && typeof dateStr === "object" && dateStr.toDate) {
        const date = dateStr.toDate();
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      }

      // Handle different date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "-";

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      console.log("Date formatting error:", error, "Input:", dateStr);
      return dateStr || "-";
    }
  };

  // Common table header component
  const TableHeader = ({ isReturned = false, isWfh = false }) => (
    <thead style={{ position: "sticky", top: "0", zIndex: "10" }}>
      <tr
        style={{
          background: isDarkMode ? "#4b5563" : "#f9fafb",
          borderBottom: isDarkMode ? "1px solid #6b7280" : "1px solid #e5e7eb",
        }}
      >
        {!isReturned && (
          <th
            style={{
              padding: "12px 16px",
              textAlign: "center",
              fontWeight: 600,
              color: isDarkMode ? "#f3f4f6" : "#374151",
              fontSize: 12,
              width: "40px",
              position: "sticky",
              top: "0",
              background: isDarkMode ? "#4b5563" : "#f9fafb",
              zIndex: 10,
            }}
          >
            <input
              type="checkbox"
              checked={
                isWfh
                  ? workFromHomeAssets.length > 0 &&
                    selectedWfhIds.length === workFromHomeAssets.length
                  : deployedAssets.length > 0 &&
                    selectedDeployedIds.length === deployedAssets.length
              }
              ref={(el) => {
                if (el) {
                  if (isWfh) {
                    el.indeterminate =
                      selectedWfhIds.length > 0 &&
                      selectedWfhIds.length < workFromHomeAssets.length;
                  } else {
                    el.indeterminate =
                      selectedDeployedIds.length > 0 &&
                      selectedDeployedIds.length < deployedAssets.length;
                  }
                }
              }}
              onChange={(e) =>
                isWfh
                  ? handleSelectAllWfhDevices(e.target.checked)
                  : handleSelectAllDeployedDevices(e.target.checked)
              }
              style={{
                cursor: "pointer",
                accentColor: "#6b7280",
                colorScheme: isDarkMode ? "dark" : "light",
              }}
            />
          </th>
        )}
        <th
          style={{
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: 600,
            color: isDarkMode ? "#f3f4f6" : "#374151",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            position: "sticky",
            top: "0",
            background: isDarkMode ? "#4b5563" : "#f9fafb",
            zIndex: 10,
          }}
        >
          Device Tag
        </th>
        <th
          style={{
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: 600,
            color: isDarkMode ? "#f3f4f6" : "#374151",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            position: "sticky",
            top: "0",
            background: isDarkMode ? "#4b5563" : "#f9fafb",
            zIndex: 10,
          }}
        >
          Type
        </th>
        <th
          style={{
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: 600,
            color: isDarkMode ? "#f3f4f6" : "#374151",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            position: "sticky",
            top: "0",
            background: isDarkMode ? "#4b5563" : "#f9fafb",
            zIndex: 10,
          }}
        >
          Brand
        </th>
        <th
          style={{
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: 600,
            color: isDarkMode ? "#f3f4f6" : "#374151",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            position: "sticky",
            top: "0",
            background: isDarkMode ? "#4b5563" : "#f9fafb",
            zIndex: 10,
          }}
        >
          Model
        </th>
        <th
          style={{
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: 600,
            color: isDarkMode ? "#f3f4f6" : "#374151",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            position: "sticky",
            top: "0",
            background: isDarkMode ? "#4b5563" : "#f9fafb",
            zIndex: 10,
          }}
        >
          Condition
        </th>
        <th
          style={{
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: 600,
            color: isDarkMode ? "#f3f4f6" : "#374151",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            position: "sticky",
            top: "0",
            background: isDarkMode ? "#4b5563" : "#f9fafb",
            zIndex: 10,
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
              color: isDarkMode ? "#f3f4f6" : "#374151",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              position: "sticky",
              top: "0",
              background: isDarkMode ? "#4b5563" : "#f9fafb",
              zIndex: 10,
            }}
          >
            Actions
          </th>
        )}
      </tr>
    </thead>
  );

  // Common table row component
  const TableRow = ({
    device,
    isReturned = false,
    isWfh = false,
    onUnassign,
    onReassign,
  }) => (
    <tr
      style={{
        borderBottom: isDarkMode ? "1px solid #4b5563" : "1px solid #f3f4f6",
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
            checked={
              isWfh
                ? selectedWfhIds.includes(device.id)
                : selectedDeployedIds.includes(device.id)
            }
            onChange={(e) =>
              isWfh
                ? handleSelectWfhDevice(device.id, e.target.checked)
                : handleSelectDeployedDevice(device.id, e.target.checked)
            }
            style={{
              cursor: "pointer",
              accentColor: "#6b7280",
              colorScheme: isDarkMode ? "dark" : "light",
            }}
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
          color: isDarkMode ? "#f3f4f6" : "#374151",
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
          color: isDarkMode ? "#f3f4f6" : "#374151",
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
          color: isDarkMode ? "#f3f4f6" : "#374151",
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
          color: isDarkMode ? "#f3f4f6" : "#374151",
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
          color: isDarkMode ? "#f3f4f6" : "#374151",
        }}
      >
        <span
          style={{
            padding: "3px 6px",
            borderRadius: 3,
            fontSize: 11,
            fontWeight: 500,
            background:
              (isReturned
                ? device.returnCondition || device.condition
                : device.condition) === "BRANDNEW"
                ? "rgb(40, 167, 69)"
                : (isReturned
                    ? device.returnCondition || device.condition
                    : device.condition) === "GOOD"
                ? "rgb(0, 123, 255)"
                : (isReturned
                    ? device.returnCondition || device.condition
                    : device.condition) === "DEFECTIVE"
                ? "rgb(220, 53, 69)"
                : (isReturned
                    ? device.returnCondition || device.condition
                    : device.condition) === "Poor"
                ? "#fee2e2"
                : "#f3f4f6",
            color:
              (isReturned
                ? device.returnCondition || device.condition
                : device.condition) === "BRANDNEW"
                ? "rgb(255, 255, 255)"
                : (isReturned
                    ? device.returnCondition || device.condition
                    : device.condition) === "GOOD"
                ? "rgb(255, 255, 255)"
                : (isReturned
                    ? device.returnCondition || device.condition
                    : device.condition) === "DEFECTIVE"
                ? "rgb(255, 255, 255)"
                : (isReturned
                    ? device.returnCondition || device.condition
                    : device.condition) === "Poor"
                ? "rgb(255, 255, 255)"
                : "#374151",
          }}
        >
          {(isReturned
            ? device.returnCondition || device.condition
            : device.condition) || "Unknown"}
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
          color: isDarkMode ? "#f3f4f6" : "#374151",
        }}
      >
        {isReturned
          ? formatDate(device.returnDate)
          : formatDate(device.assignmentDate)}
      </td>
      {!isReturned && (
        <td
          style={{
            padding: "12px 16px",
            textAlign: "center",
          }}
        >
          <div
            style={{ display: "flex", gap: "8px", justifyContent: "center" }}
          >
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
                fontFamily: "inherit",
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
                fontFamily: "inherit",
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
          backgroundColor: isDarkMode ? "#1f2937" : "white",
          borderRadius: 12,
          width: "95%",
          maxWidth: 1200,
          maxHeight: "95vh",
          overflow: "hidden",
          fontFamily:
            'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: "0 20px 32px rgba(34, 46, 58, 0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 32px",
            borderBottom: isDarkMode
              ? "1px solid #4b5563"
              : "1px solid #e5e7eb",
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
                color: isDarkMode ? "#f3f4f6" : "#222e3a",
                marginBottom: 4,
                marginTop: 0,
              }}
            >
              Asset History
            </h2>
            <p
              style={{
                fontSize: 16,
                color: isDarkMode ? "#d1d5db" : "#6b7280",
                margin: 0,
              }}
            >
              {employee.fullName} • {deployedAssets.length} deployed,{" "}
              {workFromHomeAssets.length} work from home,{" "}
              {returnedAssets.length} returned
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#222e3a",
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
                {selectedDeployedIds.length > 0 && (
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
                    {selectedDeployedIds.length} selected
                  </span>
                )}
              </div>

              {/* Bulk Action Buttons */}
              {showDeployedBulkActions && selectedDeployedIds.length > 0 && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleDeployedBulkUnassign}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #dc2626",
                      borderRadius: 6,
                      background: "white",
                      color: "#dc2626",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Bulk Unassign ({selectedDeployedIds.length})
                  </button>
                  <button
                    onClick={handleDeployedBulkReassign}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #2563eb",
                      borderRadius: 6,
                      background: "white",
                      color: "#2563eb",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Bulk Reassign ({selectedDeployedIds.length})
                  </button>
                </div>
              )}
            </div>

            {deployedAssets.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                  fontSize: 14,
                  padding: "32px 16px",
                  backgroundColor: isDarkMode ? "#374151" : "#f9fafb",
                  borderRadius: 8,
                  border: isDarkMode
                    ? "1px dashed #6b7280"
                    : "1px dashed #d1d5db",
                }}
              >
                No assets currently deployed to this employee
              </div>
            ) : (
              <div
                style={{
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #e5e7eb",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 14,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                  }}
                >
                  <TableHeader isReturned={false} isWfh={false} />
                  <tbody>
                    {deployedAssets.map((device) => (
                      <TableRow
                        key={`deployed-${device.id}`}
                        device={device}
                        isReturned={false}
                        isWfh={false}
                        onUnassign={handleUnassign}
                        onReassign={handleReassign}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Work From Home / Borrowed Assets Section */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#222e3a",
                    margin: 0,
                  }}
                >
                  Work From Home / Borrowed Assets
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
                  {workFromHomeAssets.length} active
                </span>
                {selectedWfhIds.length > 0 && (
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
                    {selectedWfhIds.length} selected
                  </span>
                )}
              </div>

              {/* Bulk Action Buttons */}
              {showWfhBulkActions && selectedWfhIds.length > 0 && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleWfhBulkUnassign}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #dc2626",
                      borderRadius: 6,
                      background: "white",
                      color: "#dc2626",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Bulk Unassign ({selectedWfhIds.length})
                  </button>
                  <button
                    onClick={handleWfhBulkReassign}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #2563eb",
                      borderRadius: 6,
                      background: "white",
                      color: "#2563eb",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Bulk Reassign ({selectedWfhIds.length})
                  </button>
                </div>
              )}
            </div>

            {workFromHomeAssets.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                  fontSize: 14,
                  padding: "32px 16px",
                  backgroundColor: isDarkMode ? "#374151" : "#f9fafb",
                  borderRadius: 8,
                  border: isDarkMode
                    ? "1px dashed #6b7280"
                    : "1px dashed #d1d5db",
                }}
              >
                No work from home or borrowed assets assigned to this employee
              </div>
            ) : (
              <div
                style={{
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #e5e7eb",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 14,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                  }}
                >
                  <TableHeader isReturned={false} isWfh={true} />
                  <tbody>
                    {workFromHomeAssets.map((device) => (
                      <TableRow
                        key={`wfh-${device.id}`}
                        device={device}
                        isReturned={false}
                        isWfh={true}
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
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  margin: 0,
                }}
              >
                Returned Assets
              </h3>
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
                {returnedAssets.length} returned
              </span>
            </div>

            {returnedAssets.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                  fontSize: 14,
                  padding: "32px 16px",
                  backgroundColor: isDarkMode ? "#374151" : "#f9fafb",
                  borderRadius: 8,
                  border: isDarkMode
                    ? "1px dashed #6b7280"
                    : "1px dashed #d1d5db",
                }}
              >
                No assets have been returned by this employee
              </div>
            ) : (
              <div
                style={{
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #e5e7eb",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 14,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                  }}
                >
                  <TableHeader isReturned={true} />
                  <tbody>
                    {returnedAssets.map((device) => (
                      <TableRow
                        key={`returned-${device.id}`}
                        device={device}
                        isReturned={true}
                      />
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
              fontFamily: "inherit",
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
              backgroundColor: isDarkMode ? "#374151" : "white",
              borderRadius: 12,
              width: "100%",
              maxWidth: 480,
              fontFamily:
                'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              boxShadow: "0 20px 32px rgba(34, 46, 58, 0.3)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "24px 32px 20px 32px",
                borderBottom: isDarkMode
                  ? "1px solid #4b5563"
                  : "1px solid #e5e7eb",
              }}
            >
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  margin: 0,
                  marginBottom: 8,
                }}
              >
                {actionModal.isBulk
                  ? `Bulk ${
                      actionModal.type === "unassign" ? "Unassign" : "Reassign"
                    } Devices`
                  : `${
                      actionModal.type === "unassign" ? "Unassign" : "Reassign"
                    } Device`}
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: isDarkMode ? "#d1d5db" : "#6b7280",
                  margin: 0,
                }}
              >
                {actionModal.isBulk
                  ? `This will ${actionModal.type} ${
                      actionModal.devices.length
                    } devices and generate a ${
                      actionModal.type === "unassign"
                        ? "bulk return"
                        : "bulk transfer"
                    } form.`
                  : `This will ${actionModal.type} the device and generate a ${
                      actionModal.type === "unassign" ? "return" : "transfer"
                    } form.`}
              </p>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "24px 32px" }}>
              {/* Device Information */}
              <div
                style={{
                  padding: "16px",
                  backgroundColor: isDarkMode ? "#4b5563" : "#f9fafb",
                  borderRadius: 8,
                  marginBottom: 20,
                }}
              >
                <h4
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    margin: 0,
                    marginBottom: 8,
                  }}
                >
                  {actionModal.isBulk
                    ? "Selected Devices"
                    : "Device Information"}
                </h4>
                {actionModal.isBulk ? (
                  <div
                    style={{
                      fontSize: 13,
                      color: isDarkMode ? "#d1d5db" : "#6b7280",
                      lineHeight: 1.5,
                    }}
                  >
                    <div>
                      <strong>Count:</strong> {actionModal.devices.length}{" "}
                      devices
                    </div>
                    <div
                      style={{
                        maxHeight: "120px",
                        overflowY: "auto",
                        marginTop: 8,
                      }}
                    >
                      {actionModal.devices.map((device, index) => (
                        <div
                          key={device.id}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#fff",
                            borderRadius: 4,
                            marginBottom: 4,
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          <strong>{device.deviceTag}</strong> -{" "}
                          {device.deviceType} ({device.brand})
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 13,
                      color: isDarkMode ? "#d1d5db" : "#6b7280",
                      lineHeight: 1.5,
                    }}
                  >
                    <div>
                      <strong>Tag:</strong> {actionModal.device?.deviceTag}
                    </div>
                    <div>
                      <strong>Type:</strong> {actionModal.device?.deviceType}
                    </div>
                    <div>
                      <strong>Brand:</strong> {actionModal.device?.brand}
                    </div>
                    <div>
                      <strong>Model:</strong> {actionModal.device?.model}
                    </div>
                  </div>
                )}
              </div>

              {/* Employee Information */}
              <div
                style={{
                  padding: "16px",
                  backgroundColor: isDarkMode ? "#78350f" : "#fef3c7",
                  borderRadius: 8,
                  marginBottom: actionModal.type === "reassign" ? 20 : 0,
                }}
              >
                <h4
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: isDarkMode ? "#fef3c7" : "#374151",
                    margin: 0,
                    marginBottom: 8,
                  }}
                >
                  {actionModal.type === "unassign"
                    ? "Returning from"
                    : "Transferring from"}
                </h4>
                <div
                  style={{
                    fontSize: 13,
                    color: isDarkMode ? "#fef3c7" : "#6b7280",
                    lineHeight: 1.5,
                  }}
                >
                  <div>
                    <strong>Name:</strong> {employee.fullName}
                  </div>
                  <div>
                    <strong>Position:</strong> {employee.position}
                  </div>
                  <div>
                    <strong>Department:</strong> {employee.department}
                  </div>
                </div>
              </div>

              {/* Condition Selection for Unassign */}
              {actionModal.type === "unassign" && (
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
                        Please select the condition of the device being
                        returned:
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
                            checked={actionModal.selectedCondition === "GOOD"}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setActionModal((prev) => ({
                                  ...prev,
                                  selectedCondition: "GOOD",
                                }));
                              } else {
                                setActionModal((prev) => ({
                                  ...prev,
                                  selectedCondition: "",
                                }));
                              }
                            }}
                            style={{
                              width: 16,
                              height: 16,
                              cursor: "pointer",
                              accentColor: "#6b7280",
                              colorScheme: isDarkMode ? "dark" : "light",
                            }}
                          />
                          <span style={{ color: "#059669" }}>
                            GOOD Condition
                          </span>
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
                            checked={
                              actionModal.selectedCondition === "DEFECTIVE"
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setActionModal((prev) => ({
                                  ...prev,
                                  selectedCondition: "DEFECTIVE",
                                }));
                              } else {
                                setActionModal((prev) => ({
                                  ...prev,
                                  selectedCondition: "",
                                }));
                              }
                            }}
                            style={{
                              width: 16,
                              height: 16,
                              cursor: "pointer",
                              accentColor: "#6b7280",
                              colorScheme: isDarkMode ? "dark" : "light",
                            }}
                          />
                          <span style={{ color: "#dc2626" }}>
                            DEFECTIVE Condition
                          </span>
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
                        Please select the condition for each device being
                        returned:
                      </p>
                      <div
                        style={{
                          maxHeight: "300px",
                          overflowY: "auto",
                          border: "1px solid #e5e7eb",
                          borderRadius: 6,
                          backgroundColor: "#fff",
                        }}
                      >
                        {actionModal.devices.map((device, index) => (
                          <div
                            key={device.id}
                            style={{
                              padding: "12px 16px",
                              borderBottom:
                                index < actionModal.devices.length - 1
                                  ? "1px solid #f3f4f6"
                                  : "none",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: 13,
                                  color: "#374151",
                                }}
                              >
                                {device.deviceTag}
                              </div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>
                                {device.deviceType} - {device.brand}
                              </div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                              }}
                            >
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
                                  checked={
                                    actionModal.deviceConditions[device.id] ===
                                    "GOOD"
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setActionModal((prev) => ({
                                        ...prev,
                                        deviceConditions: {
                                          ...prev.deviceConditions,
                                          [device.id]: "GOOD",
                                        },
                                      }));
                                    } else {
                                      setActionModal((prev) => ({
                                        ...prev,
                                        deviceConditions: {
                                          ...prev.deviceConditions,
                                          [device.id]: "",
                                        },
                                      }));
                                    }
                                  }}
                                  style={{
                                    width: 14,
                                    height: 14,
                                    cursor: "pointer",
                                    accentColor: "#6b7280",
                                    colorScheme: isDarkMode ? "dark" : "light",
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
                                  checked={
                                    actionModal.deviceConditions[device.id] ===
                                    "DEFECTIVE"
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setActionModal((prev) => ({
                                        ...prev,
                                        deviceConditions: {
                                          ...prev.deviceConditions,
                                          [device.id]: "DEFECTIVE",
                                        },
                                      }));
                                    } else {
                                      setActionModal((prev) => ({
                                        ...prev,
                                        deviceConditions: {
                                          ...prev.deviceConditions,
                                          [device.id]: "",
                                        },
                                      }));
                                    }
                                  }}
                                  style={{
                                    width: 14,
                                    height: 14,
                                    cursor: "pointer",
                                    accentColor: "#6b7280",
                                    colorScheme: isDarkMode ? "dark" : "light",
                                  }}
                                />
                                <span style={{ color: "#dc2626" }}>
                                  DEFECTIVE
                                </span>
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
              {actionModal.type === "reassign" && (
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: isDarkMode ? "#065f46" : "#dcfce7",
                    borderRadius: 8,
                  }}
                >
                  <h4
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: isDarkMode ? "#dcfce7" : "#374151",
                      margin: 0,
                      marginBottom: 12,
                    }}
                  >
                    Assign to Employee
                  </h4>
                  <SearchableDropdown
                    value={actionModal.newEmployee?.id || ""}
                    onChange={(event) => {
                      console.log(
                        "SearchableDropdown onChange called with:",
                        event
                      );
                      const employeeId = event.target
                        ? event.target.value
                        : event;
                      console.log("Extracted employeeId:", employeeId);
                      const selectedEmployee = reassignEmployees.find(
                        (emp) => emp.id === employeeId
                      );
                      console.log("Found employee:", selectedEmployee);
                      setActionModal((prev) => ({
                        ...prev,
                        newEmployee: selectedEmployee,
                      }));
                    }}
                    options={reassignEmployees}
                    placeholder="Search and select employee..."
                    displayKey="fullName"
                    valueKey="id"
                    formatDisplay={(emp) => `${emp.fullName} - ${emp.position}`}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 32px 24px 32px",
                borderTop: isDarkMode
                  ? "1px solid #4b5563"
                  : "1px solid #e5e7eb",
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
                      border: isDarkMode
                        ? "1px solid #6b7280"
                        : "1px solid #d1d5db",
                      borderRadius: 6,
                      background: isDarkMode ? "#4b5563" : "white",
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    disabled={
                      (actionModal.type === "reassign" &&
                        !actionModal.newEmployee) ||
                      (actionModal.type === "unassign" &&
                        !actionModal.isBulk &&
                        !actionModal.selectedCondition) ||
                      (actionModal.type === "unassign" &&
                        actionModal.isBulk &&
                        !actionModal.devices.every(
                          (device) => actionModal.deviceConditions[device.id]
                        ))
                    }
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: 6,
                      background:
                        (actionModal.type === "reassign" &&
                          !actionModal.newEmployee) ||
                        (actionModal.type === "unassign" &&
                          !actionModal.isBulk &&
                          !actionModal.selectedCondition) ||
                        (actionModal.type === "unassign" &&
                          actionModal.isBulk &&
                          !actionModal.devices.every(
                            (device) => actionModal.deviceConditions[device.id]
                          ))
                          ? "#9ca3af"
                          : actionModal.type === "unassign"
                          ? "#dc2626"
                          : "#2563eb",
                      color: "white",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor:
                        (actionModal.type === "reassign" &&
                          !actionModal.newEmployee) ||
                        (actionModal.type === "unassign" &&
                          !actionModal.isBulk &&
                          !actionModal.selectedCondition) ||
                        (actionModal.type === "unassign" &&
                          actionModal.isBulk &&
                          !actionModal.devices.every(
                            (device) => actionModal.deviceConditions[device.id]
                          ))
                          ? "not-allowed"
                          : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Confirm{" "}
                    {actionModal.type === "unassign" ? "Unassign" : "Reassign"}
                  </button>
                </>
              )}

              {actionModal.isGenerating && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 200,
                      height: 4,
                      backgroundColor: isDarkMode ? "#4b5563" : "#e5e7eb",
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
                  <span
                    style={{
                      fontSize: 14,
                      color: isDarkMode ? "#d1d5db" : "#6b7280",
                    }}
                  >
                    Generating document...
                  </span>
                </div>
              )}

              {actionModal.docxBlob && (
                <>
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
                      fontFamily: "inherit",
                    }}
                  >
                    Download {actionModal.isBulk ? "Bulk " : ""}
                    {actionModal.type === "unassign"
                      ? "Return"
                      : "Transfer"}{" "}
                    Form
                  </button>
                  <button
                    onClick={closeActionModal}
                    style={{
                      padding: "8px 16px",
                      border: isDarkMode
                        ? "1px solid #6b7280"
                        : "1px solid #d1d5db",
                      borderRadius: 6,
                      background: isDarkMode ? "#4b5563" : "white",
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Close
                  </button>
                </>
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
    return formatDisplayDate(toLocalISODate(date));
  }

  // Handle regular date string or Date object
  if (typeof dateValue === "string" || dateValue instanceof Date) {
    return formatDisplayDate(dateValue);
  }

  return "";
}

// Entity Form Modal Component
function EntityFormModal({
  data,
  onChange,
  onSave,
  onCancel,
  isValid,
  clients,
}) {
  const { isDarkMode } = useTheme();

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
          backgroundColor: isDarkMode ? "#1f2937" : "white",
          borderRadius: 12,
          padding: "clamp(16px, 2vw, 24px)",
          width: "100%",
          maxWidth: "min(480px, 90vw)",
          maxHeight: "95vh",
          overflow: "auto",
          fontFamily:
            'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
            color: isDarkMode ? "#f3f4f6" : "#222e3a",
            marginBottom: "clamp(16px, 2vw, 20px)",
            marginTop: 0,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {data.id ? "Edit Entity" : "Add Entity"}
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(10px, 1.2vw, 16px)",
            flex: 1,
            overflow: "auto",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "clamp(12px, 1.1vw, 14px)",
                fontWeight: 600,
                color: isDarkMode ? "#f3f4f6" : "#374151",
                marginBottom: 4,
              }}
            >
              Description:
            </label>
            <input
              name="description"
              value={data.description || ""}
              onChange={onChange}
              placeholder="Full Name or Room Name"
              style={{
                width: "100%",
                padding: "clamp(6px, 0.8vw, 10px)",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: "clamp(12px, 1.1vw, 14px)",
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
                backgroundColor: isDarkMode ? "#374151" : "white",
                color: isDarkMode ? "#f3f4f6" : "black",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "clamp(12px, 1.1vw, 14px)",
                fontWeight: 600,
                color: isDarkMode ? "#f3f4f6" : "#374151",
                marginBottom: 4,
              }}
            >
              Department:
            </label>
            <input
              name="department"
              value={data.department || ""}
              onChange={onChange}
              style={{
                width: "100%",
                padding: "clamp(6px, 0.8vw, 10px)",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: "clamp(12px, 1.1vw, 14px)",
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
                backgroundColor: isDarkMode ? "#374151" : "white",
                color: isDarkMode ? "#f3f4f6" : "black",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "clamp(8px, 1vw, 12px)",
            marginTop: "clamp(16px, 2vw, 20px)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "clamp(8px, 1vw, 12px) clamp(16px, 2vw, 20px)",
              border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
              borderRadius: 6,
              background: isDarkMode ? "#374151" : "white",
              color: isDarkMode ? "#f3f4f6" : "#374151",
              fontSize: "clamp(12px, 1.1vw, 14px)",
              fontWeight: 500,
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
              padding: "clamp(8px, 1vw, 12px) clamp(16px, 2vw, 20px)",
              border: "none",
              borderRadius: 6,
              background: isValid ? "#2563eb" : "#9ca3af",
              color: "white",
              fontSize: "clamp(12px, 1.1vw, 14px)",
              fontWeight: 500,
              cursor: isValid ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            {data.id ? "Update" : "Add"} Entity
          </button>
        </div>
      </div>
    </div>
  );
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
  // Debug: Check if ACTION_TYPES is properly imported
  console.log("Employee component loaded. ACTION_TYPES:", ACTION_TYPES);

  const { isDarkMode } = useTheme();
  const { currentUser } = useCurrentUser(); // Get current user for logging
  const [employees, setEmployees] = useState([]);
  const [resignedEmployees, setResignedEmployees] = useState([]);
  const [entities, setEntities] = useState([]);
  const [form, setForm] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState([]);
  const [devices, setDevices] = useState([]);
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  // Progress state for deployed assets import
  const [assetImportProgress, setAssetImportProgress] = useState({
    total: 0,
    processed: 0,
    success: 0,
    errors: 0,
    skipped: 0,
    active: false,
  });
  const [sortBy, setSortBy] = useState("default");
  const [activeTab, setActiveTab] = useState("active");
  const { showSuccess, showError, showUndoNotification } = useSnackbar();

  // === DATE UTILITIES (Excel + Fallback Normalization) ===
  // Formats a Date object to mm/dd/yyyy
  const formatToMMDDYYYY = (dateObj) => {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return formatToMMDDYYYY(new Date());
    }
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const yyyy = dateObj.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  // Parses various Excel/CSV date representations and normalizes invalid/1970 dates to today.
  // Accepts: Excel serial numbers, ISO strings, mm/dd/yyyy, yyyy-mm-dd, Date objects
  const parseExcelDate = (value) => {
    const today = new Date();
    const todayStr = formatToMMDDYYYY(today);
    if (value === null || value === undefined) return todayStr;

    // If already a Date
    if (value instanceof Date) {
      if (isNaN(value.getTime()) || value.getFullYear() === 1970)
        return todayStr;
      return formatToMMDDYYYY(value);
    }

    // If numeric (possible Excel serial). Excel serial 1 corresponds to 1899-12-31; 25569 -> 1970-01-01
    if (typeof value === "number") {
      // Guard very small / negative numbers
      if (value < 25569) return todayStr; // pre-1970 or invalid
      const milliseconds = (value - 25569) * 86400000; // days to ms from Unix epoch
      const dateFromSerial = new Date(milliseconds);
      if (
        isNaN(dateFromSerial.getTime()) ||
        dateFromSerial.getFullYear() === 1970
      )
        return todayStr;
      return formatToMMDDYYYY(dateFromSerial);
    }

    // If string: trim and attempt multiple parses
    if (typeof value === "string") {
      const raw = value.trim();
      if (!raw) return todayStr;

      // If it's a pure number string representing a serial
      if (/^\d+$/.test(raw)) {
        const asNum = Number(raw);
        if (asNum < 25569) return todayStr;
        const milliseconds = (asNum - 25569) * 86400000;
        const dateFromSerial = new Date(milliseconds);
        if (
          isNaN(dateFromSerial.getTime()) ||
          dateFromSerial.getFullYear() === 1970
        )
          return todayStr;
        return formatToMMDDYYYY(dateFromSerial);
      }

      // Try letting Date parse it (handles yyyy-mm-dd, mm/dd/yyyy etc.)
      const parsed = new Date(raw.replace(/-/g, "/")); // normalize dashes to slashes
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() !== 1970) {
        return formatToMMDDYYYY(parsed);
      }
      // If it includes '1970' anywhere treat as invalid and use today
      if (/1970/.test(raw)) return todayStr;
      return todayStr; // fallback
    }

    return todayStr; // fallback for unrecognized types
  };

  // Convenience: current date in mm/dd/yyyy
  const getCurrentDateMDY = () => formatToMMDDYYYY(new Date());

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

  // Confirmation modal states
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [employeeToResign, setEmployeeToResign] = useState(null);
  const [employeeToUndo, setEmployeeToUndo] = useState(null);

  // Delete permanently state
  const [showDeletePermanentlyConfirm, setShowDeletePermanentlyConfirm] =
    useState(false);

  // Hover state for table rows
  const [hoveredRowId, setHoveredRowId] = useState(null);

  // === UTILITY FUNCTIONS ===
  // Get client name from client ID
  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.clientName : "No Client";
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

  // Helper function to split fullName into firstName, middleName, lastName
  const splitFullName = (fullName) => {
    if (!fullName) return { firstName: "", middleName: "", lastName: "" };

    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], middleName: "", lastName: "" };
    } else if (parts.length === 2) {
      return { firstName: parts[0], middleName: "", lastName: parts[1] };
    } else if (parts.length >= 3) {
      return {
        firstName: parts[0],
        middleName: parts.slice(1, -1).join(" "),
        lastName: parts[parts.length - 1],
      };
    }
    return { firstName: "", middleName: "", lastName: "" };
  };

  // Helper function to combine firstName, middleName, lastName into fullName
  const combineFullName = (firstName, middleName, lastName) => {
    return [firstName, middleName, lastName]
      .filter((part) => part && part.trim())
      .join(" ");
  };

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

      // Separate active employees, resigned employees, and entities
      const activeEmployees = employeesData.filter(
        (emp) => !emp.isResigned && !emp.isEntity
      );
      const resignedEmployees = employeesData.filter(
        (emp) => emp.isResigned && !emp.isEntity
      );
      const entitiesData = employeesData.filter((emp) => emp.isEntity);

      setEmployees(activeEmployees);
      setResignedEmployees(resignedEmployees);
      setEntities(entitiesData);
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
      const normalized = (history || []).map((entry) => {
        let rawDate = entry.date;
        // Accept ISO or stored format; ensure fallback logic
        let finalMDY;
        if (!rawDate) {
          finalMDY = formatToMMDDYYYY(new Date());
        } else {
          // If numeric epoch string convert, if ISO parse, else delegate to parser
          if (typeof rawDate === "string" && /^\d+$/.test(rawDate)) {
            // Possibly ms timestamp
            const asNum = Number(rawDate);
            const d = new Date(asNum);
            finalMDY = isNaN(d.getTime())
              ? formatToMMDDYYYY(new Date())
              : formatToMMDDYYYY(d);
          } else {
            try {
              const d = new Date(rawDate);
              if (!isNaN(d.getTime()) && d.getFullYear() !== 1970) {
                finalMDY = formatToMMDDYYYY(d);
              } else {
                // Use general parser (which also handles 1970 fallback)
                finalMDY = parseExcelDate(rawDate);
              }
            } catch {
              finalMDY = formatToMMDDYYYY(new Date());
            }
          }
        }
        return { ...entry, date: finalMDY };
      });
      setEmployeeDeviceHistory(normalized);
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
  const handleFormChange = (eOrName, maybeValue) => {
    // Supports signatures: (event), (name, value), ({ target: { name, value } })
    let name, value;
    if (eOrName && typeof eOrName === "object" && "target" in eOrName) {
      name = eOrName.target?.name;
      value = eOrName.target?.value;
    } else if (typeof eOrName === "string") {
      name = eOrName;
      value = maybeValue;
    } else if (
      eOrName &&
      typeof eOrName === "object" &&
      "name" in eOrName &&
      "value" in eOrName
    ) {
      name = eOrName.name;
      value = eOrName.value;
    }

    if (!name) {
      console.warn("handleFormChange called without a field name", {
        eOrName,
        maybeValue,
      });
      return;
    }

    console.log("Form field changed:", { name, value });
    setForm((prev) => {
      const newForm = { ...prev, [name]: value };

      // If firstName, middleName, or lastName changed, update fullName
      if (
        name === "firstName" ||
        name === "middleName" ||
        name === "lastName"
      ) {
        const firstName = name === "firstName" ? value : prev.firstName || "";
        const middleName =
          name === "middleName" ? value : prev.middleName || "";
        const lastName = name === "lastName" ? value : prev.lastName || "";
        newForm.fullName = combineFullName(firstName, middleName, lastName);
      }

      console.log("Updated form state:", newForm);
      return newForm;
    });
  };

  const handleSave = async () => {
    console.log("handleSave called with form:", form);
    console.log("Is form valid?", isFormValid());

    try {
      setIsTableLoading(true);
      const dataToSave = { ...form };

      // For entities, generate auto-increment ID if it's a new entity
      if (form.isEntity && !form.id) {
        // Generate next ID for entities
        const existingEntities = entities || [];
        const maxId =
          existingEntities.length > 0
            ? Math.max(
                ...existingEntities.map((e) => {
                  const numId = parseInt(e.id);
                  return isNaN(numId) ? 0 : numId;
                })
              )
            : 0;
        dataToSave.id = (maxId + 1).toString();

        // For entities, use description as fullName for compatibility
        dataToSave.fullName = dataToSave.description;
        // Set a default position for entities
        dataToSave.position = "Entity";
        // Set clientId to null or empty for entities (no client assignment needed)
        dataToSave.clientId = "";
        // Ensure isEntity flag is set
        dataToSave.isEntity = true;
      }

      if (form.id) {
        console.log(
          "Updating employee/entity with ID:",
          form.id,
          "Data:",
          dataToSave
        );
        await updateEmployee(form.id, dataToSave);

        // Log to User Logs
        await safeCreateUserLog(
          currentUser?.uid,
          currentUser?.username || currentUser?.email,
          currentUser?.email,
          ACTION_TYPES.EMPLOYEE_UPDATE,
          `Updated ${form.isEntity ? "entity" : "employee"} ${
            dataToSave.fullName || dataToSave.description
          }`,
          {
            employeeId: form.id,
            employeeName: dataToSave.fullName || dataToSave.description,
            isEntity: form.isEntity,
          }
        );

        showSuccess(
          form.isEntity
            ? "Entity updated successfully!"
            : "Employee updated successfully!"
        );
      } else {
        console.log("Adding new employee/entity with data:", dataToSave);
        await addEmployee(dataToSave);

        // Log to User Logs
        await safeCreateUserLog(
          currentUser?.uid,
          currentUser?.username || currentUser?.email,
          currentUser?.email,
          ACTION_TYPES.EMPLOYEE_CREATE,
          `Added new ${form.isEntity ? "entity" : "employee"} ${
            dataToSave.fullName || dataToSave.description
          }`,
          {
            employeeName: dataToSave.fullName || dataToSave.description,
            department: dataToSave.department,
            position: dataToSave.position,
            isEntity: form.isEntity,
          }
        );

        showSuccess(
          form.isEntity
            ? "Entity added successfully!"
            : "Employee added successfully!"
        );
      }

      await loadClientsAndEmployees();
      
      // Only clear form and close modal after successful save
      setForm({});
      setShowForm(false);
    } catch (error) {
      console.error("Error in handleSave:", error);
      showError(
        "Error saving " +
          (form.isEntity ? "entity" : "employee") +
          ": " +
          error.message
      );
    } finally {
      setIsTableLoading(false);
    }
  };

  // Resign employee with undo capability
  const handleResignEmployee = (id, reason = "") => {
    const employee = employees.find((emp) => emp.id === id);
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

      // Log to User Logs
      await createUserLog(
        currentUser?.uid,
        currentUser?.username || currentUser?.email,
        currentUser?.email,
        ACTION_TYPES.EMPLOYEE_UPDATE,
        `Resigned employee ${employee.fullName}`,
        {
          employeeId: id,
          employeeName: employee.fullName,
          reason: reason,
        }
      );

      loadClientsAndEmployees();

      // Show undo notification
      showUndoNotification("Employee resigned successfully", () => {
        undoManager.restoreItem(id);
      });
    } catch (error) {
      showError("Error resigning employee: " + error.message);
    } finally {
      setIsTableLoading(false);
    }
  };

  // Undo resignation - restore employee to active status
  const handleUndoResignation = (id) => {
    const employee = resignedEmployees.find((emp) => emp.id === id);
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
      setSelectedIds(currentEmployees.map((emp) => emp.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectEmployee = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
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

    try {
      setIsTableLoading(true);

      // Store original states and selected IDs for undo
      const employeesToResign = employees.filter((emp) =>
        selectedIds.includes(emp.id)
      );
      const originalStates = employeesToResign.map((emp) => ({ ...emp }));
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
              console.error(
                `Failed to undo resignation for employee ${id}:`,
                error
              );
            }
          },
          10000 // 10 seconds for bulk operations
        );
      });

      // Perform bulk resignation
      for (const id of resignedIds) {
        await resignEmployee(id, "");
      }

      const resignedCount = resignedIds.length;
      loadClientsAndEmployees();

      // Show undo notification for bulk operation
      showUndoNotification(
        `Successfully resigned ${resignedCount} employee(s)`,
        () => {
          // Restore all resigned employees
          resignedIds.forEach((id) => {
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

  // Delete permanently function for resigned employees
  const handleDeletePermanently = () => {
    if (selectedIds.length === 0) return;
    setShowDeletePermanentlyConfirm(true);
  };

  const confirmDeletePermanently = async () => {
    if (selectedIds.length === 0) return;

    setIsTableLoading(true);
    try {
      const employeesToDelete = resignedEmployees.filter((emp) =>
        selectedIds.includes(emp.id)
      );

      // Delete each employee permanently
      for (const employee of employeesToDelete) {
        await deleteEmployee(employee.id);
      }

      // Refresh data
      await loadClientsAndEmployees();

      // Clear selection
      setSelectedIds([]);
      setShowDeletePermanentlyConfirm(false);

      showSuccess(
        `Successfully deleted ${employeesToDelete.length} employee(s) permanently`
      );
    } catch (error) {
      console.error("Error deleting employees permanently:", error);
      showError("Failed to delete employees permanently: " + error.message);
    } finally {
      setIsTableLoading(false);
    }
  };

  // Delete entity function
  const handleDeleteEntity = async (entityId) => {
    try {
      setIsTableLoading(true);

      // Find the entity to delete
      const entityToDelete = entities.find((entity) => entity.id === entityId);
      if (!entityToDelete) {
        throw new Error("Entity not found");
      }

      // Delete the entity from Firebase
      await deleteEmployee(entityId);

      // Refresh the data
      await loadClientsAndEmployees();

      showSuccess(
        `Entity "${entityToDelete.description}" deleted successfully`
      );
    } catch (error) {
      console.error("Error deleting entity:", error);
      showError("Failed to delete entity: " + error.message);
    } finally {
      setIsTableLoading(false);
    }
  };

  // Excel import (idempotent: fills gaps, updates existing, avoids duplicates)
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsTableLoading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0];

        // Get headers from first row
        const headerRow = worksheet.getRow(1);
        const headers = headerRow.values.slice(1); // ExcelJS row.values is 1-based
        
        // Parse rows as objects
        const rows = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // skip header
          const rowVals = row.values;
          const obj = {};
          for (let i = 1; i <= headers.length; i++) {
            const key = headers[i - 1] || `col${i}`;
            obj[key] = rowVals[i] !== undefined ? rowVals[i] : '';
          }
          rows.push(obj);
        });

        console.log("Parsed Excel rows:", rows); // Debug log

        if (rows.length === 0) {
          showError("Excel file is empty or has no valid data");
          setIsTableLoading(false);
          return;
        }

        // Prepare existing employees map for quick lookup
        const existingEmployees = await getAllEmployees();
        const byId = new Map(existingEmployees.map((e) => [e.id, e]));
        // Secondary key: fullName + position (case-insensitive) to detect near duplicates
        const byComposite = new Map(
          existingEmployees.map((e) => [
            (e.fullName || "").toLowerCase() +
              "|" +
              (e.position || "").toLowerCase(),
            e,
          ])
        );

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const row of rows) {
          try {
            const firstName = (row["FIRST NAME"] || "").toString().trim();
            const middleName = (row["MIDDLE NAME"] || "").toString().trim();
            const lastName = (row["LAST NAME"] || "").toString().trim();
            const fullName = [firstName, middleName, lastName]
              .filter((p) => p)
              .join(" ");
            const position = (row["POSITION"] || "").toString().trim();
            const employeeIdRaw = (
              row["Employee ID"] ||
              row["EMPLOYEE ID"] ||
              ""
            )
              .toString()
              .trim();
            const clientId = findClientIdByName(row["CLIENT"] || "");

            if (!fullName || !position) {
              skippedCount++;
              continue; // Missing essentials
            }

            const compositeKey =
              fullName.toLowerCase() + "|" + position.toLowerCase();
            let targetEmployee = null;

            // Priority 1: explicit ID match
            if (employeeIdRaw && byId.has(employeeIdRaw)) {
              targetEmployee = byId.get(employeeIdRaw);
            } else if (byComposite.has(compositeKey)) {
              // Priority 2: composite key match
              targetEmployee = byComposite.get(compositeKey);
            }

            const normalizedDateHired = parseExcelDate(row["DATE HIRED"]);
            const corporateEmail = row["CORPORATE EMAIL"] || "";
            const personalEmail = row["PERSONAL EMAIL"] || "";

            if (targetEmployee) {
              // Determine if an update is needed (only update empty or missing fields or changed client/email)
              const patch = {};
              const assignIf = (field, newValue) => {
                if (
                  newValue && // new value present
                  (targetEmployee[field] === undefined ||
                    targetEmployee[field] === "" ||
                    targetEmployee[field] === null)
                ) {
                  patch[field] = newValue;
                }
              };

              assignIf("firstName", firstName);
              assignIf("middleName", middleName);
              assignIf("lastName", lastName);
              assignIf("fullName", fullName);
              assignIf("position", position);
              assignIf("corporateEmail", corporateEmail);
              assignIf("personalEmail", personalEmail);
              assignIf("dateHired", normalizedDateHired);
              assignIf("clientId", clientId);

              // If clientId differs (and not empty) update explicitly
              if (clientId && targetEmployee.clientId !== clientId) {
                patch.clientId = clientId;
              }

              if (Object.keys(patch).length > 0) {
                try {
                  await updateEmployee(targetEmployee.id, patch);
                  updatedCount++;
                } catch (err) {
                  console.error("Update failed for", targetEmployee.id, err);
                  errorCount++;
                }
              } else {
                skippedCount++; // Nothing to change
              }
            } else {
              // Create new employee
              const newEmployee = {
                fullName,
                position,
                department: "", // Extend if column added later
                clientId,
                corporateEmail,
                personalEmail,
                dateHired: normalizedDateHired,
                firstName,
                lastName,
                middleName,
              };
              try {
                await addEmployee(newEmployee);
                createdCount++;
              } catch (err) {
                console.error("Create failed for", fullName, err);
                errorCount++;
              }
            }
          } catch (rowErr) {
            console.error("Row processing error:", rowErr);
            errorCount++;
          }
        }

        if (createdCount + updatedCount > 0) {
          // Log to User Logs
          await createUserLog(
            currentUser?.uid,
            currentUser?.username || currentUser?.email,
            currentUser?.email,
            ACTION_TYPES.EMPLOYEE_IMPORT,
            `Imported employees from Excel: ${createdCount} added, ${updatedCount} updated`,
            {
              createdCount: createdCount,
              updatedCount: updatedCount,
              skippedCount: skippedCount,
              errorCount: errorCount,
            }
          );

          showSuccess(
            `Import summary: ${createdCount} added, ${updatedCount} updated, ${skippedCount} unchanged${
              errorCount > 0 ? `, ${errorCount} errors` : ""
            }`
          );
          await loadClientsAndEmployees();
        } else {
          showError(
            `No changes applied. ${skippedCount} rows unchanged$${
              errorCount > 0 ? `, ${errorCount} errors` : ""
            }`
          );
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
    setAssetImportProgress({
      total: 0,
      processed: 0,
      success: 0,
      errors: 0,
      skipped: 0,
      active: true,
    });
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0];

        // Get headers from first row
        const headerRow = worksheet.getRow(1);
        const headers = headerRow.values.slice(1);
        
        // Parse rows as objects
        const rawRows = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // skip header
          const rowVals = row.values;
          const obj = {};
          for (let i = 1; i <= headers.length; i++) {
            const key = headers[i - 1] || `col${i}`;
            obj[key] = rowVals[i] !== undefined ? rowVals[i] : '';
          }
          rawRows.push(obj);
        });

        console.log("Raw Asset Excel rows:", rawRows); // Debug log

        if (rawRows.length === 0) {
          showError("Excel file is empty or has no valid data");
          setIsTableLoading(false);
          return;
        }

        // Normalize column headers to be case-insensitive and handle variations
        const normalizeHeaders = (rows) => {
          return rows.map((row) => {
            const normalizedRow = {};
            Object.keys(row).forEach((key) => {
              const normalizedKey = key.toString().trim().toLowerCase();
              let standardKey = key; // Default to original key

              // Map common variations to standard headers
              if (
                normalizedKey.includes("employee") &&
                normalizedKey.includes("id")
              ) {
                standardKey = "EMPLOYEE ID";
              } else if (
                normalizedKey === "employee" ||
                normalizedKey === "employee name"
              ) {
                standardKey = "Employee";
              } else if (
                normalizedKey === "type" ||
                normalizedKey === "device type"
              ) {
                standardKey = "TYPE";
              } else if (normalizedKey === "brand") {
                standardKey = "BRAND";
              } else if (
                normalizedKey === "device tag" ||
                normalizedKey === "devicetag" ||
                normalizedKey === "tag"
              ) {
                standardKey = "DEVICE TAG";
              } else if (
                normalizedKey === "date deployed" ||
                normalizedKey === "datedeployed" ||
                normalizedKey === "deployment date"
              ) {
                standardKey = "DATE DEPLOYED";
              } else if (normalizedKey === "model") {
                standardKey = "MODEL";
              } else if (
                normalizedKey === "serial number" ||
                normalizedKey === "serialnumber" ||
                normalizedKey === "serial"
              ) {
                standardKey = "SERIAL NUMBER";
              } else if (
                normalizedKey === "specifications" ||
                normalizedKey === "specs"
              ) {
                standardKey = "SPECIFICATIONS";
              } else if (normalizedKey === "warranty") {
                standardKey = "WARRANTY";
              } else if (
                normalizedKey === "purchase date" ||
                normalizedKey === "purchasedate"
              ) {
                standardKey = "PURCHASE DATE";
              } else if (normalizedKey === "supplier") {
                standardKey = "SUPPLIER";
              }

              normalizedRow[standardKey] = row[key];
            });
            return normalizedRow;
          });
        };

        const rows = normalizeHeaders(rawRows);
        console.log("Normalized Asset Excel rows:", rows.slice(0, 2)); // Debug log first 2 rows
        console.log("Total rows to process:", rows.length);

        // Check if we have any rows with blank device tags
        const blankTagRows = rows.filter(
          (row) =>
            !row["DEVICE TAG"] || row["DEVICE TAG"].toString().trim() === ""
        );
        console.log("Rows with blank device tags:", blankTagRows.length);
        if (blankTagRows.length > 0) {
          console.log("Sample blank tag rows:", blankTagRows.slice(0, 2));
        }

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        const errors = [];

        // Get all existing devices to check for duplicate device tags (robust normalization)
        let existingDevices = [];
        try {
          existingDevices = await getAllDevices();
          console.log(
            "Existing devices loaded successfully:",
            existingDevices.length
          );
        } catch (error) {
          console.error("Failed to load existing devices:", error);
          if (
            error.code === "resource-exhausted" ||
            error.message.includes("quota")
          ) {
            showError(
              "Firebase quota exceeded. Please wait for quota reset or upgrade your plan. Unable to import assets."
            );
            setIsTableLoading(false);
            return;
          }
          showError(
            "Error loading existing devices. Import may not detect duplicates correctly."
          );
          // Continue with empty array - this will disable duplicate checking but allow import
        }

        // Ensure employees are loaded for validation
        let employeesForValidation = employees;
        if (employeesForValidation.length === 0) {
          console.log("Loading employees for import validation...");
          try {
            employeesForValidation = await getAllEmployees();
            console.log(
              "Loaded employees for import:",
              employeesForValidation.length
            );
          } catch (error) {
            console.error("Error loading employees for import:", error);
            if (
              error.code === "resource-exhausted" ||
              error.message.includes("quota")
            ) {
              showError(
                "Firebase quota exceeded. Cannot load employee data for import validation. Please wait for quota reset or upgrade your plan."
              );
              setIsTableLoading(false);
              return;
            }
            showError("Failed to load employee data for validation");
            setIsTableLoading(false);
            return;
          }
        }

        const normalizeTag = (tag) => {
          if (tag === null || tag === undefined) return "";
          try {
            return String(tag).trim().toLowerCase();
          } catch (err) {
            return ""; // Fallback for unexpected non-coercible values
          }
        };

        // Helper function to find client ID by name or ID (case-insensitive)
        const findClientIdByName = (clientIdentifier) => {
          if (!clientIdentifier || clientIdentifier.trim() === "") return "";

          const normalizedIdentifier = clientIdentifier.trim().toLowerCase();

          // First try to match by exact client ID
          let client = clients.find(
            (client) =>
              client.id && client.id.toLowerCase() === normalizedIdentifier
          );

          // If not found by ID, try to match by client name (case-insensitive)
          if (!client) {
            client = clients.find(
              (client) =>
                client.clientName &&
                client.clientName.trim().toLowerCase() === normalizedIdentifier
            );
          }

          return client ? client.id : "";
        };

        const existingTags = new Set(
          existingDevices
            .map((d) => normalizeTag(d.deviceTag))
            .filter((t) => t.length > 0)
        );

        // Track device tags within this import batch to prevent duplicates
        const currentImportTags = new Set();

        const yieldToBrowser = () =>
          new Promise((resolve) => setTimeout(resolve, 0));

        // Debug: Check current employees state
        console.log(
          "Current employees state:",
          employees.length,
          "employees loaded"
        );
        if (employees.length === 0) {
          console.warn(
            "No employees loaded in state - this could cause all employee lookups to fail"
          );
        }

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            // Extract data from Excel columns
            const employeeName = (row["Employee"] || "").toString().trim();
            const deviceType = (row["TYPE"] || "").toString().trim();
            const brand = (row["BRAND"] || "").toString().trim();

            // Special handling for device tag to debug blank values
            const rawDeviceTag = row["DEVICE TAG"];
            let deviceTag = "";
            if (
              rawDeviceTag !== undefined &&
              rawDeviceTag !== null &&
              rawDeviceTag !== ""
            ) {
              deviceTag = rawDeviceTag.toString().trim();
            }

            // Debug logging for blank device tag processing
            if (!deviceTag || deviceTag === "") {
              console.log(`🔍 Blank device tag detected:`, {
                employeeId: row["EMPLOYEE ID"],
                rawValue: rawDeviceTag,
                processedValue: deviceTag,
                type: typeof rawDeviceTag,
                isEmpty: !deviceTag,
              });
            }
            const dateDeployed = row["DATE DEPLOYED"];
            const employeeId = (row["EMPLOYEE ID"] || "").toString().trim();

            // Extract Client information
            const deviceOwner = (row["CLIENT"] || "").toString().trim();

            // Process Client information early for debug logging
            let clientId = "";
            let clientName = "";
            if (deviceOwner && deviceOwner.trim() !== "") {
              clientId = findClientIdByName(deviceOwner);
              if (clientId) {
                // Find the actual client object to get the proper name
                const clientObj = clients.find((c) => c.id === clientId);
                clientName = clientObj ? clientObj.clientName : deviceOwner;
                console.log(
                  `✅ Client "${deviceOwner}" found with ID: ${clientId} (Name: ${clientName})`
                );
              } else {
                // Since CLIENT is required, this is now an error that fails the import
                errorCount++;
                errors.push(
                  `Row with Employee "${employeeName}": Client "${deviceOwner}" not found in system. Available clients: ${clients
                    .map((c) => c.clientName)
                    .join(", ")}`
                );
                console.error(
                  `❌ ERROR: Client "${deviceOwner}" not found in system. Available clients:`,
                  clients.map((c) => ({ id: c.id, name: c.clientName }))
                );
                continue; // Skip this row since CLIENT is required
              }
            }

            console.log("Processing asset row:", {
              employeeName,
              deviceType,
              brand,
              deviceTag,
              dateDeployed,
              employeeId,
              deviceOwner,
              clientId: clientId || "(not found/empty)",
              clientName: clientName || "(not found/empty)",
            });

            // Special debug logging for specific problematic employees
            if (employeeId === "EMP0008" || employeeId === "EMP0019") {
              console.log(`🔍 DEBUGGING ${employeeId}:`, {
                employeeName,
                deviceType,
                brand,
                deviceTag: deviceTag || "(BLANK - REQUIRED)",
                dateDeployed,
                employeeId,
                deviceOwner,
                clientId: clientId || "(not found/empty)",
                clientName: clientName || "(not found/empty)",
                rawRow: row,
              });
            }

            // Validate required fields according to template
            if (
              !deviceType ||
              !brand ||
              !deviceTag ||
              !employeeId ||
              !dateDeployed ||
              !deviceOwner
            ) {
              errorCount++;
              const missing = [];
              if (!deviceType) missing.push("TYPE");
              if (!brand) missing.push("BRAND");
              if (!deviceTag) missing.push("DEVICE TAG");
              if (!employeeId) missing.push("EMPLOYEE ID");
              if (!dateDeployed) missing.push("DATE DEPLOYED");
              if (!deviceOwner) missing.push("CLIENT");

              errors.push(
                `Row with Employee "${employeeName}": Missing required fields: ${missing.join(
                  ", "
                )}`
              );
              // Enhanced debugging information
              const safeEmpId = employeeId ? employeeId : "(missing)";
              const safeTag = deviceTag
                ? deviceTag
                : "(REQUIRED - cannot proceed without device tag)";
              console.warn(
                `Skipped (missing required fields): Employee ID: ${safeEmpId}, Device Tag: ${safeTag}, Missing: ${missing.join(
                  ", "
                )}`
              );
              continue;
            }

            // Validate device type against system device types (case-insensitive)
            const validDeviceType = normalizeDeviceTypeWithLegacy(deviceType);

            if (!validDeviceType) {
              errorCount++;
              const availableTypes = CANONICAL_DEVICE_TYPES.map(
                (t) => t.label
              ).join(", ");
              errors.push(
                `Row with Employee "${employeeName}": Invalid device type "${deviceType}". Available types: ${availableTypes}`
              );
              // Enhanced error details for debugging
              const safeEmpId = employeeId ? employeeId : "(missing)";
              const safeTag = deviceTag ? deviceTag : "(blank - REQUIRED)";
              console.warn(
                `Skipped (invalid device type): Employee ID: ${safeEmpId}, Device Tag: ${safeTag}, Attempted Type: "${deviceType}"`
              );
              continue;
            }

            // Find employee by Employee ID (primary) or name (fallback)
            let employee = null;
            if (employeeId) {
              employee = employeesForValidation.find(
                (emp) => emp.id === employeeId
              );

              // Special debug for specific employees
              if (employeeId === "EMP0008" || employeeId === "EMP0019") {
                console.log(`🔍 Employee lookup for ${employeeId}:`, {
                  found: !!employee,
                  totalEmployees: employeesForValidation.length,
                  employee: employee
                    ? {
                        id: employee.id,
                        fullName: employee.fullName,
                        firstName: employee.firstName,
                        lastName: employee.lastName,
                      }
                    : null,
                });
              }
            }

            if (!employee && employeeName) {
              // Try multiple name matching strategies
              employee = employeesForValidation.find(
                (emp) =>
                  emp.fullName?.toLowerCase() === employeeName.toLowerCase() ||
                  `${emp.firstName} ${emp.lastName}`.toLowerCase() ===
                    employeeName.toLowerCase()
              );
            }

            if (!employee) {
              skippedCount++;
              const identifier = employeeId || employeeName || "unknown";
              errors.push(
                `Row with Employee "${identifier}": Employee not found in system. Check employee ID or full name spelling.`
              );
              // Enhanced error details for debugging
              const safeEmpId = employeeId ? employeeId : "(missing)";
              const safeTag = deviceTag ? deviceTag : "(blank - REQUIRED)";
              console.warn(
                `Skipped (employee not found): Employee ID: ${safeEmpId}, Employee Name: "${employeeName}", Device Tag: ${safeTag}`
              );
              continue;
            }

            // Validate device tag is provided (required field per template)
            console.log(
              `Processing device for ${employeeName}: deviceTag="${deviceTag}", deviceType="${deviceType}"`
            );

            // Check if device tag is blank (required field)
            const isBlankTag =
              !deviceTag || deviceTag === "" || deviceTag.trim() === "";

            if (isBlankTag) {
              errors.push(
                `Row ${
                  i + 1
                }: DEVICE TAG is required and cannot be blank for employee ${employeeName} (${employeeId}). Please provide a valid device tag.`
              );
              continue;
            }

            // Check for duplicate device tags
            const normalizedTag = normalizeTag(deviceTag);
            let existingDevice = null;
            let isUpdatingExisting = false;

            // First check if this tag appears multiple times in the current import batch
            if (currentImportTags.has(normalizedTag)) {
              errors.push(
                `Row ${
                  i + 1
                }: Duplicate DEVICE TAG "${deviceTag}" found within this import file for employee ${employeeName} (${employeeId}). Each device tag can only appear once per import.`
              );
              continue;
            }

            // Check if device tag already exists in the system
            if (existingTags.has(normalizedTag)) {
              // Find the existing device with this tag
              existingDevice = existingDevices.find(
                (device) => normalizeTag(device.deviceTag) === normalizedTag
              );

              if (existingDevice) {
                isUpdatingExisting = true;
                console.log(
                  `Device tag "${deviceTag}" already exists - will update existing device for employee ${employeeName} (${employeeId})`
                );
              }
            }

            // Add to current import tracking set
            currentImportTags.add(normalizedTag);

            // Normalize date deployed (Excel serial, string, etc.) to mm/dd/yyyy; fallback to today
            const assignmentDateMDY = parseExcelDate(dateDeployed);
            // Store ISO (yyyy-mm-dd) version for model persistence while keeping MDY for display/history fallback
            const assignmentDateISO = (() => {
              const parts = assignmentDateMDY.split("/"); // mm/dd/yyyy
                if (parts.length === 3) {
                  return `${parts[2]}-${parts[0]}-${parts[1]}`; // yyyy-mm-dd
                }
                return toLocalISODate(new Date());
            })();

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
              assignmentDate: assignmentDateISO,
              client: clientName, // Store client NAME for Device Owner display, not clientId
              remarks: `Imported deployed asset for ${employee.fullName}`,
              specifications: row["SPECIFICATIONS"] || "",
              warranty: row["WARRANTY"] || "",
              purchaseDate: row["PURCHASE DATE"] || "",
              supplier: row["SUPPLIER"] || "",
            };

            console.log(
              isUpdatingExisting
                ? "Updating existing device:"
                : "Creating new device:",
              {
                ...deviceData,
                clientDetails: clientName
                  ? {
                      clientId,
                      clientName,
                      deviceOwnerInput: deviceOwner,
                      storedAsClient: clientName,
                    }
                  : "No client assigned",
                existingDeviceId: existingDevice?.id || "N/A",
              }
            );

            // Create new device or update existing one
            let deviceResult;
            if (isUpdatingExisting && existingDevice) {
              // Update existing device with new data
              await updateDevice(existingDevice.id, deviceData);
              // Create a result object with the existing device ID since updateDevice may not return the device
              deviceResult = { id: existingDevice.id };
              console.log(
                `Updated existing device ${existingDevice.id} with tag "${deviceTag}"`
              );
            } else {
              // Create new device
              deviceResult = await addDevice(deviceData);
              console.log(`Created new device with tag "${deviceTag}"`);
            }

            // Log device history for assignment
            const historyDetails = {
              employeeId: employee.id,
              employeeName: employee.fullName,
              deviceId: deviceResult.id,
              deviceTag: deviceTag,
              action: isUpdatingExisting ? "updated_assignment" : "assigned",
              date: new Date(assignmentDateISO).toISOString(),
              reason: isUpdatingExisting
                ? "Updated device assignment via bulk import"
                : "Bulk import of deployed assets",
            };

            // Add client information to history if available
            if (clientId && clientName) {
              historyDetails.clientId = clientId;
              historyDetails.clientName = clientName;
              historyDetails.reason += ` (Client: ${clientName})`;
            }

            await logDeviceHistory(historyDetails);

            successCount++;
          } catch (error) {
            console.error("Error processing asset row:", error);
            errorCount++;
            errors.push(
              `Row with Employee "${row["Employee"] || "Unknown"}": ${
                error.message
              }`
            );
          }

          // Update progress every row (batched for UI fairness)
          const processed = successCount + errorCount + skippedCount;
          setAssetImportProgress((prev) => ({
            ...prev,
            total: rows.length,
            processed,
            success: successCount,
            errors: errorCount,
            skipped: skippedCount,
          }));

          // Yield every 25 rows to keep UI responsive
          if (i % 25 === 24) {
            await yieldToBrowser();
          }
        }

        // Show results
        const totalProcessed = successCount + errorCount + skippedCount;
        let message = `Asset import completed: ${successCount} successful`;
        if (errorCount > 0) message += `, ${errorCount} errors`;
        if (skippedCount > 0) message += `, ${skippedCount} skipped`;

        if (successCount > 0) {
          showSuccess(message);

          // Comprehensive data refresh to update all UI components
          console.log("Refreshing all data after successful import...");
          await loadClientsAndEmployees(); // Refresh data

          // Force re-render of any cached device lists by triggering state updates
          if (typeof window !== "undefined" && window.location) {
            // Trigger a custom event that other components can listen to for updates
            window.dispatchEvent(
              new CustomEvent("devicesUpdated", {
                detail: {
                  importedCount: successCount,
                  source: "deployedAssetsImport",
                },
              })
            );
          }

          console.log("Data refresh completed after import");

          // Log successful import to User Logs
          try {
            await safeCreateUserLog(
              currentUser?.uid,
              currentUser?.username || currentUser?.email,
              currentUser?.email,
              ACTION_TYPES.DEVICE_IMPORT,
              `Imported ${successCount} deployed assets from Excel file`,
              {
                importedCount: successCount,
                errorCount: errorCount,
                skippedCount: skippedCount,
                totalRows: rows.length,
                source: "deployedAssetsImport",
              }
            );
          } catch (logError) {
            console.error("Error logging deployed assets import:", logError);
            // Don't fail the import if logging fails
          }
        } else {
          showError(`No assets were imported. ${message}`);
        }

        // Log errors for debugging
        if (errors.length > 0) {
          console.log("Asset import errors:", errors);
          if (errors.length <= 5) {
            // Show first few errors in UI
            showError(
              `Import issues: ${errors.slice(0, 3).join("; ")}${
                errors.length > 3 ? "..." : ""
              }`
            );
          }
        }
      } catch (error) {
        console.error("Error importing assets:", error);
        showError("Error importing assets: " + error.message);
      } finally {
        setIsTableLoading(false);
        setAssetImportProgress((prev) => ({ ...prev, active: false }));
      }
    };

    reader.onerror = () => {
      showError("Error reading the asset Excel file");
      setIsTableLoading(false);
      setAssetImportProgress((prev) => ({ ...prev, active: false }));
    };

    reader.readAsArrayBuffer(file);
    e.target.value = ""; // Reset file input
  };

  // Helper function to find client ID by name
  const findClientIdByName = (clientName) => {
    if (!clientName) return "";
    const client = clients.find((c) => c.clientName === clientName);
    return client ? client.id : "";
  };

  // Helper function to extract first, middle, and last names from fullName
  const extractNames = (fullName) => {
    if (!fullName) return { firstName: "", middleName: "", lastName: "" };
    const nameParts = fullName
      .trim()
      .split(" ")
      .filter((part) => part.length > 0);

    if (nameParts.length === 0)
      return { firstName: "", middleName: "", lastName: "" };
    if (nameParts.length === 1)
      return { firstName: nameParts[0], middleName: "", lastName: "" };
    if (nameParts.length === 2)
      return {
        firstName: nameParts[0],
        middleName: "",
        lastName: nameParts[1],
      };

    // For 3+ parts: first name, middle name(s), last name
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1]; // Last part is the last name
    const middleName = nameParts.slice(1, -1).join(" "); // Everything between first and last

    return { firstName, middleName, lastName };
  };

  // Excel export
  const exportToExcel = async () => {
    // Use allEmployees (filtered/searched data) instead of currentEmployees (paginated data)
    // This ensures we export all data that matches current filters, not just the visible page
    const exportData = allEmployees.map((emp, index) => {
      const { firstName, middleName, lastName } = extractNames(emp.fullName);
      return {
        "Employee ID": emp.id || `EMP-${index + 1}`, // Use actual employee ID
        "DATE HIRED": formatDisplayDate(emp.dateHired),
        CLIENT: getClientName(emp.clientId),
        "LAST NAME": lastName,
        "FIRST NAME": firstName,
        "MIDDLE NAME": middleName, // Now properly extracted middle name
        POSITION: emp.position,
        "CORPORATE EMAIL": emp.corporateEmail || "",
        "PERSONAL EMAIL": emp.personalEmail || "",
      };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Employees");

    // Set columns
    worksheet.columns = [
      { header: "Employee ID", key: "Employee ID", width: 15 },
      { header: "DATE HIRED", key: "DATE HIRED", width: 15 },
      { header: "CLIENT", key: "CLIENT", width: 20 },
      { header: "LAST NAME", key: "LAST NAME", width: 15 },
      { header: "FIRST NAME", key: "FIRST NAME", width: 15 },
      { header: "MIDDLE NAME", key: "MIDDLE NAME", width: 15 },
      { header: "POSITION", key: "POSITION", width: 20 },
      { header: "CORPORATE EMAIL", key: "CORPORATE EMAIL", width: 25 },
      { header: "PERSONAL EMAIL", key: "PERSONAL EMAIL", width: 25 },
    ];

    // Add rows
    worksheet.addRows(exportData);

    // Update filename and success message to reflect what was actually exported
    const filterInfo = searchTerm
      ? `filtered_${searchTerm.replace(/[^\w]/g, "_")}_`
      : "";
    const filename = `employees_${activeTab}_${filterInfo}${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);

    const message = searchTerm
      ? `Excel file exported successfully! (${exportData.length} ${activeTab} employees matching "${searchTerm}")`
      : `Excel file exported successfully! (${exportData.length} ${activeTab} employees)`;

    // Log to User Logs
    createUserLog(
      currentUser?.uid,
      currentUser?.username || currentUser?.email,
      currentUser?.email,
      ACTION_TYPES.EMPLOYEE_EXPORT,
      `Exported ${exportData.length} ${activeTab} employee(s) to Excel`,
      {
        employeeCount: exportData.length,
        tabType: activeTab,
        filtered: !!searchTerm,
      }
    );

    showSuccess(message);
  };

  // Helper to format a value into YYYY-MM-DD for input fields, using local date
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return "";

    // Handle Firestore timestamp object
    if (dateValue && typeof dateValue === "object" && dateValue.seconds) {
      const date = new Date(dateValue.seconds * 1000);
      return toLocalISODate(date);
    }

    // Handle Date object
    if (dateValue instanceof Date) {
      return toLocalISODate(dateValue);
    }

    // Handle date string
    if (typeof dateValue === "string") {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      // Try to parse other formats and return local date representation
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return toLocalISODate(date);
      }
    }

    return "";
  };

  const isFormValid = () => {
    console.log("Form validation check:", {
      fullName: form.fullName,
      description: form.description,
      position: form.position,
      department: form.department,
      clientId: form.clientId,
      isEntity: form.isEntity,
      allFormData: form,
    });

    // For entities, only require description and department
    if (form.isEntity) {
      return form.description && form.department;
    }

    // For regular employees, require fullName, position, and clientId
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

    return employeeList.filter((employee) => {
      const fullName = (employee.fullName || "").toLowerCase();
      const description = (employee.description || "").toLowerCase(); // For entities
      const position = (employee.position || "").toLowerCase();
      const department = (employee.department || "").toLowerCase();
      const corporateEmail = (employee.corporateEmail || "").toLowerCase();
      const personalEmail = (employee.personalEmail || "").toLowerCase();
      const clientName = getClientName(employee.clientId).toLowerCase();
      const employeeId = (employee.id || "").toLowerCase();

      // Debug logging for employee ID search
      if (term.length > 0) {
        console.log(
          "Employee:",
          employee.fullName || employee.description,
          "ID:",
          employee.id,
          "Searching for:",
          term,
          "Match:",
          employeeId.includes(term)
        );
      }

      const matches =
        fullName.includes(term) ||
        description.includes(term) || // Include description for entities
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
  const baseEmployees =
    activeTab === "active"
      ? employees
      : activeTab === "resigned"
      ? resignedEmployees
      : entities;
  const searchedEmployees = searchEmployees(baseEmployees, searchTerm);
  const allEmployees = sortEmployees(searchedEmployees);

  // Calculate pagination
  const totalPages = Math.ceil(allEmployees.length / employeesPerPage);

  // Ensure current page is within valid bounds to prevent empty states
  // when changing items per page or when filters reduce the total count
  const validCurrentPage = Math.min(
    Math.max(1, currentPage),
    Math.max(1, totalPages)
  );
  if (validCurrentPage !== currentPage && allEmployees.length > 0) {
    setCurrentPage(validCurrentPage);
  }

  const startIndex = (validCurrentPage - 1) * employeesPerPage;
  const endIndex = startIndex + employeesPerPage;
  const currentEmployees = allEmployees.slice(startIndex, endIndex);

  const isAllSelected =
    currentEmployees.length > 0 &&
    selectedIds.length === currentEmployees.length;
  const isIndeterminate =
    selectedIds.length > 0 && selectedIds.length < currentEmployees.length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100vh",
        background: isDarkMode ? "#1f2937" : "#f7f9fb",
        fontFamily:
          'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        /* Custom scrollbar with transparent background */
        .employee-main-scroll::-webkit-scrollbar {
          width: 10px;
        }

        .employee-main-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .employee-main-scroll::-webkit-scrollbar-thumb {
          background: ${
            isDarkMode ? "rgba(156, 163, 175, 0.3)" : "rgba(209, 213, 219, 0.5)"
          };
          border-radius: 5px;
        }

        .employee-main-scroll::-webkit-scrollbar-thumb:hover {
          background: ${
            isDarkMode ? "rgba(156, 163, 175, 0.5)" : "rgba(209, 213, 219, 0.8)"
          };
        }

        /* Firefox scrollbar */
        .employee-main-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${
            isDarkMode ? "rgba(156, 163, 175, 0.3)" : "rgba(209, 213, 219, 0.5)"
          } transparent;
        }
      `}</style>
      {/* Header */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: isDarkMode ? "#f3f4f6" : "#222e3a",
          letterSpacing: 1,
          padding: "20px 24px 0px 24px",
          flexShrink: 0,
        }}
      >
        EMPLOYEE MANAGEMENT
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          padding: "16px 24px 0px 24px",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => handleTabChange("active")}
          style={{
            padding: "12px 20px",
            border: "none",
            background: "transparent",
            color:
              activeTab === "active"
                ? "#2563eb"
                : isDarkMode
                ? "#d1d5db"
                : "#6b7280",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            borderBottom:
              activeTab === "active"
                ? "2px solid #2563eb"
                : "2px solid transparent",
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
            color:
              activeTab === "resigned"
                ? "#2563eb"
                : isDarkMode
                ? "#d1d5db"
                : "#6b7280",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            borderBottom:
              activeTab === "resigned"
                ? "2px solid #2563eb"
                : "2px solid transparent",
            transition: "all 0.2s ease",
          }}
        >
          Resigned Employees ({resignedEmployees.length})
        </button>
        <button
          onClick={() => handleTabChange("others")}
          style={{
            padding: "12px 20px",
            border: "none",
            background: "transparent",
            color:
              activeTab === "others"
                ? "#2563eb"
                : isDarkMode
                ? "#d1d5db"
                : "#6b7280",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            borderBottom:
              activeTab === "others"
                ? "2px solid #2563eb"
                : "2px solid transparent",
            transition: "all 0.2s ease",
          }}
        >
          Others ({entities.length})
        </button>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px 16px 24px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Search Bar */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchTerm("");
                }
              }}
              className={isDarkMode ? "search-input-dark" : ""}
              style={{
                padding: "8px 12px 8px 36px",
                paddingRight: searchTerm ? "36px" : "12px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                width: 200,
                backgroundColor: isDarkMode ? "#374151" : "white",
                color: isDarkMode ? "#f3f4f6" : "#000",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: isDarkMode ? "#d1d5db" : "#6b7280",
                fontSize: 16,
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
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
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
                  color: isDarkMode ? "#d1d5db" : "#6b7280",
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
              border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
              backgroundColor: isDarkMode ? "#374151" : "white",
              color: isDarkMode ? "#f3f4f6" : "#000",
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
                fontFamily: "inherit",
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
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                borderRadius: 6,
                background: isDarkMode ? "#374151" : "white",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-block",
              }}
            >
              Import Employees
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
                background: assetImportProgress.active ? "#059669" : "#10b981",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-block",
                position: "relative",
                minWidth: 180,
                textAlign: "center",
              }}
              title={
                assetImportProgress.active
                  ? `Processed ${assetImportProgress.processed} of ${assetImportProgress.total} (Success: ${assetImportProgress.success}, Errors: ${assetImportProgress.errors}, Skipped: ${assetImportProgress.skipped})`
                  : "Import deployed (assigned) assets from Excel"
              }
            >
              {assetImportProgress.active
                ? `Importing ${assetImportProgress.processed}/${assetImportProgress.total}`
                : "Import Deployed Assets"}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportDeployedAssets}
                style={{ display: "none" }}
                disabled={assetImportProgress.active}
              />
            </label>
          )}
          <button
            onClick={exportToExcel}
            style={{
              padding: "8px 16px",
              border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
              borderRadius: 6,
              background: isDarkMode ? "#374151" : "white",
              color: isDarkMode ? "#f3f4f6" : "#374151",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Export Excel
          </button>
          {/* Show Delete Permanently button only for resigned tab when employees are selected */}
          {activeTab === "resigned" && selectedIds.length > 0 && (
            <button
              onClick={handleDeletePermanently}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 6,
                background: "#dc2626",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Delete Permanently ({selectedIds.length})
            </button>
          )}
          {/* Show Add Employee only for active tab */}
          {activeTab === "active" && (
            <button
              onClick={() => {
                setForm({
                  dateHired: getCurrentDate(),
                  isEntity: false,
                });
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
                fontFamily: "inherit",
              }}
            >
              Add Employee
            </button>
          )}
          {/* Show Add Entity only for others tab */}
          {activeTab === "others" && (
            <button
              onClick={() => {
                setForm({
                  description: "",
                  department: "",
                  isEntity: true,
                });
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
                fontFamily: "inherit",
              }}
            >
              Add Entity
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div
        style={{
          flex: 1,
          margin: "0 24px",
          background: isDarkMode ? "#374151" : "white",
          // borderRadius: "12px 12px 0 0", // Only top corners rounded
          border: isDarkMode ? "1px solid #4b5563" : "1px solid #e5e7eb",
          borderBottom: "none", // Remove bottom border to connect with pagination
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          className="employee-main-scroll"
          style={{
            flex: 1,
            overflow: "auto",
            minHeight: 0,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "clamp(12px, 1vw, 14px)",
              color: isDarkMode ? "#f3f4f6" : "#374151",
              tableLayout: "fixed", // Fixed layout for better control
              border: isDarkMode ? "1px solid #4b5563" : "1px solid #e5e7eb", // Add outer border
            }}
          >
            <thead>
              <tr
                style={{
                  background: isDarkMode ? "#4b5563" : "#f9fafb",
                  borderBottom: isDarkMode
                    ? "1px solid #6b7280"
                    : "1px solid #e5e7eb",
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                }}
              >
                {activeTab !== "others" && (
                  <th
                    style={{
                      padding: "clamp(8px, 1vw, 16px)",
                      textAlign: "left",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      width: "3%",
                      minWidth: "40px",
                      border: isDarkMode
                        ? "1px solid #6b7280"
                        : "1px solid #e5e7eb", // Add cell borders
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#4b5563" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    {activeTab === "active" && (
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isIndeterminate;
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        style={{
                          cursor: "pointer",
                          accentColor: "#6b7280",
                          colorScheme: isDarkMode ? "dark" : "light",
                        }}
                      />
                    )}
                    {activeTab === "resigned" && (
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isIndeterminate;
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        style={{
                          cursor: "pointer",
                          accentColor: "#6b7280",
                          colorScheme: isDarkMode ? "dark" : "light",
                        }}
                      />
                    )}
                  </th>
                )}
                <th
                  style={{
                    padding: "clamp(8px, 1vw, 16px)",
                    textAlign: "left",
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    width: activeTab === "active" ? "8%" : "8%",
                    fontSize: "clamp(11px, 0.9vw, 14px)",
                    border: isDarkMode
                      ? "1px solid #6b7280"
                      : "1px solid #e5e7eb", // Add cell borders
                    position: "sticky",
                    top: "0",
                    background: isDarkMode ? "#4b5563" : "#f9fafb",
                    zIndex: 10,
                  }}
                >
                  {activeTab === "others" ? "ID" : "Employee ID"}
                </th>
                <th
                  style={{
                    padding: "clamp(8px, 1vw, 16px)",
                    textAlign: "left",
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    width:
                      activeTab === "active"
                        ? "16%"
                        : activeTab === "others"
                        ? "30%"
                        : "15%",
                    fontSize: "clamp(11px, 0.9vw, 14px)",
                    border: isDarkMode
                      ? "1px solid #6b7280"
                      : "1px solid #e5e7eb", // Add cell borders
                    position: "sticky",
                    top: "0",
                    background: isDarkMode ? "#4b5563" : "#f9fafb",
                    zIndex: 10,
                  }}
                >
                  {activeTab === "others" ? "Description" : "Full Name"}
                </th>
                {activeTab !== "others" && (
                  <th
                    style={{
                      padding: "clamp(8px, 1vw, 16px)",
                      textAlign: "left",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      width: activeTab === "active" ? "13%" : "12%",
                      fontSize: "clamp(11px, 0.9vw, 14px)",
                      border: isDarkMode
                        ? "1px solid #6b7280"
                        : "1px solid #e5e7eb", // Add cell borders
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#4b5563" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    Position
                  </th>
                )}
                <th
                  style={{
                    padding: "clamp(8px, 1vw, 16px)",
                    textAlign: "left",
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    width:
                      activeTab === "active"
                        ? "10%"
                        : activeTab === "others"
                        ? "25%"
                        : "9%",
                    fontSize: "clamp(11px, 0.9vw, 14px)",
                    border: isDarkMode
                      ? "1px solid #6b7280"
                      : "1px solid #e5e7eb", // Add cell borders
                    position: "sticky",
                    top: "0",
                    background: isDarkMode ? "#4b5563" : "#f9fafb",
                    zIndex: 10,
                  }}
                >
                  Department
                </th>
                {activeTab !== "others" && (
                  <th
                    style={{
                      padding: "clamp(8px, 1vw, 16px)",
                      textAlign: "left",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      width: activeTab === "active" ? "11%" : "10%",
                      fontSize: "clamp(11px, 0.9vw, 14px)",
                      border: isDarkMode
                        ? "1px solid #6b7280"
                        : "1px solid #e5e7eb", // Add cell borders
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#4b5563" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    Client
                  </th>
                )}
                {activeTab !== "others" && (
                  <th
                    style={{
                      padding: "clamp(8px, 1vw, 16px)",
                      textAlign: "left",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      width: activeTab === "active" ? "16%" : "15%",
                      fontSize: "clamp(11px, 0.9vw, 14px)",
                      border: isDarkMode
                        ? "1px solid #6b7280"
                        : "1px solid #e5e7eb", // Add cell borders
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#4b5563" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    Corporate Email
                  </th>
                )}
                {activeTab !== "others" && (
                  <th
                    style={{
                      padding: "clamp(8px, 1vw, 16px)",
                      textAlign: "left",
                      fontWeight: 600,
                      color: isDarkMode ? "#ef4444" : "#9c2b2bff",
                      width: activeTab === "active" ? "10%" : "9%",
                      fontSize: "clamp(11px, 0.9vw, 14px)",
                      border: isDarkMode
                        ? "1px solid #6b7280"
                        : "1px solid #e5e7eb", // Add cell borders
                      borderRight: isDarkMode
                        ? "1px solid #6b7280"
                        : "1px solid #e5e7eb", // Standard border for separation
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#4b5563" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    {activeTab === "active" ? "Date Hired" : "Date Resigned"}
                  </th>
                )}
                {activeTab === "others" && (
                  <th
                    style={{
                      padding: "clamp(8px, 1vw, 16px)",
                      textAlign: "center",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      width: "15%",
                      fontSize: "clamp(11px, 0.9vw, 14px)",
                      border: isDarkMode
                        ? "1px solid #6b7280"
                        : "1px solid #e5e7eb",
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#4b5563" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    Actions
                  </th>
                )}
                {activeTab === "resigned" && (
                  <th
                    style={{
                      padding: "clamp(8px, 1vw, 16px)",
                      textAlign: "center",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      width: "10%",
                      fontSize: "clamp(11px, 0.9vw, 14px)",
                      border: isDarkMode
                        ? "1px solid #6b7280"
                        : "1px solid #e5e7eb", // Add cell borders
                      borderLeft: isDarkMode
                        ? "1px solid #6b7280"
                        : "1px solid #e5e7eb", // Standard border for separation
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#4b5563" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    Actions
                  </th>
                )}
                {activeTab === "active" && (
                  <th
                    style={{
                      padding: "clamp(8px, 1vw, 16px)",
                      textAlign: "center",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      width: "10%",
                      fontSize: "clamp(11px, 0.9vw, 14px)",
                      border: isDarkMode
                        ? "1px solid #6b7280"
                        : "1px solid #e5e7eb", // Add cell borders
                      borderLeft: isDarkMode
                        ? "1px solid #6b7280"
                        : "1px solid #e5e7eb", // Standard border for separation
                      position: "sticky",
                      top: "0",
                      background: isDarkMode ? "#4b5563" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {isTableLoading ? (
                <tr>
                  <td
                    colSpan={
                      activeTab === "others"
                        ? "4"
                        : activeTab === "active"
                        ? "9"
                        : "10"
                    }
                    style={{
                      padding: 40,
                      textAlign: "center",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #e5e7eb",
                      color: isDarkMode ? "#d1d5db" : "#6b7280",
                    }}
                  >
                    <TableLoadingSpinner />
                  </td>
                </tr>
              ) : currentEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      activeTab === "others"
                        ? "4"
                        : activeTab === "active"
                        ? "9"
                        : "10"
                    }
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: isDarkMode ? "#d1d5db" : "#6b7280",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #e5e7eb",
                    }}
                  >
                    {searchTerm ? (
                      <>
                        No{" "}
                        {activeTab === "others"
                          ? "entities"
                          : activeTab + " employees"}{" "}
                        found matching "{searchTerm}"
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
                            fontFamily: "inherit",
                          }}
                        >
                          Clear search
                        </button>
                      </>
                    ) : activeTab === "active" ? (
                      "No active employees found"
                    ) : activeTab === "resigned" ? (
                      "No resigned employees found"
                    ) : (
                      "No entities found"
                    )}
                  </td>
                </tr>
              ) : (
                currentEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    style={{
                      borderBottom: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #f3f4f6",
                      backgroundColor:
                        hoveredRowId === employee.id
                          ? isDarkMode
                            ? "#4b5563"
                            : "#e5e7eb"
                          : "transparent",
                      transition: "background-color 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={() => setHoveredRowId(employee.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    {activeTab !== "others" && (
                      <td
                        style={{
                          padding: "clamp(8px, 1vw, 16px)",
                          overflow: "hidden",
                          border: isDarkMode
                            ? "1px solid #4b5563"
                            : "1px solid #e5e7eb", // Add cell borders
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(employee.id)}
                          onChange={(e) =>
                            handleSelectEmployee(employee.id, e.target.checked)
                          }
                          style={{
                            cursor: "pointer",
                            accentColor: "#6b7280",
                            colorScheme: isDarkMode ? "dark" : "light",
                          }}
                        />
                      </td>
                    )}
                    <td
                      style={{
                        padding: "clamp(8px, 1vw, 16px)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "clamp(12px, 1vw, 14px)",
                        color: isDarkMode ? "#d1d5db" : "#6b7280",
                        fontFamily: "monospace",
                        border: isDarkMode
                          ? "1px solid #4b5563"
                          : "1px solid #e5e7eb", // Add cell borders
                      }}
                      title={employee.id}
                    >
                      {employee.id
                        ? employee.id.substring(0, 8)
                        : "Record Not Found"}
                    </td>
                    <td
                      style={{
                        padding: "clamp(8px, 1vw, 16px)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        border: isDarkMode
                          ? "1px solid #4b5563"
                          : "1px solid #e5e7eb", // Add cell borders
                      }}
                    >
                      <span
                        onClick={() => handleEmployeeNameClick(employee)}
                        style={{
                          color: isDarkMode ? "#f3f4f6" : "#2563eb",
                          cursor: "pointer",
                          textDecoration: "underline",
                          textDecorationColor: "transparent",
                          transition: "all 0.2s ease",
                          fontSize: "clamp(12px, 1vw, 14px)",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.textDecorationColor = isDarkMode
                            ? "#f3f4f6"
                            : "#2563eb";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.textDecorationColor = "transparent";
                        }}
                        title={
                          activeTab === "others"
                            ? employee.description
                            : employee.fullName
                        } // Show description for entities, fullName for employees
                      >
                        {activeTab === "others"
                          ? employee.description
                          : employee.fullName}
                      </span>
                    </td>
                    {activeTab !== "others" && (
                      <td
                        style={{
                          padding: "clamp(8px, 1vw, 16px)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "clamp(12px, 1vw, 14px)",
                          border: isDarkMode
                            ? "1px solid #4b5563"
                            : "1px solid #e5e7eb", // Add cell borders
                        }}
                        title={employee.position}
                      >
                        {employee.position}
                      </td>
                    )}
                    <td
                      style={{
                        padding: "clamp(8px, 1vw, 16px)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "clamp(12px, 1vw, 14px)",
                        border: isDarkMode
                          ? "1px solid #4b5563"
                          : "1px solid #e5e7eb", // Add cell borders
                      }}
                      title={employee.department}
                    >
                      {employee.department}
                    </td>
                    {activeTab !== "others" && (
                      <td
                        style={{
                          padding: "clamp(8px, 1vw, 16px)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "clamp(12px, 1vw, 14px)",
                          border: isDarkMode
                            ? "1px solid #4b5563"
                            : "1px solid #e5e7eb", // Add cell borders
                        }}
                        title={getClientName(employee.clientId)}
                      >
                        {getClientName(employee.clientId)}
                      </td>
                    )}
                    {activeTab !== "others" && (
                      <td
                        style={{
                          padding: "clamp(8px, 1vw, 16px)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "clamp(12px, 1vw, 14px)",
                          border: isDarkMode
                            ? "1px solid #4b5563"
                            : "1px solid #e5e7eb", // Add cell borders
                        }}
                        title={employee.corporateEmail || "-"}
                      >
                        {employee.corporateEmail || "-"}
                      </td>
                    )}
                    {activeTab !== "others" && (
                      <td
                        style={{
                          padding: "clamp(8px, 1vw, 16px)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "clamp(12px, 1vw, 14px)",
                          border: isDarkMode
                            ? "1px solid #4b5563"
                            : "1px solid #e5e7eb",
                          borderRight: isDarkMode
                            ? "1px solid #4b5563"
                            : "1px solid #e5e7eb", // Standard border for separation
                        }}
                      >
                        {activeTab === "active"
                          ? formatDisplayDate(employee.dateHired)
                          : formatDisplayDate(
                              employee.dateResigned || employee.dateHired
                            )}
                      </td>
                    )}
                    {activeTab === "resigned" && (
                      <td
                        style={{
                          padding: "clamp(8px, 1vw, 16px)",
                          textAlign: "center",
                          overflow: "hidden",
                          border: isDarkMode
                            ? "1px solid #4b5563"
                            : "1px solid #e5e7eb",
                          borderLeft: isDarkMode
                            ? "1px solid #4b5563"
                            : "1px solid #e5e7eb", // Standard border for separation
                        }}
                      >
                        <button
                          onClick={() => handleUndoResignation(employee.id)}
                          style={{
                            padding:
                              "clamp(3px, 0.5vw, 4px) clamp(6px, 0.8vw, 8px)",
                            border: "1px solid #059669",
                            borderRadius: 4,
                            background: isDarkMode ? "#6b7280" : "white",
                            color: isDarkMode ? "#f3f4f6" : "#059669",
                            fontSize: "clamp(10px, 0.8vw, 12px)",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Undo
                        </button>
                      </td>
                    )}
                    {activeTab === "active" && (
                      <td
                        style={{
                          padding: "clamp(8px, 1vw, 16px)",
                          textAlign: "center",
                          overflow: "hidden",
                          border: isDarkMode
                            ? "1px solid #4b5563"
                            : "1px solid #e5e7eb",
                          borderLeft: isDarkMode
                            ? "1px solid #4b5563"
                            : "1px solid #e5e7eb", // Standard border for separation
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "clamp(4px, 0.5vw, 8px)",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            onClick={() => {
                              console.log(
                                "Edit button clicked for employee:",
                                employee
                              );

                              // Properly format the employee data for editing
                              // Prefer explicit stored name parts (firstName/middleName/lastName)
                              // if they exist; otherwise fall back to splitting fullName.
                              const nameParts = splitFullName(employee.fullName || "");
                              const formattedEmployee = {
                                ...employee,
                                dateHired: formatDateForInput(
                                  employee.dateHired
                                ),
                                // Ensure required fields have default values
                                department: employee.department || "",
                                clientId: employee.clientId || "",
                                fullName: employee.fullName || "",
                                position: employee.position || "",
                                // Ensure isEntity is properly set for employees
                                isEntity: employee.isEntity || false,
                                // Use explicit name fields if present, otherwise use splitFullName
                                firstName:
                                  employee.firstName != null &&
                                  String(employee.firstName).trim() !== ""
                                    ? employee.firstName
                                    : nameParts.firstName,
                                middleName:
                                  employee.middleName != null &&
                                  String(employee.middleName).trim() !== ""
                                    ? employee.middleName
                                    : nameParts.middleName,
                                lastName:
                                  employee.lastName != null &&
                                  String(employee.lastName).trim() !== ""
                                    ? employee.lastName
                                    : nameParts.lastName,
                              };

                              console.log(
                                "Formatted employee data for form:",
                                formattedEmployee
                              );
                              setForm(formattedEmployee);
                              setShowForm(true);
                            }}
                            style={{
                              padding:
                                "clamp(3px, 0.5vw, 4px) clamp(6px, 0.8vw, 8px)",
                              border: isDarkMode
                                ? "1px solid #4b5563"
                                : "1px solid #d1d5db",
                              borderRadius: 4,
                              background: isDarkMode ? "#6b7280" : "#f3f4f6",
                              color: isDarkMode ? "#f3f4f6" : "#374151",
                              fontSize: "clamp(10px, 0.8vw, 12px)",
                              cursor: "pointer",
                              fontFamily: "inherit",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleResignEmployee(employee.id)}
                            style={{
                              padding:
                                "clamp(3px, 0.5vw, 4px) clamp(6px, 0.8vw, 8px)",
                              border: "1px solid #dc2626",
                              borderRadius: 4,
                              background: isDarkMode ? "#6b7280" : "white",
                              color: isDarkMode ? "#f3f4f6" : "#dc2626",
                              fontSize: "clamp(10px, 0.8vw, 12px)",
                              cursor: "pointer",
                              fontFamily: "inherit",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Resign
                          </button>
                        </div>
                      </td>
                    )}
                    {activeTab === "others" && (
                      <td
                        style={{
                          padding: "clamp(8px, 1vw, 16px)",
                          textAlign: "center",
                          overflow: "hidden",
                          border: isDarkMode
                            ? "1px solid #4b5563"
                            : "1px solid #e5e7eb",
                          borderLeft: isDarkMode
                            ? "1px solid #4b5563"
                            : "1px solid #e5e7eb", // Standard border for separation
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "clamp(4px, 0.5vw, 8px)",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            onClick={() => {
                              console.log(
                                "Edit button clicked for entity:",
                                employee
                              );

                              // Format entity data for editing
                              const formattedEntity = {
                                ...employee,
                                isEntity: true,
                                description: employee.description || "",
                                department: employee.department || "",
                              };

                              console.log(
                                "Formatted entity data for form:",
                                formattedEntity
                              );
                              setForm(formattedEntity);
                              setShowForm(true);
                            }}
                            style={{
                              padding:
                                "clamp(3px, 0.5vw, 4px) clamp(6px, 0.8vw, 8px)",
                              border: isDarkMode
                                ? "1px solid #4b5563"
                                : "1px solid #d1d5db",
                              borderRadius: 4,
                              background: isDarkMode ? "#6b7280" : "#f3f4f6",
                              color: isDarkMode ? "#f3f4f6" : "#374151",
                              fontSize: "clamp(10px, 0.8vw, 12px)",
                              cursor: "pointer",
                              fontFamily: "inherit",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to delete the entity "${employee.description}"? This action cannot be undone.`
                                )
                              ) {
                                handleDeleteEntity(employee.id);
                              }
                            }}
                            style={{
                              padding:
                                "clamp(3px, 0.5vw, 4px) clamp(6px, 0.8vw, 8px)",
                              border: "1px solid #dc2626",
                              borderRadius: 4,
                              background: isDarkMode ? "#6b7280" : "white",
                              color: isDarkMode ? "#f3f4f6" : "#dc2626",
                              fontSize: "clamp(10px, 0.8vw, 12px)",
                              cursor: "pointer",
                              fontFamily: "inherit",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Delete
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
            background: isDarkMode ? "#374151" : "#fff",
            borderTop: isDarkMode ? "1px solid #4b5563" : "1px solid #e5e7eb",
            margin: "0 24px",
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            marginTop: -1, // To merge with table border
          }}
        >
          {/* Left side - Results info and items per page */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span
              style={{
                fontSize: "14px",
                color: isDarkMode ? "#d1d5db" : "#6b7280",
              }}
            >
              Showing {startIndex + 1}-{Math.min(endIndex, allEmployees.length)}{" "}
              of {allEmployees.length} {activeTab} employees
              {searchTerm && (
                <span style={{ fontStyle: "italic", marginLeft: "8px" }}>
                  (filtered by "{searchTerm}")
                </span>
              )}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "14px",
                  color: isDarkMode ? "#d1d5db" : "#6b7280",
                }}
              >
                Show:
              </span>
              <select
                value={employeesPerPage}
                onChange={(e) => setEmployeesPerPage(Number(e.target.value))}
                style={{
                  padding: "6px 8px",
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #e0e7ef",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  outline: "none",
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

          {/* Right side - Pagination controls */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={validCurrentPage === 1}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #e0e7ef",
                  background:
                    validCurrentPage === 1
                      ? isDarkMode
                        ? "#374151"
                        : "#f5f7fa"
                      : isDarkMode
                      ? "#4b5563"
                      : "#fff",
                  color:
                    validCurrentPage === 1
                      ? isDarkMode
                        ? "#6b7280"
                        : "#9ca3af"
                      : isDarkMode
                      ? "#f3f4f6"
                      : "#445F6D",
                  cursor: validCurrentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: "inherit",
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
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #e0e7ef",
                  background:
                    validCurrentPage === 1
                      ? isDarkMode
                        ? "#374151"
                        : "#f5f7fa"
                      : isDarkMode
                      ? "#4b5563"
                      : "#fff",
                  color:
                    validCurrentPage === 1
                      ? isDarkMode
                        ? "#6b7280"
                        : "#9ca3af"
                      : isDarkMode
                      ? "#f3f4f6"
                      : "#445F6D",
                  cursor: validCurrentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: "inherit",
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
                        border: isDarkMode
                          ? "1px solid #4b5563"
                          : "1px solid #e0e7ef",
                        background:
                          i === validCurrentPage
                            ? "#2563eb"
                            : isDarkMode
                            ? "#4b5563"
                            : "#fff",
                        color:
                          i === validCurrentPage
                            ? "#fff"
                            : isDarkMode
                            ? "#f3f4f6"
                            : "#445F6D",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        minWidth: "40px",
                        fontFamily: "inherit",
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
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #e0e7ef",
                  background:
                    validCurrentPage === totalPages
                      ? isDarkMode
                        ? "#374151"
                        : "#f5f7fa"
                      : isDarkMode
                      ? "#4b5563"
                      : "#fff",
                  color:
                    validCurrentPage === totalPages
                      ? isDarkMode
                        ? "#6b7280"
                        : "#9ca3af"
                      : isDarkMode
                      ? "#f3f4f6"
                      : "#445F6D",
                  cursor:
                    validCurrentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: "inherit",
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
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #e0e7ef",
                  background:
                    validCurrentPage === totalPages
                      ? isDarkMode
                        ? "#374151"
                        : "#f5f7fa"
                      : isDarkMode
                      ? "#4b5563"
                      : "#fff",
                  color:
                    validCurrentPage === totalPages
                      ? isDarkMode
                        ? "#6b7280"
                        : "#9ca3af"
                      : isDarkMode
                      ? "#f3f4f6"
                      : "#445F6D",
                  cursor:
                    validCurrentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: "inherit",
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
      {showForm && form.isEntity && (
        <EntityFormModal
          data={form}
          onChange={handleFormChange}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          isValid={isFormValid()}
          clients={clients}
        />
      )}
      {showForm && !form.isEntity && (
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

      {/* Delete Permanently Confirmation */}
      <ConfirmationModal
        isOpen={showDeletePermanentlyConfirm}
        onConfirm={confirmDeletePermanently}
        onCancel={() => {
          setShowDeletePermanentlyConfirm(false);
        }}
        title="Delete Permanently"
        message={`Are you sure you want to permanently delete ${selectedIds.length} employee(s)? This action cannot be undone.`}
        confirmText="Delete Permanently"
        confirmColor="#dc2626"
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
        clients={clients}
        getDepartmentForForm={getDepartmentForForm}
        currentUser={currentUser}
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
