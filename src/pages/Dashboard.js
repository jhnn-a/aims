import { useEffect, useState } from "react";
import { getAllEmployees } from "../services/employeeService";
import { getAllDevices } from "../services/deviceService";
import { getAllClients } from "../services/clientService";
import { exportDashboardToExcel } from "../utils/exportDashboardToExcel";
import { getDeviceHistory } from "../services/deviceHistoryService";
import LoadingSpinner from "../components/LoadingSpinner";
import { useCurrentUser } from "../CurrentUserContext";
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

// Custom Pie Chart Component
function CustomPieChart({ data, title, height = 300 }) {
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 24,
        border: "1px solid #e0e7ef",
      }}
    >
      <h3
        style={{
          margin: "0 0 16px 0",
          color: "#374151",
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Custom Bar Chart Component with internal labels
function CustomBarChart({ data, title, xKey, yKey, height = 300 }) {
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
        background: "#fff",
        borderRadius: 12,
        padding: 24,
        border: "1px solid #e0e7ef",
      }}
    >
      <h3
        style={{
          margin: "0 0 16px 0",
          color: "#374151",
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={yKey} fill="#2563eb" label={renderCustomLabel} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Time Range Filter Component
function TimeRangeFilter({ value, onChange }) {
  const options = [
    { value: "7days", label: "Last 7 days" },
    { value: "30days", label: "Last 30 days" },
    { value: "90days", label: "Last 90 days" },
    { value: "custom", label: "Custom range" },
  ];

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: "#6b7280" }}>
        Time Range:
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid #d1d5db",
          fontSize: 14,
          background: "#fff",
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
  const [employeeMap, setEmployeeMap] = useState({});
  const [timeRange, setTimeRange] = useState("30days");
  const [loading, setLoading] = useState(true);
  const [systemHistory, setSystemHistory] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Extract fetchData as a standalone function for reuse
  const fetchData = async () => {
    console.log('🔄 fetchData function called!');
    const isRefresh = !loading; // If not loading, it's a refresh
    if (isRefresh) {
      console.log('📊 Setting refreshing to true');
      setRefreshing(true);
    }
    
    try {
      console.log('📡 Fetching data from services...');
      const [employees, devices, clients] = await Promise.all([
        getAllEmployees(),
        getAllDevices(),
        getAllClients(),
      ]);

      console.log(`📊 Data fetched - Employees: ${employees.length}, Devices: ${devices.length}, Clients: ${clients.length}`);

      // Fetch total admins from users collection
      const usersSnapshot = await getDocs(collection(db, "users"));
      const totalAdminsCount = usersSnapshot.size;
      setTotalAdmins(totalAdminsCount);

      setEmployeeCount(employees.length);
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

      // Calculate inventory total (all active devices excluding retired)
      const inventory = devices.filter(
        (d) => d.status !== "Retired" && d.status !== "Disposed"
      ).length;
      setInventoryCount(inventory);

      // Get working devices (GOOD or BRANDNEW condition)
      const workingDevicesList = devices.filter(
        (d) => d.condition === "GOOD" || d.condition === "BRANDNEW"
      );
      setWorkingDevices(workingDevicesList);
      setAllDevices(devices); // Store all devices for later use

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

      // Count device types
      const typeMap = {};
      devices.forEach((d) => {
        const type = d.deviceType || "Unknown";
        typeMap[type] = (typeMap[type] || 0) + 1;
      });
      const sortedTypes = Object.entries(typeMap)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([type, count]) => ({ type, count }));
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
      setRetiredCount(
        devices.filter((d) => d.condition === "RETIRED").length
      );
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
      const devicesInUse = devices.filter(
        (d) => d.status === "In Use"
      ).length;
      const utilization =
        totalDevices > 0
          ? Math.round((devicesInUse / totalDevices) * 100)
          : 0;
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
        const recentHistory = history.filter(entry => {
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
          console.log("Setting system history with", formatted.length, "entries");
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
        console.log('✅ Data fetch complete, setting refreshing to false');
        setRefreshing(false);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
      if (isRefresh) {
        console.log('❌ Data fetch error, setting refreshing to false');
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
          background: "#f9f9f9",
        }}
      >
        <LoadingSpinner />
      </div>
    );
  }

  // Prepare data for enhanced visualizations
  const deviceStatusData = [
    { name: "GOOD", value: goodCount },
    { name: "BRAND NEW", value: brandNewCount },
    { name: "DEFECTIVE", value: defectiveCount },
    { name: "RETIRED", value: retiredCount },
  ].filter((item) => item.value > 0);

  const deviceTypeData = deviceTypes.map((dt) => ({
    type: dt.type,
    count: dt.count,
  }));

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
        background: "#f9f9f9",
        position: "relative",
      }}
    >
      {/* Header with time range filter */}
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
              color: "#6b7280",
              margin: 0,
            }}
          >
            Comprehensive asset and inventory management dashboard
          </p>
        </div>
        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Core Metrics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 24,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #e0e7ef",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#6b7280",
              marginBottom: 8,
            }}
          >
            Total Employees
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#2563eb" }}>
            {employeeCount}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #e0e7ef",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#6b7280",
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
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #e0e7ef",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#6b7280",
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
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #e0e7ef",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#6b7280",
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
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #e0e7ef",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#6b7280",
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
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #e0e7ef",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#6b7280",
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
        />

        {/* Device Type Distribution */}
        <CustomBarChart
          data={deviceTypeData}
          title="📦 Device Type Distribution"
          xKey="type"
          yKey="count"
          height={350}
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
          />
        )}

        {/* Working Devices Table */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #e0e7ef",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              color: "#374151",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            🔧 Working Devices
          </h3>
          <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
            {workingDevices.length === 0 ? (
              <div
                style={{
                  color: "#6b7280",
                  textAlign: "center",
                  padding: 20,
                  fontStyle: "italic",
                }}
              >
                No working devices found
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
                  <tr style={{ borderBottom: "2px solid #e0e7ef" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 8px",
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      Device Tag
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 8px",
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      Type
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 8px",
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      Condition
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 8px",
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      Assigned To
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 8px",
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      Assigned Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workingDevices.map((device, index) => (
                    <tr
                      key={device.id || index}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        backgroundColor:
                          index % 2 === 0 ? "#fafafa" : "#ffffff",
                      }}
                    >
                      <td style={{ padding: "12px 8px", color: "#374151" }}>
                        {device.deviceTag || device.deviceName || "N/A"}
                      </td>
                      <td style={{ padding: "12px 8px", color: "#6b7280" }}>
                        {device.deviceType || "N/A"}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 500,
                            backgroundColor:
                              device.condition === "BRANDNEW"
                                ? "#dcfce7"
                                : "#f0fdf4",
                            color:
                              device.condition === "BRANDNEW"
                                ? "#166534"
                                : "#15803d",
                          }}
                        >
                          {device.condition || "N/A"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 8px", color: "#6b7280" }}>
                        {device.assignedTo
                          ? employeeMap[
                              device.assignedTo.toString().trim().toUpperCase()
                            ] || device.assignedTo
                          : "Not assigned"}
                      </td>
                      <td style={{ padding: "12px 8px", color: "#6b7280" }}>
                        {device.assignmentDate
                          ? new Date(device.assignmentDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
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
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #e0e7ef",
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
                color: "#374151",
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              📋 Recent Activity
            </h3>
            <button
              onClick={() => {
                console.log('🔄 Refresh button clicked!');
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
                  console.log('🖱️ Mouse enter refresh button');
                  e.target.style.backgroundColor = "#1d4ed8";
                  e.target.style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                if (!refreshing) {
                  console.log('🖱️ Mouse leave refresh button');
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
                  verticalAlign: "middle"
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
                  color: "#6b7280",
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
                          ? "1px solid #f3f4f6"
                          : "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 14, color: "#374151" }}>
                      {entry.event}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
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
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              border: "1px solid #e0e7ef",
            }}
          >
            <h4
              style={{
                margin: "0 0 12px 0",
                color: "#374151",
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
              <span style={{ fontSize: 14, color: "#6b7280" }}>
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
              <span style={{ fontSize: 14, color: "#6b7280" }}>Brand New</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#2563eb" }}>
                {brandNewCount}
              </span>
            </div>
          </div>

          {/* Asset Condition Summary */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              border: "1px solid #e0e7ef",
            }}
          >
            <h4
              style={{
                margin: "0 0 12px 0",
                color: "#374151",
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
              <span style={{ fontSize: 14, color: "#6b7280" }}>
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
              <span style={{ fontSize: 14, color: "#6b7280" }}>Defective</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#ef4444" }}>
                {defectiveCount}
              </span>
            </div>
          </div>

          {/* Deployment Summary */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              border: "1px solid #e0e7ef",
            }}
          >
            <h4
              style={{
                margin: "0 0 12px 0",
                color: "#374151",
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
              <span style={{ fontSize: 14, color: "#6b7280" }}>
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
              <span style={{ fontSize: 14, color: "#6b7280" }}>
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
              <span style={{ fontSize: 14, color: "#6b7280" }}>
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
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              border: "1px solid #e0e7ef",
            }}
          >
            <h4
              style={{
                margin: "0 0 12px 0",
                color: "#374151",
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

      {/* Device Type Details Table */}
      {deviceTypes.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #e0e7ef",
            marginBottom: 32,
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              color: "#374151",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            🖥️ Device Inventory by Type
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    Device Type
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    Total Count
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    Percentage
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {deviceTypes.map((dt, index) => {
                  const percentage =
                    deviceCount > 0
                      ? Math.round((dt.count / deviceCount) * 100)
                      : 0;
                  const needsRestock = dt.count < 5; // Consider restock if less than 5 units

                  return (
                    <tr
                      key={dt.type}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        backgroundColor:
                          index % 2 === 0 ? "#ffffff" : "#f8fafc",
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "#374151",
                          fontWeight: 500,
                        }}
                      >
                        {dt.type}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "center",
                          color: "#2563eb",
                          fontWeight: 600,
                        }}
                      >
                        {dt.count}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "center",
                          color: "#6b7280",
                        }}
                      >
                        {percentage}%
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {needsRestock ? (
                          <span
                            style={{
                              color: "#ef4444",
                              fontWeight: 600,
                              fontSize: 12,
                              padding: "4px 8px",
                              backgroundColor: "#fef2f2",
                              borderRadius: 4,
                            }}
                          >
                            ⚠️ Low Stock
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "#22c55e",
                              fontWeight: 600,
                              fontSize: 12,
                              padding: "4px 8px",
                           
                              backgroundColor: "#f0fdf4",
                              borderRadius: 4,
                            }}
                          >
                            ✅ Sufficient
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer with version info */}
      <div
        style={{
          textAlign: "center",
          padding: "12px 0",
          borderTop: "1px solid #e5e7eb",
          marginTop: 20,
          marginBottom: -20,
          color: "#6b7280",
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
            backgroundColor: "#2563eb",
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
            e.target.style.backgroundColor = "#1d4ed8";
            e.target.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "#2563eb";
            e.target.style.transform = "scale(1)";
          }}
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          ↑
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
