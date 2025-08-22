import React, { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import LoadingSpinner, {
  TableLoadingSpinner,
} from "../components/LoadingSpinner";
// Import XLSX for Excel import
import * as XLSX from "xlsx";
// Import snackbar for notifications
import { useSnackbar } from "../components/Snackbar";
// Import device types and tag generation utility
import {
  deviceTypes,
  getConditionColor,
  getConditionTextColor,
} from "./InventoryConstants";
import { generateNextDeviceTag } from "./InventoryUtils";
// Import theme context for dark mode
import { useTheme } from "../context/ThemeContext";

const emptyUnit = {
  Tag: "",
  deviceType: "", // New field for device type (Laptop/PC)
  category: "", // New field for category (mid-range, etc.)
  cpuSystemUnit: "", // CPU System Unit for PC devices (i3, i5, i7, i9)
  cpuGen: "", // New field for CPU generation
  cpuModel: "", // New field for CPU model
  CPU: "",
  RAM: "",
  Drive: "",
  GPU: "",
  Condition: "", // Renamed from Status to Condition
  OS: "",
  Status: "", // New field for maintenance status (Healthy, Needs Maintenance, Critical)
  lifespan: "", // New field for lifespan
  dateAdded: "", // New field for dateAdded to calculate appraisal date
  lastMaintenanceDate: "", // New field for last maintenance date
  maintenanceChecklist: [], // Array to store completed maintenance tasks
};

const cpuGenOptions = ["i3", "i5", "i7", "i9"];
const ramOptions = [4, 8, 16, 32, 64];

// Category options for devices
const categoryOptions = [
  { label: "Low-End", value: "Low-End" },
  { label: "Mid-Range", value: "Mid-Range" },
  { label: "High-End", value: "High-End" },
];

// Device type options (filtered for PC and Laptop only)
const unitDeviceTypes = deviceTypes.filter(
  (type) => type.label === "PC" || type.label === "Laptop"
);

const osOptions = [
  { label: "Windows 10", value: "WIN10" },
  { label: "Windows 11", value: "WIN11" },
];

const conditionOptions = [
  { label: "BRANDNEW", value: "BRANDNEW" },
  { label: "GOOD", value: "GOOD" },
  { label: "DEFECTIVE", value: "DEFECTIVE" },
];

// === APPRAISAL DATE CALCULATION FUNCTIONS ===
// Helper function to get lifespan years based on category/specs
const getLifespanYears = (category, cpuGen, ram, drive, gpu) => {
  // If category is explicitly set, use it
  if (category) {
    switch (category) {
      case "Low-End":
        return 3;
      case "Mid-Range":
        return 4;
      case "High-End":
        return 5;
      default:
        return 3; // Default to low-end
    }
  }

  // Auto-determine based on specs if no category
  const cpuGeneration = cpuGen?.toLowerCase() || "";
  const ramSize = parseInt(ram) || 0;
  const hasHDD = drive?.toLowerCase().includes("hdd") || false;
  const hasSSD =
    drive?.toLowerCase().includes("ssd") ||
    drive?.toLowerCase().includes("nvme") ||
    false;
  const hasGPU =
    gpu && gpu.trim() !== "" && !gpu.toLowerCase().includes("integrated");

  // High-end criteria: i7+, 16GB+ RAM, SSD/NVMe + GPU
  if (
    (cpuGeneration === "i7" || cpuGeneration === "i9") &&
    ramSize >= 16 &&
    hasSSD &&
    hasGPU
  ) {
    return 5;
  }

  // Mid-range criteria: i5/i7, 8GB+ RAM, SSD
  if (
    (cpuGeneration === "i5" || cpuGeneration === "i7") &&
    ramSize >= 8 &&
    hasSSD
  ) {
    return 4;
  }

  // Low-end: everything else (i3, 4GB RAM, HDD)
  return 3;
};

// Helper function to calculate appraisal date
const calculateAppraisalDate = (
  dateAdded,
  category,
  cpuGen,
  ram,
  drive,
  gpu
) => {
  if (!dateAdded) return "";

  try {
    const addedDate = new Date(dateAdded);
    if (isNaN(addedDate.getTime())) return "";

    const lifespanYears = getLifespanYears(category, cpuGen, ram, drive, gpu);
    const appraisalDate = new Date(addedDate);
    appraisalDate.setFullYear(appraisalDate.getFullYear() + lifespanYears);

    return appraisalDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch (error) {
    console.error("Error calculating appraisal date:", error);
    return "";
  }
};

// Helper function to auto-fill category based on specs
const autoFillCategoryFromSpecs = (cpuGen, ram, drive, gpu) => {
  const cpuString = cpuGen?.toLowerCase() || "";
  const ramSize = parseInt(ram) || 0;
  const driveString = drive?.toLowerCase() || "";
  const gpuString = gpu?.toLowerCase() || "";

  // Extract CPU generation from strings like "Intel Core i7-8700K" or "i7-10700"
  let cpuGeneration = "";
  if (cpuString.includes("i9")) {
    cpuGeneration = "i9";
  } else if (cpuString.includes("i7")) {
    cpuGeneration = "i7";
  } else if (cpuString.includes("i5")) {
    cpuGeneration = "i5";
  } else if (cpuString.includes("i3")) {
    cpuGeneration = "i3";
  }

  // Check drive types
  const hasHDD = driveString.includes("hdd");
  const hasSSD = driveString.includes("ssd") || driveString.includes("nvme");

  // Check for dedicated GPU (not integrated)
  const hasGPU =
    gpuString &&
    gpuString.trim() !== "" &&
    !gpuString.includes("integrated") &&
    !gpuString.includes("intel") &&
    !gpuString.includes("none");

  console.log("Category Debug:", {
    cpuString,
    cpuGeneration,
    ramSize,
    driveString,
    hasHDD,
    hasSSD,
    gpuString,
    hasGPU,
  });

  // High-end criteria: i7+ (i7 or i9), 16GB+ RAM, SSD/NVMe + dedicated GPU
  if (
    (cpuGeneration === "i7" || cpuGeneration === "i9") &&
    ramSize >= 16 &&
    hasSSD &&
    hasGPU
  ) {
    return "High-End";
  }

  // Mid-range criteria: i5/i7, 8GB+ RAM, SSD
  if (
    (cpuGeneration === "i5" || cpuGeneration === "i7") &&
    ramSize >= 8 &&
    hasSSD
  ) {
    return "Mid-Range";
  }

  // Low-end: everything else (i3, <8GB RAM, HDD, or doesn't meet above criteria)
  return "Low-End";
};

// Helper function to analyze specs and generate recommendations
const analyzeSpecs = (device) => {
  const recommendations = [];
  const warnings = [];
  const goodPoints = [];

  const cpuString = device.cpuGen?.toLowerCase() || "";
  const ramSize = parseInt(device.RAM) || 0;
  const driveString = device.Drive?.toLowerCase() || "";
  const gpuString = device.GPU?.toLowerCase() || "";

  // CPU Analysis
  if (cpuString.includes("i9")) {
    goodPoints.push("Excellent CPU performance (i9)");
  } else if (cpuString.includes("i7")) {
    goodPoints.push("Good CPU performance (i7)");
  } else if (cpuString.includes("i5")) {
    recommendations.push("CPU is acceptable for most tasks (i5)");
  } else if (cpuString.includes("i3")) {
    warnings.push(
      "CPU below recommended baseline (i3) - consider i5 or higher"
    );
  } else {
    warnings.push("CPU information unclear - please verify specifications");
  }

  // RAM Analysis
  if (ramSize >= 16) {
    goodPoints.push(`Excellent RAM capacity (${ramSize}GB)`);
  } else if (ramSize >= 8) {
    goodPoints.push(`Adequate RAM for most tasks (${ramSize}GB)`);
  } else if (ramSize === 4) {
    warnings.push("RAM below minimum (Only 4GB, recommend 8GB or higher)");
  } else if (ramSize > 0) {
    warnings.push(`Low RAM capacity (${ramSize}GB, recommend 8GB or higher)`);
  } else {
    warnings.push("RAM information missing - please verify specifications");
  }

  // Drive Analysis
  if (driveString.includes("nvme")) {
    goodPoints.push("Excellent storage speed (NVMe SSD)");
  } else if (driveString.includes("ssd")) {
    goodPoints.push("Good storage speed (SSD)");
  } else if (driveString.includes("hdd")) {
    warnings.push(
      "HDD detected – recommend upgrade to SSD for better performance"
    );
  } else {
    warnings.push("Drive type unclear - please verify if SSD or HDD");
  }

  // GPU Analysis
  if (
    gpuString &&
    !gpuString.includes("integrated") &&
    !gpuString.includes("intel") &&
    gpuString.trim() !== ""
  ) {
    goodPoints.push("Dedicated GPU available for graphics-intensive tasks");
  } else {
    recommendations.push(
      "Using integrated graphics - adequate for basic tasks"
    );
  }

  return { recommendations, warnings, goodPoints };
};

// Helper function to generate preventive maintenance checklist based on device
const getMaintenanceChecklist = (device) => {
  const tasks = [];
  const deviceAge = device.dateAdded
    ? Math.floor(
        (new Date() - new Date(device.dateAdded)) / (1000 * 60 * 60 * 24 * 365)
      )
    : 0;

  // Universal tasks
  tasks.push({ task: "Clean internal fans and vents", critical: true });
  tasks.push({ task: "Run disk cleanup and defragmentation", critical: false });
  tasks.push({ task: "Clear temp files and browser cache", critical: false });
  tasks.push({ task: "Windows and driver updates", critical: true });
  tasks.push({ task: "Antivirus software status check", critical: true });
  tasks.push({ task: "Backup verification", critical: true });

  // Device type specific tasks
  if (device.deviceType?.toLowerCase() === "laptop") {
    tasks.push({
      task: "Check battery health and calibration",
      critical: true,
    });
    tasks.push({ task: "Clean keyboard and touchpad", critical: false });
  }

  // Age-based tasks
  if (deviceAge >= 3) {
    tasks.push({
      task: "Thermal paste replacement (device is 3+ years old)",
      critical: true,
    });
    tasks.push({ task: "Deep hardware diagnostic", critical: true });
  }

  // Drive-specific tasks
  if (device.Drive?.toLowerCase().includes("hdd")) {
    tasks.push({ task: "Check HDD health (SMART status)", critical: true });
    tasks.push({
      task: "Consider SSD upgrade for better performance",
      critical: false,
    });
  } else if (device.Drive?.toLowerCase().includes("ssd")) {
    tasks.push({ task: "Check SSD health and wear level", critical: true });
  }

  return tasks.sort((a, b) => b.critical - a.critical);
};

// Helper function to calculate maintenance status based on checklist completion and timing
const calculateMaintenanceStatus = (device) => {
  if (!device) return "Critical";

  const now = new Date();
  const lastMaintenance = device.lastMaintenanceDate
    ? new Date(
        device.lastMaintenanceDate.seconds
          ? device.lastMaintenanceDate.seconds * 1000
          : device.lastMaintenanceDate
      )
    : null;
  const maintenanceChecklist = device.maintenanceChecklist || {};

  // Get the required checklist for this device
  const requiredTasks = getMaintenanceChecklist(device);
  const criticalTasks = requiredTasks.filter((task) => task.critical);

  // Check if device hasn't been maintained for 6+ months (critical)
  if (lastMaintenance) {
    const monthsSinceLastMaintenance =
      (now - lastMaintenance) / (1000 * 60 * 60 * 24 * 30);
    if (monthsSinceLastMaintenance >= 6) {
      return "Critical";
    }
  } else {
    // No maintenance record - check if device is older than 6 months
    const deviceAge = device.dateAdded
      ? (now - new Date(device.dateAdded)) / (1000 * 60 * 60 * 24 * 30)
      : 0;
    if (deviceAge >= 6) {
      return "Critical";
    }
  }

  // Check if maintenance tasks need to be reset (every 3 months)
  const tasksNeedingReset = [];
  Object.keys(maintenanceChecklist).forEach((taskName) => {
    const task = maintenanceChecklist[taskName];
    if (task.completed && task.completedDate) {
      const completedDate = new Date(
        task.completedDate.seconds
          ? task.completedDate.seconds * 1000
          : task.completedDate
      );
      const monthsSinceCompletion =
        (now - completedDate) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSinceCompletion >= 3) {
        tasksNeedingReset.push(taskName);
      }
    }
  });

  // Count currently completed critical tasks (excluding those that need reset)
  const currentlyCompletedCriticalTasks = criticalTasks.filter((reqTask) => {
    const task = maintenanceChecklist[reqTask.task];
    if (!task || !task.completed) return false;

    // Check if this task needs reset
    if (tasksNeedingReset.includes(reqTask.task)) return false;

    return true;
  });

  const criticalCompletionRate =
    criticalTasks.length > 0
      ? currentlyCompletedCriticalTasks.length / criticalTasks.length
      : 1;

  // For new devices with no maintenance data, return "Healthy" if no maintenance is overdue
  if (Object.keys(maintenanceChecklist).length === 0) {
    // Check if device is older than 6 months
    const deviceAge = device.dateAdded
      ? (now - new Date(device.dateAdded)) / (1000 * 60 * 60 * 24 * 30)
      : 0;
    if (deviceAge >= 6) {
      return "Needs Maintenance"; // Old device with no maintenance
    }
    return "Healthy"; // New device, no maintenance needed yet
  }

  // Determine status based on completion rate
  if (criticalCompletionRate >= 0.8) {
    // 80% of critical tasks completed and not needing reset
    return "Healthy";
  } else if (criticalCompletionRate >= 0.5) {
    // 50-79% completion
    return "Needs Maintenance";
  } else {
    return "Critical"; // Less than 50% completion
  }
};

// Helper function to get status badge color
const getMaintenanceStatusColor = (status) => {
  switch (status) {
    case "Healthy":
      return "#16a34a"; // Green
    case "Needs Maintenance":
      return "#ea580c"; // Orange
    case "Critical":
      return "#dc2626"; // Red
    default:
      return "#6b7280"; // Gray
  }
};

// Helper function to get status badge text color
const getMaintenanceStatusTextColor = (status) => {
  return "#ffffff"; // Always white text for good contrast
};

// --- Modern Table Styles (matching Assets.js design) ---
const getTableStyle = (isDarkMode) => ({
  width: "100%",
  borderCollapse: "collapse",
  background: isDarkMode ? "#1f2937" : "#fff",
  fontSize: "14px",
});

const getThStyle = (isDarkMode) => ({
  color: isDarkMode ? "#f3f4f6" : "#374151",
  fontWeight: 500,
  padding: "12px 16px",
  border: "none",
  textAlign: "left",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  background: isDarkMode ? "#1f2937" : "rgb(255, 255, 255)",
  borderBottom: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
  cursor: "pointer",
});

const getTdStyle = (isDarkMode) => ({
  padding: "12px 16px",
  color: isDarkMode ? "#9ca3af" : "#6b7280",
  fontSize: "14px",
  borderBottom: isDarkMode ? "1px solid #374151" : "1px solid #f3f4f6",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
});

const getTrStyle = (index, isDarkMode) => ({
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
  borderBottom: isDarkMode ? "1px solid #374151" : "1px solid #f3f4f6",
});

const getTrHoverStyle = (index, isDarkMode) => ({
  background:
    index % 2 === 0
      ? isDarkMode
        ? "#374151"
        : "rgb(235, 235, 240)"
      : isDarkMode
      ? "#1f2937"
      : "rgb(225, 225, 235)",
});

const getActionButtonStyle = (isDarkMode) => ({
  background: "transparent",
  border: "none",
  borderRadius: "6px",
  padding: "6px",
  margin: "0 2px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
  color: isDarkMode ? "#9ca3af" : "#6b7280",
  width: "32px",
  height: "32px",
});

const moveButtonStyle = {
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.2s ease",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const editIcon = (
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
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const deleteIcon = (
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
);

const UnitSpecs = () => {
  // Initialize theme context for dark mode
  const { isDarkMode } = useTheme();

  // Initialize snackbar hook
  const { showSuccess, showError, showInfo } = useSnackbar();

  const [inventory, setInventory] = useState([]);
  const [deployed, setDeployed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyUnit);
  const [addTo, setAddTo] = useState("InventoryUnits");
  const [editId, setEditId] = useState(null);
  const [editCollection, setEditCollection] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [hoveredRow, setHoveredRow] = useState({ id: null, collection: "" });
  const [confirmSingleDelete, setConfirmSingleDelete] = useState(null);

  // Tab State
  const [activeTab, setActiveTab] = useState("InventoryUnits");

  // Pagination State
  const [inventoryPage, setInventoryPage] = useState(1);
  const [deployedPage, setDeployedPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25); // Dynamic items per page

  // Sorting and Filtering State
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "desc",
  });

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        // Toggle direction
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  // Separate filter state for inventory and deployed
  const [inventoryFilters, setInventoryFilters] = useState({
    Tag: [],
    CPU: [],
    RAM: [],
    Drive: [],
    GPU: [],
    Status: [],
    OS: [],
    Category: [],
    Remarks: [],
    Appraisal: [],
  });
  const [deployedFilters, setDeployedFilters] = useState({
    Tag: [],
    CPU: [],
    RAM: [],
    Drive: [],
    GPU: [],
    Status: [],
    OS: [],
    Category: [],
    Remarks: [],
    Appraisal: [],
  });

  // Track which table's filter popup is open
  const [filterPopup, setFilterPopup] = useState({
    open: false,
    column: null,
    table: null,
    anchor: null,
  });

  // Delete mode state
  const [deleteMode, setDeleteMode] = useState({ table: null, active: false });
  const [selectedToDelete, setSelectedToDelete] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // New modal states for Specs Report and Preventive Maintenance
  const [showSpecsReport, setShowSpecsReport] = useState(false);
  const [showPreventiveMaintenance, setShowPreventiveMaintenance] =
    useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [maintenanceChecklist, setMaintenanceChecklist] = useState({});

  // Handle maintenance task completion
  const handleTaskCompletion = async (deviceTag, taskName, isCompleted) => {
    try {
      const currentDevice = selectedDevice;
      if (!currentDevice) return;

      // Determine which collection the device belongs to
      const isInInventory = inventory.some(
        (device) => device.Tag === deviceTag
      );
      const targetCollection = isInInventory
        ? "InventoryUnits"
        : "DeployedUnits";

      // Update local state immediately for UI responsiveness
      const updatedChecklist = {
        ...currentDevice.maintenanceChecklist,
        [taskName]: {
          completed: isCompleted,
          completedDate: isCompleted ? new Date() : null,
          lastResetDate:
            currentDevice.maintenanceChecklist?.[taskName]?.lastResetDate ||
            new Date(),
        },
      };

      // Update selected device state
      const updatedDevice = {
        ...currentDevice,
        maintenanceChecklist: updatedChecklist,
        lastMaintenanceDate: isCompleted
          ? new Date()
          : currentDevice.lastMaintenanceDate,
      };
      setSelectedDevice(updatedDevice);

      // Save to database
      const deviceRef = doc(db, targetCollection, deviceTag);
      await updateDoc(deviceRef, {
        maintenanceChecklist: updatedChecklist,
        lastMaintenanceDate: isCompleted
          ? new Date()
          : currentDevice.lastMaintenanceDate,
      });

      // Refresh the main data to update the status badges
      fetchData();

      if (isCompleted) {
        showSuccess(`Marked "${taskName}" as completed`);
      }
    } catch (error) {
      console.error("Error updating maintenance task:", error);
      showError("Failed to update maintenance task");
    }
  };

  // Close filter popup when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (filterPopup.open) {
        setFilterPopup({
          open: false,
          column: null,
          table: null,
          anchor: null,
        });
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [filterPopup.open]);

  // Import Excel handler
  const handleImportExcel = async (e, targetTable = "InventoryUnits") => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

      // Expect columns: Tag, CPU, RAM, Drive, GPU, Condition, OS, Status
      for (const row of data) {
        if (!row.Tag) continue;
        const conditionValue = row.Condition || row.Status || "";
        const unit = {
          Tag: row.Tag || "",
          CPU: row.CPU || "",
          RAM: row.RAM || "",
          Drive: row.Drive || "",
          GPU: row.GPU || "",
          Condition: conditionValue, // Save to new field name
          Status: conditionValue, // Save to old field name for backward compatibility
          OS: row.OS || "",
          lastMaintenanceDate: null,
          maintenanceChecklist: {},
        };
        
        await setDoc(doc(db, targetTable, unit.Tag), unit);
      }
      fetchData();
      showSuccess("Excel data imported successfully!");
    };
    reader.readAsBinaryString(file);
    // Reset input so same file can be re-imported if needed
    e.target.value = "";
  };

  // Fetch data from Firestore on mount and after changes
  const fetchData = async () => {
    setLoading(true);
    const inventorySnapshot = await getDocs(collection(db, "InventoryUnits"));
    setInventory(
      inventorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    );
    const deployedSnapshot = await getDocs(collection(db, "DeployedUnits"));
    setDeployed(
      deployedSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // === SYNC FROM INVENTORY FUNCTION ===
  // Utility function to sync existing PC/Laptop data from main inventory to UnitSpecs
  const syncFromInventory = async () => {
    try {
      setLoading(true);
      showInfo("Syncing PC and Laptop data from Inventory...");

      // Get all devices from main inventory
      const devicesSnapshot = await getDocs(collection(db, "devices"));
      const allDevices = devicesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter for PC and Laptop devices only
      const pcAndLaptops = allDevices.filter(
        (device) =>
          device.deviceType &&
          ["PC", "Laptop", "Desktop", "Notebook"].includes(device.deviceType)
      );

      let syncedCount = 0;

      for (const device of pcAndLaptops) {
        try {
          // Helper functions to extract data
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

          // Map inventory fields to UnitSpecs format
          const unitSpecData = {
            Tag: device.deviceTag || "",
            deviceType: device.deviceType || "",
            category: device.category || "",
            cpuGen: extractCpuGen(device.cpuGen || device.cpu || ""),
            cpuModel: extractCpuModel(device.cpuGen || device.cpu || ""),
            CPU: device.cpuGen || device.cpu || "",
            RAM: extractRamSize(device.ram) || "",
            Drive: device.drive1 || device.mainDrive || "",
            GPU: device.gpu || "",
            Status: device.condition || "",
            OS: device.os || device.operatingSystem || "",
            Remarks: device.remarks || "",
            lifespan: device.lifespan || "",
            dateAdded:
              device.dateAdded ||
              device.acquisitionDate ||
              new Date().toISOString(), // Include date for appraisal calculation
          };

          // Determine target collection based on assignment status
          const targetCollection =
            device.assignedTo && device.assignedTo.trim() !== ""
              ? "DeployedUnits"
              : "InventoryUnits";

          // Add to appropriate UnitSpecs collection
          await setDoc(
            doc(db, targetCollection, device.deviceTag),
            unitSpecData
          );
          syncedCount++;
        } catch (deviceError) {
          console.error(
            `Error syncing device ${device.deviceTag}:`,
            deviceError
          );
        }
      }

      // Refresh data
      await fetchData();

      showSuccess(
        `Successfully synced ${syncedCount} PC/Laptop devices from Inventory to UnitSpecs!`
      );
      console.log(`Synced ${syncedCount} PC/Laptop devices to UnitSpecs`);
    } catch (error) {
      console.error("Error syncing from inventory:", error);
      showError("Failed to sync data from Inventory. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => {
      const newForm = { ...prevForm, [name]: value };

      // Auto-generate tag when device type changes (for new units only)
      if (name === "deviceType" && !editId && value) {
        if (value === "PC") {
          // For PC, generate tag immediately when PC is selected
          const allDevices = [...inventory, ...deployed];
          const prefix = "JOIIPC";
          const ids = allDevices
            .map((d) => d.Tag)
            .filter((tag) => tag && tag.startsWith(prefix))
            .map((tag) => parseInt(tag.replace(prefix, "")))
            .filter((num) => !isNaN(num));
          const max = ids.length > 0 ? Math.max(...ids) : 0;
          newForm.Tag = `${prefix}${String(max + 1).padStart(4, "0")}`;
          console.log(`Generated PC tag:`, newForm.Tag); // Debug log
          newForm.cpuGen = ""; // Reset CPU System Unit when device type changes
        } else {
          // For non-PC devices, generate tag immediately
          const allDevices = [...inventory, ...deployed];
          const generatedTag = generateNextDeviceTag(value, allDevices);
          newForm.Tag = generatedTag;
          console.log(`Generated tag for ${value}:`, generatedTag); // Debug log
          console.log("Existing devices count:", allDevices.length); // Debug log
        }
      }

      // Combine cpuGen and cpuModel into the main CPU field
      if (name === "cpuGen" || name === "cpuModel") {
        newForm.CPU = `${newForm.cpuGen} - ${newForm.cpuModel}`.trim();
      }

      // Auto-fill category based on specs when relevant fields change
      if (["cpuGen", "RAM", "Drive", "GPU"].includes(name)) {
        const suggestedCategory = autoFillCategoryFromSpecs(
          newForm.cpuGen,
          newForm.RAM,
          newForm.Drive,
          newForm.GPU
        );
        newForm.category = suggestedCategory;

        // Also update lifespan display (though it's calculated, we keep for consistency)
        const lifespanYears = getLifespanYears(
          suggestedCategory,
          newForm.cpuGen,
          newForm.RAM,
          newForm.Drive,
          newForm.GPU
        );
        newForm.lifespan = `${lifespanYears} years`;
      }

      // Update lifespan when category is manually changed
      if (name === "category") {
        const lifespanYears = getLifespanYears(
          value,
          newForm.cpuGen,
          newForm.RAM,
          newForm.Drive,
          newForm.GPU
        );
        newForm.lifespan = `${lifespanYears} years`;
      }

      return newForm;
    });
  };

  const handleAddToChange = (e) => {
    setAddTo(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.Tag || form.Tag.trim() === "") {
      showError("TAG is a required field.");
      return;
    }

    // --- Create a new object for submission with formatted RAM ---
    const unitData = {
      ...form,
      // Ensure RAM is stored with "GB" suffix
      RAM: form.RAM ? `${form.RAM}GB` : "",
      // Set dateAdded for new units (keep existing for edits)
      dateAdded: editId
        ? form.dateAdded
        : form.dateAdded || new Date().toISOString(),
      // Ensure backward compatibility by saving condition to both fields
      Status: form.Condition, // Save to old field name for backward compatibility
      Condition: form.Condition, // Save to new field name
    };

    // --- Improved Validation ---
    // 1. RAM validation (now checks the numeric part from the form state)
    if (form.RAM && !/^\d+$/.test(form.RAM.toString())) {
      showError("RAM must be a valid number.");
      return;
    }

    // 2. CPU validation (must contain i3, i5, or i7)
    if (unitData.CPU && !/i[357]/i.test(unitData.CPU)) {
      showError("CPU format must include i3, i5, or i7.");
      return;
    }

    // 3. Duplicate Tag validation
    if (!editId) {
      // Only for new units
      const allUnits = [...inventory, ...deployed];
      const tagExists = allUnits.some((unit) => unit.Tag === unitData.Tag);
      if (tagExists) {
        showError(`Tag '${unitData.Tag}' already exists.`);
        return;
      }
    }

    if (editId) {
      const collectionName = editCollection;
      await setDoc(doc(db, collectionName, unitData.Tag), unitData);
      if (editId !== unitData.Tag) {
        await deleteDoc(doc(db, collectionName, editId));
      }
      setEditId(null);
      setEditCollection("");
      showSuccess(`Unit ${unitData.Tag} updated successfully!`);
    } else {
      await setDoc(doc(db, addTo, unitData.Tag), unitData);
      showSuccess(
        `Unit ${unitData.Tag} added to ${
          addTo === "InventoryUnits" ? "Inventory" : "Deployed"
        }!`
      );
    }
    setForm(emptyUnit);
    setShowModal(false);
    fetchData();
  };

  const handleMove = async (unit, from, to) => {
    const newUnit = { ...unit };
    delete newUnit.id;
    await setDoc(doc(db, to, newUnit.Tag), newUnit);
    await deleteDoc(doc(db, from, unit.id));
    fetchData();
    showSuccess(
      `Unit ${unit.Tag} moved to ${
        to === "InventoryUnits" ? "Inventory" : "Deployed"
      }.`
    );
  };

  const handleEdit = (unit, collectionName) => {
    // Parse CPU field to populate cpuGen and cpuModel for editing
    const cpuParts = (unit.CPU || "").split(" - ");
    const cpuGen = cpuParts[0] || "";
    const cpuModel = cpuParts.length > 1 ? cpuParts.slice(1).join(" - ") : "";

    setForm({
      Tag: unit.Tag || "",
      deviceType: unit.deviceType || "", // Include device type for editing
      category: unit.category || "", // Include category for editing
      cpuSystemUnit: "", // No longer used
      cpuGen: cpuGen, // This now serves as CPU - System Unit
      cpuModel: cpuModel,
      CPU: unit.CPU || "",
      RAM: parseRam(unit.RAM) || "",
      Drive: unit.Drive || "",
      GPU: unit.GPU || "",
      Condition: unit.Condition || unit.Status || "", // Support both old and new field names
      OS: unit.OS || "",
      lifespan: unit.lifespan || "", // Include lifespan for editing
      dateAdded: unit.dateAdded || "", // Include dateAdded for editing
      lastMaintenanceDate: unit.lastMaintenanceDate || null,
      maintenanceChecklist: unit.maintenanceChecklist || {},
    });
    setEditId(unit.id);
    setEditCollection(collectionName);
    setShowModal(true);
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setEditCollection("");
    setForm(emptyUnit);
    setShowModal(false);
  };

  // --- Checkbox Functions ---
  const handleSelectItem = (itemId) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleSelectAll = (data) => {
    const allIds = data.map((item) => item.id);
    if (
      selectedItems.length === allIds.length &&
      allIds.every((id) => selectedItems.includes(id))
    ) {
      // If all are selected, deselect all
      setSelectedItems([]);
    } else {
      // Otherwise, select all
      setSelectedItems(allIds);
    }
  };

  const handleBulkDelete = () => {
    setBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      for (const itemId of selectedItems) {
        // Find the item in either inventory or deployed data
        const inventoryItem = inventory.find((item) => item.id === itemId);
        const deployedItem = deployed.find((item) => item.id === itemId);

        if (inventoryItem) {
          await deleteDoc(doc(db, "InventoryUnits", itemId));
        } else if (deployedItem) {
          await deleteDoc(doc(db, "DeployedUnits", itemId));
        }
      }

      setSelectedItems([]);
      setBulkDeleteConfirm(false);
      fetchData();
      showSuccess(`${selectedItems.length} unit(s) deleted successfully.`);
    } catch (error) {
      console.error("Error deleting units:", error);
      showError("Failed to delete units.");
    }
  };

  // --- Sorting and Filtering Logic ---
  // RAM sorting: expects RAM like "8gb", "16gb", "32gb"
  const parseRam = (ram) => {
    if (!ram) return 0;
    const match = ram.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // CPU Gen filter: expects CPU like "i5 - 10400"
  const parseCpuGen = (cpu) => {
    if (!cpu) return "";
    const match = cpu.match(/(i[357])/i);
    return match ? match[1].toLowerCase() : "";
  };

  // Get unique values for a column (always from data, not static)
  const getUniqueColumnValues = (data, key) => {
    if (key === "CPU") {
      // Combine cpuGenOptions and any new CPU gens found in data
      const found = Array.from(
        new Set(
          data
            .map((u) => {
              const match = (u.CPU || "").match(/(i[357])/i);
              return match ? match[1].toLowerCase() : null;
            })
            .filter(Boolean)
        )
      );
      return Array.from(new Set([...cpuGenOptions, ...found]));
    }
    if (key === "RAM")
      return Array.from(
        new Set(data.map((u) => (u.RAM || "").replace(/[^0-9]/g, "")))
      )
        .filter(Boolean)
        .sort((a, b) => a - b);
    if (key === "Drive")
      return Array.from(new Set(data.map((u) => u.Drive))).filter(Boolean);
    if (key === "GPU")
      return Array.from(new Set(data.map((u) => u.GPU))).filter(Boolean);
    if (key === "Status")
      return Array.from(new Set(data.map((u) => u.Status))).filter(Boolean);
    if (key === "OS")
      return Array.from(new Set(data.map((u) => u.OS))).filter(Boolean);
    if (key === "Category")
      return Array.from(new Set(data.map((u) => u.category))).filter(Boolean);
    // Remove filter for Tag
    // if (key === 'Tag') return Array.from(new Set(data.map(u => u.Tag))).filter(Boolean);
    if (key === "Remarks")
      return Array.from(new Set(data.map((u) => u.Remarks))).filter(Boolean);
    if (key === "Appraisal") {
      // For appraisal, we'll show calculated appraisal dates
      return Array.from(
        new Set(
          data.map((u) => {
            if (!u.dateAdded) return null;
            return calculateAppraisalDate(
              u.dateAdded,
              u.category,
              u.cpuGen,
              u.RAM,
              u.Drive,
              u.GPU
            );
          })
        )
      ).filter(Boolean);
    }
    return [];
  };

  // Filtering logic for all columns (now takes filters as argument)
  const filterData = (data, filters) => {
    let filtered = data;

    // Apply search filter first
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((unit) => {
        return Object.values(unit).some((value) =>
          (value || "").toString().toLowerCase().includes(term)
        );
      });
    }

    // Apply column filters
    Object.keys(filters).forEach((key) => {
      if (filters[key] && filters[key].length > 0) {
        if (key === "CPU") {
          filtered = filtered.filter((unit) => {
            const gen = parseCpuGen(unit.CPU);
            return filters.CPU.includes(gen);
          });
        } else if (key === "RAM") {
          filtered = filtered.filter((unit) => {
            const ramVal = (unit.RAM || "").replace(/[^0-9]/g, "");
            return filters.RAM.includes(ramVal);
          });
        } else if (key === "Appraisal") {
          filtered = filtered.filter((unit) => {
            const appraisalDate = unit.dateAdded
              ? calculateAppraisalDate(
                  unit.dateAdded,
                  unit.category,
                  unit.cpuGen,
                  unit.RAM,
                  unit.Drive,
                  unit.GPU
                )
              : "";
            return filters.Appraisal.includes(appraisalDate);
          });
        } else if (key !== "Tag") {
          // Don't filter by Tag
          filtered = filtered.filter((unit) =>
            filters[key].includes(unit[key])
          );
        }
      }
    });
    return filtered;
  };

  const sortData = (data) => {
    if (!sortConfig.key) return data;
    let sorted = [...data];
    if (sortConfig.key === "RAM") {
      sorted.sort((a, b) => {
        const aRam = parseRam(a.RAM);
        const bRam = parseRam(b.RAM);
        return sortConfig.direction === "asc" ? aRam - bRam : bRam - aRam;
      });
    } else {
      sorted.sort((a, b) => {
        const aVal = (a[sortConfig.key] || "").toString().toLowerCase();
        const bVal = (b[sortConfig.key] || "").toString().toLowerCase();
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  };

  // Open/close filter popup for a column and table (toggle)
  const handleFilterClick = (e, column, table) => {
    e.stopPropagation();
    if (
      filterPopup.open &&
      filterPopup.column === column &&
      filterPopup.table === table
    ) {
      setFilterPopup({ open: false, column: null, table: null, anchor: null });
    } else {
      setFilterPopup({ open: true, column, table, anchor: e.target });
    }
  };

  // Toggle filter value for a column and table
  const handleFilterCheck = (column, value, table) => {
    if (table === "InventoryUnits") {
      setInventoryFilters((prev) => {
        const arr = prev[column] || [];
        return {
          ...prev,
          [column]: arr.includes(value)
            ? arr.filter((v) => v !== value)
            : [...arr, value],
        };
      });
      setInventoryPage(1); // Reset to first page on filter change
    } else {
      setDeployedFilters((prev) => {
        const arr = prev[column] || [];
        return {
          ...prev,
          [column]: arr.includes(value)
            ? arr.filter((v) => v !== value)
            : [...arr, value],
        };
      });
      setDeployedPage(1); // Reset to first page on filter change
    }
  };

  // Delete logic
  const handleSelectToDelete = (id) => {
    setSelectedToDelete((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    const table = deleteMode.table;
    for (const id of selectedToDelete) {
      await deleteDoc(doc(db, table, id));
    }
    setShowDeleteConfirm(false);
    setDeleteMode({ table: null, active: false });
    setSelectedToDelete([]);
    fetchData();
    showSuccess(`${selectedToDelete.length} unit(s) deleted successfully.`);
  };

  const cancelDeleteMode = () => {
    setDeleteMode({ table: null, active: false });
    setSelectedToDelete([]);
    setShowDeleteConfirm(false);
  };

  const handleConfirmSingleDelete = async () => {
    if (!confirmSingleDelete) return;
    const { unit, collectionName } = confirmSingleDelete;
    try {
      await deleteDoc(doc(db, collectionName, unit.id));
      fetchData();
      showSuccess(`Unit ${unit.Tag} has been deleted.`);
    } catch (error) {
      showError("Failed to delete unit.");
      console.error("Error deleting document: ", error);
    }
    setConfirmSingleDelete(null);
  };

  // Render filter popup for any column
  const renderFilterPopup = (column, data, table) => {
    // Always get unique values from current data, not just static options
    const options = getUniqueColumnValues(data, column);

    // Calculate popup position to avoid cropping
    let popupStyle = {
      position: "fixed",
      background: "#18181a",
      border: "1.5px solid #2563eb",
      borderRadius: 8,
      boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
      padding: 14,
      zIndex: 9999,
      minWidth: 170,
      color: "#fff",
      left: 0,
      top: 0,
    };

    if (filterPopup.anchor) {
      const rect = filterPopup.anchor.getBoundingClientRect();
      popupStyle.left = Math.min(rect.left, window.innerWidth - 220) + "px";
      popupStyle.top = rect.bottom + 4 + "px";
    }

    // Use correct filter state
    const filterState =
      table === "InventoryUnits" ? inventoryFilters : deployedFilters;

    return (
      <div style={popupStyle} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            fontWeight: 700,
            marginBottom: 10,
            fontSize: 16,
            color: "#fff",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Filter {column === "CPU" ? "CPU Gen" : column}
        </div>
        {options.map((opt) => (
          <label
            key={opt}
            style={{
              display: "block",
              marginBottom: 8,
              fontSize: 15,
              cursor: "pointer",
              fontWeight: column === "CPU" ? 700 : 500,
              color: "#fff",
              letterSpacing: column === "CPU" ? 1 : 0,
            }}
          >
            <input
              type="checkbox"
              checked={filterState[column]?.includes(opt)}
              onChange={() => handleFilterCheck(column, opt, table)}
              style={{ marginRight: 8 }}
            />
            {column === "CPU" ? opt.toUpperCase() : opt}
          </label>
        ))}
      </div>
    );
  };

  // Card Footer with Pagination Controls
  const renderCardFooter = () => {
    const currentData = activeTab === "InventoryUnits" ? inventory : deployed;
    const currentPage =
      activeTab === "InventoryUnits" ? inventoryPage : deployedPage;
    const setCurrentPage =
      activeTab === "InventoryUnits" ? setInventoryPage : setDeployedPage;
    const filters =
      activeTab === "InventoryUnits" ? inventoryFilters : deployedFilters;

    let filtered = filterData(currentData, filters);
    let sorted = sortData(filtered);
    const totalPages = Math.ceil(sorted.length / itemsPerPage);

    const handlePageChange = (newPage) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
      }
    };

    return (
      <div
        style={{
          background: isDarkMode ? "#374151" : "#f9fafb",
          borderTop: isDarkMode ? "1px solid #4b5563" : "1px solid #e5e7eb",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          fontSize: "14px",
        }}
      >
        {/* Left side: Show dropdown and info */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "14px",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontWeight: 500,
              }}
            >
              Show:
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                const newItemsPerPage = parseInt(e.target.value);
                setItemsPerPage(newItemsPerPage);
                // Reset both pages to 1 when changing items per page
                setInventoryPage(1);
                setDeployedPage(1);
              }}
              style={{
                padding: "4px 8px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                borderRadius: "4px",
                background: isDarkMode ? "#1f2937" : "#fff",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <span
            style={{
              color: isDarkMode ? "#9ca3af" : "#6b7280",
              fontSize: "14px",
            }}
          >
            Showing {(currentPage - 1) * itemsPerPage + 1} -{" "}
            {Math.min(currentPage * itemsPerPage, sorted.length)} of{" "}
            {sorted.length} units
          </span>
        </div>

        {/* Right side: Pagination Controls - only show if more than 1 page */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              style={{
                padding: "6px 12px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                background:
                  currentPage === 1
                    ? isDarkMode
                      ? "#1f2937"
                      : "#f9fafb"
                    : isDarkMode
                    ? "#374151"
                    : "#fff",
                color:
                  currentPage === 1
                    ? isDarkMode
                      ? "#6b7280"
                      : "#9ca3af"
                    : isDarkMode
                    ? "#f3f4f6"
                    : "#374151",
                borderRadius: "6px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "14px",
                transition: "all 0.2s",
              }}
            >
              First
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: "6px 12px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                background:
                  currentPage === 1
                    ? isDarkMode
                      ? "#1f2937"
                      : "#f9fafb"
                    : isDarkMode
                    ? "#374151"
                    : "#fff",
                color:
                  currentPage === 1
                    ? isDarkMode
                      ? "#6b7280"
                      : "#9ca3af"
                    : isDarkMode
                    ? "#f3f4f6"
                    : "#374151",
                borderRadius: "6px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "14px",
                transition: "all 0.2s",
              }}
            >
              Previous
            </button>

            <span
              style={{
                margin: "0 12px",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: "6px 12px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                background:
                  currentPage === totalPages
                    ? isDarkMode
                      ? "#1f2937"
                      : "#f9fafb"
                    : isDarkMode
                    ? "#374151"
                    : "#fff",
                color:
                  currentPage === totalPages
                    ? isDarkMode
                      ? "#6b7280"
                      : "#9ca3af"
                    : isDarkMode
                    ? "#f3f4f6"
                    : "#374151",
                borderRadius: "6px",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: "14px",
                transition: "all 0.2s",
              }}
            >
              Next
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              style={{
                padding: "6px 12px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                background:
                  currentPage === totalPages
                    ? isDarkMode
                      ? "#1f2937"
                      : "#f9fafb"
                    : isDarkMode
                    ? "#374151"
                    : "#fff",
                color:
                  currentPage === totalPages
                    ? isDarkMode
                      ? "#6b7280"
                      : "#9ca3af"
                    : isDarkMode
                    ? "#f3f4f6"
                    : "#374151",
                borderRadius: "6px",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: "14px",
                transition: "all 0.2s",
              }}
            >
              Last
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderSingleDeleteConfirmModal = () => {
    if (!confirmSingleDelete) return null;
    const { unit } = confirmSingleDelete;
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
        }}
      >
        <div
          style={{
            background: isDarkMode ? "#1f2937" : "#fff",
            padding: "32px 36px",
            borderRadius: "16px",
            minWidth: 340,
            boxShadow: "0 8px 32px rgba(37,99,235,0.18)",
            position: "relative",
            fontFamily:
              'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            maxWidth: 420,
          }}
        >
          <h2
            style={{
              margin: "0 0 18px 0",
              fontWeight: 700,
              color: "#e11d48",
              letterSpacing: 1,
              fontSize: 20,
              textAlign: "center",
            }}
          >
            Confirm Delete
          </h2>
          <div
            style={{
              marginBottom: 18,
              color: isDarkMode ? "#f3f4f6" : "#18181a",
              fontWeight: 500,
            }}
          >
            Are you sure you want to delete the following unit?
            <div
              style={{
                margin: "12px 0",
                padding: "10px",
                background: isDarkMode ? "#7f1d1d" : "#fee2e2",
                borderRadius: "8px",
                textAlign: "center",
                color: isDarkMode ? "#fca5a5" : "#b91c1c",
                fontWeight: 700,
              }}
            >
              {unit.Tag} {unit.CPU && `- ${unit.CPU}`}
            </div>
            This action cannot be undone.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button
              style={{
                background: "#e11d48",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 28px",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
              }}
              onClick={handleConfirmSingleDelete}
            >
              Delete
            </button>
            <button
              style={{
                background: isDarkMode ? "#4b5563" : "#e2e8f0",
                color: isDarkMode ? "#f3f4f6" : "#18181a",
                border: "none",
                borderRadius: 8,
                padding: "10px 22px",
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
              }}
              onClick={() => setConfirmSingleDelete(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderBulkDeleteConfirmModal = () => {
    if (!bulkDeleteConfirm) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
        }}
      >
        <div
          style={{
            background: isDarkMode ? "#1f2937" : "#fff",
            padding: "32px 36px",
            borderRadius: "16px",
            minWidth: 340,
            boxShadow: "0 8px 32px rgba(37,99,235,0.18)",
            position: "relative",
            fontFamily:
              'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            maxWidth: 420,
          }}
        >
          <h2
            style={{
              margin: "0 0 18px 0",
              fontWeight: 700,
              color: "#e11d48",
              letterSpacing: 1,
              fontSize: 20,
              textAlign: "center",
            }}
          >
            Confirm Bulk Delete
          </h2>
          <div
            style={{
              marginBottom: 18,
              color: isDarkMode ? "#f3f4f6" : "#18181a",
              fontWeight: 500,
            }}
          >
            Are you sure you want to delete the following {selectedItems.length}{" "}
            selected unit(s)?
            <div
              style={{
                margin: "12px 0",
                padding: "10px",
                background: isDarkMode ? "#7f1d1d" : "#fee2e2",
                borderRadius: "8px",
                textAlign: "center",
                color: isDarkMode ? "#fca5a5" : "#b91c1c",
                fontWeight: 700,
              }}
            >
              {selectedItems.length} unit(s) selected
            </div>
            This action cannot be undone.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button
              style={{
                background: "#e11d48",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 28px",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
              }}
              onClick={confirmBulkDelete}
            >
              Delete All
            </button>
            <button
              style={{
                background: isDarkMode ? "#4b5563" : "#e2e8f0",
                color: isDarkMode ? "#f3f4f6" : "#18181a",
                border: "none",
                borderRadius: 8,
                padding: "10px 22px",
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
              }}
              onClick={() => setBulkDeleteConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Table with Sorting and Filtering ---
  const renderTable = (data, collectionName, currentPage, setCurrentPage) => {
    // Use correct filter state
    const filters =
      collectionName === "InventoryUnits" ? inventoryFilters : deployedFilters;
    let filtered = filterData(data, filters);
    let sorted = sortData(filtered);

    // --- Pagination Logic ---
    const totalPages = Math.ceil(sorted.length / itemsPerPage);
    const paginatedData = sorted.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    const handlePageChange = (newPage) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
      }
    };

    return (
      <div
        style={{
          flex: 1,
          overflow: "auto",
          background: "transparent",
        }}
      >
        {/* Add Unit Button - Inside Card */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: isDarkMode
              ? "1px solid #374151"
              : "1px solid #e5e7eb",
            background: isDarkMode ? "#374151" : "#f9fafb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Search Bar */}
          <div style={{ position: "relative", width: "280px" }}>
            <input
              type="text"
              placeholder="Search units..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                borderRadius: "6px",
                background: isDarkMode ? "#1f2937" : "#fff",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) =>
                (e.target.style.borderColor = isDarkMode
                  ? "#4b5563"
                  : "#d1d5db")
              }
            />
            <svg
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "14px",
                height: "14px",
                color: "#9ca3af",
                pointerEvents: "none",
              }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>

          {/* Add Unit Button */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {selectedItems.length > 0 && (
              <button
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "9px 16px",
                  fontWeight: 500,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
                onClick={handleBulkDelete}
              >
                Delete ({selectedItems.length})
              </button>
            )}
            <button
              style={{
                background: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "9px 16px",
                fontWeight: 500,
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onClick={syncFromInventory}
              title="Sync PC and Laptop data from main Inventory"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ marginRight: "8px", verticalAlign: "middle" }}
              >
                <path
                  d="M1 4v6h6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M23 20v-6h-6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.51 15a9 9 0 0 0 14.85 3.36L23 14"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Sync from Inventory
            </button>
            <button
              style={{
                background: "#f59e0b",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "9px 16px",
                fontWeight: 500,
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onClick={() => setShowSpecsReport(true)}
              title="Generate specifications report with recommendations"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ marginRight: "8px", verticalAlign: "middle" }}
              >
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <polyline
                  points="14,2 14,8 20,8"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <line
                  x1="16"
                  y1="13"
                  x2="8"
                  y2="13"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="16"
                  y1="17"
                  x2="8"
                  y2="17"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <polyline
                  points="10,9 9,9 8,9"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Generate Specs Report
            </button>
            <button
              style={{
                background: "#8b5cf6",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "9px 16px",
                fontWeight: 500,
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onClick={() => setShowPreventiveMaintenance(true)}
              title="Open preventive maintenance checklist"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ marginRight: "8px", verticalAlign: "middle" }}
              >
                <path
                  d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <polyline
                  points="9,12 10,10 16,16"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Preventive
            </button>
            <button
              style={{
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "9px 16px",
                fontWeight: 500,
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onClick={() => {
                setForm(emptyUnit);
                setEditId(null);
                setEditCollection("");
                setShowModal(true);
              }}
            >
              + Add Unit
            </button>
          </div>
        </div>

        {/* Scrollable Table Container */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            maxHeight: "calc(100vh - 300px)", // Increased from 280px to give more space
            paddingBottom: "20px", // Add padding at bottom for last row visibility
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: "900px",
              borderCollapse: "collapse",
              background: isDarkMode ? "#1f2937" : "#fff",
              fontSize: "14px",
              border: isDarkMode ? "1px solid #374151" : "1px solid #d1d5db",
              tableLayout: "fixed",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: "0",
                background: isDarkMode ? "#374151" : "#f9fafb",
                zIndex: 10,
              }}
            >
              <tr style={{ background: isDarkMode ? "#374151" : "#f9fafb" }}>
                {/* Select All Checkbox Column */}
                <th
                  style={{
                    width: "4%",
                    padding: "8px 4px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    textAlign: "center",
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #d1d5db",
                    position: "sticky",
                    top: 0,
                    background: isDarkMode ? "#374151" : "#f9fafb",
                    zIndex: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      sorted.length > 0 &&
                      sorted.every((item) => selectedItems.includes(item.id))
                    }
                    onChange={() => handleSelectAll(sorted)}
                    style={{
                      width: 16,
                      height: 16,
                      margin: 0,
                      accentColor: "#6b7280",
                      colorScheme: isDarkMode ? "dark" : "light",
                    }}
                  />
                </th>
                {deleteMode.active && deleteMode.table === collectionName && (
                  <th
                    style={{
                      width: "4%",
                      padding: "8px 4px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      textAlign: "center",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #d1d5db",
                      position: "sticky",
                      top: 0,
                      background: isDarkMode ? "#374151" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    <input
                      type="checkbox"
                      style={{
                        width: 16,
                        height: 16,
                        margin: 0,
                        accentColor: "#6b7280",
                        colorScheme: isDarkMode ? "dark" : "light",
                      }}
                    />
                  </th>
                )}
                {[
                  "Tag",
                  "CPU",
                  "RAM",
                  "Drive",
                  "GPU",
                  "Condition",
                  "OS",
                  "Category",
                  "Appraisal",
                  "Status",
                ].map((col) => (
                  <th
                    key={col}
                    style={{
                      width:
                        col === "Tag"
                          ? "11%"
                          : col === "CPU"
                          ? "11%"
                          : col === "RAM"
                          ? "7%"
                          : col === "Drive"
                          ? "13%"
                          : col === "GPU"
                          ? "11%"
                          : col === "Condition"
                          ? "9%"
                          : col === "OS"
                          ? "7%"
                          : col === "Category"
                          ? "9%"
                          : col === "Appraisal"
                          ? "8%"
                          : "11%", // Status
                      padding: "8px 6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      textAlign: "center",
                      border: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #d1d5db",
                      position: "sticky",
                      top: 0,
                      background: isDarkMode ? "#374151" : "#f9fafb",
                      zIndex: 10,
                    }}
                  >
                    <span
                      onClick={
                        col !== "Tag"
                          ? (e) => handleFilterClick(e, col, collectionName)
                          : undefined
                      }
                      style={{
                        marginRight: 8,
                        textDecoration:
                          col !== "Tag" ? "underline dotted" : undefined,
                        cursor: col !== "Tag" ? "pointer" : undefined,
                        display: "inline-block",
                      }}
                    >
                      {col === "CPU"
                        ? "CPU GEN"
                        : col === "Drive"
                        ? "MAIN DRIVE"
                        : col.toUpperCase()}
                    </span>
                    <span
                      onClick={() => handleSort(col)}
                      style={{ marginLeft: 2, fontSize: 10, cursor: "pointer" }}
                    >
                      ⇅
                    </span>
                    {col !== "Tag" &&
                      filterPopup.open &&
                      filterPopup.column === col &&
                      filterPopup.table === collectionName &&
                      renderFilterPopup(col, data, collectionName)}
                  </th>
                ))}
                <th
                  style={{
                    width: "13%",
                    padding: "8px 4px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    textAlign: "center",
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #d1d5db",
                    position: "sticky",
                    top: 0,
                    background: isDarkMode ? "#374151" : "#f9fafb",
                    zIndex: 10,
                  }}
                >
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      deleteMode.active && deleteMode.table === collectionName
                        ? 12 // Updated to 12 to account for new Category column
                        : 11 // Updated to 11 to account for new Category column
                    }
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "#9ca3af",
                      fontSize: "14px",
                      fontWeight: "400",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    No{" "}
                    {collectionName === "InventoryUnits"
                      ? "inventory"
                      : "deployed"}{" "}
                    units found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((unit, index) => (
                  <tr
                    key={unit.id}
                    style={{
                      borderBottom: isDarkMode
                        ? "1px solid #374151"
                        : "1px solid #d1d5db",
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
                    }}
                    onMouseEnter={(e) => {
                      setHoveredRow({
                        id: unit.id,
                        collection: collectionName,
                      });
                      if (index % 2 === 0) {
                        e.currentTarget.style.background = isDarkMode
                          ? "#374151"
                          : "rgb(235, 235, 240)";
                      } else {
                        e.currentTarget.style.background = isDarkMode
                          ? "#1f2937"
                          : "rgb(225, 225, 235)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      setHoveredRow({ id: null, collection: "" });
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
                    {/* Select Item Checkbox Column */}
                    <td
                      style={{
                        width: "4%",
                        padding: "8px 4px",
                        textAlign: "center",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #d1d5db",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(unit.id)}
                        onChange={() => handleSelectItem(unit.id)}
                        style={{
                          width: 16,
                          height: 16,
                          margin: 0,
                          accentColor: "#6b7280",
                          colorScheme: isDarkMode ? "dark" : "light",
                        }}
                      />
                    </td>
                    {deleteMode.active &&
                      deleteMode.table === collectionName && (
                        <td
                          style={{
                            width: "4%",
                            padding: "8px 4px",
                            textAlign: "center",
                            border: isDarkMode
                              ? "1px solid #374151"
                              : "1px solid #d1d5db",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedToDelete.includes(unit.id)}
                            onChange={() => handleSelectToDelete(unit.id)}
                            style={{
                              width: 16,
                              height: 16,
                              margin: 0,
                              accentColor: "#6b7280",
                              colorScheme: isDarkMode ? "dark" : "light",
                            }}
                          />
                        </td>
                      )}
                    <td
                      style={{
                        width: "12%",
                        padding: "8px 6px",
                        fontSize: "14px",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #d1d5db",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {unit.Tag}
                    </td>
                    <td
                      style={{
                        width: "12%",
                        padding: "8px 6px",
                        fontSize: "14px",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #d1d5db",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {unit.CPU}
                    </td>
                    <td
                      style={{
                        width: "8%",
                        padding: "8px 6px",
                        fontSize: "14px",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #d1d5db",
                        textAlign: "center",
                      }}
                    >
                      {unit.RAM &&
                        `${(unit.RAM || "").replace(/[^0-9]/g, "")} GB`}
                    </td>
                    <td
                      style={{
                        width: "15%",
                        padding: "8px 6px",
                        fontSize: "14px",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #d1d5db",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {unit.Drive}
                    </td>
                    <td
                      style={{
                        width: "12%",
                        padding: "8px 6px",
                        fontSize: "14px",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #d1d5db",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {unit.GPU}
                    </td>
                    <td
                      style={{
                        width: "10%",
                        padding: "8px 6px",
                        fontSize: "14px",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #d1d5db",
                        textAlign: "center",
                      }}
                    >
                      {unit.Condition || unit.Status ? (
                        <div
                          style={{
                            display: "inline-block",
                            background: getConditionColor(
                              unit.Condition || unit.Status
                            ),
                            color: getConditionTextColor(
                              unit.Condition || unit.Status
                            ),
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "600",
                            textAlign: "center",
                            minWidth: "70px",
                            lineHeight: "1.2",
                            whiteSpace: "nowrap",
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                          }}
                        >
                          {unit.Condition || unit.Status}
                        </div>
                      ) : (
                        ""
                      )}
                    </td>
                    <td
                      style={{
                        width: "8%",
                        padding: "8px 6px",
                        fontSize: "14px",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #d1d5db",
                        textAlign: "center",
                      }}
                    >
                      {unit.OS}
                    </td>
                    <td
                      style={{
                        width: "9%",
                        padding: "8px 6px",
                        fontSize: "14px",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #d1d5db",
                        textAlign: "center",
                      }}
                    >
                      {unit.category || ""}
                    </td>
                    <td
                      style={{
                        width: "8%",
                        padding: "8px 6px",
                        fontSize: "14px",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #d1d5db",
                        textAlign: "center",
                      }}
                    >
                      {unit.dateAdded
                        ? calculateAppraisalDate(
                            unit.dateAdded,
                            unit.category,
                            unit.cpuGen,
                            unit.RAM,
                            unit.Drive,
                            unit.GPU
                          )
                        : "No Date"}
                    </td>
                    <td
                      style={{
                        width: "11%",
                        padding: "8px 6px",
                        fontSize: "14px",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #d1d5db",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        textAlign: "center", // Center the content
                      }}
                    >
                      {(() => {
                        const status = calculateMaintenanceStatus(unit);
                        return (
                          <div
                            style={{
                              display: "inline-block",
                              background: getMaintenanceStatusColor(status),
                              color: getMaintenanceStatusTextColor(status),
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "600",
                              textAlign: "center",
                              minWidth: "70px",
                              lineHeight: "1.2",
                              whiteSpace: "nowrap",
                              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                            }}
                          >
                            {status}
                          </div>
                        );
                      })()}
                    </td>
                    <td
                      style={{
                        width: "13%",
                        padding: "8px 4px",
                        textAlign: "center",
                        border: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #d1d5db",
                      }}
                    >
                      {!deleteMode.active && (
                        <div
                          style={{
                            display: "flex",
                            gap: "1px",
                            alignItems: "center",
                            justifyContent: "center",
                            flexWrap: "nowrap",
                            minWidth: "fit-content",
                          }}
                        >
                          <button
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "none",
                              outline: "none",
                              borderRadius: 4,
                              background: "transparent",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              padding: "3px",
                              minWidth: "24px",
                              minHeight: "24px",
                            }}
                            onClick={() =>
                              collectionName === "InventoryUnits"
                                ? handleMove(
                                    unit,
                                    "InventoryUnits",
                                    "DeployedUnits"
                                  )
                                : handleMove(
                                    unit,
                                    "DeployedUnits",
                                    "InventoryUnits"
                                  )
                            }
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#10b981";
                              e.currentTarget.style.transform = "scale(1.1)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(16, 185, 129, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                            title={
                              collectionName === "InventoryUnits"
                                ? "Deploy"
                                : "Return"
                            }
                          >
                            <svg
                              width="14"
                              height="14"
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
                              {collectionName === "InventoryUnits" ? (
                                // Deploy icon (upload arrow)
                                <>
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </>
                              ) : (
                                // Return icon (download arrow)
                                <>
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="17 8 12 3 7 8" />
                                  <line x1="12" y1="3" x2="12" y2="15" />
                                </>
                              )}
                            </svg>
                          </button>
                          <button
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "none",
                              outline: "none",
                              borderRadius: 4,
                              background: "transparent",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              padding: "3px",
                              minWidth: "24px",
                              minHeight: "24px",
                            }}
                            onClick={() => handleEdit(unit, collectionName)}
                            title="Edit"
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
                          >
                            <svg
                              width="14"
                              height="14"
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
                              borderRadius: 4,
                              background: "transparent",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              padding: "3px",
                              minWidth: "24px",
                              minHeight: "24px",
                            }}
                            onClick={() =>
                              setConfirmSingleDelete({ unit, collectionName })
                            }
                            title="Delete"
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
                          >
                            <svg
                              width="14"
                              height="14"
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
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderModal = () => (
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
        className="unit-form-modal"
        style={{
          background: isDarkMode ? "#1f2937" : "#fff",
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
          border: editId
            ? "2px solid #2563eb"
            : isDarkMode
            ? "1.5px solid #374151"
            : "1.5px solid #e5e7eb",
          backgroundColor: editId
            ? isDarkMode
              ? "#1e293b"
              : "#fefbff"
            : isDarkMode
            ? "#1f2937"
            : "#ffffff",
          transition: "box-shadow 0.2s",
          maxHeight: "85vh",
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitScrollbar: { display: "none" },
          fontFamily:
            "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
          
          .unit-form-modal input:focus,
          .unit-form-modal select:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }
          
          .unit-form-modal input:hover,
          .unit-form-modal select:hover {
            border-color: #64748b;
          }
        `}</style>

        {/* Header with Icon and Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          {editId && (
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
              fontSize: 18,
              fontWeight: 700,
              color: editId ? "#2563eb" : isDarkMode ? "#f3f4f6" : "#374151",
              marginBottom: 0,
              letterSpacing: 0.5,
              width: "100%",
              fontFamily:
                "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {editId ? "Edit Unit" : "Add Unit"}
          </h3>
        </div>

        {/* Edit Mode Info Banner */}
        {editId && (
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
              width: "100%",
              boxSizing: "border-box",
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
            Editing existing unit - modify the fields below to update the unit
            information
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          {/* Row 1: Add to collection (only for new units) */}
          {!editId && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginBottom: 12,
                width: "100%",
                minWidth: 140,
              }}
            >
              <label
                style={{
                  alignSelf: "flex-start",
                  fontWeight: 500,
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  marginBottom: 3,
                  fontSize: 13,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                Add to:
              </label>
              <select
                value={addTo}
                onChange={handleAddToChange}
                style={{
                  width: "100%",
                  minWidth: 0,
                  fontSize: 13,
                  padding: "6px 8px",
                  borderRadius: 5,
                  border: isDarkMode
                    ? "1.2px solid #4b5563"
                    : "1.2px solid #cbd5e1",
                  background: isDarkMode ? "#374151" : "#f1f5f9",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  height: "30px",
                  boxSizing: "border-box",
                  marginBottom: 0,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              >
                <option value="InventoryUnits">Inventory</option>
                <option value="DeployedUnits">Deployed</option>
              </select>
            </div>
          )}

          {/* Row 2: Device Type and Category */}
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
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginBottom: 0,
                width: "100%",
                minWidth: 140,
                flex: 1,
              }}
            >
              <label
                style={{
                  alignSelf: "flex-start",
                  fontWeight: 500,
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  marginBottom: 3,
                  fontSize: 13,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                Device Type:
              </label>
              <select
                name="deviceType"
                value={form.deviceType}
                onChange={handleChange}
                style={{
                  width: "100%",
                  minWidth: 0,
                  fontSize: 13,
                  padding: "6px 8px",
                  borderRadius: 5,
                  border: isDarkMode
                    ? "1.2px solid #4b5563"
                    : "1.2px solid #cbd5e1",
                  background: isDarkMode ? "#374151" : "#f1f5f9",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  height: "30px",
                  boxSizing: "border-box",
                  marginBottom: 0,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                required
              >
                <option value="">Select Device Type</option>
                {unitDeviceTypes.map((type) => (
                  <option key={type.label} value={type.label}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginBottom: 0,
                width: "100%",
                minWidth: 140,
                flex: 1,
              }}
            >
              <label
                style={{
                  alignSelf: "flex-start",
                  fontWeight: 500,
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  marginBottom: 3,
                  fontSize: 13,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                Category:
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                style={{
                  width: "100%",
                  minWidth: 0,
                  fontSize: 13,
                  padding: "6px 8px",
                  borderRadius: 5,
                  border: isDarkMode
                    ? "1.2px solid #4b5563"
                    : "1.2px solid #cbd5e1",
                  background: isDarkMode ? "#374151" : "#f1f5f9",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  height: "30px",
                  boxSizing: "border-box",
                  marginBottom: 0,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              >
                <option value="">Select Category</option>
                {categoryOptions.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: TAG */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              marginBottom: 12,
              width: "100%",
              minWidth: 140,
            }}
          >
            <label
              style={{
                alignSelf: "flex-start",
                fontWeight: 500,
                color: isDarkMode ? "#f3f4f6" : "#222e3a",
                marginBottom: 3,
                fontSize: 13,
                fontFamily:
                  "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              TAG:
            </label>
            <input
              name="Tag"
              placeholder="TAG (Auto-generated)"
              value={form.Tag}
              onChange={handleChange}
              required
              disabled={true} // Always disable tag field since it's auto-generated
              style={{
                width: "100%",
                minWidth: 0,
                fontSize: 13,
                padding: "6px 8px",
                borderRadius: 5,
                border: isDarkMode
                  ? "1.2px solid #4b5563"
                  : "1.2px solid #cbd5e1",
                background: isDarkMode ? "#4b5563" : "#e5e7eb", // Gray background since always disabled
                color: isDarkMode ? "#9ca3af" : "#6b7280", // Gray text since always disabled
                height: "30px",
                boxSizing: "border-box",
                marginBottom: 0,
                fontFamily:
                  "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
                cursor: editId ? "not-allowed" : "text",
              }}
            />
          </div>

          {/* Row 4: CPU Generation and Model */}
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
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginBottom: 0,
                width: "100%",
                minWidth: 140,
                flex: 1,
              }}
            >
              <label
                style={{
                  alignSelf: "flex-start",
                  fontWeight: 500,
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  marginBottom: 3,
                  fontSize: 13,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                CPU - System Unit:
              </label>
              <select
                name="cpuGen"
                value={form.cpuGen}
                onChange={handleChange}
                style={{
                  width: "100%",
                  minWidth: 0,
                  fontSize: 13,
                  padding: "6px 8px",
                  borderRadius: 5,
                  border: isDarkMode
                    ? "1.2px solid #4b5563"
                    : "1.2px solid #cbd5e1",
                  background: isDarkMode ? "#374151" : "#f1f5f9",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  height: "30px",
                  boxSizing: "border-box",
                  marginBottom: 0,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                required
              >
                <option value="">Select CPU System Unit</option>
                {cpuGenOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginBottom: 0,
                width: "100%",
                minWidth: 140,
                flex: 1,
              }}
            >
              <label
                style={{
                  alignSelf: "flex-start",
                  fontWeight: 500,
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  marginBottom: 3,
                  fontSize: 13,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                CPU Model:
              </label>
              <input
                name="cpuModel"
                placeholder="Model"
                value={form.cpuModel}
                onChange={handleChange}
                style={{
                  width: "100%",
                  minWidth: 0,
                  fontSize: 13,
                  padding: "6px 8px",
                  borderRadius: 5,
                  border: isDarkMode
                    ? "1.2px solid #4b5563"
                    : "1.2px solid #cbd5e1",
                  background: isDarkMode ? "#374151" : "#f1f5f9",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  height: "30px",
                  boxSizing: "border-box",
                  marginBottom: 0,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              />
            </div>
          </div>

          {/* Row 5: RAM and Drive */}
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
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginBottom: 0,
                width: "100%",
                minWidth: 140,
                flex: 1,
              }}
            >
              <label
                style={{
                  alignSelf: "flex-start",
                  fontWeight: 500,
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  marginBottom: 3,
                  fontSize: 13,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                RAM (GB):
              </label>
              <select
                name="RAM"
                value={form.RAM}
                onChange={handleChange}
                style={{
                  width: "100%",
                  minWidth: 0,
                  fontSize: 13,
                  padding: "6px 8px",
                  borderRadius: 5,
                  border: isDarkMode
                    ? "1.2px solid #4b5563"
                    : "1.2px solid #cbd5e1",
                  background: isDarkMode ? "#374151" : "#f1f5f9",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  height: "30px",
                  boxSizing: "border-box",
                  marginBottom: 0,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              >
                <option value="">Select RAM</option>
                {ramOptions.map((ram) => (
                  <option key={ram} value={ram}>
                    {ram} GB
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginBottom: 0,
                width: "100%",
                minWidth: 140,
                flex: 1,
              }}
            >
              <label
                style={{
                  alignSelf: "flex-start",
                  fontWeight: 500,
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  marginBottom: 3,
                  fontSize: 13,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                Drive:
              </label>
              <input
                name="Drive"
                placeholder="MAIN DRIVE"
                value={form.Drive}
                onChange={handleChange}
                style={{
                  width: "100%",
                  minWidth: 0,
                  fontSize: 13,
                  padding: "6px 8px",
                  borderRadius: 5,
                  border: isDarkMode
                    ? "1.2px solid #4b5563"
                    : "1.2px solid #cbd5e1",
                  background: isDarkMode ? "#374151" : "#f1f5f9",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  height: "30px",
                  boxSizing: "border-box",
                  marginBottom: 0,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              />
            </div>
          </div>

          {/* Row 6: GPU and Status */}
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
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginBottom: 0,
                width: "100%",
                minWidth: 140,
                flex: 1,
              }}
            >
              <label
                style={{
                  alignSelf: "flex-start",
                  fontWeight: 500,
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  marginBottom: 3,
                  fontSize: 13,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                GPU:
              </label>
              <input
                name="GPU"
                placeholder="GPU"
                value={form.GPU}
                onChange={handleChange}
                style={{
                  width: "100%",
                  minWidth: 0,
                  fontSize: 13,
                  padding: "6px 8px",
                  borderRadius: 5,
                  border: isDarkMode
                    ? "1.2px solid #4b5563"
                    : "1.2px solid #cbd5e1",
                  background: isDarkMode ? "#374151" : "#f1f5f9",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  height: "30px",
                  boxSizing: "border-box",
                  marginBottom: 0,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginBottom: 0,
                width: "100%",
                minWidth: 140,
                flex: 1,
              }}
            >
              <label
                style={{
                  alignSelf: "flex-start",
                  fontWeight: 500,
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  marginBottom: 3,
                  fontSize: 13,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                Condition:
              </label>
              <select
                name="Condition"
                value={form.Condition}
                onChange={handleChange}
                style={{
                  width: "100%",
                  minWidth: 0,
                  fontSize: 13,
                  padding: "6px 8px",
                  borderRadius: 5,
                  border: isDarkMode
                    ? "1.2px solid #4b5563"
                    : "1.2px solid #cbd5e1",
                  background: isDarkMode ? "#374151" : "#f1f5f9",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  height: "30px",
                  boxSizing: "border-box",
                  marginBottom: 0,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                required
              >
                <option value="">Select Condition</option>
                {conditionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 7: OS and Remarks */}
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
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginBottom: 0,
                width: "100%",
                minWidth: 140,
                flex: 1,
              }}
            >
              <label
                style={{
                  alignSelf: "flex-start",
                  fontWeight: 500,
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  marginBottom: 3,
                  fontSize: 13,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                OS:
              </label>
              <select
                name="OS"
                value={form.OS}
                onChange={handleChange}
                style={{
                  width: "100%",
                  minWidth: 0,
                  fontSize: 13,
                  padding: "6px 8px",
                  borderRadius: 5,
                  border: isDarkMode
                    ? "1.2px solid #4b5563"
                    : "1.2px solid #cbd5e1",
                  background: isDarkMode ? "#374151" : "#f1f5f9",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  height: "30px",
                  boxSizing: "border-box",
                  marginBottom: 0,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                required
              >
                <option value="">Select OS</option>
                {osOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginBottom: 0,
                width: "100%",
                minWidth: 140,
                flex: 1,
              }}
            >
              <label
                style={{
                  alignSelf: "flex-start",
                  fontWeight: 500,
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  marginBottom: 3,
                  fontSize: 13,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                Remarks:
              </label>
              <input
                name="Remarks"
                placeholder="REMARKS"
                value={form.Remarks}
                onChange={handleChange}
                style={{
                  width: "100%",
                  minWidth: 0,
                  fontSize: 13,
                  padding: "6px 8px",
                  borderRadius: 5,
                  border: isDarkMode
                    ? "1.2px solid #4b5563"
                    : "1.2px solid #cbd5e1",
                  background: isDarkMode ? "#374151" : "#f1f5f9",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  height: "30px",
                  boxSizing: "border-box",
                  marginBottom: 0,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              />
            </div>
          </div>

          {/* Button Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 20,
              width: "100%",
            }}
          >
            <button
              type="submit"
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                marginLeft: 4,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                transition: "background 0.2s, box-shadow 0.2s",
                outline: "none",
                fontFamily:
                  "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
              aria-label={editId ? "Update unit information" : "Save new unit"}
            >
              {editId ? "Update" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{
                background: "#e0e7ef",
                color: "#2563eb",
                border: "none",
                borderRadius: 8,
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                marginLeft: 4,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                transition: "background 0.2s, box-shadow 0.2s",
                outline: "none",
                fontFamily:
                  "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
              aria-label="Cancel and close dialog"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Close filter popup when clicking anywhere else
  useEffect(() => {
    if (!filterPopup.open) return;
    const close = () =>
      setFilterPopup({ open: false, column: null, table: null, anchor: null });
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [filterPopup.open]);

  // Reset pagination when search term changes
  useEffect(() => {
    setInventoryPage(1);
    setDeployedPage(1);
  }, [searchTerm]);

  // --- Main Component Render ---
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: isDarkMode ? "#111827" : "#f7f9fb",
        fontFamily:
          "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Header outside card */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: isDarkMode ? "#ffffff" : "#222e3a",
          letterSpacing: 1,
          padding: "20px 24px 16px 24px",
          flexShrink: 0,
        }}
      >
        UNIT SPECIFICATIONS
      </div>

      {/* Tab Bar - matching Company Assets style */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          borderBottom: isDarkMode ? "2px solid #374151" : "2px solid #e0e7ef",
          margin: "0 24px 0 24px",
          gap: 2,
          flexShrink: 0,
          paddingBottom: 0,
        }}
      >
        <button
          onClick={() => setActiveTab("InventoryUnits")}
          style={{
            border: "none",
            background:
              activeTab === "InventoryUnits"
                ? isDarkMode
                  ? "#1f2937"
                  : "#fff"
                : isDarkMode
                ? "#374151"
                : "#e0e7ef",
            color:
              activeTab === "InventoryUnits"
                ? "#2563eb"
                : isDarkMode
                ? "#9ca3af"
                : "#64748b",
            fontWeight: activeTab === "InventoryUnits" ? 700 : 500,
            fontSize: 16,
            padding: "10px 32px",
            borderRadius: 0,
            cursor: "pointer",
            boxShadow:
              activeTab === "InventoryUnits"
                ? "0 -2px 8px rgba(68,95,109,0.08)"
                : "none",
            outline: "none",
            transition: "all 0.2s",
          }}
        >
          Inventory Units
        </button>
        <button
          onClick={() => setActiveTab("DeployedUnits")}
          style={{
            border: "none",
            background:
              activeTab === "DeployedUnits"
                ? isDarkMode
                  ? "#1f2937"
                  : "#fff"
                : isDarkMode
                ? "#374151"
                : "#e0e7ef",
            color:
              activeTab === "DeployedUnits"
                ? "#2563eb"
                : isDarkMode
                ? "#9ca3af"
                : "#64748b",
            fontWeight: activeTab === "DeployedUnits" ? 700 : 500,
            fontSize: 16,
            padding: "10px 32px",
            borderRadius: 0,
            cursor: "pointer",
            boxShadow:
              activeTab === "DeployedUnits"
                ? "0 -2px 8px rgba(68,95,109,0.08)"
                : "none",
            outline: "none",
            transition: "all 0.2s",
          }}
        >
          Deployed Units
        </button>
      </div>

      {/* Add/Edit Modal */}
      {showModal && renderModal()}

      {/* Main Content: Tabbed Tables */}
      <div
        style={{
          background: isDarkMode ? "#1f2937" : "#fff",
          borderRadius: 0,
          boxShadow: "0 2px 12px rgba(68,95,109,0.10)",
          margin: "0 24px 24px 24px",
          padding: 0,
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {activeTab === "InventoryUnits" && (
          <div
            style={{ flex: 1, overflow: "hidden", background: "transparent" }}
          >
            {loading ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px",
                }}
              >
                <TableLoadingSpinner text="Loading inventory units..." />
              </div>
            ) : (
              renderTable(
                inventory,
                "InventoryUnits",
                inventoryPage,
                setInventoryPage
              )
            )}
          </div>
        )}
        {activeTab === "DeployedUnits" && (
          <div
            style={{ flex: 1, overflow: "hidden", background: "transparent" }}
          >
            {loading ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px",
                }}
              >
                <TableLoadingSpinner text="Loading deployed units..." />
              </div>
            ) : (
              renderTable(
                deployed,
                "DeployedUnits",
                deployedPage,
                setDeployedPage
              )
            )}
          </div>
        )}

        {/* Card Footer with Pagination Controls */}
        {!loading && renderCardFooter()}
      </div>

      {/* Delete confirmation modal */}
      {confirmSingleDelete && renderSingleDeleteConfirmModal()}

      {/* Bulk delete confirmation modal */}
      {bulkDeleteConfirm && renderBulkDeleteConfirmModal()}

      {/* Specs Report Modal */}
      {showSpecsReport && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowSpecsReport(false)}
        >
          <div
            style={{
              backgroundColor: isDarkMode ? "#1f2937" : "#fff",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "800px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color: isDarkMode ? "#f3f4f6" : "#1f2937",
                  fontSize: "24px",
                  fontWeight: "600",
                }}
              >
                📤 Specifications Report
              </h2>
              <button
                onClick={() => setShowSpecsReport(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: "0",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <p
                style={{
                  color: "#6b7280",
                  fontSize: "16px",
                  margin: "0 0 16px 0",
                }}
              >
                Summary of current specifications with recommendations for
                devices that don't meet today's baseline standards.
              </p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h3
                style={{
                  color: isDarkMode ? "#f3f4f6" : "#1f2937",
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "12px",
                }}
              >
                📊 Overall Statistics
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    background: "#f3f4f6",
                    padding: "16px",
                    borderRadius: "8px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#1f2937",
                    }}
                  >
                    {inventory.length + deployed.length}
                  </div>
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>
                    Total Devices
                  </div>
                </div>
                <div
                  style={{
                    background: "#fef3c7",
                    padding: "16px",
                    borderRadius: "8px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#d97706",
                    }}
                  >
                    {
                      [...inventory, ...deployed].filter((device) => {
                        const analysis = analyzeSpecs(device);
                        return analysis.warnings.length > 0;
                      }).length
                    }
                  </div>
                  <div style={{ fontSize: "14px", color: "#92400e" }}>
                    Need Attention
                  </div>
                </div>
                <div
                  style={{
                    background: "#d1fae5",
                    padding: "16px",
                    borderRadius: "8px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#059669",
                    }}
                  >
                    {
                      [...inventory, ...deployed].filter((device) => {
                        const analysis = analyzeSpecs(device);
                        return analysis.warnings.length === 0;
                      }).length
                    }
                  </div>
                  <div style={{ fontSize: "14px", color: "#047857" }}>
                    Meeting Standards
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h3
                style={{
                  color: isDarkMode ? "#f3f4f6" : "#1f2937",
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "12px",
                }}
              >
                ⚠️ Devices Requiring Attention
              </h3>
              <div
                style={{
                  maxHeight: "300px",
                  overflow: "auto",
                  border: isDarkMode
                    ? "1px solid #374151"
                    : "1px solid #e5e7eb",
                  borderRadius: "8px",
                  backgroundColor: isDarkMode ? "#374151" : "#ffffff",
                }}
              >
                {[...inventory, ...deployed]
                  .filter((device) => {
                    const analysis = analyzeSpecs(device);
                    return analysis.warnings.length > 0;
                  })
                  .map((device, index) => {
                    const analysis = analyzeSpecs(device);
                    return (
                      <div
                        key={index}
                        style={{
                          padding: "16px",
                          borderBottom:
                            index <
                            [...inventory, ...deployed].filter(
                              (d) => analyzeSpecs(d).warnings.length > 0
                            ).length -
                              1
                              ? isDarkMode
                                ? "1px solid #4b5563"
                                : "1px solid #e5e7eb"
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "600",
                            color: isDarkMode ? "#f3f4f6" : "#1f2937",
                            marginBottom: "8px",
                          }}
                        >
                          {device.Tag || `Device ${index + 1}`} -{" "}
                          {device.deviceType || "Unknown Type"}
                        </div>
                        {analysis.warnings.map((warning, wIndex) => (
                          <div
                            key={wIndex}
                            style={{
                              color: "#dc2626",
                              fontSize: "14px",
                              marginBottom: "4px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span style={{ color: "#f59e0b" }}>⚠️</span>
                            {warning}
                          </div>
                        ))}
                        {analysis.goodPoints.length > 0 && (
                          <div style={{ marginTop: "8px" }}>
                            {analysis.goodPoints.map((point, pIndex) => (
                              <div
                                key={pIndex}
                                style={{
                                  color: "#059669",
                                  fontSize: "14px",
                                  marginBottom: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <span style={{ color: "#10b981" }}>✅</span>
                                {point}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                {[...inventory, ...deployed].filter(
                  (device) => analyzeSpecs(device).warnings.length > 0
                ).length === 0 && (
                  <div
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    🎉 All devices meet current baseline standards!
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "24px",
              }}
            >
              <button
                onClick={() => setShowSpecsReport(false)}
                style={{
                  background: "#6b7280",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 16px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  // TODO: Implement PDF export functionality
                  showInfo("PDF export feature coming soon!");
                }}
                style={{
                  background: "#f59e0b",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 16px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Export as PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preventive Maintenance Modal */}
      {showPreventiveMaintenance && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowPreventiveMaintenance(false)}
        >
          <div
            style={{
              backgroundColor: isDarkMode ? "#1f2937" : "#fff",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "700px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color: isDarkMode ? "#f3f4f6" : "#1f2937",
                  fontSize: "24px",
                  fontWeight: "600",
                }}
              >
                🔧 Preventive Maintenance Checklist
              </h2>
              <button
                onClick={() => setShowPreventiveMaintenance(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: "0",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            {selectedDevice ? (
              <div>
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "16px",
                    background: isDarkMode ? "#374151" : "#f9fafb",
                    borderRadius: "8px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      color: isDarkMode ? "#f3f4f6" : "#1f2937",
                      fontSize: "18px",
                    }}
                  >
                    Device: {selectedDevice.Tag || "Unknown"}
                  </h3>
                  <p
                    style={{
                      margin: "0",
                      color: isDarkMode ? "#9ca3af" : "#6b7280",
                      fontSize: "14px",
                    }}
                  >
                    Type: {selectedDevice.deviceType || "Unknown"} | Category:{" "}
                    {selectedDevice.category || "Unknown"} | Age:{" "}
                    {selectedDevice.dateAdded
                      ? Math.floor(
                          (new Date() - new Date(selectedDevice.dateAdded)) /
                            (1000 * 60 * 60 * 24 * 365)
                        ) + " years"
                      : "Unknown"}
                  </p>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <h4
                    style={{
                      color: isDarkMode ? "#f3f4f6" : "#1f2937",
                      fontSize: "16px",
                      fontWeight: "600",
                      marginBottom: "12px",
                    }}
                  >
                    ✅ Maintenance Tasks
                  </h4>
                  {getMaintenanceChecklist(selectedDevice).map(
                    (item, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                          padding: "12px",
                          marginBottom: "8px",
                          border: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          borderRadius: "8px",
                          backgroundColor: item.critical
                            ? isDarkMode
                              ? "#451a03"
                              : "#fef3c7"
                            : isDarkMode
                            ? "#374151"
                            : "#f9fafb",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={
                            selectedDevice?.maintenanceChecklist?.[item.task]
                              ?.completed || false
                          }
                          style={{
                            marginTop: "2px",
                            accentColor: "#6b7280",
                            colorScheme: isDarkMode ? "dark" : "light",
                          }}
                          onChange={(e) => {
                            handleTaskCompletion(
                              selectedDevice.Tag,
                              item.task,
                              e.target.checked
                            );
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: item.critical ? "600" : "normal",
                              color: item.critical
                                ? isDarkMode
                                  ? "#fbbf24"
                                  : "#92400e"
                                : isDarkMode
                                ? "#f3f4f6"
                                : "#374151",
                              fontSize: "14px",
                            }}
                          >
                            {item.task}
                            {item.critical && (
                              <span
                                style={{ color: "#dc2626", marginLeft: "8px" }}
                              >
                                ⚠️ Critical
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "16px",
                    marginBottom: "20px",
                  }}
                >
                  Select a device from the table below to generate a customized
                  maintenance checklist.
                </p>

                <div
                  style={{
                    maxHeight: "400px",
                    overflow: "auto",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: isDarkMode
                              ? "1px solid #374151"
                              : "1px solid #e5e7eb",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: isDarkMode ? "#f3f4f6" : "#374151",
                            backgroundColor: isDarkMode ? "#374151" : "#f9fafb",
                          }}
                        >
                          Device Tag
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: isDarkMode
                              ? "1px solid #374151"
                              : "1px solid #e5e7eb",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: isDarkMode ? "#f3f4f6" : "#374151",
                            backgroundColor: isDarkMode ? "#374151" : "#f9fafb",
                          }}
                        >
                          Type
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: isDarkMode
                              ? "1px solid #374151"
                              : "1px solid #e5e7eb",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: isDarkMode ? "#f3f4f6" : "#374151",
                            backgroundColor: isDarkMode ? "#374151" : "#f9fafb",
                          }}
                        >
                          Category
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            borderBottom: isDarkMode
                              ? "1px solid #374151"
                              : "1px solid #e5e7eb",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: isDarkMode ? "#f3f4f6" : "#374151",
                            backgroundColor: isDarkMode ? "#374151" : "#f9fafb",
                          }}
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...inventory, ...deployed].map((device, index) => (
                        <tr
                          key={index}
                          style={{ borderBottom: "1px solid #f3f4f6" }}
                        >
                          <td style={{ padding: "12px", fontSize: "14px" }}>
                            {device.Tag || `Device ${index + 1}`}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px" }}>
                            {device.deviceType || "Unknown"}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px" }}>
                            <span
                              style={{
                                background:
                                  device.category === "High-End"
                                    ? "#dcfce7"
                                    : device.category === "Mid-Range"
                                    ? "#fef3c7"
                                    : "#fee2e2",
                                color:
                                  device.category === "High-End"
                                    ? "#166534"
                                    : device.category === "Mid-Range"
                                    ? "#92400e"
                                    : "#991b1b",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                fontWeight: "500",
                              }}
                            >
                              {device.category || "Low-End"}
                            </span>
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <button
                              onClick={() => setSelectedDevice(device)}
                              style={{
                                background: "#8b5cf6",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                padding: "6px 12px",
                                fontSize: "12px",
                                cursor: "pointer",
                                fontWeight: "500",
                              }}
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "24px",
              }}
            >
              {selectedDevice && (
                <button
                  onClick={() => setSelectedDevice(null)}
                  style={{
                    background: "#6b7280",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "10px 16px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Back to Device List
                </button>
              )}
              <button
                onClick={() => {
                  setShowPreventiveMaintenance(false);
                  setSelectedDevice(null);
                }}
                style={{
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 16px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitSpecs;
