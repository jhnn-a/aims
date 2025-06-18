import { useEffect, useState } from "react";
import { getAllEmployees } from "../services/employeeService";
import { getAllDevices } from "../services/deviceService";
import { getAllClients } from "../services/clientService";

// Simple bar component
function Bar({ label, value, max, color = "#2563eb" }) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div
        style={{
          background: "#e5e7eb",
          borderRadius: 8,
          height: 22,
          width: "100%",
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            background: color,
            height: "100%",
            borderRadius: 8,
            transition: "width 0.4s",
            minWidth: 2,
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 12,
            top: 0,
            height: "100%",
            display: "flex",
            alignItems: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            textShadow: "0 1px 4px #2563eb55",
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

// Simple circular progress (donut) chart
function Donut({ label, value, total, color = "#2563eb", size = 110 }) {
  const percent = total > 0 ? value / total : 0;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - percent);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        margin: 12,
      }}
    >
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s" }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy="0.3em"
          fontSize="1.5em"
          fontWeight="bold"
          fill={color}
        >
          {value}
        </text>
      </svg>
      <div
        style={{
          fontWeight: 600,
          color: "#64748b",
          marginTop: 4,
          fontSize: 15,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Dashboard() {
  const [employeeCount, setEmployeeCount] = useState(0);
  const [deviceCount, setDeviceCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [inUseCount, setInUseCount] = useState(0);
  const [stockCount, setStockCount] = useState(0);
  const [retiredCount, setRetiredCount] = useState(0);
  const [deviceTypes, setDeviceTypes] = useState([]);
  // Add device condition counts
  const [workingCount, setWorkingCount] = useState(0);
  const [needsRepairCount, setNeedsRepairCount] = useState(0);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      const [employees, devices, clients] = await Promise.all([
        getAllEmployees(),
        getAllDevices(),
        getAllClients(),
      ]);
      setEmployeeCount(employees.length);
      setDeviceCount(devices.length);
      setClientCount(clients.length);
      setInUseCount(devices.filter((d) => d.status === "In Use").length);
      setStockCount(devices.filter((d) => d.status === "Stock Room").length);
      setRetiredCount(devices.filter((d) => d.status === "Retired").length);

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
      setWorkingCount(devices.filter((d) => d.condition === "Working").length);
      setNeedsRepairCount(
        devices.filter((d) => d.condition === "Needs Repair").length
      );
      setNewCount(devices.filter((d) => d.condition === "New").length);
    }
    fetchData();
  }, []);

  // Find the max for bar scaling
  const maxDevices = Math.max(
    deviceCount,
    inUseCount,
    stockCount,
    retiredCount,
    1
  );

  // For donut charts
  const donutData = [
    { label: "In Use", value: inUseCount, color: "#2563eb" },
    { label: "Stock Room", value: stockCount, color: "#22c55e" },
    { label: "Retired", value: retiredCount, color: "#e11d48" },
  ];

  // For device condition donut
  const conditionDonutData = [
    { label: "Working", value: workingCount, color: "#22c55e" },
    { label: "Needs Repair", value: needsRepairCount, color: "#f59e42" },
    { label: "New", value: newCount, color: "#2563eb" },
  ];

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <h2
        style={{
          color: "#2563eb",
          fontWeight: 700,
          marginBottom: 24,
        }}
      >
        Dashboard Overview
      </h2>
      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 32,
        }}
      >
        <div style={widgetStyle}>
          <div style={widgetTitle}>Employees</div>
          <div style={widgetValue}>{employeeCount}</div>
        </div>
        <div style={widgetStyle}>
          <div style={widgetTitle}>Devices</div>
          <div style={widgetValue}>{deviceCount}</div>
        </div>
        <div style={widgetStyle}>
          <div style={widgetTitle}>Clients</div>
          <div style={widgetValue}>{clientCount}</div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 32,
          flexWrap: "wrap",
          marginBottom: 32,
        }}
      >
        <div style={{ flex: 1, minWidth: 320 }}>
          <h3
            style={{
              color: "#2563eb",
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            Device Status (Bar)
          </h3>
          <Bar
            label="In Use"
            value={inUseCount}
            max={deviceCount}
            color="#2563eb"
          />
          <Bar
            label="Stock Room"
            value={stockCount}
            max={deviceCount}
            color="#22c55e"
          />
          <Bar
            label="Retired"
            value={retiredCount}
            max={deviceCount}
            color="#e11d48"
          />
        </div>
        <div style={{ flex: 1, minWidth: 320 }}>
          <h3
            style={{
              color: "#2563eb",
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            Device Status (Donut)
          </h3>
          <div style={{ display: "flex", gap: 24 }}>
            {donutData.map((d) => (
              <Donut
                key={d.label}
                label={d.label}
                value={d.value}
                total={deviceCount}
                color={d.color}
              />
            ))}
          </div>
        </div>
      </div>
      {/* Device Condition Donut */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ color: "#2563eb", fontWeight: 600, marginBottom: 12 }}>
          Device Condition Overview
        </h3>
        <div style={{ display: "flex", gap: 24 }}>
          {conditionDonutData.map((d) => (
            <Donut
              key={d.label}
              label={d.label}
              value={d.value}
              total={deviceCount}
              color={d.color}
            />
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 32 }}>
        <h3
          style={{
            color: "#2563eb",
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Devices by Type
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
          {deviceTypes.map((dt) => (
            <div
              key={dt.type}
              style={{
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 2px 12px #2563eb0a",
                padding: "18px 24px",
                minWidth: 120,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "#2563eb",
                  fontSize: 18,
                }}
              >
                {dt.count}
              </div>
              <div
                style={{
                  color: "#64748b",
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                {dt.type}
              </div>
              <div
                style={{
                  marginTop: 8,
                  height: 8,
                  width: "100%",
                  background: "#e5e7eb",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${
                      deviceCount ? (dt.count / deviceCount) * 100 : 0
                    }%`,
                    background: "#2563eb",
                    borderRadius: 4,
                    transition: "width 0.4s",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const widgetStyle = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 2px 12px #2563eb0a",
  padding: "24px 32px",
  minWidth: 160,
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const widgetTitle = {
  color: "#64748b",
  fontWeight: 600,
  fontSize: 16,
  marginBottom: 8,
  letterSpacing: 0.2,
};

const widgetValue = {
  color: "#2563eb",
  fontWeight: 800,
  fontSize: 32,
  letterSpacing: 1,
};

export default Dashboard;
