import { useEffect, useState , useRef } from "react";
import { getAllEmployees } from "../services/employeeService";
import { getAllDevices } from "../services/deviceService";
import { getAllClients } from "../services/clientService";
import { exportDashboardToExcel } from "../utils/exportDashboardToExcel";
import { getDeviceHistory } from "../services/deviceHistoryService";
import LoadingSpinner from "../components/LoadingSpinner";
import { useCurrentUser } from "../CurrentUserContext";
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

// Custom Bar Chart Component
function CustomBarChart({ data, title, xKey, yKey, height = 300 }) {
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
          <Bar dataKey={yKey} fill="#2563eb" />
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
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const scrollFunction = () => {
      if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.onscroll = scrollFunction;
    
    // Cleanup
    return () => {
      window.onscroll = null;
    };
  }, []);

  const topFunction = () => {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
  };



  let currentUser = undefined;
  try {
    const userContext = useCurrentUser?.();
    currentUser = userContext?.currentUser;
  } catch (e) {
    currentUser = undefined;
  }
  const username = currentUser?.username || "User";


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
  const [deviceLifecycle, setDeviceLifecycle] = useState([]);
  const [utilizationRate, setUtilizationRate] = useState(0);
  const [timeRange, setTimeRange] = useState("30days");
  const [loading, setLoading] = useState(true);
  const [systemHistory, setSystemHistory] = useState([]);
  const [allDevices, setAllDevices] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [employees, devices, clients] = await Promise.all([
          getAllEmployees(),
          getAllDevices(),
          getAllClients(),
        ]);

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

        // Device lifecycle calculation
        const currentDate = new Date();
        const lifecycleMap = {
          "< 1 year": 0,
          "1-3 years": 0,
          "> 3 years": 0,
          Unknown: 0,
        };

        devices.forEach((device) => {
          const purchaseDate = device.purchaseDate || device.dateDeployed;
          if (purchaseDate) {
            const deviceDate = new Date(purchaseDate);
            const yearsDiff =
              (currentDate - deviceDate) / (1000 * 60 * 60 * 24 * 365);

            if (yearsDiff < 1) {
              lifecycleMap["< 1 year"]++;
            } else if (yearsDiff <= 3) {
              lifecycleMap["1-3 years"]++;
            } else {
              lifecycleMap["> 3 years"]++;
            }
          } else {
            lifecycleMap["Unknown"]++;
          }
        });

        const lifecycleData = Object.entries(lifecycleMap)
          .map(([age, count]) => ({ age, count }))
          .filter((item) => item.count > 0);
        setDeviceLifecycle(lifecycleData);

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
        const history = await getDeviceHistory();
        const sorted = history.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        const last10 = sorted.slice(0, 10);
        const formatted = last10.map((entry) => ({
          event: formatHistoryEvent(entry, empMap),
          date: formatShortDate(entry.date),
        }));
        setSystemHistory(formatted);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: "40px 48px 80px 48px",
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
    style={{
      height: "100vh",              // ✅ makes this container fill screen
      overflowY: "auto",            // ✅ enables scrolling inside it
      padding: "40px 48px 80px 48px",
      boxSizing: "border-box",
      fontFamily:
        'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: "#f9f9f9",
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
            Utilization Rate
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#22c55e" }}>
            {utilizationRate}%
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
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
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

        {/* Device Lifecycle Overview */}
        {deviceLifecycle.length > 0 && (
          <CustomPieChart
            data={deviceLifecycle.map((item) => ({
              name: item.age,
              value: item.count,
            }))}
            title="📅 Device Lifecycle Overview"
            height={350}
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
            📋 Recent Activity
          </h3>
          <div>
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
          padding: "20px 0",
          borderTop: "1px solid #e5e7eb",
          marginTop: 32,
          color: "#6b7280",
          fontSize: 14,
        }}
      >
        <p style={{ margin: 0 }}>
          AIMS Dashboard v2.0 | Last updated: {new Date().toLocaleDateString()}{" "}
          | Data refreshed: {new Date().toLocaleTimeString()}
        </p>
      </div>
{showScrollTop && (
  <button
    onClick={topFunction}
    style={{
      display: "block",
      position: "fixed",
      bottom: "20px",
      right: "30px",
      zIndex: 99,
      border: "none",
      outline: "none",
      backgroundColor: "#2563eb",
      color: "white",
      cursor: "pointer",
      padding: "15px",
      borderRadius: "10px",
      fontSize: "18px",
      transition: "background-color 0.3s"
    }}
    onMouseEnter={(e) => (e.target.style.backgroundColor = "#555")}
    onMouseLeave={(e) => (e.target.style.backgroundColor = "#2563eb")}
    title="Go to top"
  >
    ↑
  </button>
)}
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
export function formatShortDate(dateString) {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export default Dashboard;
