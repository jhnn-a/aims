import { useEffect, useState } from "react";
import { getAllEmployees } from "../services/employeeService";
import { getAllDevices } from "../services/deviceService";
import { getAllClients } from "../services/clientService";
import { exportDashboardToExcel } from "../utils/exportDashboardToExcel";
import LoadingSpinner from "../components/LoadingSpinner";
import { useCurrentUser } from "../CurrentUserContext";
import { useTheme } from "../context/ThemeContext";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { formatActionType } from "../services/userLogService";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  LineChart,
  Line,
} from "recharts";

// Maintenance Status Colors for Specifications Report
const MAINTENANCE_COLORS = {
  Healthy: "#16a34a", // Green
  "Needs Maintenance": "#ea580c", // Orange
  Critical: "#dc2626", // Red
};

// Utility function to normalize device type for case-insensitive comparison
const normalizeDeviceType = (deviceType) => {
  if (!deviceType || typeof deviceType !== "string") return "Unknown";
  return deviceType.trim().toUpperCase(); // Normalize to uppercase for consistency
};

// Helper function to get proper display name for device types with special capitalization rules
const getDeviceTypeDisplayName = (deviceType) => {
  if (!deviceType || typeof deviceType !== "string") return "Unknown";

  const cleanType = deviceType.trim().toLowerCase();

  // Special cases that should be fully capitalized
  const specialCases = {
    ups: "UPS",
    pc: "PC",
    ram: "RAM",
    psu: "PSU",
    ssd: "SSD",
    hdd: "HDD",
    cpu: "CPU",
    gpu: "GPU",
  };

  if (specialCases[cleanType]) {
    return specialCases[cleanType];
  }

  // For other types, use proper case (first letter uppercase, rest lowercase)
  return cleanType.charAt(0).toUpperCase() + cleanType.slice(1);
};

// Helper function to get display name for device type (preserves original casing for display)
const getDeviceTypeDisplayNameOld = (normalizedType, originalDevices) => {
  if (normalizedType === "UNKNOWN") return "Unknown";

  // Find the first occurrence of this device type and use its original casing for display
  const device = originalDevices.find(
    (d) => normalizeDeviceType(d.deviceType) === normalizedType
  );
  return device?.deviceType || normalizedType;
};

// Helper functions for maintenance status calculation (from UnitSpecs.js)
const getMaintenanceChecklist = (device) => {
  if (!device) return [];

  const tasks = [];

  // Basic maintenance tasks for all devices
  tasks.push({ task: "Physical inspection for damage", critical: true });
  tasks.push({ task: "Clean dust from vents and components", critical: false });
  tasks.push({ task: "Check cable connections", critical: false });
  tasks.push({ task: "Update operating system", critical: true });
  tasks.push({ task: "Run antivirus scan", critical: true });
  tasks.push({ task: "Check disk space and cleanup", critical: false });

  // Device-specific tasks
  if (device.deviceType?.toLowerCase() === "laptop") {
    tasks.push({ task: "Check battery health", critical: true });
    tasks.push({ task: "Test keyboard and trackpad", critical: false });
    tasks.push({ task: "Check hinge operation", critical: false });
  } else if (device.deviceType?.toLowerCase() === "pc") {
    tasks.push({ task: "Check power supply connections", critical: true });
    tasks.push({ task: "Monitor CPU and GPU temperatures", critical: true });
    tasks.push({ task: "Test USB and other ports", critical: false });
  }

  // Storage-specific tasks
  if (device.Drive?.toLowerCase().includes("hdd")) {
    tasks.push({ task: "Run disk health check (HDD)", critical: true });
  } else if (device.Drive?.toLowerCase().includes("ssd")) {
    tasks.push({ task: "Check SSD health and wear level", critical: true });
  }

  return tasks.sort((a, b) => b.critical - a.critical);
};

// Helper function to calculate maintenance status with better defaults for Dashboard
const calculateMaintenanceStatusForDashboard = (device) => {
  if (!device) return "Critical";

  // If no maintenance checklist exists, check if this device should be tracked
  if (
    !device.maintenanceChecklist ||
    Object.keys(device.maintenanceChecklist).length === 0
  ) {
    // For devices without any maintenance tracking, default to Healthy
    // This assumes that devices in UnitSpecs without maintenance data are new/clean
    return "Healthy";
  }

  // Use the full calculation if maintenance data exists
  return calculateMaintenanceStatus(device);
};

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

