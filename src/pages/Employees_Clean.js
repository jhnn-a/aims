import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  addEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
} from "../services/employeeService";
import { getAllClients } from "../services/clientService";
import { getAllDevices, updateDevice } from "../services/deviceService";
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

const isValidName = (value) => /^[A-Za-zÑñ\s.'\-(),]+$/.test(value.trim());

// Employee Form Modal Component
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
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 28,
          borderRadius: 14,
          minWidth: 460,
          maxWidth: 540,
          boxShadow: "0 4px 16px rgba(68,95,109,0.14)",
          display: "flex",
          flexDirection: "column",
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
          {data.id ? "Edit Employee" : "Add Employee"}
        </h3>
        
        <form
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
          }}
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div
            style={{
              marginBottom: 16,
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <label
              style={{
                color: "#445F6D",
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              Full Name:
            </label>
            <input
              name="fullName"
              value={data.fullName || ""}
              onChange={onChange}
              style={{
                padding: "10px 14px",
                border: "1px solid #d0d7de",
                borderRadius: "6px",
                fontSize: "14px",
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#fafbfc",
                color: "#24292f",
                fontFamily: "inherit",
              }}
            />
          </div>
          
          <div
            style={{
              marginBottom: 16,
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <label
              style={{
                color: "#445F6D",
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              Position:
            </label>
            <input
              name="position"
              value={data.position || ""}
              onChange={onChange}
              style={{
                padding: "10px 14px",
                border: "1px solid #d0d7de",
                borderRadius: "6px",
                fontSize: "14px",
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#fafbfc",
                color: "#24292f",
                fontFamily: "inherit",
              }}
            />
          </div>
          
          <div
            style={{
              marginBottom: 16,
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <label
              style={{
                color: "#445F6D",
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              Department:
            </label>
            <input
              name="department"
              value={data.department || ""}
              onChange={onChange}
              style={{
                padding: "10px 14px",
                border: "1px solid #d0d7de",
                borderRadius: "6px",
                fontSize: "14px",
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#fafbfc",
                color: "#24292f",
                fontFamily: "inherit",
              }}
            />
          </div>
          
          <div
            style={{
              marginBottom: 16,
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <label
              style={{
                color: "#445F6D",
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              Client:
            </label>
            <select
              name="clientId"
              value={data.clientId || ""}
              onChange={onChange}
              style={{
                padding: "10px 14px",
                border: "1px solid #d0d7de",
                borderRadius: "6px",
                fontSize: "14px",
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#fafbfc",
                color: "#24292f",
                fontFamily: "inherit",
              }}
            >
              <option value="">Choose Client</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName}
                </option>
              ))}
            </select>
          </div>
          
          <div
            style={{
              marginBottom: 16,
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <label
              style={{
                color: "#445F6D",
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              Corporate Email:
            </label>
            <input
              name="corporateEmail"
              value={data.corporateEmail || ""}
              onChange={onChange}
              style={{
                padding: "10px 14px",
                border: "1px solid #d0d7de",
                borderRadius: "6px",
                fontSize: "14px",
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#fafbfc",
                color: "#24292f",
                fontFamily: "inherit",
              }}
            />
          </div>
          
          <div
            style={{
              marginBottom: 16,
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <label
              style={{
                color: "#445F6D",
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              Personal Email:
            </label>
            <input
              name="personalEmail"
              value={data.personalEmail || ""}
              onChange={onChange}
              style={{
                padding: "10px 14px",
                border: "1px solid #d0d7de",
                borderRadius: "6px",
                fontSize: "14px",
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#fafbfc",
                color: "#24292f",
                fontFamily: "inherit",
              }}
            />
          </div>
          
          <div
            style={{
              marginBottom: 16,
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <label
              style={{
                color: "#445F6D",
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              Date Hired:
            </label>
            <input
              name="dateHired"
              type="date"
              value={data.dateHired || ""}
              onChange={onChange}
              style={{
                padding: "10px 14px",
                border: "1px solid #d0d7de",
                borderRadius: "6px",
                fontSize: "14px",
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#fafbfc",
                color: "#24292f",
                fontFamily: "inherit",
              }}
            />
          </div>
          
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "12px",
              marginTop: 20,
            }}
          >
            <button
              onClick={onSave}
              disabled={!isValid}
              style={{
                padding: "12px 24px",
                border: "none",
                borderRadius: "8px",
                background: isValid ? "#70C1B3" : "#94a3b8",
                color: "#fff",
                cursor: isValid ? "pointer" : "not-allowed",
                fontSize: "14px",
                fontWeight: 600,
                transition: "all 0.2s",
                minWidth: "120px",
                boxShadow: isValid ? "0 2px 4px rgba(112, 193, 179, 0.3)" : "none",
              }}
            >
              {data.id ? "Update" : "Add"} Employee
            </button>
            <button 
              onClick={onCancel} 
              style={{
                padding: "12px 24px",
                border: "1px solid #d0d7de",
                borderRadius: "8px",
                background: "#f8f9fa",
                color: "#495057",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.2s",
                minWidth: "100px",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main Employees Component
function Employees() {
  // All state variables
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeSection, setEmployeeSection] = useState("active");
  const [form, setForm] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [showImportExportDropdown, setShowImportExportDropdown] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [showBulkResignModal, setShowBulkResignModal] = useState(false);
  const [bulkResignReason, setBulkResignReason] = useState("");
  
  const { showSuccess, showError, showUndoNotification } = useSnackbar();

  // Load data
  const loadClientsAndEmployees = async () => {
    setLoading(true);
    try {
      const [clientsData, employeesData, devicesData] = await Promise.all([
        getAllClients(),
        getAllEmployees(),
        getAllDevices(),
      ]);

      const clientsWithMap = clientsData || [];
      const clientMap = {};
      clientsWithMap.forEach(client => {
        clientMap[client.id] = client.clientName;
      });

      const enrichedEmployees = (employeesData || []).map(emp => ({
        ...emp,
        client: clientMap[emp.clientId] || "No Client",
      }));

      setClients(clientsWithMap);
      setEmployees(enrichedEmployees);
      setDevices(devicesData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      showError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientsAndEmployees();
    
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setShowImportExportDropdown(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      if (form.id) {
        await updateEmployee(form.id, form);
        showSuccess("Employee updated successfully");
      } else {
        await addEmployee(form);
        showSuccess("Employee added successfully");
      }
      
      setShowForm(false);
      setForm({});
      loadClientsAndEmployees();
    } catch (error) {
      console.error("Error saving employee:", error);
      showError("Failed to save employee");
    }
  };

  // Import/Export functions
  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportProgress({ current: 0, total: 0 });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log("Excel data structure:", jsonData[0]);

      setImportProgress({ current: 0, total: jsonData.length });

      const clientsMap = {};
      clients.forEach(client => {
        clientsMap[client.clientName.toLowerCase()] = client.id;
      });

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        setImportProgress({ current: i + 1, total: jsonData.length });

        try {
          const lastName = (row["LAST NAME"] || "").toString().trim();
          const firstName = (row["FIRST NAME"] || "").toString().trim();
          const middleName = (row["MIDDLE NAME"] || "").toString().trim();
          
          let fullName = "";
          if (lastName && firstName) {
            fullName = middleName ? 
              `${lastName}, ${firstName} ${middleName}` : 
              `${lastName}, ${firstName}`;
          } else if (firstName) {
            fullName = firstName;
          } else if (lastName) {
            fullName = lastName;
          }

          if (!fullName) {
            errors.push(`Row ${i + 2}: Missing name information`);
            errorCount++;
            continue;
          }

          if (!isValidName(fullName)) {
            errors.push(`Row ${i + 2}: Invalid name format - ${fullName}`);
            errorCount++;
            continue;
          }

          const clientName = (row["CLIENT"] || "").toString().trim();
          const clientId = clientName ? 
            clientsMap[clientName.toLowerCase()] || "" : "";

          if (clientName && !clientId) {
            console.warn(`Client not found: ${clientName}`);
          }

          const employeeData = {
            fullName: fullName,
            position: (row["POSITION"] || "").toString().trim(),
            corporateEmail: (row["CORPORATE EMAIL"] || "").toString().trim(),
            personalEmail: (row["PERSONAL EMAIL"] || "").toString().trim(),
            dateHired: row["DATE HIRED"] ? 
              new Date(row["DATE HIRED"]).toISOString().slice(0, 10) : "",
            clientId: clientId,
            department: "",
          };

          console.log(`Processing row ${i + 2}:`, employeeData);

          await addEmployee(employeeData);
          successCount++;

        } catch (error) {
          console.error(`Error processing row ${i + 2}:`, error);
          errors.push(`Row ${i + 2}: ${error.message}`);
          errorCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (errors.length > 0) {
        console.log("Import errors:", errors);
      }

      showSuccess(`Import completed: ${successCount} successful, ${errorCount} errors`);
      loadClientsAndEmployees();

    } catch (error) {
      console.error("Import error:", error);
      showError("Import failed: " + error.message);
    } finally {
      setImporting(false);
      setImportProgress({ current: 0, total: 0 });
      event.target.value = "";
    }
  };

  const handleExportToExcel = async () => {
    try {
      const exportData = employees.map(emp => ({
        "DATE HIRED": emp.dateHired || "",
        "CLIENT": emp.client || "",
        "LAST NAME": emp.fullName ? emp.fullName.split(',')[0] || "" : "",
        "FIRST NAME": emp.fullName ? (emp.fullName.split(',')[1] || "").split(' ')[0] || "" : "",
        "MIDDLE NAME": emp.fullName ? (emp.fullName.split(',')[1] || "").split(' ').slice(1).join(' ') || "" : "",
        "POSITION": emp.position || "",
        "CORPORATE EMAIL": emp.corporateEmail || "",
        "PERSONAL EMAIL": emp.personalEmail || "",
      }));
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Employees");
      
      const filename = `employees_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      showSuccess("Employee data exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      showError("Export failed");
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const isActive = !emp.resignedDate;
    const matchesSection = employeeSection === "active" ? isActive : !isActive;
    const matchesSearch = emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.client?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSection && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, startIndex + rowsPerPage);

  const isFormValid = form.fullName?.trim() && form.position?.trim();

  // Selection functions for bulk operations
  const toggleSelectAll = () => {
    if (selectedIds.length === currentEmployees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentEmployees.map(emp => emp.id));
    }
  };

  const toggleSelectEmployee = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkResign = () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one employee to resign.");
      return;
    }
    setShowBulkResignModal(true);
  };

  const confirmBulkResign = async () => {
    try {
      for (const empId of selectedIds) {
        await updateEmployee(empId, {
          resignedDate: new Date().toISOString().slice(0, 10),
          resignationReason: bulkResignReason || "Resigned",
        });
      }
      setShowBulkResignModal(false);
      setBulkResignReason("");
      setSelectedIds([]);
      showSuccess(`Successfully resigned ${selectedIds.length} employee(s)`);
      loadClientsAndEmployees();
    } catch (error) {
      showError("Failed to resign employees: " + error.message);
    }
  };

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
        padding: "20px 24px 16px 24px",
        flexShrink: 0,
      }}>
        EMPLOYEE MANAGEMENT
      </div>

      {/* Tabs Bar */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        borderBottom: "2px solid #e0e7ef",
        margin: "0 24px 0 24px",
        gap: 2,
        flexShrink: 0,
        paddingBottom: 0,
      }}>
        <button
          onClick={() => setEmployeeSection("active")}
          style={{
            border: "none",
            background: employeeSection === "active" ? "#fff" : "#e0e7ef",
            color: employeeSection === "active" ? "#2563eb" : "#64748b",
            fontWeight: employeeSection === "active" ? 700 : 500,
            fontSize: 16,
            padding: "10px 32px",
            borderRadius: 0,
            cursor: "pointer",
            boxShadow: employeeSection === "active" ? "0 -2px 8px rgba(68,95,109,0.08)" : "none",
            outline: "none",
            transition: "all 0.2s",
          }}
        >
          Active Employees ({employees.filter(e => !e.resignedDate).length})
        </button>
        <button
          onClick={() => setEmployeeSection("resigned")}
          style={{
            border: "none",
            background: employeeSection === "resigned" ? "#fff" : "#e0e7ef",
            color: employeeSection === "resigned" ? "#2563eb" : "#64748b",
            fontWeight: employeeSection === "resigned" ? 700 : 500,
            fontSize: 16,
            padding: "10px 32px",
            borderRadius: 0,
            cursor: "pointer",
            boxShadow: employeeSection === "resigned" ? "0 -2px 8px rgba(68,95,109,0.08)" : "none",
            outline: "none",
            transition: "all 0.2s",
          }}
        >
          Resigned Employees ({employees.filter(e => e.resignedDate).length})
        </button>
      </div>

      {/* Tab Content */}
      <div style={{
        background: "#fff",
        borderRadius: 0,
        boxShadow: "0 2px 12px rgba(68,95,109,0.10)",
        margin: "0 24px 24px 24px",
        padding: 0,
        flex: 1,
        overflow: "hidden",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Controls Bar */}
        <div style={{
          padding: "24px 24px 0 24px",
          borderBottom: "1px solid #e5e7eb",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}>
            {/* Search */}
            <div style={{
              display: "flex",
              alignItems: "center",
              background: "#f9fafb",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "0 12px",
              width: "320px",
              height: "40px",
            }}>
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="#6b7280"
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
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

            {/* Action Buttons */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginLeft: "auto",
              flexWrap: "wrap",
            }}>
              {employeeSection === "active" && (
                <button
                  disabled={!selectedIds.length}
                  onClick={handleBulkResign}
                  style={{
                    padding: "9px 16px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    background: selectedIds.length ? "#ef4444" : "#f3f4f6",
                    color: selectedIds.length ? "#fff" : "#9ca3af",
                    cursor: selectedIds.length ? "pointer" : "not-allowed",
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
                  Resign Selected
                </button>
              )}
              
              <button
                onClick={() => {
                  setForm({});
                  setShowForm(true);
                }}
                style={{
                  padding: "9px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  background: "#3b82f6",
                  color: "#fff",
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
                  <path d="M19 8v6" />
                  <path d="M22 11h-6" />
                </svg>
                Add Employee
              </button>

              <div style={{ position: "relative", display: "inline-block" }} className="dropdown-container">
                <button
                  onClick={() => setShowImportExportDropdown(!showImportExportDropdown)}
                  style={{
                    padding: "9px 16px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    background: "#f3f4f6",
                    color: "#374151",
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
                  disabled={importing}
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
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {importing ? `Importing... ${importProgress.current}/${importProgress.total}` : "Import/Export"}
                </button>
                
                {showImportExportDropdown && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: "0",
                    backgroundColor: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    zIndex: 1000,
                    minWidth: "150px",
                    overflow: "hidden",
                  }}>
                    <label style={{
                      display: "block",
                      padding: "10px 15px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#374151",
                      borderBottom: "1px solid #e5e7eb",
                      backgroundColor: "transparent",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "#f9fafb"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    >
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: "none" }}
                        onChange={handleImportExcel}
                        disabled={importing}
                      />
                      Import Excel
                    </label>
                    <button
                      onClick={() => {
                        handleExportToExcel();
                        setShowImportExportDropdown(false);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "10px 15px",
                        border: "none",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#374151",
                        textAlign: "left",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = "#f9fafb"}
                      onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    >
                      Export Excel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Scrollable Table Container */}
        <div style={{
          background: "#fff",
          border: "none",
          flex: "1",
          overflow: "auto",
          minHeight: "0",
        }}>
          <div style={{ overflowX: "auto", width: "100%", height: "100%" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "50px" }}>
                <TableLoadingSpinner text="Loading employees..." />
              </div>
            ) : (
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#fff",
                fontSize: "14px",
                border: "1px solid #d1d5db",
              }}>
                <thead style={{ position: "sticky", top: "0", zIndex: "5" }}>
                  {/* Header Row with Column Titles */}
                  <tr style={{
                    background: "rgb(255, 255, 255)",
                    borderBottom: "1px solid #e5e7eb",
                  }}>
                    {employeeSection === "active" && (
                      <th style={{
                        padding: "8px 16px",
                        border: "1px solid #d1d5db",
                        width: "40px",
                        textAlign: "center",
                        fontWeight: 500,
                        color: "#374151",
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}>
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
                    )}
                    <th style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: "1px solid #d1d5db",
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}>#</th>
                    <th style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: "1px solid #d1d5db",
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "120px",
                      maxWidth: "120px",
                      minWidth: "100px",
                    }}>Employee ID</th>
                    <th style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: "1px solid #d1d5db",
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "200px",
                      maxWidth: "200px",
                      minWidth: "180px",
                    }}>Full Name</th>
                    <th style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: "1px solid #d1d5db",
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "150px",
                      maxWidth: "150px",
                      minWidth: "120px",
                    }}>Position</th>
                    <th style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: "1px solid #d1d5db",
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "120px",
                      maxWidth: "120px",
                      minWidth: "100px",
                    }}>Client</th>
                    <th style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: "1px solid #d1d5db",
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "180px",
                      maxWidth: "180px",
                      minWidth: "150px",
                    }}>Corporate Email</th>
                    <th style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: "1px solid #d1d5db",
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "120px",
                      maxWidth: "120px",
                      minWidth: "100px",
                    }}>Date Hired</th>
                    <th style={{
                      color: "#374151",
                      fontWeight: 500,
                      padding: "8px 16px",
                      border: "1px solid #d1d5db",
                      textAlign: "center",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "100px",
                    }}>Actions</th>
                  </tr>
                </thead>
                
                <tbody>
                  {currentEmployees.length > 0 ? (
                    currentEmployees.map((emp, index) => (
                      <tr 
                        key={emp.id} 
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          backgroundColor: selectedIds.includes(emp.id) ? "#f0f9ff" : "#fff",
                        }}
                      >
                        {employeeSection === "active" && (
                          <td style={{
                            padding: "8px 16px",
                            border: "1px solid #d1d5db",
                            textAlign: "center",
                            fontSize: "14px",
                            color: "#374151",
                            width: "40px",
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(emp.id)}
                              onChange={() => toggleSelectEmployee(emp.id)}
                              style={{
                                width: 16,
                                height: 16,
                                accentColor: "#3b82f6",
                                border: "1px solid #d1d5db",
                                borderRadius: "3px",
                              }}
                            />
                          </td>
                        )}
                        <td style={{
                          padding: "8px 16px",
                          border: "1px solid #d1d5db",
                          textAlign: "center",
                          fontSize: "14px",
                          color: "#374151",
                        }}>
                          {startIndex + index + 1}
                        </td>
                        <td style={{
                          padding: "8px 16px",
                          border: "1px solid #d1d5db",
                          textAlign: "left",
                          fontSize: "14px",
                          color: "#374151",
                          width: "120px",
                          maxWidth: "120px",
                          wordWrap: "break-word",
                        }}>
                          {emp.id}
                        </td>
                        <td style={{
                          padding: "8px 16px",
                          border: "1px solid #d1d5db",
                          textAlign: "left",
                          fontSize: "14px",
                          color: "#374151",
                          width: "200px",
                          maxWidth: "200px",
                          wordWrap: "break-word",
                        }}>
                          {emp.fullName}
                        </td>
                        <td style={{
                          padding: "8px 16px",
                          border: "1px solid #d1d5db",
                          textAlign: "left",
                          fontSize: "14px",
                          color: "#374151",
                          width: "150px",
                          maxWidth: "150px",
                          wordWrap: "break-word",
                        }}>
                          {emp.position}
                        </td>
                        <td style={{
                          padding: "8px 16px",
                          border: "1px solid #d1d5db",
                          textAlign: "left",
                          fontSize: "14px",
                          color: "#374151",
                          width: "120px",
                          maxWidth: "120px",
                          wordWrap: "break-word",
                        }}>
                          {emp.client || "-"}
                        </td>
                        <td style={{
                          padding: "8px 16px",
                          border: "1px solid #d1d5db",
                          textAlign: "left",
                          fontSize: "14px",
                          color: "#374151",
                          width: "180px",
                          maxWidth: "180px",
                          wordWrap: "break-word",
                        }}>
                          {emp.corporateEmail || "-"}
                        </td>
                        <td style={{
                          padding: "8px 16px",
                          border: "1px solid #d1d5db",
                          textAlign: "center",
                          fontSize: "14px",
                          color: "#374151",
                          width: "120px",
                          maxWidth: "120px",
                        }}>
                          {emp.dateHired || "-"}
                        </td>
                        <td style={{
                          padding: "8px 16px",
                          border: "1px solid #d1d5db",
                          textAlign: "center",
                          fontSize: "14px",
                          color: "#374151",
                          width: "100px",
                        }}>
                          <div style={{
                            display: "flex",
                            gap: "4px",
                            justifyContent: "center",
                            flexWrap: "wrap",
                          }}>
                            <button
                              onClick={() => {
                                setForm(emp);
                                setShowForm(true);
                              }}
                              style={{
                                padding: "4px 8px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                background: "#f3f4f6",
                                color: "#374151",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: 500,
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = "#e5e7eb";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = "#f3f4f6";
                              }}
                            >
                              Edit
                            </button>
                            {employeeSection === "active" ? (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to resign ${emp.fullName}?`)) {
                                    try {
                                      await updateEmployee(emp.id, {
                                        resignedDate: new Date().toISOString().slice(0, 10),
                                        resignationReason: "Resigned",
                                      });
                                      showSuccess(`${emp.fullName} has been resigned`);
                                      loadClientsAndEmployees();
                                    } catch (error) {
                                      showError("Failed to resign employee: " + error.message);
                                    }
                                  }
                                }}
                                style={{
                                  padding: "4px 8px",
                                  border: "1px solid #dc2626",
                                  borderRadius: "4px",
                                  background: "#fef2f2",
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = "#dc2626";
                                  e.target.style.color = "#fff";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = "#fef2f2";
                                  e.target.style.color = "#dc2626";
                                }}
                              >
                                Resign
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to reactivate ${emp.fullName}?`)) {
                                    try {
                                      await updateEmployee(emp.id, {
                                        resignedDate: null,
                                        resignationReason: null,
                                      });
                                      showSuccess(`${emp.fullName} has been reactivated`);
                                      loadClientsAndEmployees();
                                    } catch (error) {
                                      showError("Failed to reactivate employee: " + error.message);
                                    }
                                  }
                                }}
                                style={{
                                  padding: "4px 8px",
                                  border: "1px solid #16a34a",
                                  borderRadius: "4px",
                                  background: "#f0fdf4",
                                  color: "#16a34a",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = "#16a34a";
                                  e.target.style.color = "#fff";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = "#f0fdf4";
                                  e.target.style.color = "#16a34a";
                                }}
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td 
                        colSpan={employeeSection === "active" ? "9" : "8"} 
                        style={{
                          padding: "50px",
                          textAlign: "center",
                          fontSize: "16px",
                          color: "#6b7280",
                          fontStyle: "italic",
                        }}
                      >
                        No employees found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            padding: "16px 0",
            borderTop: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                background: currentPage === 1 ? "#f3f4f6" : "#fff",
                color: currentPage === 1 ? "#9ca3af" : "#374151",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.2s",
              }}
            >
              Previous
            </button>
            
            <span style={{
              padding: "8px 16px",
              fontSize: "14px",
              color: "#374151",
              fontWeight: 500,
            }}>
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                background: currentPage === totalPages ? "#f3f4f6" : "#fff",
                color: currentPage === totalPages ? "#9ca3af" : "#374151",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.2s",
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Bulk Resign Modal */}
      {showBulkResignModal && (
        <div style={{
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
        }}>
          <div style={{
            background: "#fff",
            padding: 28,
            borderRadius: 14,
            minWidth: 360,
            maxWidth: 440,
            boxShadow: "0 4px 16px rgba(68,95,109,0.14)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            border: "2px solid #ef4444",
          }}>
            <h3 style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#dc2626",
              marginBottom: 16,
              letterSpacing: 0.3,
              textAlign: "center",
            }}>
              Bulk Resign Employees
            </h3>
            
            <p style={{
              fontSize: 14,
              color: "#374151",
              marginBottom: 16,
              textAlign: "center",
            }}>
              You are about to resign {selectedIds.length} employee(s). This action cannot be undone.
            </p>
            
            <div style={{
              marginBottom: 20,
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}>
              <label style={{
                color: "#445F6D",
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
                fontSize: 13,
              }}>
                Resignation Reason (optional):
              </label>
              <textarea
                value={bulkResignReason}
                onChange={(e) => setBulkResignReason(e.target.value)}
                placeholder="Enter resignation reason..."
                style={{
                  padding: "10px 14px",
                  border: "1px solid #d0d7de",
                  borderRadius: "6px",
                  fontSize: "14px",
                  width: "100%",
                  boxSizing: "border-box",
                  backgroundColor: "#fafbfc",
                  color: "#24292f",
                  fontFamily: "inherit",
                  minHeight: "80px",
                  resize: "vertical",
                }}
              />
            </div>
            
            <div style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "12px",
            }}>
              <button
                onClick={confirmBulkResign}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#dc2626",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  transition: "all 0.2s",
                  minWidth: "120px",
                }}
              >
                Confirm Resignation
              </button>
              <button 
                onClick={() => {
                  setShowBulkResignModal(false);
                  setBulkResignReason("");
                }}
                style={{
                  padding: "12px 24px",
                  border: "1px solid #d0d7de",
                  borderRadius: "8px",
                  background: "#f8f9fa",
                  color: "#495057",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 500,
                  transition: "all 0.2s",
                  minWidth: "100px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Form Modal */}
      {showForm && (
        <EmployeeFormModal
          data={form}
          onChange={handleFormChange}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setForm({});
          }}
          isValid={isFormValid}
          clients={clients}
        />
      )}
    </div>
  );
}

export default Employees;
