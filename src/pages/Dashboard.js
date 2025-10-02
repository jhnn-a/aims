import { useEffect, useState } from "react";
import { getAllEmployees } from "../services/employeeService";
import { getAllDevices } from "../services/deviceService";
import { getAllClients } from "../services/clientService";
import { exportDashboardToExcel } from "../utils/exportDashboardToExcel";
import { getDeviceHistory } from "../services/deviceHistoryService";
import LoadingSpinner from "../components/LoadingSpinner";
import { useCurrentUser } from "../CurrentUserContext";
import { useTheme } from "../context/ThemeContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../utils/firebase";
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
  Legend,
  LabelList,
} from "recharts";

// Enhanced Chart Components
const COLORS = [
  "#2563eb",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
];

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

// Helper function to get display name for device type (preserves original casing for display)
const getDeviceTypeDisplayName = (normalizedType, originalDevices) => {
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
          gap: 16,
          marginTop: 16,
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
                  fontSize: 14,
                  color:
                    entry.name === "DEFECTIVE"
                      ? "#ef4444"
                      : isDarkMode
                      ? "#f3f4f6"
                      : "#374151",
                  fontWeight: entry.name === "DEFECTIVE" ? 600 : 500,
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
        background: isDarkMode ? "#1f2937" : "#fff",
        borderRadius: 12,
        padding: 24,
        border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
      }}
    >
      <h3
        style={{
          margin: "0 0 16px 0",
          color: isDarkMode ? "#f3f4f6" : "#374151",
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height - 60}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value} devices`, name]}
            contentStyle={{
              backgroundColor: isDarkMode ? "#374151" : "#fff",
              border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
              borderRadius: "8px",
              color: isDarkMode ? "#f3f4f6" : "#374151",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {renderCustomLegend()}
    </div>
  );
}

// Custom Bar Chart Component with internal labels
function CustomBarChart({
  data,
  title,
  xKey,
  yKey,
  height = 300,
  isDarkMode = false,
}) {
  // Custom label function for bars
  const renderCustomLabel = (props) => {
    const { x, y, width, height, value } = props;
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12"
        fontWeight="600"
      >
        {value}
      </text>
    );
  };

  return (
    <div
      style={{
        background: isDarkMode ? "#1f2937" : "#fff",
        borderRadius: 12,
        padding: 24,
        border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
      }}
    >
      <h3
        style={{
          margin: "0 0 16px 0",
          color: isDarkMode ? "#f3f4f6" : "#374151",
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDarkMode ? "#4b5563" : "#e5e7eb"}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280", fontSize: 12 }}
            axisLine={{ stroke: isDarkMode ? "#4b5563" : "#e5e7eb" }}
          />
          <YAxis
            tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280", fontSize: 12 }}
            axisLine={{ stroke: isDarkMode ? "#4b5563" : "#e5e7eb" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDarkMode ? "#374151" : "#fff",
              border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
              borderRadius: "8px",
              color: isDarkMode ? "#f3f4f6" : "#374151",
            }}
          />
          <Bar dataKey={yKey} fill="#2563eb" label={renderCustomLabel} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Time Range Filter Component
function TimeRangeFilter({ value, onChange, isDarkMode }) {
  const options = [
    { value: "7days", label: "Last 7 days" },
    { value: "30days", label: "Last 30 days" },
    { value: "90days", label: "Last 90 days" },
    { value: "custom", label: "Custom range" },
  ];

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: isDarkMode ? "#9ca3af" : "#6b7280",
        }}
      >
        Time Range:
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
          fontSize: 14,
          background: isDarkMode ? "#374151" : "#fff",
          color: isDarkMode ? "#f3f4f6" : "#374151",
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
  const [clientAllocation, setClientAllocation] = useState([]);
  const [utilizationRate, setUtilizationRate] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [workingDevices, setWorkingDevices] = useState([]);
  const [stockroomData, setStockroomData] = useState([]);
  const [specsReportData, setSpecsReportData] = useState([]);
  const [cpuSpecifications, setCpuSpecifications] = useState([]);
  const [employeeMap, setEmployeeMap] = useState({});
  const [timeRange, setTimeRange] = useState("30days");
  const [loading, setLoading] = useState(true);
  const [systemHistory, setSystemHistory] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Extract fetchData as a standalone function for reuse
  const fetchData = async () => {
    console.log("🔄 fetchData function called!");
    const isRefresh = !loading; // If not loading, it's a refresh
    if (isRefresh) {
      console.log("📊 Setting refreshing to true");
      setRefreshing(true);
    }

    try {
      console.log("📡 Fetching data from services...");
      const [employees, devices, clients] = await Promise.all([
        getAllEmployees(),
        getAllDevices(),
        getAllClients(),
      ]);

      // Also fetch UnitSpecs data for specifications report
      const [inventoryUnitsSnapshot, deployedUnitsSnapshot] = await Promise.all(
        [
          getDocs(collection(db, "InventoryUnits")),
          getDocs(collection(db, "DeployedUnits")),
        ]
      );

      const inventoryUnits = inventoryUnitsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const deployedUnits = deployedUnitsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const allUnitsSpecs = [...inventoryUnits, ...deployedUnits];

      // Fetch total admins from users collection
      const usersSnapshot = await getDocs(collection(db, "users"));
      const totalAdminsCount = usersSnapshot.size;
      setTotalAdmins(totalAdminsCount);

      // Filter to only count active employees (not resigned and not entities)
      const activeEmployees = employees.filter(
        (emp) => !emp.isResigned && !emp.isEntity
      );

      console.log(
        `📊 Data fetched - Total Employees: ${employees.length}, Active Employees: ${activeEmployees.length}, Devices: ${devices.length}, Clients: ${clients.length}, Total UnitSpecs: ${allUnitsSpecs.length}`
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

      // Get working devices (GOOD or BRANDNEW condition)
      const workingDevicesList = devices.filter(
        (d) => d.condition === "GOOD" || d.condition === "BRANDNEW"
      );
      setWorkingDevices(workingDevicesList);

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

      // Calculate CPU Specifications - count CPU generations from UnitSpecs collections
      const cpuGenMap = { i3: 0, i5: 0, i7: 0, Other: 0 };

      console.log("� Processing UnitSpecs data for CPU specifications...");
      console.log(`📊 Total UnitSpecs records: ${allUnitsSpecs.length}`);

      // Log a sample of the data to see what we're working with
      if (allUnitsSpecs.length > 0) {
        console.log(
          "� Sample UnitSpecs data:",
          JSON.stringify(allUnitsSpecs[0], null, 2)
        );
      }

      let processedCount = 0;

      // Process ALL UnitSpecs devices to count CPU generations
      allUnitsSpecs.forEach((unit, index) => {
        processedCount++;

        const cpuGen =
          unit.cpuGen?.toLowerCase() || unit.CPU?.toLowerCase() || "";

        if (cpuGen.includes("i3")) {
          cpuGenMap["i3"]++;
        } else if (cpuGen.includes("i5")) {
          cpuGenMap["i5"]++;
        } else if (cpuGen.includes("i7") || cpuGen.includes("i9")) {
          cpuGenMap["i7"]++;
        } else if (cpuGen.trim() !== "") {
          cpuGenMap["Other"]++;
        }

        console.log(
          `Unit ${processedCount} (${
            unit.Tag || "No Tag"
          }): CPU Gen: "${cpuGen}" -> Category: ${
            cpuGen.includes("i3")
              ? "i3"
              : cpuGen.includes("i5")
              ? "i5"
              : cpuGen.includes("i7") || cpuGen.includes("i9")
              ? "i7"
              : cpuGen.trim() !== ""
              ? "Other"
              : "No CPU data"
          }`
        );
      });

      console.log(`\n💻 CPU GENERATION SUMMARY:`);
      console.log(
        `📊 ACTUAL: ${cpuGenMap.i3} i3 + ${cpuGenMap.i5} i5 + ${
          cpuGenMap.i7
        } i7 + ${cpuGenMap.Other} Other = ${
          cpuGenMap.i3 + cpuGenMap.i5 + cpuGenMap.i7 + cpuGenMap.Other
        } total`
      );

      console.log(`\n📊 FINAL SUMMARY:`);
      console.log(`Total devices processed: ${processedCount}`);
      console.log(`CPU generation distribution:`, cpuGenMap);

      console.log("� Final CPU generation counts:", cpuGenMap);

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

      // Still set specsReportData for compatibility, but now it contains CPU data
      setSpecsReportData(cpuSpecsData);

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

      // Client allocation calculation
      const clientMap = {};
      clients.forEach((client) => {
        clientMap[client.id || client.name] = client.name || client.id;
      });

      const clientAllocationMap = {};
      devices.forEach((device) => {
        if (device.assignedTo && device.status === "In Use") {
          const employee = employees.find(
            (emp) => emp.id === device.assignedTo
          );
          if (employee && employee.clientAssigned) {
            const clientName =
              clientMap[employee.clientAssigned] ||
              employee.clientAssigned ||
              "Unassigned";
            clientAllocationMap[clientName] =
              (clientAllocationMap[clientName] || 0) + 1;
          } else {
            clientAllocationMap["Internal"] =
              (clientAllocationMap["Internal"] || 0) + 1;
          }
        }
      });

      const clientAllocationData = Object.entries(clientAllocationMap)
        .map(([client, count]) => ({ client, count }))
        .sort((a, b) => b.count - a.count);
      setClientAllocation(clientAllocationData);

      // Utilization rate calculation
      const totalDevices = devices.length;
      const devicesInUse = devices.filter((d) => d.status === "In Use").length;
      const utilization =
        totalDevices > 0 ? Math.round((devicesInUse / totalDevices) * 100) : 0;
      setUtilizationRate(utilization);

      // Fetch system history
      try {
        const history = await getDeviceHistory();
        console.log("=== Device History Debug ===");
        console.log("Raw history data:", history);
        console.log("History count:", history.length);

        // Check for recent history (last 24 hours)
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recentHistory = history.filter((entry) => {
          const entryDate = new Date(entry.date);
          return entryDate > oneDayAgo;
        });
        console.log("Recent history (last 24h):", recentHistory);

        const sorted = history.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        console.log("Sorted history (first 5):", sorted.slice(0, 5));

        const last10 = sorted.slice(0, 10);
        const formatted = last10.map((entry) => ({
          event: formatHistoryEvent(entry, empMap),
          date: formatShortDate(entry.date),
          rawEntry: entry, // Keep raw entry for debugging
        }));
        console.log("Formatted history:", formatted);

        // If no history data, provide fallback
        if (formatted.length === 0) {
          console.log("No history found, showing fallback");
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
          console.log(
            "Setting system history with",
            formatted.length,
            "entries"
          );
          setSystemHistory(formatted);
        }
      } catch (historyError) {
        console.error("Error fetching device history:", historyError);
        // Provide fallback sample data if no history exists
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

      setLoading(false);
      if (isRefresh) {
        console.log("✅ Data fetch complete, setting refreshing to false");
        setRefreshing(false);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
      if (isRefresh) {
        console.log("❌ Data fetch error, setting refreshing to false");
        setRefreshing(false);
      }
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

      // Also add a polling check as backup
      const pollInterval = setInterval(() => {
        handleScroll();
      }, 100);

      // Initial check
      setTimeout(() => {
        handleScroll();
      }, 50);

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

  useEffect(() => {
    fetchData();

    // Set up automatic refresh every 30 seconds for recent activity
    const refreshInterval = setInterval(() => {
      if (!refreshing) {
        fetchData();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [refreshing]);

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
    <div
      id="dashboard-container"
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
      {/* Header with time range filter and theme toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "#2563eb",
              margin: "0 0 8px 0",
            }}
          >
            Hello {username}, Welcome Back!
          </h1>
          <p
            style={{
              fontSize: 17,
              color: isDarkMode ? "#9ca3af" : "#6b7280",
              margin: 0,
            }}
          >
            Comprehensive asset and inventory management dashboard
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <TimeRangeFilter
            value={timeRange}
            onChange={setTimeRange}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      {/* Core Metrics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 24,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            background: isDarkMode ? "#1f2937" : "#fff",
            borderRadius: 12,
            padding: 24,
            border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: isDarkMode ? "#9ca3af" : "#6b7280",
              marginBottom: 8,
            }}
          >
            Active Employees
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#2563eb" }}>
            {employeeCount}
          </div>
        </div>

        <div
          style={{
            background: isDarkMode ? "#1f2937" : "#fff",
            borderRadius: 12,
            padding: 24,
            border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: isDarkMode ? "#9ca3af" : "#6b7280",
              marginBottom: 8,
            }}
          >
            Total Devices
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#2563eb" }}>
            {deviceCount}
          </div>
        </div>

        <div
          style={{
            background: isDarkMode ? "#1f2937" : "#fff",
            borderRadius: 12,
            padding: 24,
            border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: isDarkMode ? "#9ca3af" : "#6b7280",
              marginBottom: 8,
            }}
          >
            Total Clients
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#2563eb" }}>
            {clientCount}
          </div>
        </div>

        <div
          style={{
            background: isDarkMode ? "#1f2937" : "#fff",
            borderRadius: 12,
            padding: 24,
            border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: isDarkMode ? "#9ca3af" : "#6b7280",
              marginBottom: 8,
            }}
          >
            Total Admins
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#22c55e" }}>
            {totalAdmins}
          </div>
        </div>

        <div
          style={{
            background: isDarkMode ? "#1f2937" : "#fff",
            borderRadius: 12,
            padding: 24,
            border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: isDarkMode ? "#9ca3af" : "#6b7280",
              marginBottom: 8,
            }}
          >
            Assets Deployed
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#f59e0b" }}>
            {deployedCount}
          </div>
        </div>

        <div
          style={{
            background: isDarkMode ? "#1f2937" : "#fff",
            borderRadius: 12,
            padding: 24,
            border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: isDarkMode ? "#9ca3af" : "#6b7280",
              marginBottom: 8,
            }}
          >
            Inventory Total
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#8b5cf6" }}>
            {inventoryCount}
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 24,
          marginBottom: 32,
        }}
      >
        {/* Device Status Summary */}
        <CustomPieChart
          data={deviceStatusData}
          title="🎯 Device Status Summary"
          height={350}
          isDarkMode={isDarkMode}
        />

        {/* Device Type Distribution - Deployed Assets */}
        <CustomBarChart
          data={deviceTypeData}
          title="📦 Deployed Assets by Device Type"
          xKey="type"
          yKey="count"
          height={350}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Secondary Charts Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: 24,
          marginBottom: 32,
        }}
      >
        {/* Device Allocation by Client */}
        {clientAllocation.length > 0 && (
          <CustomBarChart
            data={clientAllocation}
            title="🏢 Device Allocation by Client"
            xKey="client"
            yKey="count"
            height={350}
            isDarkMode={isDarkMode}
          />
        )}
      </div>

      {/* Additional Metrics & Controls */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 24,
          marginBottom: 32,
        }}
      >
        {/* Recent Activity */}
        <div
          style={{
            background: isDarkMode ? "#1f2937" : "#fff",
            borderRadius: 12,
            padding: 24,
            border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
          }}
        >
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
              }}
            >
              📋 Recent Activity
            </h3>
            <button
              onClick={() => {
                console.log("🔄 Refresh button clicked!");
                fetchData();
              }}
              disabled={refreshing}
              style={{
                padding: "6px 12px",
                backgroundColor: "#2563eb",
                background: "#2563eb",
                color: "#ffffff",
                border: "1px solid #2563eb",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: refreshing ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                transition: "all 0.2s ease",
                outline: "none",
                opacity: refreshing ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!refreshing) {
                  console.log("🖱️ Mouse enter refresh button");
                  e.target.style.backgroundColor = "#1d4ed8";
                  e.target.style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                if (!refreshing) {
                  console.log("🖱️ Mouse leave refresh button");
                  e.target.style.backgroundColor = "#2563eb";
                  e.target.style.color = "#ffffff";
                }
              }}
              title={refreshing ? "Refreshing..." : "Refresh activity"}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  marginRight: "6px",
                  transform: refreshing ? "rotate(360deg)" : "rotate(0deg)",
                  transition: "transform 1s linear",
                  display: "inline-block",
                  verticalAlign: "middle",
                }}
              >
                <path
                  d="M1 4v6h6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M23 20v-6h-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.51 15a9 9 0 0 0 14.85 3.36L23 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
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
              <div>
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
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats & Actions */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Stock Availability */}
          <div
            style={{
              background: isDarkMode ? "#1f2937" : "#fff",
              borderRadius: 12,
              padding: 20,
              border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
            }}
          >
            <h4
              style={{
                margin: "0 0 12px 0",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              📦 Stock Availability
            </h4>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                }}
              >
                Available Units
              </span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#22c55e" }}>
                {stockCount}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                }}
              >
                Brand New
              </span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#2563eb" }}>
                {brandNewCount}
              </span>
            </div>
          </div>

          {/* Asset Condition Summary */}
          <div
            style={{
              background: isDarkMode ? "#1f2937" : "#fff",
              borderRadius: 12,
              padding: 20,
              border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
            }}
          >
            <h4
              style={{
                margin: "0 0 12px 0",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              🔧 Asset Condition
            </h4>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                }}
              >
                Needs Repair
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>
                {needsRepairCount}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                }}
              >
                Defective
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#ef4444" }}>
                {defectiveCount}
              </span>
            </div>
          </div>

          {/* Deployment Summary */}
          <div
            style={{
              background: isDarkMode ? "#1f2937" : "#fff",
              borderRadius: 12,
              padding: 20,
              border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
            }}
          >
            <h4
              style={{
                margin: "0 0 12px 0",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              🚀 Deployment Summary
            </h4>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                }}
              >
                Assets Deployed
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>
                {deployedCount}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                }}
              >
                Inventory Total
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#8b5cf6" }}>
                {inventoryCount}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                }}
              >
                Deployment Rate
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#10b981" }}>
                {inventoryCount > 0
                  ? Math.round((deployedCount / inventoryCount) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>

          {/* Export Options */}
          <div
            style={{
              background: isDarkMode ? "#1f2937" : "#fff",
              borderRadius: 12,
              padding: 20,
              border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
            }}
          >
            <h4
              style={{
                margin: "0 0 12px 0",
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
                    timeRange,
                  });
                }
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
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
      </div>

      {/* Actual Count Monitoring Assets Table */}
      <div
        style={{
          background: isDarkMode ? "#1f2937" : "#fff",
          borderRadius: 12,
          padding: 24,
          border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
          marginBottom: 32,
        }}
      >
        <h3
          style={{
            margin: "0 0 16px 0",
            color: isDarkMode ? "#f3f4f6" : "#374151",
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          📊 Actual Count Monitoring Assets
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <thead>
              <tr
                style={{ backgroundColor: isDarkMode ? "#374151" : "#f8fafc" }}
              >
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    borderBottom: `2px solid ${
                      isDarkMode ? "#4b5563" : "#e5e7eb"
                    }`,
                    minWidth: "120px",
                  }}
                >
                  ASSETS
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    borderBottom: `2px solid ${
                      isDarkMode ? "#4b5563" : "#e5e7eb"
                    }`,
                    minWidth: "80px",
                  }}
                >
                  TOTAL
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    borderBottom: `2px solid ${
                      isDarkMode ? "#4b5563" : "#e5e7eb"
                    }`,
                    minWidth: "90px",
                  }}
                >
                  DEPLOYED
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    borderBottom: `2px solid ${
                      isDarkMode ? "#4b5563" : "#e5e7eb"
                    }`,
                    minWidth: "110px",
                  }}
                >
                  TOTAL STOCKROOM
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    borderBottom: `2px solid ${
                      isDarkMode ? "#4b5563" : "#e5e7eb"
                    }`,
                    minWidth: "90px",
                  }}
                >
                  DEFECTIVE
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    borderBottom: `2px solid ${
                      isDarkMode ? "#4b5563" : "#e5e7eb"
                    }`,
                    minWidth: "90px",
                  }}
                >
                  BRANDNEW
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    borderBottom: `2px solid ${
                      isDarkMode ? "#4b5563" : "#e5e7eb"
                    }`,
                    minWidth: "80px",
                  }}
                >
                  GOODS
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    borderBottom: `2px solid ${
                      isDarkMode ? "#4b5563" : "#e5e7eb"
                    }`,
                    minWidth: "80px",
                  }}
                >
                  USABLE
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    borderBottom: `2px solid ${
                      isDarkMode ? "#4b5563" : "#e5e7eb"
                    }`,
                    minWidth: "130px",
                  }}
                >
                  REORDER STATUS
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Process device data by type (case-insensitive)
                const deviceTypeStats = {};
                const typeDisplayNames = {}; // Store original display names

                allDevices.forEach((device) => {
                  const normalizedType = normalizeDeviceType(device.deviceType);

                  if (!deviceTypeStats[normalizedType]) {
                    deviceTypeStats[normalizedType] = {
                      total: 0,
                      deployed: 0,
                      stockroom: 0,
                      defective: 0,
                      brandnew: 0,
                      good: 0,
                    };
                  }

                  // Store the original device type for display purposes (first occurrence wins)
                  if (!typeDisplayNames[normalizedType]) {
                    typeDisplayNames[normalizedType] = getDeviceTypeDisplayName(
                      normalizedType,
                      allDevices
                    );
                  }

                  const stats = deviceTypeStats[normalizedType];
                  stats.total++;

                  // Count deployed (assigned/in use)
                  if (
                    device.status === "In Use" ||
                    device.status === "Deployed" ||
                    (device.assignedTo && device.assignedTo.trim() !== "")
                  ) {
                    stats.deployed++;
                  }

                  // Count stockroom (available inventory)
                  if (
                    device.status === "Stock Room" ||
                    device.status === "Available"
                  ) {
                    stats.stockroom++;
                  }

                  // Count by condition
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

                return Object.entries(deviceTypeStats)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([normalizedType, stats], index) => {
                    const deviceType = typeDisplayNames[normalizedType];
                    const usable = stats.brandnew + stats.good;
                    const reorderThreshold = 5; // Consider restocking if usable < 5
                    const reorderStatus =
                      usable >= reorderThreshold
                        ? "Sufficient"
                        : "Needs Restocking";

                    return (
                      <tr
                        key={normalizedType}
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
                            padding: "12px 8px",
                            color: isDarkMode ? "#f3f4f6" : "#374151",
                            fontWeight: 500,
                          }}
                        >
                          {deviceType}
                        </td>
                        <td
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            color: "#2563eb",
                            fontWeight: 600,
                          }}
                        >
                          {stats.total}
                        </td>
                        <td
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            color: "#f59e0b",
                            fontWeight: 600,
                          }}
                        >
                          {stats.deployed}
                        </td>
                        <td
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            color: "#8b5cf6",
                            fontWeight: 600,
                          }}
                        >
                          {stats.stockroom}
                        </td>
                        <td
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            color: "#ef4444",
                            fontWeight: 600,
                          }}
                        >
                          {stats.defective}
                        </td>
                        <td
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            color: "#06b6d4",
                            fontWeight: 600,
                          }}
                        >
                          {stats.brandnew}
                        </td>
                        <td
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            color: "#22c55e",
                            fontWeight: 600,
                          }}
                        >
                          {stats.good}
                        </td>
                        <td
                          style={{
                            padding: "12px 8px",
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
                        <td
                          style={{ padding: "12px 8px", textAlign: "center" }}
                        >
                          <span
                            style={{
                              color:
                                reorderStatus === "Sufficient"
                                  ? "#22c55e"
                                  : "#ef4444",
                              fontWeight: 600,
                              fontSize: 12,
                              padding: "4px 8px",
                              backgroundColor:
                                reorderStatus === "Sufficient"
                                  ? isDarkMode
                                    ? "#064e3b"
                                    : "#f0fdf4"
                                  : isDarkMode
                                  ? "#7f1d1d"
                                  : "#fef2f2",
                              borderRadius: 4,
                              border:
                                reorderStatus === "Sufficient"
                                  ? `1px solid ${
                                      isDarkMode ? "#059669" : "#bbf7d0"
                                    }`
                                  : `1px solid ${
                                      isDarkMode ? "#dc2626" : "#fecaca"
                                    }`,
                            }}
                          >
                            {reorderStatus === "Sufficient"
                              ? "✅ Sufficient"
                              : "⚠️ Needs Restocking"}
                          </span>
                        </td>
                      </tr>
                    );
                  });
              })()}
            </tbody>
          </table>

          {/* Summary Row */}
          <div
            style={{
              marginTop: 16,
              padding: 16,
              backgroundColor: isDarkMode ? "#374151" : "#f8fafc",
              borderRadius: 8,
              border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
            }}
          >
            <h4
              style={{
                margin: "0 0 12px 0",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              📈 Summary Statistics
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 12,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#2563eb" }}
                >
                  {allDevices.length}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                    fontWeight: 500,
                  }}
                >
                  Total Assets
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}
                >
                  {
                    allDevices.filter(
                      (d) =>
                        d.status === "In Use" ||
                        d.status === "Deployed" ||
                        (d.assignedTo && d.assignedTo.trim() !== "")
                    ).length
                  }
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                    fontWeight: 500,
                  }}
                >
                  Total Deployed
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#22c55e" }}
                >
                  {
                    allDevices.filter(
                      (d) =>
                        d.condition?.toUpperCase() === "BRANDNEW" ||
                        d.condition?.toUpperCase() === "BRAND NEW" ||
                        d.condition?.toUpperCase() === "GOOD"
                    ).length
                  }
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                    fontWeight: 500,
                  }}
                >
                  Total Usable
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}
                >
                  {
                    allDevices.filter(
                      (d) => d.condition?.toUpperCase() === "DEFECTIVE"
                    ).length
                  }
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                    fontWeight: 500,
                  }}
                >
                  Total Defective
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#8b5cf6" }}
                >
                  {(() => {
                    const deviceTypeStats = {};
                    allDevices.forEach((device) => {
                      const deviceType = device.deviceType || "Unknown";
                      if (!deviceTypeStats[deviceType]) {
                        deviceTypeStats[deviceType] = { brandnew: 0, good: 0 };
                      }
                      const condition = device.condition?.toUpperCase() || "";
                      if (
                        condition === "BRANDNEW" ||
                        condition === "BRAND NEW"
                      ) {
                        deviceTypeStats[deviceType].brandnew++;
                      } else if (condition === "GOOD") {
                        deviceTypeStats[deviceType].good++;
                      }
                    });

                    return Object.values(deviceTypeStats).filter(
                      (stats) => stats.brandnew + stats.good < 5
                    ).length;
                  })()}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                    fontWeight: 500,
                  }}
                >
                  Types Need Restocking
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stockroom Table */}
      <div
        style={{
          background: isDarkMode ? "#1f2937" : "#fff",
          borderRadius: 12,
          padding: 24,
          border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
          marginBottom: 32,
        }}
      >
        <h3
          style={{
            margin: "0 0 16px 0",
            color: isDarkMode ? "#f3f4f6" : "#374151",
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          � Stockroom
        </h3>
        <div style={{ overflowX: "auto" }}>
          {stockroomData.length === 0 ? (
            <div
              style={{
                color: isDarkMode ? "#9ca3af" : "#6b7280",
                textAlign: "center",
                padding: 20,
                fontStyle: "italic",
              }}
            >
              No devices available for deployment in stockroom
            </div>
          ) : (
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
                    borderBottom: `2px solid ${
                      isDarkMode ? "#374151" : "#e0e7ef"
                    }`,
                  }}
                >
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 8px",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                    }}
                  >
                    Device Type
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "12px 8px",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                    }}
                  >
                    Brand New
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "12px 8px",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                    }}
                  >
                    Good Condition
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "12px 8px",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                    }}
                  >
                    Total Usable
                  </th>
                </tr>
              </thead>
              <tbody>
                {stockroomData.map((item, index) => (
                  <tr
                    key={item.deviceType}
                    style={{
                      borderBottom: `1px solid ${
                        isDarkMode ? "#374151" : "#e0e7ef"
                      }`,
                      backgroundColor:
                        index % 2 === 0
                          ? isDarkMode
                            ? "#1f2937"
                            : "#f8fafc"
                          : isDarkMode
                          ? "#111827"
                          : "#ffffff",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 8px",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        fontWeight: 500,
                      }}
                    >
                      {item.deviceType}
                    </td>
                    <td
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        color: isDarkMode ? "#34d399" : "#059669",
                        fontWeight: 600,
                      }}
                    >
                      {item.brandNew}
                    </td>
                    <td
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        color: isDarkMode ? "#60a5fa" : "#2563eb",
                        fontWeight: 600,
                      }}
                    >
                      {item.good}
                    </td>
                    <td
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        fontWeight: 700,
                        fontSize: "16px",
                      }}
                    >
                      {item.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Assets - Bar Chart for Available Devices by Type */}
      {stockroomData.length > 0 && (
        <div
          style={{
            backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
            marginBottom: 32,
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              color: isDarkMode ? "#f3f4f6" : "#374151",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            📊 Assets - Number of Usable Devices
          </h3>
          <div style={{ height: 450, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stockroomData.map((item, index) => ({
                  type: item.deviceType,
                  count: item.total,
                  color: COLORS[index % COLORS.length],
                }))}
                margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDarkMode ? "#374151" : "#e5e7eb"}
                />
                <XAxis
                  dataKey="type"
                  tick={{
                    fill: isDarkMode ? "#f3f4f6" : "#374151",
                    fontSize: 12,
                  }}
                  axisLine={{ stroke: isDarkMode ? "#374151" : "#d1d5db" }}
                />
                <YAxis
                  tick={{
                    fill: isDarkMode ? "#f3f4f6" : "#374151",
                    fontSize: 12,
                  }}
                  axisLine={{ stroke: isDarkMode ? "#374151" : "#d1d5db" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? "#374151" : "#ffffff",
                    border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                    borderRadius: 8,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                  }}
                  labelStyle={{ color: isDarkMode ? "#f3f4f6" : "#374151" }}
                />
                <Bar dataKey="count" name="Total Count" radius={[4, 4, 0, 0]}>
                  {stockroomData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{
                      fill: isDarkMode ? "#f3f4f6" : "#374151",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Specifications Report - Device Maintenance Status */}
      {specsReportData.length > 0 && (
        <div
          style={{
            backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            border: `1px solid ${isDarkMode ? "#374151" : "#e0e7ef"}`,
            marginBottom: 32,
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              color: isDarkMode ? "#f3f4f6" : "#374151",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            � PC CPU Specification Chart
          </h3>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 24,
              alignItems: "flex-start",
            }}
          >
            {/* Pie Chart */}
            <div style={{ flex: "1 1 400px", minWidth: 400 }}>
              <div style={{ height: 350, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={specsReportData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="none"
                    >
                      {specsReportData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} devices`, name]}
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#374151" : "#fff",
                        border: `1px solid ${
                          isDarkMode ? "#4b5563" : "#e5e7eb"
                        }`,
                        borderRadius: "8px",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Legend and Summary */}
            <div style={{ flex: "1 1 300px", minWidth: 300 }}>
              <div style={{ marginBottom: 24 }}>
                <h4
                  style={{
                    margin: "0 0 16px 0",
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  Device Health Distribution
                </h4>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {specsReportData.map((entry) => {
                    const total = specsReportData.reduce(
                      (sum, item) => sum + item.value,
                      0
                    );
                    const percentage =
                      total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;

                    return (
                      <div
                        key={entry.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          backgroundColor: isDarkMode ? "#374151" : "#f8fafc",
                          borderRadius: 8,
                          border: `1px solid ${
                            isDarkMode ? "#4b5563" : "#e2e8f0"
                          }`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              backgroundColor: entry.color,
                            }}
                          />
                          <span
                            style={{
                              color: isDarkMode ? "#f3f4f6" : "#374151",
                              fontWeight: 500,
                              fontSize: 14,
                            }}
                          >
                            {entry.name}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              color: isDarkMode ? "#d1d5db" : "#6b7280",
                              fontSize: 14,
                            }}
                          >
                            {entry.value} devices
                          </span>
                          <span
                            style={{
                              color: entry.color,
                              fontWeight: 600,
                              fontSize: 14,
                            }}
                          >
                            ({percentage}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Health Status Indicators */}
              <div
                style={{
                  padding: "16px",
                  backgroundColor: isDarkMode ? "#111827" : "#f1f5f9",
                  borderRadius: 8,
                  border: `1px solid ${isDarkMode ? "#374151" : "#e2e8f0"}`,
                }}
              >
                <h5
                  style={{
                    margin: "0 0 12px 0",
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  CPU Generation Breakdown:
                </h5>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "#dc2626",
                      }}
                    />
                    <span
                      style={{
                        color: isDarkMode ? "#d1d5db" : "#6b7280",
                        fontSize: 12,
                      }}
                    >
                      i3 Processors: Basic performance CPUs
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "#ea580c",
                      }}
                    />
                    <span
                      style={{
                        color: isDarkMode ? "#d1d5db" : "#6b7280",
                        fontSize: 12,
                      }}
                    >
                      i5 Processors: Mid-range performance CPUs
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "#16a34a",
                      }}
                    />
                    <span
                      style={{
                        color: isDarkMode ? "#d1d5db" : "#6b7280",
                        fontSize: 12,
                      }}
                    >
                      i7 Processors: High-performance CPUs (includes i9)
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "#6b7280",
                      }}
                    />
                    <span
                      style={{
                        color: isDarkMode ? "#d1d5db" : "#6b7280",
                        fontSize: 12,
                      }}
                    >
                      Other: Non-Intel or unspecified processors
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
          AIMS Dashboard v2.0 | Last updated: {new Date().toLocaleDateString()}{" "}
          | Data refreshed: {new Date().toLocaleTimeString()}
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
            e.target.style.backgroundColor = isDarkMode ? "#4b5563" : "#1d4ed8";
            e.target.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = isDarkMode ? "#374151" : "#2563eb";
            e.target.style.transform = "scale(1)";
          }}
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          ⬆
        </button>
      </div>
    </div>
  );
}

// Helper to format device history events
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