// Custom Pie Chart Component
function CustomPieChart({ data, title, height = 300, isDarkMode = false }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const renderCustomLegend = () => {
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 12,
          marginTop: 20,
        }}
      >
        {data.map((entry, index) => {
          const percentage =
            total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
          return (
            <div
              key={entry.name}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: entry.color,
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  color: isDarkMode ? "#cbd5e1" : "#334155",
                  fontWeight: 600,
                }}
              >
                {entry.name} ({percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{
        background: isDarkMode
          ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
          : "linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%)",
        borderRadius: 16,
        padding: 32,
        border: `1px solid ${isDarkMode ? "#334155" : "#dbeafe"}`,
        boxShadow: isDarkMode
          ? "0 8px 24px rgba(0,0,0,0.2)"
          : "0 8px 24px rgba(59, 130, 246, 0.08)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Gradient accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "120px",
          height: "120px",
          background: isDarkMode
            ? "radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <h3
        style={{
          margin: "0 0 8px 0",
          color: isDarkMode ? "#f1f5f9" : "#0f172a",
          fontSize: 18,
          fontWeight: 700,
          position: "relative",
          zIndex: 1,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: "0 0 20px 0",
          color: isDarkMode ? "#a1a5af" : "#64748b",
          fontSize: 13,
          position: "relative",
          zIndex: 1,
        }}
      >
        Snapshot of the current asset distribution
      </p>
      <ResponsiveContainer width="100%" height={height - 60}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={68}
            outerRadius={98}
            paddingAngle={3}
            cornerRadius={8}
            fill="#8884d8"
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <text
            x="50%"
            y="48%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={isDarkMode ? "#f1f5f9" : "#0f172a"}
            fontSize="28"
            fontWeight="700"
          >
            {total}
          </text>
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={isDarkMode ? "#a1a5af" : "#64748b"}
            fontSize="12"
          >
            assets
          </text>
          <Tooltip
            formatter={(value, name) => [`${value} devices`, name]}
            contentStyle={{
              backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
              border: `2px solid #3b82f6`,
              borderRadius: "10px",
              color: isDarkMode ? "#f1f5f9" : "#0f172a",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {renderCustomLegend()}
    </div>
  );
}

// Custom Bar Chart Component - Vertical Column Chart with Premium Styling
function CustomBarChart({
  data,
  title,
  xKey,
  yKey,
  height = 350,
  isDarkMode = false,
}) {
  return (
    <div
      style={{
        background: isDarkMode
          ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
          : "linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%)",
        borderRadius: 16,
        padding: 32,
        border: `1px solid ${isDarkMode ? "#334155" : "#dbeafe"}`,
        boxShadow: isDarkMode
          ? "0 8px 24px rgba(0,0,0,0.2)"
          : "0 8px 24px rgba(59, 130, 246, 0.08)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Gradient accent background */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "120px",
          height: "120px",
          background: isDarkMode
            ? "radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <h3
        style={{
          margin: "0 0 12px 0",
          color: isDarkMode ? "#f1f5f9" : "#0f172a",
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: "-0.3px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: "0 0 24px 0",
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 13,
          position: "relative",
          zIndex: 1,
        }}
      >
        Top deployed device categories
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDarkMode ? "#334155" : "#e0e7ff"}
            vertical={false}
          />
          <XAxis
            type="category"
            dataKey={xKey}
            tick={{ fill: isDarkMode ? "#cbd5e1" : "#334155", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="number"
            tick={{ fill: isDarkMode ? "#cbd5e1" : "#334155", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
              border: `2px solid #3b82f6`,
              borderRadius: "10px",
              color: isDarkMode ? "#f1f5f9" : "#0f172a",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          />
          <Bar
            dataKey={yKey}
            fill="url(#barGradient)"
            radius={[12, 12, 0, 0]}
            barSize={40}
          >
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                <stop offset="100%" stopColor="#1e40af" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <LabelList
              dataKey={yKey}
              position="top"
              fill={isDarkMode ? "#dbeafe" : "#1e40af"}
              fontSize={13}
              fontWeight={700}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Dashboard() {
  // Use custom hook to get current user, with fallback for missing context
  let currentUser = undefined;
  try {
    const userContext = useCurrentUser?.();
    currentUser = userContext?.currentUser;
  } catch (e) {
    currentUser = undefined;
  }
  const username = currentUser?.username || "User";

  // Get dark mode state from theme context
  const { isDarkMode } = useTheme();

  // Scroll to top button state
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Core metrics state
  const [employeeCount, setEmployeeCount] = useState(0);
  const [deviceCount, setDeviceCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [stockCount, setStockCount] = useState(0);
  const [retiredCount, setRetiredCount] = useState(0);
  const [deployedCount, setDeployedCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [deviceTypes, setDeviceTypes] = useState([]);

  // Device condition counts
  const [goodCount, setGoodCount] = useState(0);
  const [needsRepairCount, setNeedsRepairCount] = useState(0);
  const [brandNewCount, setBrandNewCount] = useState(0);
  const [defectiveCount, setDefectiveCount] = useState(0);

  // Enhanced dashboard state
  const [utilizationRate, setUtilizationRate] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [stockroomData, setStockroomData] = useState([]);
  const [cpuSpecifications, setCpuSpecifications] = useState([]);
  const [employeeMap, setEmployeeMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [systemHistory, setSystemHistory] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [clientAssetCounts, setClientAssetCounts] = useState([]);
  const [clientAssetsData, setClientAssetsData] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [selectedStockroomClient, setSelectedStockroomClient] = useState("All Owners");

  // Modal state for client assets
  const [clientAssetsModalOpen, setClientAssetsModalOpen] = useState(false);
  const [clientAssetsModalData, setClientAssetsModalData] = useState({
    type: "",
    client: "",
    items: [],
  });

  // Extract fetchData as a standalone function for reuse
  const fetchData = async () => {
    try {
      // Helper function to normalize device owner names
      const normalizeDeviceOwner = (ownerName) => {
        if (!ownerName) return ownerName;
        const normalized = ownerName.trim().toLowerCase();
        if (normalized === "joii philippines") return "Workstream PH";
        if (normalized === "joii ph - other services") return "WPH - Other Services";
        return ownerName;
      };

      const [employees, devices, clients] = await Promise.all([
        getAllEmployees(),
        getAllDevices(),
        getAllClients(),
      ]);

      // Fetch total admins from users collection
      const usersSnapshot = await getDocs(collection(db, "users"));
      const totalAdminsCount = usersSnapshot.size;
      setTotalAdmins(totalAdminsCount);

      // Filter to only count active employees (not resigned and not entities)
      const activeEmployees = employees.filter(
        (emp) => !emp.isResigned && !emp.isEntity
      );

      setEmployeeCount(activeEmployees.length);
      setDeviceCount(devices.length);
      setClientCount(clients.length);
      setStockCount(devices.filter((d) => d.status === "Stock Room").length);
      setRetiredCount(devices.filter((d) => d.status === "Retired").length);

      // Calculate deployed assets (devices that are assigned/in use)
      const deployed = devices.filter(
        (d) =>
          d.status === "In Use" ||
          d.status === "Deployed" ||
          (d.assignedTo && d.assignedTo.trim() !== "")
      ).length;
      setDeployedCount(deployed);

      // Calculate inventory total (unassigned devices - matching Inventory.js logic exactly)
      const inventory = devices.filter((device) => {
        // Only show devices that are NOT assigned (matching getUnassignedDevices function)
        return !device.assignedTo || device.assignedTo === "";
      }).length;
      setInventoryCount(inventory);

      // Calculate stockroom data (usable devices that are NOT assigned)
      const stockroomMap = {};
      const availableDevices = devices.filter(
        (d) =>
          (d.condition === "GOOD" || d.condition === "BRANDNEW") &&
          (!d.assignedTo || d.assignedTo.trim() === "")
      );

      availableDevices.forEach((device) => {
        const normalizedType = normalizeDeviceType(device.deviceType);
        if (!stockroomMap[normalizedType]) {
          stockroomMap[normalizedType] = {
            deviceType: getDeviceTypeDisplayName(
              normalizedType,
              availableDevices
            ),
            brandNew: 0,
            good: 0,
            total: 0,
          };
        }

        if (device.condition === "BRANDNEW") {
          stockroomMap[normalizedType].brandNew++;
        } else if (device.condition === "GOOD") {
          stockroomMap[normalizedType].good++;
        }
        stockroomMap[normalizedType].total++;
      });

      const stockroomArray = Object.values(stockroomMap).sort(
        (a, b) => b.total - a.total
      );
      setStockroomData(stockroomArray);
      setAllDevices(devices); // Store all devices for later use

      // Calculate CPU Specifications - count CPU generations from devices data
      const cpuGenMap = { i3: 0, i5: 0, i7: 0, Other: 0 };

      // Process PC/Laptop devices to count CPU generations directly from devices collection
      devices.forEach((device) => {
        // Only process PC and Laptop devices
        const deviceType = (device.deviceType || "").toLowerCase();
        if (deviceType === "pc" || deviceType === "laptop") {
          const cpuGen = (device.cpuGen || device.CPU || "").toLowerCase();

          if (cpuGen.includes("i3")) {
            cpuGenMap["i3"]++;
          } else if (cpuGen.includes("i5")) {
            cpuGenMap["i5"]++;
          } else if (cpuGen.includes("i7") || cpuGen.includes("i9")) {
            cpuGenMap["i7"]++;
          } else if (cpuGen.trim() !== "") {
            cpuGenMap["Other"]++;
          }
        }
      });

      // CPU Colors for chart
      const CPU_COLORS = {
        i3: "#ef4444", // Red
        i5: "#f59e0b", // Orange
        i7: "#22c55e", // Green
        Other: "#6b7280", // Gray
      };

      // Convert to array format for chart
      const cpuSpecsData = Object.entries(cpuGenMap)
        .map(([generation, count]) => ({
          name: generation,
          value: count,
          color: CPU_COLORS[generation],
        }))
        .filter((item) => item.value > 0);

      setCpuSpecifications(cpuSpecsData);

      // Build employeeId → employeeName map
      const empMap = {};
      employees.forEach((emp) => {
        const docId = (emp.id || emp.employeeId || "")
          .toString()
          .trim()
          .toUpperCase();
        if (docId && emp.fullName) {
          empMap[docId] = emp.fullName.trim();
        }
      });
      setEmployeeMap(empMap); // Store employee map in state

      // Count device types (case-insensitive)
      const typeMap = {};
      const typeDisplayNames = {}; // Store original display names
      devices.forEach((d) => {
        const normalizedType = normalizeDeviceType(d.deviceType);
        typeMap[normalizedType] = (typeMap[normalizedType] || 0) + 1;

        // Store the original device type for display purposes (first occurrence wins)
        if (!typeDisplayNames[normalizedType]) {
          typeDisplayNames[normalizedType] = getDeviceTypeDisplayName(
            normalizedType,
            devices
          );
        }
      });
      const sortedTypes = Object.entries(typeMap)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([normalizedType, count]) => ({
          type: typeDisplayNames[normalizedType],
          count,
        }));
      setDeviceTypes(sortedTypes);

      // Count device conditions
      setGoodCount(devices.filter((d) => d.condition === "GOOD").length);
      setNeedsRepairCount(
        devices.filter((d) => d.condition === "NEEDS REPAIR").length
      );
      setBrandNewCount(
        devices.filter((d) => d.condition === "BRANDNEW").length
      );
      setDefectiveCount(
        devices.filter((d) => d.condition === "DEFECTIVE").length
      );
      setRetiredCount(devices.filter((d) => d.condition === "RETIRED").length);
      setAllDevices(devices);

      // Enhanced metrics calculations

      // Total Assets Count Owned by Client calculation
      const clientMap = {};
      // Create a normalized map for case-insensitive matching
      const normalizedClientMap = {};
      clients.forEach((client) => {
        const clientName = client.clientName || client.name || client.id;
        clientMap[client.id || client.name] = clientName;
        // Store normalized version for matching
        normalizedClientMap[clientName.trim().toLowerCase()] = clientName;
      });
      // Always ensure "Workstream Philippines" is in the normalized map for default owner
      if (!normalizedClientMap["workstream philippines"]) {
        normalizedClientMap["workstream philippines"] = "Workstream Philippines";
      }

      // Total Assets Count Owned by Client calculation
      // Only count devices with explicit client field set
      const clientAssetCountMap = {};
      devices.forEach((device) => {
        // Only count devices that have a client explicitly set
        if (device.client && device.client.trim() !== "") {
          const normalizedDeviceClient = device.client.trim().toLowerCase();
          // Find the proper client name using case-insensitive matching
          const clientName =
            normalizedClientMap[normalizedDeviceClient] || device.client;
          clientAssetCountMap[clientName] =
            (clientAssetCountMap[clientName] || 0) + 1;
        }
      });

      // Only include clients with at least 1 asset
      const clientAssetCountData = Object.entries(clientAssetCountMap)
        .filter(([client, count]) => count > 0)
        .map(([client, count]) => ({ client, count }))
        .sort((a, b) => b.count - a.count);
      setClientAssetCounts(clientAssetCountData);

      // Store all data for modal functionality
      setAllDevices(devices);
      setAllEmployees(employees);
      setAllClients(clients);

      // Enhanced Client Assets Table calculation
      const clientAssetsMap = {};

      // Get all unique clients from the clients list
      clients.forEach((client) => {
        const clientName = client.clientName || client.name || client.id;
        if (!clientAssetsMap[clientName]) {
          clientAssetsMap[clientName] = {
            clientName: clientName,
            setsOfAssets: 0,
            totalPeripherals: 0,
            availablePeripherals: 0,
          };
        }
      });

      // Calculate employee sets per client (SETS OF ASSETS)
      // For every Employee that has assets (1 or more), count as 1 set of assets per client
      const employeesWithAssetsByClient = {};

      // First, find all employees who have assigned devices
      devices.forEach((device) => {
        if (device.assignedTo && device.assignedTo.trim() !== "") {
          const deviceClient = normalizeDeviceOwner(device.client || device.deviceOwner);
          if (deviceClient) {
            if (!employeesWithAssetsByClient[deviceClient]) {
              employeesWithAssetsByClient[deviceClient] = new Set();
            }
            // Add employee to the set (Set automatically handles duplicates)
            employeesWithAssetsByClient[deviceClient].add(device.assignedTo);
          }
        }
      });

      // Now count the sets of assets (unique employees with assets per client)
      Object.entries(employeesWithAssetsByClient).forEach(
        ([clientName, employeeSet]) => {
          if (!clientAssetsMap[clientName]) {
            clientAssetsMap[clientName] = {
              clientName: clientName,
              setsOfAssets: 0,
              totalPeripherals: 0,
              availablePeripherals: 0,
            };
          }
          // Each unique employee with assets counts as 1 set
          clientAssetsMap[clientName].setsOfAssets = employeeSet.size;
        }
      );

      // Calculate peripheral counts per client using devices with client field
      devices.forEach((device) => {
        const deviceClient = normalizeDeviceOwner(device.client || device.deviceOwner);
        if (deviceClient) {
          if (!clientAssetsMap[deviceClient]) {
            clientAssetsMap[deviceClient] = {
              clientName: deviceClient,
              setsOfAssets: 0,
              totalPeripherals: 0,
              availablePeripherals: 0,
            };
          }

          // Total peripherals owned by client
          clientAssetsMap[deviceClient].totalPeripherals++;

          // Available peripherals - following Inventory.js logic: unassigned devices with GOOD/BRANDNEW condition
          const isUnassigned =
            !device.assignedTo || device.assignedTo.trim() === "";
          const isUsableCondition =
            device.condition === "GOOD" || device.condition === "BRANDNEW";

          if (isUnassigned && isUsableCondition) {
            clientAssetsMap[deviceClient].availablePeripherals++;
          }
        }
      });

      const clientAssetsArray = Object.values(clientAssetsMap)
        .filter(
          (client) => client.totalPeripherals > 0 || client.setsOfAssets > 0
        )
        .sort((a, b) => b.totalPeripherals - a.totalPeripherals);

      setClientAssetsData(clientAssetsArray);

      // Utilization rate calculation
      const totalDevices = devices.length;
      const devicesInUse = devices.filter((d) => d.status === "In Use").length;
      const utilization =
        totalDevices > 0 ? Math.round((devicesInUse / totalDevices) * 100) : 0;
      setUtilizationRate(utilization);

      // Device history will be handled by real-time listener in useEffect
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  };

  // Scroll event handler for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      // Get scroll position from multiple sources
      let scrollTop = 0;

      // Check dashboard container first
      const dashboardElement = document.getElementById("dashboard-container");
      if (dashboardElement && dashboardElement.scrollTop > 0) {
        scrollTop = dashboardElement.scrollTop;
      }
      // Check main content element
      else {
        const mainContentElement = document.querySelector(".main-content");
        if (mainContentElement && mainContentElement.scrollTop > 0) {
          scrollTop = mainContentElement.scrollTop;
        }
        // Fallback to window scroll
        else {
          scrollTop =
            window.pageYOffset ||
            document.documentElement.scrollTop ||
            document.body.scrollTop ||
            0;
        }
      }

      setShowScrollTop(scrollTop > 200);
    };

    // Set up listeners with a delay to ensure DOM is ready
    const setupListeners = () => {
      const dashboardElement = document.getElementById("dashboard-container");
      const mainContentElement = document.querySelector(".main-content");

      // Add scroll listeners to available elements
      if (dashboardElement) {
        dashboardElement.addEventListener("scroll", handleScroll, {
          passive: true,
        });
      }

      if (mainContentElement) {
        mainContentElement.addEventListener("scroll", handleScroll, {
          passive: true,
        });
      }

      // Add fallback listeners
      window.addEventListener("scroll", handleScroll, { passive: true });
      document.addEventListener("scroll", handleScroll, { passive: true });

      // Reduced polling frequency for better performance
      const pollInterval = setInterval(() => {
        handleScroll();
      }, 500); // Reduced from 100ms to 500ms

      // Initial check
      setTimeout(() => {
        handleScroll();
      }, 100);

      return () => {
        if (dashboardElement) {
          dashboardElement.removeEventListener("scroll", handleScroll);
        }
        if (mainContentElement) {
          mainContentElement.removeEventListener("scroll", handleScroll);
        }
        window.removeEventListener("scroll", handleScroll);
        document.removeEventListener("scroll", handleScroll);
        clearInterval(pollInterval);
      };
    };

    // Use a timeout to ensure the DOM is fully rendered
    const timeoutId = setTimeout(setupListeners, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Function to scroll to top
  const scrollToTop = () => {
    // Get all possible scroll containers
    const dashboardElement = document.getElementById("dashboard-container");
    const mainContentElement = document.querySelector(".main-content");

    // Try dashboard container first
    if (dashboardElement) {
      dashboardElement.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

    // Also try main content element since that's what we found
    if (mainContentElement) {
      mainContentElement.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

    // Fallback to window scroll
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Client Assets Modal Handlers
  const handleClientAssetsClick = (type, clientName) => {
    // Don't handle employees type - Sets of Assets is view-only
    if (type === "employees") {
      return;
    }

    let items = [];

    if (type === "totalDevices") {
      // Get count of device types for the specific client (case-insensitive grouping)
      const deviceTypeCounts = {};

      allDevices.forEach((device) => {
        const deviceClient = device.client || device.deviceOwner;
        if (deviceClient === clientName) {
          // Normalize and get proper display name for device type
          const rawDeviceType = device.deviceType || "Unknown";
          const deviceType = getDeviceTypeDisplayName(rawDeviceType);

          if (!deviceTypeCounts[deviceType]) {
            deviceTypeCounts[deviceType] = {
              deviceType: deviceType,
              total: 0,
              usableDevices: 0,
              deployedAssets: 0,
            };
          }

          deviceTypeCounts[deviceType].total++;

          // Count usable devices - following Inventory.js logic: unassigned devices with GOOD + BRANDNEW
          const isUnassigned =
            !device.assignedTo || device.assignedTo.trim() === "";
          const isUsableCondition =
            device.condition === "GOOD" || device.condition === "BRANDNEW";
          if (isUnassigned && isUsableCondition) {
            deviceTypeCounts[deviceType].usableDevices++;
          }

          // Count deployed assets - following Assets.js logic: devices with assignedTo field
          if (device.assignedTo && device.assignedTo.trim() !== "") {
            deviceTypeCounts[deviceType].deployedAssets++;
          }
        }
      });

      items = Object.values(deviceTypeCounts).sort((a, b) => b.total - a.total);
    } else if (type === "availableDevices") {
      // Get count of available device types for the specific client
      // Following Inventory.js logic: unassigned devices with GOOD/BRANDNEW condition
      const availableDeviceTypeCounts = {};

      allDevices.forEach((device) => {
        const deviceClient = device.client || device.deviceOwner;
        const isUnassigned =
          !device.assignedTo || device.assignedTo.trim() === "";
        const isUsableCondition =
          device.condition === "GOOD" || device.condition === "BRANDNEW";

        if (deviceClient === clientName && isUnassigned && isUsableCondition) {
          const rawDeviceType = device.deviceType || "Unknown";
          const deviceType = getDeviceTypeDisplayName(rawDeviceType);
          availableDeviceTypeCounts[deviceType] =
            (availableDeviceTypeCounts[deviceType] || 0) + 1;
        }
      });

      items = Object.entries(availableDeviceTypeCounts)
        .map(([deviceType, count]) => ({ deviceType, count }))
        .sort((a, b) => b.count - a.count);
    }

    setClientAssetsModalData({
      type: type,
      client: clientName,
      items: items,
    });

    setClientAssetsModalOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Separate useEffect for real-time user logs listener
  useEffect(() => {
    const logsCollection = collection(db, "userLogs");
    const logsQuery = query(
      logsCollection,
      orderBy("timestamp", "desc"),
      limit(10)
    );

    // Set up real-time listener for user logs
    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        try {
          const logs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const formatted = logs.map((log) => ({
            event: formatUserLogEvent(log),
            date: formatShortDate(log.timestamp?.toDate?.() || new Date()),
            rawEntry: log,
          }));

          // If no logs data, provide fallback
          if (formatted.length === 0) {
            const fallbackHistory = [
              {
                event: "No recent activity found",
                date: formatShortDate(new Date().toISOString()),
              },
              {
                event: "System monitoring active",
                date: formatShortDate(new Date().toISOString()),
              },
            ];
            setSystemHistory(fallbackHistory);
          } else {
            setSystemHistory(formatted);
          }
        } catch (error) {
          console.error("Error processing user logs:", error);
        }
      },
      (error) => {
        console.error("Error listening to user logs:", error);
        // Provide fallback on error
        const fallbackHistory = [
          {
            event: "System initialized",
            date: formatShortDate(new Date().toISOString()),
          },
          {
            event: "Dashboard loaded",
            date: formatShortDate(new Date().toISOString()),
          },
        ];
        setSystemHistory(fallbackHistory);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []); // No dependencies needed for user logs

  if (loading) {
    return (
      <div
        style={{
          padding: "40px 48px 20px 40px",
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: isDarkMode ? "#111827" : "#f9f9f9",
        }}
      >
        <LoadingSpinner />
      </div>
    );
  }

  // Prepare data for enhanced visualizations
  const deviceStatusData = [
    { name: "GOOD", value: goodCount, color: "#2563eb" },
    { name: "BRAND NEW", value: brandNewCount, color: "#22c55e" },
    { name: "DEFECTIVE", value: defectiveCount, color: "#ef4444" },
    { name: "RETIRED", value: retiredCount, color: "#6b7280" },
  ].filter((item) => item.value > 0);

  const deviceTypeData = (() => {
    // Calculate deployed devices by type (only assigned/in use devices)
    const deployedTypeMap = {};
    const typeDisplayNames = {}; // Store original display names
    allDevices.forEach((device) => {
      // Only count devices that are deployed/assigned
      if (
        device.status === "In Use" ||
        device.status === "Deployed" ||
        (device.assignedTo && device.assignedTo.trim() !== "")
      ) {
        const normalizedType = normalizeDeviceType(device.deviceType);
        deployedTypeMap[normalizedType] =
          (deployedTypeMap[normalizedType] || 0) + 1;

        // Store the original device type for display purposes (first occurrence wins)
        if (!typeDisplayNames[normalizedType]) {
          typeDisplayNames[normalizedType] = getDeviceTypeDisplayName(
            normalizedType,
            allDevices
          );
        }
      }
    });

    return Object.entries(deployedTypeMap)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([normalizedType, count]) => ({
        type: typeDisplayNames[normalizedType],
        count,
      }));
  })();

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }

          /* Custom scrollbar for Recent Activity */
          .recent-activity-scroll::-webkit-scrollbar {
            width: 8px;
          }

          .recent-activity-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .recent-activity-scroll::-webkit-scrollbar-thumb {
            background: ${isDarkMode
            ? "rgba(156, 163, 175, 0.3)"
            : "rgba(209, 213, 219, 0.5)"
          };
            border-radius: 4px;
          }

          .recent-activity-scroll::-webkit-scrollbar-thumb:hover {
            background: ${isDarkMode
            ? "rgba(156, 163, 175, 0.5)"
            : "rgba(209, 213, 219, 0.8)"
          };
          }

          /* Firefox scrollbar */
          .recent-activity-scroll {
            scrollbar-width: thin;
            scrollbar-color: ${isDarkMode
            ? "rgba(156, 163, 175, 0.3)"
            : "rgba(209, 213, 219, 0.5)"
          } transparent;
          }

          /* Custom scrollbar for Main Dashboard */
          .dashboard-main-scroll::-webkit-scrollbar {
            width: 10px;
          }

          .dashboard-main-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .dashboard-main-scroll::-webkit-scrollbar-thumb {
            background: ${isDarkMode
            ? "rgba(156, 163, 175, 0.3)"
            : "rgba(209, 213, 219, 0.5)"
          };
            border-radius: 5px;
          }

          .dashboard-main-scroll::-webkit-scrollbar-thumb:hover {
            background: ${isDarkMode
            ? "rgba(156, 163, 175, 0.5)"
            : "rgba(209, 213, 219, 0.8)"
          };
          }

          /* Firefox scrollbar for main dashboard */
          .dashboard-main-scroll {
            scrollbar-width: thin;
            scrollbar-color: ${isDarkMode
            ? "rgba(156, 163, 175, 0.3)"
            : "rgba(209, 213, 219, 0.5)"
          } transparent;
          }
        `}
      </style>
      <div
        id="dashboard-container"
        className="dashboard-main-scroll"
        style={{
          padding: "40px 48px 20px 48px",
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          fontFamily:
            'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          overflowY: "auto",
          background: isDarkMode ? "#111827" : "#f9f9f9",
          position: "relative",
        }}
      >
        {/* Header with Professional Typography */}
        <div style={{ marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: isDarkMode ? "#f1f5f9" : "#0f172a",
              margin: "0 0 12px 0",
              letterSpacing: "-0.5px",
            }}
          >
            Dashboard Overview
          </h1>
          <p
            style={{
              fontSize: 16,
              color: isDarkMode ? "#a1a5af" : "#64748b",
              margin: "0",
              fontWeight: 400,
              letterSpacing: "0px",
            }}
          >
            Welcome back, {username}. Here's your asset & inventory status.
          </p>
        </div>

        {/* Core Metrics Cards - Professional Design */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 16,
            marginBottom: 40,
          }}
        >
          {/* Active Employees */}
          <div
            style={{
              background: isDarkMode
                ? "#1e293b"
                : "#ffffff",
              borderRadius: 12,
              padding: "28px 24px",
              border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
              boxShadow: isDarkMode
                ? "0 4px 12px rgba(0,0,0,0.15)"
                : "0 4px 12px rgba(15, 23, 42, 0.06)",
              transition: "all 0.3s ease",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = isDarkMode
                ? "0 8px 20px rgba(0,0,0,0.25)"
                : "0 8px 20px rgba(15, 23, 42, 0.12)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = isDarkMode
                ? "0 4px 12px rgba(0,0,0,0.15)"
                : "0 4px 12px rgba(15, 23, 42, 0.06)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isDarkMode ? "#94a3b8" : "#64748b",
                    marginBottom: 12,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                  }}
                >
                  Active Employees
                </div>
                <div style={{ fontSize: 40, fontWeight: 800, color: "#1e40af", lineHeight: 1 }}>
                  {employeeCount}
                </div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.15 }}>👥</div>
            </div>
          </div>

          {/* Total Devices */}
          <div
            style={{
              background: isDarkMode
                ? "#1e293b"
                : "#ffffff",
              borderRadius: 12,
              padding: "28px 24px",
              border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
              boxShadow: isDarkMode
                ? "0 4px 12px rgba(0,0,0,0.15)"
                : "0 4px 12px rgba(15, 23, 42, 0.06)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = isDarkMode
                ? "0 8px 20px rgba(0,0,0,0.25)"
                : "0 8px 20px rgba(15, 23, 42, 0.12)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = isDarkMode
                ? "0 4px 12px rgba(0,0,0,0.15)"
                : "0 4px 12px rgba(15, 23, 42, 0.06)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isDarkMode ? "#94a3b8" : "#64748b",
                    marginBottom: 12,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                  }}
                >
                  Total Devices
                </div>
                <div style={{ fontSize: 40, fontWeight: 800, color: "#0d9488", lineHeight: 1 }}>
                  {deviceCount}
                </div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.15 }}>💻</div>
            </div>
          </div>

          {/* Total Clients */}
          <div
            style={{
              background: isDarkMode
                ? "#1e293b"
                : "#ffffff",
              borderRadius: 12,
              padding: "28px 24px",
              border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
              boxShadow: isDarkMode
                ? "0 4px 12px rgba(0,0,0,0.15)"
                : "0 4px 12px rgba(15, 23, 42, 0.06)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = isDarkMode
                ? "0 8px 20px rgba(0,0,0,0.25)"
                : "0 8px 20px rgba(15, 23, 42, 0.12)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = isDarkMode
                ? "0 4px 12px rgba(0,0,0,0.15)"
                : "0 4px 12px rgba(15, 23, 42, 0.06)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isDarkMode ? "#94a3b8" : "#64748b",
                    marginBottom: 12,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                  }}
                >
                  Total Clients
                </div>
                <div style={{ fontSize: 40, fontWeight: 800, color: "#7c3aed", lineHeight: 1 }}>
                  {clientCount}
                </div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.15 }}>🏢</div>
            </div>
          </div>

          {/* Assets Deployed */}
          <div
            style={{
              background: isDarkMode
                ? "#1e293b"
                : "#ffffff",
              borderRadius: 12,
              padding: "28px 24px",
              border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
              boxShadow: isDarkMode
                ? "0 4px 12px rgba(0,0,0,0.15)"
                : "0 4px 12px rgba(15, 23, 42, 0.06)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = isDarkMode
                ? "0 8px 20px rgba(0,0,0,0.25)"
                : "0 8px 20px rgba(15, 23, 42, 0.12)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = isDarkMode
                ? "0 4px 12px rgba(0,0,0,0.15)"
                : "0 4px 12px rgba(15, 23, 42, 0.06)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isDarkMode ? "#94a3b8" : "#64748b",
                    marginBottom: 12,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                  }}
                >
                  Assets in Use
                </div>
                <div style={{ fontSize: 40, fontWeight: 800, color: "#d97706", lineHeight: 1 }}>
                  {deployedCount}
                </div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.15 }}>📤</div>
            </div>
          </div>

          {/* Inventory Total */}
          <div
            style={{
              background: isDarkMode
                ? "#1e293b"
                : "#ffffff",
              borderRadius: 12,
              padding: "28px 24px",
              border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
              boxShadow: isDarkMode
                ? "0 4px 12px rgba(0,0,0,0.15)"
                : "0 4px 12px rgba(15, 23, 42, 0.06)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = isDarkMode
                ? "0 8px 20px rgba(0,0,0,0.25)"
                : "0 8px 20px rgba(15, 23, 42, 0.12)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = isDarkMode
                ? "0 4px 12px rgba(0,0,0,0.15)"
                : "0 4px 12px rgba(15, 23, 42, 0.06)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isDarkMode ? "#94a3b8" : "#64748b",
                    marginBottom: 12,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                  }}
                >
                  Stock Count
                </div>
                <div style={{ fontSize: 40, fontWeight: 800, color: "#059669", lineHeight: 1 }}>
                  {inventoryCount}
                </div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.15 }}>📦</div>
            </div>
          </div>

          {/* Total Admins */}
          <div
            style={{
              background: isDarkMode
                ? "#1e293b"
                : "#ffffff",
              borderRadius: 12,
              padding: "28px 24px",
              border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
              boxShadow: isDarkMode
                ? "0 4px 12px rgba(0,0,0,0.15)"
                : "0 4px 12px rgba(15, 23, 42, 0.06)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = isDarkMode
                ? "0 8px 20px rgba(0,0,0,0.25)"
                : "0 8px 20px rgba(15, 23, 42, 0.12)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = isDarkMode
                ? "0 4px 12px rgba(0,0,0,0.15)"
                : "0 4px 12px rgba(15, 23, 42, 0.06)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isDarkMode ? "#94a3b8" : "#64748b",
                    marginBottom: 12,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                  }}
                >
                  Admins
                </div>
                <div style={{ fontSize: 40, fontWeight: 800, color: "#dc2626", lineHeight: 1 }}>
                  {totalAdmins}
                </div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.15 }}>🔐</div>
            </div>
          </div>
        </div>

        {/* Asset Monitoring Overview Section */}
        <div
          style={{
            background: isDarkMode
              ? "linear-gradient(135deg, #1f2937 0%, #111827 100%)"
              : "linear-gradient(135deg, #fff 0%, #f8fafc 100%)",
            borderRadius: 16,
            padding: 28,
            border: `1.5px solid ${isDarkMode ? "#374151" : "#dbe7f5"}`,
            marginBottom: 40,
            boxShadow: isDarkMode
              ? "0 8px 24px rgba(0,0,0,0.2)"
              : "0 8px 24px rgba(37, 99, 235, 0.06)",
          }}
        >
          <h3
            style={{
              margin: "0 0 24px 0",
              color: isDarkMode ? "#f3f4f6" : "#0f172a",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            📊 Asset Inventory Overview
          </h3>
          {/* Deployed table has no owner filter */}
          {/* (Filter moved to individual tables) */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 15,
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: isDarkMode ? "#374151" : "#f1f5f9",
                  }}
                >
                  <th
                    style={{
                      padding: "16px 12px",
                      textAlign: "left",
                      fontWeight: 700,
                      color: isDarkMode ? "#cbd5e1" : "#334155",
                      borderBottom: `2px solid ${isDarkMode ? "#4b5563" : "#cbd5e1"
                        }`,
                      minWidth: "140px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    ASSET TYPE
                  </th>
                  <th
                    style={{
                      padding: "16px 12px",
                      textAlign: "center",
                      fontWeight: 700,
                      color: isDarkMode ? "#cbd5e1" : "#334155",
                      borderBottom: `2px solid ${isDarkMode ? "#4b5563" : "#cbd5e1"
                        }`,
                      minWidth: "90px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    TOTAL
                  </th>
                  <th
                    style={{
                      padding: "16px 12px",
                      textAlign: "center",
                      fontWeight: 700,
                      color: isDarkMode ? "#cbd5e1" : "#334155",
                      borderBottom: `2px solid ${isDarkMode ? "#4b5563" : "#cbd5e1"
                        }`,
                      minWidth: "100px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    IN USE
                  </th>
                  <th
                    style={{
                      padding: "16px 12px",
                      textAlign: "center",
                      fontWeight: 700,
                      color: isDarkMode ? "#cbd5e1" : "#334155",
                      borderBottom: `2px solid ${isDarkMode ? "#4b5563" : "#cbd5e1"
                        }`,
                      minWidth: "100px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    USABLE
                  </th>
                  <th
                    style={{
                      padding: "16px 12px",
                      textAlign: "center",
                      fontWeight: 700,
                      color: isDarkMode ? "#cbd5e1" : "#334155",
                      borderBottom: `2px solid ${isDarkMode ? "#4b5563" : "#cbd5e1"
                        }`,
                      minWidth: "100px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    ISSUES
                  </th>
                  <th
                    style={{
                      padding: "16px 12px",
                      textAlign: "center",
                      fontWeight: 700,
                      color: isDarkMode ? "#cbd5e1" : "#334155",
                      borderBottom: `2px solid ${isDarkMode ? "#4b5563" : "#cbd5e1"
                        }`,
                      minWidth: "130px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const deviceTypeStats = {};
                  const typeDisplayNames = {};

                  const unassignedDevices = allDevices.filter(
                    (device) => !device.assignedTo || device.assignedTo === ""
                  );

                  const assignedDevices = allDevices.filter(
                    (device) =>
                      device.assignedTo && device.assignedTo.trim() !== ""
                  );

                  unassignedDevices.forEach((device) => {
                    const normalizedType = normalizeDeviceType(
                      device.deviceType
                    );

                    if (!deviceTypeStats[normalizedType]) {
                      deviceTypeStats[normalizedType] = {
                        totalStockroom: 0,
                        deployed: 0,
                        defective: 0,
                        brandnew: 0,
                        good: 0,
                      };
                    }

                    if (!typeDisplayNames[normalizedType]) {
                      typeDisplayNames[normalizedType] =
                        getDeviceTypeDisplayName(normalizedType, allDevices);
                    }

                    const stats = deviceTypeStats[normalizedType];
                    stats.totalStockroom++;

                    const condition = device.condition?.toUpperCase() || "";
                    if (condition === "DEFECTIVE") {
                      stats.defective++;
                    } else if (
                      condition === "BRANDNEW" ||
                      condition === "BRAND NEW"
                    ) {
                      stats.brandnew++;
                    } else if (condition === "GOOD") {
                      stats.good++;
                    }
                  });

                  assignedDevices.forEach((device) => {
                    const normalizedType = normalizeDeviceType(
                      device.deviceType
                    );

                    if (!deviceTypeStats[normalizedType]) {
                      deviceTypeStats[normalizedType] = {
                        totalStockroom: 0,
                        deployed: 0,
                        defective: 0,
                        brandnew: 0,
                        good: 0,
                      };
                    }

                    if (!typeDisplayNames[normalizedType]) {
                      typeDisplayNames[normalizedType] =
                        getDeviceTypeDisplayName(normalizedType, allDevices);
                    }

                    const stats = deviceTypeStats[normalizedType];
                    stats.deployed++;
                  });

                  return Object.entries(deviceTypeStats)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([normalizedType, stats], index) => {
                      const deviceType = typeDisplayNames[normalizedType];
                      const total = stats.totalStockroom + stats.deployed;
                      const usable = stats.brandnew + stats.good;
                      const reorderThreshold = 5;
                      const reorderStatus =
                        usable >= reorderThreshold
                          ? "✅ Sufficient"
                          : "⚠️ Low Stock";

                      return (
                        <tr
                          key={normalizedType}
                          style={{
                            borderBottom: `1px solid ${isDarkMode ? "#374151" : "#e2e8f0"
                              }`,
                            backgroundColor:
                              index % 2 === 0
                                ? "transparent"
                                : isDarkMode
                                  ? "rgba(148, 163, 184, 0.05)"
                                  : "rgba(2, 13, 46, 0.02)",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isDarkMode
                              ? "rgba(148, 163, 184, 0.1)"
                              : "rgba(2, 13, 46, 0.04)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              index % 2 === 0
                                ? "transparent"
                                : isDarkMode
                                  ? "rgba(148, 163, 184, 0.05)"
                                  : "rgba(2, 13, 46, 0.02)";
                          }}
                        >
                          <td
                            style={{
                              padding: "14px 12px",
                              color: isDarkMode ? "#e2e8f0" : "#0f172a",
                              fontWeight: 600,
                              fontSize: 15,
                            }}
                          >
                            {deviceType}
                          </td>
                          <td
                            style={{
                              padding: "14px 12px",
                              textAlign: "center",
                              color: "#2563eb",
                              fontWeight: 700,
                              fontSize: 16,
                            }}
                          >
                            {total}
                          </td>
                          <td
                            style={{
                              padding: "14px 12px",
                              textAlign: "center",
                              color: "#f59e0b",
                              fontWeight: 700,
                              fontSize: 16,
                            }}
                          >
                            {stats.deployed}
                          </td>
                          <td
                            style={{
                              padding: "14px 12px",
                              textAlign: "center",
                              color: "#10b981",
                              fontWeight: 700,
                              fontSize: 16,
                              backgroundColor:
                                usable > 0
                                  ? isDarkMode
                                    ? "rgba(16, 185, 129, 0.1)"
                                    : "rgba(16, 185, 129, 0.08)"
                                  : isDarkMode
                                    ? "rgba(239, 68, 68, 0.1)"
                                    : "rgba(239, 68, 68, 0.08)",
                              borderRadius: 6,
                            }}
                          >
                            {usable}
                          </td>
                          <td
                            style={{
                              padding: "14px 12px",
                              textAlign: "center",
                              color: "#ef4444",
                              fontWeight: 600,
                              fontSize: 15,
                            }}
                          >
                            {stats.defective}
                          </td>
                          <td
                            style={{
                              padding: "14px 12px",
                              textAlign: "center",
                            }}
                          >
                            <span
                              style={{
                                color:
                                  reorderStatus.includes("✅")
                                    ? isDarkMode
                                      ? "#34d399"
                                      : "#059669"
                                    : isDarkMode
                                      ? "#fca5a5"
                                      : "#dc2626",
                                fontWeight: 700,
                                fontSize: 13,
                                padding: "6px 12px",
                                backgroundColor:
                                  reorderStatus.includes("✅")
                                    ? isDarkMode
                                      ? "rgba(16, 185, 129, 0.15)"
                                      : "rgba(16, 185, 129, 0.1)"
                                    : isDarkMode
                                      ? "rgba(239, 68, 68, 0.15)"
                                      : "rgba(239, 68, 68, 0.1)",
                                borderRadius: 6,
                                border:
                                  reorderStatus.includes("✅")
                                    ? `1px solid ${isDarkMode
                                      ? "rgba(52, 211, 153, 0.3)"
                                      : "rgba(16, 185, 129, 0.3)"
                                    }`
                                    : `1px solid ${isDarkMode
                                      ? "rgba(239, 68, 68, 0.3)"
                                      : "rgba(239, 68, 68, 0.3)"
                                    }`,
                                display: "inline-block",
                              }}
                            >
                              {reorderStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                })()}
              </tbody>
            </table>

            {/* Summary Statistics Row */}
            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: `2px solid ${isDarkMode ? "#374151" : "#e2e8f0"}`,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 16,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  background: isDarkMode
                    ? "rgba(37, 99, 235, 0.1)"
                    : "rgba(37, 99, 235, 0.05)",
                  borderRadius: 8,
                  border: `1px solid ${isDarkMode ? "#2563eb" : "#93c5fd"}`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, color: isDarkMode ? "#94a3b8" : "#64748b", marginBottom: 4 }}>
                  Total Assets
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#2563eb" }}>
                  {allDevices.length}
                </div>
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  background: isDarkMode
                    ? "rgba(245, 158, 11, 0.1)"
                    : "rgba(245, 158, 11, 0.05)",
                  borderRadius: 8,
                  border: `1px solid ${isDarkMode ? "#f59e0b" : "#fcd34d"}`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, color: isDarkMode ? "#94a3b8" : "#64748b", marginBottom: 4 }}>
                  In Use
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#f59e0b" }}>
                  {allDevices.filter((d) => d.assignedTo && d.assignedTo.trim() !== "").length}
                </div>
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  background: isDarkMode
                    ? "rgba(16, 185, 129, 0.1)"
                    : "rgba(16, 185, 129, 0.05)",
                  borderRadius: 8,
                  border: `1px solid ${isDarkMode ? "#10b981" : "#86efac"}`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, color: isDarkMode ? "#94a3b8" : "#64748b", marginBottom: 4 }}>
                  Usable Stock
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#10b981" }}>
                  {allDevices.filter(
                    (d) =>
                      (!d.assignedTo || d.assignedTo === "") &&
                      (d.condition?.toUpperCase() === "BRANDNEW" ||
                        d.condition?.toUpperCase() === "BRAND NEW" ||
                        d.condition?.toUpperCase() === "GOOD")
                  ).length}
                </div>
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  background: isDarkMode
                    ? "rgba(239, 68, 68, 0.1)"
                    : "rgba(239, 68, 68, 0.05)",
                  borderRadius: 8,
                  border: `1px solid ${isDarkMode ? "#ef4444" : "#fca5a5"}`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, color: isDarkMode ? "#94a3b8" : "#64748b", marginBottom: 4 }}>
                  Issues
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#ef4444" }}>
                  {allDevices.filter((d) => d.condition?.toUpperCase() === "DEFECTIVE").length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stockroom Inventory Chart - Workstream Philippines Only */}
        <div
          style={{
            background: isDarkMode
              ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%)",
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${isDarkMode ? "#334155" : "#dbeafe"}`,
            marginBottom: 32,
            boxShadow: isDarkMode
              ? "0 8px 24px rgba(0,0,0,0.2)"
              : "0 8px 24px rgba(59, 130, 246, 0.08)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Gradient accent */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "120px",
              height: "120px",
              background: isDarkMode
                ? "radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />
          <h3
            style={{
              margin: "0 0 8px 0",
              color: isDarkMode ? "#f1f5f9" : "#0f172a",
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "-0.3px",
              position: "relative",
              zIndex: 1,
            }}
          >
            📦 Stockroom Inventory - Workstream Philippines - Usable
          </h3>
          <p
            style={{
              margin: "0 0 16px 0",
              color: isDarkMode ? "#94a3b8" : "#64748b",
              fontSize: 15,
              position: "relative",
              zIndex: 1,
            }}
          >
            Quick overview of available assets by device type
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              position: "relative",
              zIndex: 1,
            }}
          >
            {(() => {
              const stockroomDevices = allDevices.filter((device) => {
                if (device.assignedTo && device.assignedTo !== "") return false;
                if (device.condition?.toUpperCase() === "DEFECTIVE") return false;

                const owner = (device.client || device.deviceOwner || "").trim().toLowerCase();
                const isWorkstreamPH =
                  owner === "joii philippines" ||
                  owner === "joii philiipines" ||
                  owner === "joii phillipines" ||
                  owner === "joii philipines" ||
                  owner === "workstream ph" ||
                  owner === "workstream philippines";
                return isWorkstreamPH;
              });

              const deviceTypeMap = {
                "i5 PC": 0,
                "i7 PC": 0,
              };

              // Helper: classify a PC device into i5 PC or i7 PC
              // Checks: deviceType name, cpuGen field, model field, brand field
              const classifyPCType = (device) => {
                const dt = (device.deviceType || "").trim().toLowerCase();
                const cpuGen = (device.cpuGen || device.CPU || "").trim().toLowerCase();
                const model = (device.model || "").trim().toLowerCase();
                const brand = (device.brand || "").trim().toLowerCase();
                const combined = `${dt} ${cpuGen} ${model} ${brand}`;

                const isPC =
                  dt === "pc" ||
                  dt.includes("system unit") ||
                  dt.includes("desktop") ||
                  (dt.includes("pc") && !dt.includes("laptop"));

                if (!isPC) return null;

                if (combined.includes("i7") || combined.includes("i9")) return "i7 PC";
                if (combined.includes("i5")) return "i5 PC";

                return null; // PC but unclassifiable — skip
              };

              stockroomDevices.forEach((device) => {
                const pcBucket = classifyPCType(device);
                if (pcBucket) {
                  deviceTypeMap[pcBucket]++;
                } else {
                  const dt = (device.deviceType || "").trim().toLowerCase();
                  const isAnyPC =
                    dt === "pc" ||
                    dt.includes("system unit") ||
                    dt.includes("desktop") ||
                    (dt.includes("pc") && !dt.includes("laptop"));
                  if (!isAnyPC) {
                    const key = getDeviceTypeDisplayName(normalizeDeviceType(device.deviceType));
                    if (key) deviceTypeMap[key] = (deviceTypeMap[key] || 0) + 1;
                  }
                }
              });

              // Always guarantee i5 PC and i7 PC appear in the list
              const i5Entry = { name: "i5 PC", count: deviceTypeMap["i5 PC"] || 0 };
              const i7Entry = { name: "i7 PC", count: deviceTypeMap["i7 PC"] || 0 };

              // Other device types (non-PC), sorted by count desc, fill up to 8 remaining slots
              const otherEntries = Object.entries(deviceTypeMap)
                .filter(([name]) => name !== "i5 PC" && name !== "i7 PC")
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 8);

              // Merge: i5 and i7 pinned, then sort all by count so highest are at top
              const sortedData = [i5Entry, i7Entry, ...otherEntries]
                .sort((a, b) => b.count - a.count);

              const maxCount = Math.max(...sortedData.map(d => d.count), 1);

              return sortedData.map((item, idx) => {
                const percentage = (item.count / maxCount) * 100;
                // Color based on count relative to max: green = high, yellow = mid, red = low/zero
                let barColor, bgColor;
                if (item.count === 0) {
                  barColor = "#ef4444"; // Red = no stock
                  bgColor = "rgba(239, 68, 68, 0.1)";
                } else if (percentage >= 66) {
                  barColor = "#059669"; // Green = high stock
                  bgColor = "rgba(16, 185, 129, 0.1)";
                } else if (percentage >= 33) {
                  barColor = "#f59e0b"; // Yellow = medium stock
                  bgColor = "rgba(245, 158, 11, 0.1)";
                } else {
                  barColor = "#ef4444"; // Red = low stock
                  bgColor = "rgba(239, 68, 68, 0.1)";
                }

                return (
                  <div
                    key={item.name}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3
              style={{
                margin: 0,
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              🖥️ Stockroom Total Counts for System Units
            </h3>

            {/* Owner filter for stockroom table */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: isDarkMode ? "#9ca3af" : "#6b7280" }}>
                <span style={{ fontWeight: 600, color: isDarkMode ? "#f3f4f6" : "#374151" }}>Filter by Owner:</span>
                <select
                  value={selectedStockroomClient}
                  onChange={(e) => setSelectedStockroomClient(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                    background: isDarkMode ? "#374151" : "white",
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                  }}
                >
                  <option value="All Owners">All Owners</option>
                  {clientAssetCounts && clientAssetCounts.length > 0 &&
                    clientAssetCounts.map((c) => {
                      const name = c.client;
                      return (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      );
                    })}
                </select>
              </label>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: isDarkMode ? "#374151" : "#f8fafc",
                  }}
                >
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      borderBottom: `2px solid ${
                        isDarkMode ? "#4b5563" : "#e5e7eb"
                      }`,
                      minWidth: "180px",
                    }}
                  >
                    MODEL
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      borderBottom: `2px solid ${
                        isDarkMode ? "#4b5563" : "#e5e7eb"
                      }`,
                      minWidth: "100px",
                    }}
                  >
                    BRANDNEW
                  </th>
                  <th
                    style={{
                      background: isDarkMode
                        ? `linear-gradient(90deg, ${bgColor} 0%, transparent 100%)`
                        : `linear-gradient(90deg, ${bgColor} 0%, transparent 100%)`,
                      borderLeft: `4px solid ${barColor}`,
                      borderTopRightRadius: 8,
                      borderBottomRightRadius: 8,
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 4px 12px ${barColor}15`;
                      e.currentTarget.style.transform = "translateX(4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                    USABLE
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Filter stockroom devices (unassigned devices only - like Inventory.js)
                  // If a specific owner is selected, further filter devices by client/deviceOwner
                  const stockroomDevices = allDevices.filter((device) => {
                    const isUnassigned = !device.assignedTo || device.assignedTo === "";
                    if (!isUnassigned) return false;

                    if (!selectedStockroomClient || selectedStockroomClient === "All Owners") {
                      return true;
                    }

                    const deviceClient = (device.client || device.deviceOwner || "").toString().trim();
                    return (
                      deviceClient.toLowerCase() ===
                      selectedStockroomClient.toString().trim().toLowerCase()
                    );
                  });

                  // Process System Unit data by CPU type
                  const systemUnitStats = {
                    "SYSTEM UNIT - i7": { brandnew: 0, good: 0, defective: 0 },
                    "SYSTEM UNIT - i5": { brandnew: 0, good: 0, defective: 0 },
                    "SYSTEM UNIT - i3": { brandnew: 0, good: 0, defective: 0 },
                  };

                  stockroomDevices.forEach((device) => {
                    // Count all PC devices (System Units) from stockroom
                    const deviceTypeUpper = (
                      device.deviceType || ""
                    ).toUpperCase();

                    // Include all PC-related device types
                    if (
                      deviceTypeUpper === "PC" ||
                      deviceTypeUpper.includes("PC") ||
                      deviceTypeUpper.includes("JOIIPC") ||
                      deviceTypeUpper.includes("SYSTEM UNIT") ||
                      deviceTypeUpper.includes("DESKTOP") ||
                      deviceTypeUpper.includes("COMPUTER")
                    ) {
                      let category = "";

                      // Categorize by CPU type - check multiple fields
                      const specifications = (
                        device.specifications || ""
                      ).toUpperCase();
                      const model = (device.model || "").toUpperCase();
                      const description = (
                        device.description || ""
                      ).toUpperCase();
                      const combinedInfo = `${deviceTypeUpper} ${specifications} ${model} ${description}`;

                      // More flexible CPU detection
                      if (
                        combinedInfo.includes("I7") ||
                        combinedInfo.includes("CORE I7")
                      ) {
                        category = "SYSTEM UNIT - i7";
                      } else if (
                        combinedInfo.includes("I5") ||
                        combinedInfo.includes("CORE I5")
                      ) {
                        category = "SYSTEM UNIT - i5";
                      } else if (
                        combinedInfo.includes("I3") ||
                        combinedInfo.includes("CORE I3")
                      ) {
                        category = "SYSTEM UNIT - i3";
                      } else {
                        // If no CPU type detected, default to i5 for PC devices
                        category = "SYSTEM UNIT - i5";
                      }

                      if (category && systemUnitStats[category]) {
                        const condition = (
                          device.condition || ""
                        ).toUpperCase();
                        if (condition === "DEFECTIVE") {
                          systemUnitStats[category].defective++;
                        } else if (
                          condition === "BRANDNEW" ||
                          condition === "BRAND NEW"
                        ) {
                          systemUnitStats[category].brandnew++;
                        } else if (condition === "GOOD") {
                          systemUnitStats[category].good++;
                        } else {
                          // If no condition specified, default to GOOD
                          systemUnitStats[category].good++;
                        }
                      }
                    }
                  });

                  // Calculate totals
                  const totals = {
                    brandnew: Object.values(systemUnitStats).reduce(
                      (sum, stats) => sum + stats.brandnew,
                      0
                    ),
                    good: Object.values(systemUnitStats).reduce(
                      (sum, stats) => sum + stats.good,
                      0
                    ),
                    defective: Object.values(systemUnitStats).reduce(
                      (sum, stats) => sum + stats.defective,
                      0
                    ),
                  };
                  totals.usable = totals.brandnew + totals.good;

                  const rows = [];

                  // Add individual model rows
                  Object.entries(systemUnitStats).forEach(
                    ([model, stats], index) => {
                      const usable = stats.brandnew + stats.good;
                      rows.push(
                        <tr
                          key={model}
                          style={{
                            borderBottom: `1px solid ${
                              isDarkMode ? "#374151" : "#f3f4f6"
                            }`,
                            backgroundColor:
                              index % 2 === 0
                                ? isDarkMode
                                  ? "#1f2937"
                                  : "#ffffff"
                                : isDarkMode
                                ? "#374151"
                                : "#f8fafc",
                          }}
                        >
                          <td
                            style={{
                              padding: "12px 16px",
                              color: isDarkMode ? "#f3f4f6" : "#374151",
                              fontWeight: 500,
                            }}
                          >
                            {model}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: "#06b6d4",
                              fontWeight: 600,
                            }}
                          >
                            {stats.brandnew}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: "#22c55e",
                              fontWeight: 600,
                            }}
                          >
                            {stats.good}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: "#ef4444",
                              fontWeight: 600,
                            }}
                          >
                            {stats.defective}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: "#10b981",
                              fontWeight: 700,
                              backgroundColor:
                                usable > 0
                                  ? isDarkMode
                                    ? "#064e3b"
                                    : "#f0fdf4"
                                  : isDarkMode
                                  ? "#7f1d1d"
                                  : "#fef2f2",
                              borderRadius: "4px",
                            }}
                          >
                            {usable}
                          </td>
                        </tr>
                      );
                    }
                  );

                  // Add totals row
                  rows.push(
                    <tr
                      key="totals"
                      style={{
                        borderTop: `2px solid ${
                          isDarkMode ? "#4b5563" : "#e5e7eb"
                        }`,
                        backgroundColor: isDarkMode ? "#374151" : "#f8fafc",
                        fontWeight: 700,
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          color: isDarkMode ? "#f3f4f6" : "#374151",
                          fontWeight: 700,
                          fontSize: "15px",
                        }}
                      >
                        TOTALS
                      </td>
                      <td
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: isDarkMode ? "#cbd5e1" : "#475569",
                          marginBottom: 5,
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: 4,
                          background: isDarkMode ? "#334155" : "#e5e7eb",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: "100%",
                            background: barColor,
                            borderRadius: 2,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        marginLeft: 12,
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 900,
                          color: barColor,
                          lineHeight: 1,
                          margin: "0",
                        }}
                      >
                        {item.count}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: isDarkMode ? "#94a3b8" : "#64748b",
                          marginTop: 2,
                        }}
                      >
                        {item.count === 0
                          ? "NONE"
                          : percentage >= 66
                            ? "HIGH"
                            : percentage >= 33
                              ? "MED"
                              : "LOW"}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Main Charts Grid - Premium Layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: 28,
            marginBottom: 40,
          }}
        >
          {/* Device Status Summary */}
          <div>
            <CustomPieChart
              data={deviceStatusData}
              title="🎯 Device Status Summary"
              height={350}
              isDarkMode={isDarkMode}
            />
          </div>
          <h3
            style={{
              margin: "0 0 16px 0",
              color: isDarkMode ? "#f3f4f6" : "#374151",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            🚀 Deployed Assets Total Counts for System Units
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: isDarkMode ? "#374151" : "#f8fafc",
                  }}
                >
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      borderBottom: `2px solid ${
                        isDarkMode ? "#4b5563" : "#e5e7eb"
                      }`,
                      minWidth: "180px",
                    }}
                  >
                    MODEL
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      borderBottom: `2px solid ${
                        isDarkMode ? "#4b5563" : "#e5e7eb"
                      }`,
                      minWidth: "100px",
                    }}
                  >
                    BRANDNEW
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      borderBottom: `2px solid ${
                        isDarkMode ? "#4b5563" : "#e5e7eb"
                      }`,
                      minWidth: "100px",
                    }}
                  >
                    GOOD
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      borderBottom: `2px solid ${
                        isDarkMode ? "#4b5563" : "#e5e7eb"
                      }`,
                      minWidth: "100px",
                    }}
                  >
                    DEFECTIVE
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      borderBottom: `2px solid ${
                        isDarkMode ? "#4b5563" : "#e5e7eb"
                      }`,
                      minWidth: "100px",
                    }}
                  >
                    USABLE
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Filter deployed devices (assigned devices only - like Assets.js)
                  const deployedDevices = allDevices.filter(
                    (device) => device.assignedTo && device.assignedTo.trim() !== ""
                  );

                  // Process System Unit data by CPU type for deployed devices
                  const deployedSystemUnitStats = {
                    "SYSTEM UNIT - i7": { brandnew: 0, good: 0, defective: 0 },
                    "SYSTEM UNIT - i5": { brandnew: 0, good: 0, defective: 0 },
                    "SYSTEM UNIT - i3": { brandnew: 0, good: 0, defective: 0 },
                  };

                  deployedDevices.forEach((device) => {
                    // Count all PC devices (System Units) from deployed assets
                    const deviceTypeUpper = (
                      device.deviceType || ""
                    ).toUpperCase();

                    // Include all PC-related device types
                    if (
                      deviceTypeUpper === "PC" ||
                      deviceTypeUpper.includes("PC") ||
                      deviceTypeUpper.includes("JOIIPC") ||
                      deviceTypeUpper.includes("SYSTEM UNIT") ||
                      deviceTypeUpper.includes("DESKTOP") ||
                      deviceTypeUpper.includes("COMPUTER")
                    ) {
                      let category = "";

                      // Categorize by CPU type - check multiple fields
                      const specifications = (
                        device.specifications || ""
                      ).toUpperCase();
                      const model = (device.model || "").toUpperCase();
                      const description = (
                        device.description || ""
                      ).toUpperCase();
                      const combinedInfo = `${deviceTypeUpper} ${specifications} ${model} ${description}`;

                      // More flexible CPU detection
                      if (
                        combinedInfo.includes("I7") ||
                        combinedInfo.includes("CORE I7")
                      ) {
                        category = "SYSTEM UNIT - i7";
                      } else if (
                        combinedInfo.includes("I5") ||
                        combinedInfo.includes("CORE I5")
                      ) {
                        category = "SYSTEM UNIT - i5";
                      } else if (
                        combinedInfo.includes("I3") ||
                        combinedInfo.includes("CORE I3")
                      ) {
                        category = "SYSTEM UNIT - i3";
                      } else {
                        // If no CPU type detected, default to i5 for PC devices
                        category = "SYSTEM UNIT - i5";
                      }

                      if (category && deployedSystemUnitStats[category]) {
                        const condition = (
                          device.condition || ""
                        ).toUpperCase();
                        if (condition === "DEFECTIVE") {
                          deployedSystemUnitStats[category].defective++;
                        } else if (
                          condition === "BRANDNEW" ||
                          condition === "BRAND NEW"
                        ) {
                          deployedSystemUnitStats[category].brandnew++;
                        } else if (condition === "GOOD") {
                          deployedSystemUnitStats[category].good++;
                        } else {
                          // If no condition specified, default to GOOD
                          deployedSystemUnitStats[category].good++;
                        }
                      }
                    }
                  });

                  // Calculate totals for deployed devices
                  const deployedTotals = {
                    brandnew: Object.values(deployedSystemUnitStats).reduce(
                      (sum, stats) => sum + stats.brandnew,
                      0
                    ),
                    good: Object.values(deployedSystemUnitStats).reduce(
                      (sum, stats) => sum + stats.good,
                      0
                    ),
                    defective: Object.values(deployedSystemUnitStats).reduce(
                      (sum, stats) => sum + stats.defective,
                      0
                    ),
                  };
                  deployedTotals.usable =
                    deployedTotals.brandnew + deployedTotals.good;

                  const deployedRows = [];

                  // Add individual model rows for deployed devices
                  Object.entries(deployedSystemUnitStats).forEach(
                    ([model, stats], index) => {
                      const usable = stats.brandnew + stats.good;
                      deployedRows.push(
                        <tr
                          key={model}
                          style={{
                            borderBottom: `1px solid ${
                              isDarkMode ? "#374151" : "#f3f4f6"
                            }`,
                            backgroundColor:
                              index % 2 === 0
                                ? isDarkMode
                                  ? "#1f2937"
                                  : "#ffffff"
                                : isDarkMode
                                ? "#374151"
                                : "#f8fafc",
                          }}
                        >
                          <td
                            style={{
                              padding: "12px 16px",
                              color: isDarkMode ? "#f3f4f6" : "#374151",
                              fontWeight: 500,
                            }}
                          >
                            {model}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: "#06b6d4",
                              fontWeight: 600,
                            }}
                          >
                            {stats.brandnew}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: "#22c55e",
                              fontWeight: 600,
                            }}
                          >
                            {stats.good}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: "#ef4444",
                              fontWeight: 600,
                            }}
                          >
                            {stats.defective}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: "#10b981",
                              fontWeight: 700,
                              backgroundColor:
                                usable > 0
                                  ? isDarkMode
                                    ? "#064e3b"
                                    : "#f0fdf4"
                                  : isDarkMode
                                  ? "#7f1d1d"
                                  : "#fef2f2",
                              borderRadius: "4px",
                            }}
                          >
                            {usable}
                          </td>
                        </tr>
                      );
                    }
                  );

                  // Add totals row for deployed devices
                  deployedRows.push(
                    <tr
                      key="deployed-totals"
                      style={{
                        borderTop: `2px solid ${
                          isDarkMode ? "#4b5563" : "#e5e7eb"
                        }`,
                        backgroundColor: isDarkMode ? "#374151" : "#f8fafc",
                        fontWeight: 700,
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          color: isDarkMode ? "#f3f4f6" : "#374151",
                          fontWeight: 700,
                          fontSize: "15px",
                        }}
                      >
                        TOTALS
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "center",
                          color: "#06b6d4",
                          fontWeight: 700,
                          fontSize: "15px",
                        }}
                      >
                        {deployedTotals.brandnew}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "center",
                          color: "#22c55e",
                          fontWeight: 700,
                          fontSize: "15px",
                        }}
                      >
                        {deployedTotals.good}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "center",
                          color: "#ef4444",
                          fontWeight: 700,
                          fontSize: "15px",
                        }}
                      >
                        {deployedTotals.defective}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "center",
                          color: "#10b981",
                          fontWeight: 700,
                          fontSize: "15px",
                          backgroundColor:
                            deployedTotals.usable > 0
                              ? isDarkMode
                                ? "#064e3b"
                                : "#f0fdf4"
                              : isDarkMode
                              ? "#7f1d1d"
                              : "#fef2f2",
                          borderRadius: "4px",
                        }}
                      >
                        {deployedTotals.usable}
                      </td>
                    </tr>
                  );

          {/* Device Type Distribution - Deployed Assets - Full Width */}
          <div style={{ gridColumn: "span 2", minWidth: "0" }}>
            <CustomBarChart
              data={deviceTypeData}
              title="📦 Deployed Assets by Device Type"
              xKey="type"
              yKey="count"
              height={350}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>



        {/* Total Assets Owned by Client */}
        {clientAssetsData.length > 0 && (
          <div
            style={{
              background: isDarkMode
                ? "linear-gradient(135deg, #1f2937 0%, #111827 100%)"
                : "linear-gradient(135deg, #fff 0%, #f8fafc 100%)",
              borderRadius: 16,
              padding: 28,
              border: `1.5px solid ${isDarkMode ? "#374151" : "#dbe7f5"}`,
              marginBottom: 40,
              boxShadow: isDarkMode
                ? "0 8px 24px rgba(0,0,0,0.2)"
                : "0 8px 24px rgba(37, 99, 235, 0.06)",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: 18,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              👥 Total Assets Owned by Client
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        borderBottom: isDarkMode
                          ? "2px solid #374151"
                          : "2px solid #e5e7eb",
                        color: isDarkMode ? "#9ca3af" : "#6b7280",
                        fontWeight: 600,
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      CLIENT NAME
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        borderBottom: isDarkMode
                          ? "2px solid #374151"
                          : "2px solid #e5e7eb",
                        color: isDarkMode ? "#9ca3af" : "#6b7280",
                        fontWeight: 600,
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      TOTAL PERIPHERALS
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        borderBottom: isDarkMode
                          ? "2px solid #374151"
                          : "2px solid #e5e7eb",
                        color: isDarkMode ? "#9ca3af" : "#6b7280",
                        fontWeight: 600,
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      SETS OF ASSETS
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        borderBottom: isDarkMode
                          ? "2px solid #374151"
                          : "2px solid #e5e7eb",
                        color: isDarkMode ? "#9ca3af" : "#6b7280",
                        fontWeight: 600,
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      AVAILABLE PERIPHERALS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientAssetsData.map((client, index) => (
                    <tr
                      key={client.clientName}
                      style={{
                        borderBottom: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #f3f4f6",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode
                          ? "#374151"
                          : "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          color: isDarkMode ? "#f3f4f6" : "#374151",
                          fontWeight: 500,
                        }}
                      >
                        {client.clientName}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "center",
                          color:
                            client.totalPeripherals > 0
                              ? isDarkMode
                                ? "#60a5fa"
                                : "#3b82f6"
                              : isDarkMode
                                ? "#6b7280"
                                : "#9ca3af",
                          fontWeight: client.totalPeripherals > 0 ? 700 : 400,
                          fontSize: "16px",
                          cursor:
                            client.totalPeripherals > 0 ? "pointer" : "default",
                        }}
                        onClick={() =>
                          client.totalPeripherals > 0 &&
                          handleClientAssetsClick(
                            "totalDevices",
                            client.clientName
                          )
                        }
                        onMouseEnter={(e) => {
                          if (client.totalPeripherals > 0) {
                            e.target.style.color = isDarkMode
                              ? "#93c5fd"
                              : "#1d4ed8";
                            e.target.style.textDecoration = "underline";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (client.totalPeripherals > 0) {
                            e.target.style.color = isDarkMode
                              ? "#60a5fa"
                              : "#3b82f6";
                            e.target.style.textDecoration = "none";
                          }
                        }}
                      >
                        {client.totalPeripherals}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "center",
                          color: isDarkMode ? "#e5e7eb" : "#374151",
                          fontWeight: 500,
                          fontSize: "16px",
                        }}
                      >
                        {client.setsOfAssets}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "center",
                          color:
                            client.availablePeripherals > 0
                              ? isDarkMode
                                ? "#60a5fa"
                                : "#3b82f6"
                              : isDarkMode
                                ? "#6b7280"
                                : "#9ca3af",
                          fontWeight:
                            client.availablePeripherals > 0 ? 700 : 400,
                          fontSize: "16px",
                          cursor:
                            client.availablePeripherals > 0
                              ? "pointer"
                              : "default",
                        }}
                        onClick={() =>
                          client.availablePeripherals > 0 &&
                          handleClientAssetsClick(
                            "availableDevices",
                            client.clientName
                          )
                        }
                        onMouseEnter={(e) => {
                          if (client.availablePeripherals > 0) {
                            e.target.style.color = isDarkMode
                              ? "#93c5fd"
                              : "#1d4ed8";
                            e.target.style.textDecoration = "underline";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (client.availablePeripherals > 0) {
                            e.target.style.color = isDarkMode
                              ? "#60a5fa"
                              : "#3b82f6";
                            e.target.style.textDecoration = "none";
                          }
                        }}
                      >
                        {client.availablePeripherals}
                      </td>
                    </tr>
                  ))}
                  <tr
                    style={{
                      borderTop: isDarkMode
                        ? "2px solid #374151"
                        : "2px solid #e5e7eb",
                      backgroundColor: isDarkMode ? "#1f2937" : "#f9fafb",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        fontWeight: 700,
                        fontSize: "15px",
                      }}
                    >
                      Total
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        color: isDarkMode ? "#34d399" : "#10b981",
                        fontWeight: 700,
                        fontSize: "17px",
                      }}
                    >
                      {clientAssetsData.reduce(
                        (sum, client) => sum + client.totalPeripherals,
                        0
                      )}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        color: isDarkMode ? "#34d399" : "#10b981",
                        fontWeight: 700,
                        fontSize: "17px",
                      }}
                    >
                      {clientAssetsData.reduce(
                        (sum, client) => sum + client.setsOfAssets,
                        0
                      )}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        color: isDarkMode ? "#34d399" : "#10b981",
                        fontWeight: 700,
                        fontSize: "17px",
                      }}
                    >
                      {clientAssetsData.reduce(
                        (sum, client) => sum + client.availablePeripherals,
                        0
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Activity & Export Options */}
        <div
          style={{
            background: isDarkMode ? "#1f2937" : "#fff",
            borderRadius: 12,
            padding: 24,
            border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
            marginBottom: 32,
          }}
        >
          {/* Recent Activity Section */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                margin: "0 0 16px 0",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  fontSize: 18,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                📋 Recent Activity
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: isDarkMode ? "#22c55e" : "#16a34a",
                    backgroundColor: isDarkMode
                      ? "rgba(34, 197, 94, 0.1)"
                      : "rgba(34, 197, 94, 0.15)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "#22c55e",
                      display: "inline-block",
                      animation: "pulse 2s infinite",
                    }}
                  />
                  Live
                </span>
              </h3>
            </div>
            <div
              className="recent-activity-scroll"
              style={{
                maxHeight: 400,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {systemHistory.length === 0 ? (
                <div
                  style={{
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                    textAlign: "center",
                    padding: 20,
                    fontStyle: "italic",
                  }}
                >
                  No recent activity found
                </div>
              ) : (
                <>
                  {systemHistory.map((entry, index) => (
                    <div
                      key={index}
                      style={{
                        padding: "12px 0",
                        borderBottom:
                          index < systemHistory.length - 1
                            ? `1px solid ${isDarkMode ? "#374151" : "#f3f4f6"}`
                            : "none",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          color: isDarkMode ? "#f3f4f6" : "#374151",
                        }}
                      >
                        {entry.event}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: isDarkMode ? "#9ca3af" : "#6b7280",
                          fontWeight: 500,
                        }}
                      >
                        {entry.date}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Export Options Section */}
          <div
            style={{
              paddingTop: 24,
              borderTop: `1px solid ${isDarkMode ? "#374151" : "#e5e7eb"}`,
            }}
          >
            <h4
              style={{
                margin: "0 0 16px 0",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              📊 Export Options
            </h4>
            <button
              onClick={() => {
                // Export dashboard data
                if (typeof exportDashboardToExcel === "function") {
                  exportDashboardToExcel({
                    employees: employeeCount,
                    devices: deviceCount,
                    clients: clientCount,
                    deployed: deployedCount,
                    inventory: inventoryCount,
                    stock: stockCount,
                    retired: retiredCount,
                    deviceTypes,
                    deviceStatus: deviceStatusData,
                    utilizationRate,
                    allDevices,
                  });
                }
              }}
              style={{
                width: "100%",
                padding: "12px 16px",
                backgroundColor: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#1d4ed8")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#2563eb")}
            >
              Export Dashboard to Excel
            </button>
          </div>
        </div>

        {/* Footer with version info */}
        <div
          style={{
            textAlign: "center",
            padding: "12px 0",
            borderTop: `1px solid ${isDarkMode ? "#374151" : "#e5e7eb"}`,
            marginTop: 20,
            marginBottom: -20,
            color: isDarkMode ? "#d1d5db" : "#6b7280",
            fontSize: 14,
          }}
        >
          <p style={{ margin: 0 }}>
            AIMS Dashboard v2.0 | Last updated:{" "}
            {new Date().toLocaleDateString()} | Data refreshed:{" "}
            {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Scroll to Top Button */}
        <div
          style={{
            position: "fixed",
            bottom: "30px",
            right: "30px",
            zIndex: 99999,
            display: showScrollTop ? "block" : "none",
          }}
        >
          <button
            onClick={scrollToTop}
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: isDarkMode ? "#374151" : "#2563eb",
              color: "#fff",
              border: "2px solid #fff",
              fontSize: "24px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = isDarkMode
                ? "#4b5563"
                : "#1d4ed8";
              e.target.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = isDarkMode
                ? "#374151"
                : "#2563eb";
              e.target.style.transform = "scale(1)";
            }}
            title="Scroll to top"
            aria-label="Scroll to top"
          >
            ⬆
          </button>
        </div>

        {/* Client Assets Modal */}
        {clientAssetsModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setClientAssetsModalOpen(false)}
          >
            <div
              style={{
                backgroundColor: isDarkMode ? "#1f2937" : "#fff",
                borderRadius: 12,
                padding: 24,
                maxWidth: "80%",
                maxHeight: "80%",
                overflow: "auto",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    fontSize: 20,
                    fontWeight: 600,
                  }}
                >
                  {clientAssetsModalData.type === "totalDevices" &&
                    `${clientAssetsModalData.client} - Device Breakdown`}
                  {clientAssetsModalData.type === "availableDevices" &&
                    `${clientAssetsModalData.client} - Available Devices`}
                </h3>
                <button
                  onClick={() => setClientAssetsModalOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 24,
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>

              {clientAssetsModalData.items.length === 0 ? (
                <p
                  style={{
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                    textAlign: "center",
                    padding: 20,
                  }}
                >
                  No items found for this category.
                </p>
              ) : (
                <div>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: isDarkMode ? "#374151" : "#f8fafc",
                          }}
                        >
                          {clientAssetsModalData.type === "totalDevices" && (
                            <>
                              <th
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "left",
                                  fontWeight: 600,
                                  color: isDarkMode ? "#f3f4f6" : "#374151",
                                  borderBottom: isDarkMode
                                    ? "2px solid #4b5563"
                                    : "2px solid #e5e7eb",
                                  fontSize: "13px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                ASSETS
                              </th>
                              <th
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  fontWeight: 600,
                                  color: isDarkMode ? "#f3f4f6" : "#374151",
                                  borderBottom: isDarkMode
                                    ? "2px solid #4b5563"
                                    : "2px solid #e5e7eb",
                                  fontSize: "13px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                USABLE DEVICES
                              </th>
                              <th
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  fontWeight: 600,
                                  color: isDarkMode ? "#f3f4f6" : "#374151",
                                  borderBottom: isDarkMode
                                    ? "2px solid #4b5563"
                                    : "2px solid #e5e7eb",
                                  fontSize: "13px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                DEPLOYED ASSETS
                              </th>
                            </>
                          )}
                          {clientAssetsModalData.type ===
                            "availableDevices" && (
                              <>
                                <th
                                  style={{
                                    padding: "12px 16px",
                                    textAlign: "left",
                                    fontWeight: 600,
                                    color: isDarkMode ? "#f3f4f6" : "#374151",
                                    borderBottom: isDarkMode
                                      ? "2px solid #4b5563"
                                      : "2px solid #e5e7eb",
                                    fontSize: "13px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                  }}
                                >
                                  DEVICE TYPE
                                </th>
                                <th
                                  style={{
                                    padding: "12px 16px",
                                    textAlign: "center",
                                    fontWeight: 600,
                                    color: isDarkMode ? "#f3f4f6" : "#374151",
                                    borderBottom: isDarkMode
                                      ? "2px solid #4b5563"
                                      : "2px solid #e5e7eb",
                                    fontSize: "13px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                  }}
                                >
                                  AVAILABLE COUNT
                                </th>
                              </>
                            )}
                        </tr>
                      </thead>
                      <tbody>
                        {clientAssetsModalData.type === "totalDevices" &&
                          clientAssetsModalData.items.map((item, index) => (
                            <tr
                              key={item.deviceType}
                              style={{
                                borderBottom: isDarkMode
                                  ? "1px solid #374151"
                                  : "1px solid #f3f4f6",
                                backgroundColor:
                                  index % 2 === 0
                                    ? "transparent"
                                    : isDarkMode
                                      ? "#374151"
                                      : "#f8fafc",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  isDarkMode ? "#4b5563" : "#f1f5f9";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  index % 2 === 0
                                    ? "transparent"
                                    : isDarkMode
                                      ? "#374151"
                                      : "#f8fafc";
                              }}
                            >
                              <td
                                style={{
                                  padding: "12px 16px",
                                  color: isDarkMode ? "#f3f4f6" : "#374151",
                                  fontWeight: 500,
                                }}
                              >
                                {item.deviceType}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  color: isDarkMode ? "#60a5fa" : "#3b82f6",
                                  fontWeight: 700,
                                  fontSize: "16px",
                                }}
                              >
                                {item.usableDevices}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  color: isDarkMode ? "#34d399" : "#10b981",
                                  fontWeight: 700,
                                  fontSize: "16px",
                                }}
                              >
                                {item.deployedAssets}
                              </td>
                            </tr>
                          ))}

                        {clientAssetsModalData.type === "availableDevices" &&
                          clientAssetsModalData.items.map((item, index) => (
                            <tr
                              key={item.deviceType}
                              style={{
                                borderBottom: isDarkMode
                                  ? "1px solid #374151"
                                  : "1px solid #f3f4f6",
                                backgroundColor:
                                  index % 2 === 0
                                    ? "transparent"
                                    : isDarkMode
                                      ? "#374151"
                                      : "#f8fafc",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  isDarkMode ? "#4b5563" : "#f1f5f9";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  index % 2 === 0
                                    ? "transparent"
                                    : isDarkMode
                                      ? "#374151"
                                      : "#f8fafc";
                              }}
                            >
                              <td
                                style={{
                                  padding: "12px 16px",
                                  color: isDarkMode ? "#f3f4f6" : "#374151",
                                  fontWeight: 500,
                                }}
                              >
                                {item.deviceType}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  color: isDarkMode ? "#60a5fa" : "#3b82f6",
                                  fontWeight: 700,
                                  fontSize: "16px",
                                }}
                              >
                                {item.count}
                              </td>
                            </tr>
                          ))}

                        {/* Total Row */}
                        <tr
                          style={{
                            borderTop: isDarkMode
                              ? "2px solid #4b5563"
                              : "2px solid #e5e7eb",
                            backgroundColor: isDarkMode ? "#1f2937" : "#f9fafb",
                          }}
                        >
                          <td
                            style={{
                              padding: "12px 16px",
                              color: isDarkMode ? "#f3f4f6" : "#374151",
                              fontWeight: 700,
                              fontSize: "15px",
                            }}
                          >
                            Total
                          </td>
                          {clientAssetsModalData.type === "totalDevices" && (
                            <>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  color: isDarkMode ? "#34d399" : "#10b981",
                                  fontWeight: 700,
                                  fontSize: "17px",
                                }}
                              >
                                {clientAssetsModalData.items.reduce(
                                  (sum, item) => sum + item.usableDevices,
                                  0
                                )}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  color: isDarkMode ? "#34d399" : "#10b981",
                                  fontWeight: 700,
                                  fontSize: "17px",
                                }}
                              >
                                {clientAssetsModalData.items.reduce(
                                  (sum, item) => sum + item.deployedAssets,
                                  0
                                )}
                              </td>
                            </>
                          )}
                          {clientAssetsModalData.type ===
                            "availableDevices" && (
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  color: isDarkMode ? "#34d399" : "#10b981",
                                  fontWeight: 700,
                                  fontSize: "17px",
                                }}
                              >
                                {clientAssetsModalData.items.reduce(
                                  (sum, item) => sum + item.count,
                                  0
                                )}
                              </td>
                            )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Helper to format device history events
// Format user log entry for display in Recent Activity
function formatUserLogEvent(log) {
  // Prefer userName over userEmail, fallback to "User"
  const userName = log.userName || log.userEmail || "User";

  // Use the description if available (it already contains the action details)
  if (log.description) {
    // Check if description already starts with the username to avoid duplication
    if (log.description.includes(userName)) {
      return log.description;
    }
    return `${userName}: ${log.description}`;
  }

  // Fallback to formatting action type
  const action = formatActionType(log.actionType);
  return `${userName}: ${action}`;
}

function formatHistoryEvent(entry, employeeMap = {}) {
  const deviceInfo = entry.deviceTag
    ? `${entry.deviceTag}`
    : entry.deviceId
      ? `Device ${entry.deviceId}`
      : "Unknown device";

  const employeeName =
    entry.employeeId &&
      employeeMap[String(entry.employeeId).trim().toUpperCase()]
      ? employeeMap[String(entry.employeeId).trim().toUpperCase()]
      : entry.employeeId || "Unknown employee";

  switch (entry.action) {
    case "assigned":
      return `${deviceInfo} assigned to ${employeeName}`;
    case "unassigned":
      return `${deviceInfo} unassigned from ${employeeName}`;
    case "updated":
      return `${deviceInfo} updated`;
    case "created":
      return `${deviceInfo} added to inventory`;
    default:
      return `${deviceInfo} ${entry.action || "updated"}`;
  }
}

// Helper to format date as MM-DD HH:mm
function formatShortDate(dateString) {
  try {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    return "Invalid date";
  }
}

export default Dashboard;
