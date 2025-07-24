import { useEffect, useState, useContext } from "react";
import { getAllEmployees } from "../services/employeeService";
import { getAllDevices } from "../services/deviceService";
import { getAllClients } from "../services/clientService";
import { exportDashboardToExcel } from "../utils/exportDashboardToExcel";
import { getDeviceHistory } from "../services/deviceHistoryService";
import { getUnitSpecsByTag } from "../services/unitSpecsService";
import LoadingSpinner, {
  TableLoadingSpinner,
  CardLoadingSpinner,
} from "../components/LoadingSpinner";
import { useCurrentUser } from "../CurrentUserContext";

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
  // Use custom hook to get current user, with fallback for missing context
  let currentUser = undefined;
  try {
    const userContext = useCurrentUser?.();
    currentUser = userContext?.currentUser;
  } catch (e) {
    currentUser = undefined;
  }
  const username = currentUser?.username || "User";
  const [employeeCount, setEmployeeCount] = useState(0);
  const [deviceCount, setDeviceCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [inUseCount, setInUseCount] = useState(0);
  const [stockCount, setStockCount] = useState(0);
  const [retiredCount, setRetiredCount] = useState(0);
  const [deviceTypes, setDeviceTypes] = useState([]);
  // Add device condition counts
  const [goodCount, setGoodCount] = useState(0);
  const [needsRepairCount, setNeedsRepairCount] = useState(0);
  const [brandNewCount, setBrandNewCount] = useState(0);
  const [defectiveCount, setDefectiveCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalDevices, setModalDevices] = useState([]);
  const [systemHistory, setSystemHistory] = useState([]); // New state for system history
  const [employeeMap, setEmployeeMap] = useState({}); // Map employeeId to employeeName
  // State for device specifications popup
  const [hoveredDevice, setHoveredDevice] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [unitSpecs, setUnitSpecs] = useState(null);
  const [loadingSpecs, setLoadingSpecs] = useState(false);

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

      // Build employeeId → employeeName map
      const empMap = {};
      employees.forEach((emp) => {
        // Use emp.id (the Firestore document ID) as the key, and trim the fullName
        const docId = (emp.id || emp.employeeId || "")
          .toString()
          .trim()
          .toUpperCase();
        if (docId && emp.fullName) {
          empMap[docId] = emp.fullName.trim();
        }
      });
      setEmployeeMap(empMap);

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
      setRetiredCount(devices.filter((d) => d.condition === "RETIRED").length);
      // Save all devices for modal filtering
      setAllDevices(devices);

      // Fetch system history (real data from Firestore)
      const history = await getDeviceHistory();
      // Sort by date descending (most recent first)
      const sorted = history.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      // Only keep the last 10 logs, most recent first
      const last10 = sorted.slice(0, 10);
      // For now, just display the last 10
      const formatted = last10.map((entry) => ({
        event: formatHistoryEvent(entry, empMap),
        date: formatShortDate(entry.date),
      }));
      setSystemHistory(formatted); // Only keep the last 10 logs, most recent first
    }
    fetchData();
  }, []);

  // Store all devices for modal filtering
  const [allDevices, setAllDevices] = useState([]);

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
    { label: "GOOD", value: goodCount, color: "#007BFF" },
    { label: "NEEDS REPAIR", value: needsRepairCount, color: "#FFC107" },
    { label: "BRANDNEW", value: brandNewCount, color: "#28A745" },
    { label: "DEFECTIVE", value: defectiveCount, color: "#DC3545" },
    { label: "RETIRED", value: retiredCount, color: "#6C757D" },
  ].filter((item) => item.value > 0); // Only show conditions that have devices

  return (
    <div
      style={{
        padding: "40px 48px 80px 48px",
        width: "100%",
        minHeight: "100vh",
        boxSizing: "border-box",
        fontFamily:
          'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflowY: "auto",
        background: "#f9f9f9",
      }}
    >
      {/* Welcome Banner - styled like Device Status card */}
      <div
        style={{
          ...cardStyle,
          background: "#2563eb",
          color: "#fff",
          marginBottom: 32,
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
          Hello {username}, Welcome Back!
        </div>
        <div style={{ fontSize: 17, fontWeight: 500, opacity: 0.92 }}>
          View device, employee, and client stats at a glance. Quick insights
          and recent activity below.
        </div>
      </div>
      <h2 style={sectionTitleStyle}>Dashboard Overview</h2>
      <div style={{ display: "flex", gap: 24, marginBottom: 32 }}>
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
        <div style={{ flex: 1 }}>
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  color: "#64748B",
                  marginBottom: 8,
                }}
              >
                Device History
              </div>
              <div
                style={{
                  maxHeight: "60px",
                  overflowY: systemHistory.length > 2 ? "auto" : "hidden",
                  padding: "10px 2px",
                  scrollbarWidth: "thin",
                  msOverflowStyle: "auto",
                  margin: "0 -24px",
                  minHeight: 40,
                }}
              >
                {systemHistory.length === 0 ? (
                  <div
                    style={{
                      color: "#64748b",
                      textAlign: "center",
                      padding: 8,
                      fontSize: 12,
                    }}
                  >
                    No recent activity.
                  </div>
                ) : (
                  <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
                    {systemHistory.map((entry, index) => (
                      <li
                        key={index}
                        style={{
                          padding: "6px 12px",
                          borderBottom: "1px solid #e0e7ef",
                          color: "#233037",
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{entry.date}:</span>{" "}
                        {entry.event}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 32 }}
      >
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Device Status</div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 32,
            }}
          >
            <div style={{ flex: 1, minWidth: 180 }}>
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
      </div>
      <div style={{ marginBottom: 32, display: "flex", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Device Condition Overview</div>
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
        </div>
        <div style={{ flex: 1 }}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Devices Needing Repair</div>
            <div style={{ maxHeight: "160px", overflowY: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "#f7f9fb",
                  borderRadius: "12px",
                  textAlign: "center",
                }}
              >
                <thead>
                  <tr style={{ background: "#e0e7ef" }}>
                    <th
                      style={{
                        padding: "10px 20px",
                        color: "#445F6D",
                        fontWeight: 600,
                        fontSize: 16,
                        borderBottom: "2px solid #e0e7ef",
                      }}
                    >
                      Device Tag
                    </th>
                    <th
                      style={{
                        padding: "10px 20px",
                        color: "#445F6D",
                        fontWeight: 600,
                        fontSize: 16,
                        borderBottom: "2px solid #e0e7ef",
                      }}
                    >
                      Device Type
                    </th>
                    <th
                      style={{
                        padding: "10px 20px",
                        color: "#445F6D",
                        fontWeight: 600,
                        fontSize: 16,
                        borderBottom: "2px solid #e0e7ef",
                      }}
                    >
                      Brand
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allDevices.filter((dev) => dev.condition === "NEEDS REPAIR")
                    .length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          color: "#22c55e",
                          fontWeight: 600,
                          fontSize: 18,
                          padding: 16,
                          textAlign: "center",
                        }}
                      >
                        No devices need repair.
                      </td>
                    </tr>
                  ) : (
                    allDevices
                      .filter((dev) => dev.condition === "NEEDS REPAIR")
                      .map((dev) => (
                        <tr
                          key={dev.deviceTag}
                          style={{ borderBottom: "1px solid #e0e7ef" }}
                        >
                          <td
                            style={{
                              padding: 10,
                              color: "#233037",
                              fontWeight: 500,
                            }}
                          >
                            {dev.deviceTag}
                          </td>
                          <td
                            style={{
                              padding: 10,
                              color: "#233037",
                              fontWeight: 500,
                              textAlign: "center",
                            }}
                          >
                            {dev.deviceType || "Unknown"}
                          </td>
                          <td
                            style={{
                              padding: 10,
                              color: "#233037",
                              fontWeight: 500,
                              textAlign: "center",
                            }}
                          >
                            {dev.brand}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 32 }}>
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Devices by Type</div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {deviceTypes.map((dt) => (
              <div
                key={dt.type}
                style={{
                  background: "#f8fafc",
                  borderRadius: 12,
                  boxShadow: "0 2px 12px #2563eb0a",
                  border: "1.5px solid #e0e7ef",
                  padding: "18px 24px",
                  minWidth: 120,
                  textAlign: "center",
                  marginBottom: 8,
                  cursor: "pointer",
                  transition: "box-shadow 0.2s, border 0.2s",
                }}
                onClick={() => {
                  setModalType(dt.type);
                  setModalDevices(
                    allDevices.filter(
                      (d) => (d.deviceType || "Unknown") === dt.type
                    )
                  );
                  setModalOpen(true);
                }}
                title={`View all ${dt.type}`}
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
      <div style={{ marginBottom: 32 }}>
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Restock Alerts</div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#f7f9fb",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr style={{ background: "#e0e7ef" }}>
                <th
                  style={{
                    padding: 10,
                    color: "#445F6D",
                    fontWeight: 700,
                    fontSize: 16,
                    borderBottom: "2px solid #e0e7ef",
                    textAlign: "left",
                  }}
                >
                  Device Type
                </th>
                <th
                  style={{
                    padding: 10,
                    color: "#445F6D",
                    fontWeight: 600,
                    fontSize: 16,
                    borderBottom: "2px solid #e0e7ef",
                    textAlign: "center",
                  }}
                >
                  Count
                </th>
                <th
                  style={{
                    padding: 10,
                    color: "#445F6D",
                    fontWeight: 600,
                    fontSize: 16,
                    borderBottom: "2px solid #e0e7ef",
                    textAlign: "center",
                  }}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {deviceTypes.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      color: "#22c55e",
                      fontWeight: 600,
                      fontSize: 18,
                      padding: 16,
                      textAlign: "center",
                    }}
                  >
                    No device types found.
                  </td>
                </tr>
              ) : (
                deviceTypes.map((dt) => {
                  const needsRestock = dt.count < 10;
                  return (
                    <tr
                      key={dt.type}
                      style={{
                        borderBottom: "1px solid #e0e7ef",
                        background: needsRestock ? "#fff7f7" : undefined,
                      }}
                    >
                      <td
                        style={{
                          padding: 10,
                          color: needsRestock ? "#b45309" : "#233037",
                          fontWeight: 500,
                        }}
                      >
                        {dt.type}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          color: needsRestock ? "#e11d48" : "#2563eb",
                          fontWeight: 500,
                          textAlign: "center",
                          fontSize: 17,
                        }}
                      >
                        {dt.count}
                      </td>
                      <td style={{ padding: 10, textAlign: "center" }}>
                        {needsRestock ? (
                          <span
                            style={{
                              color: "#e11d48",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {/* Flat warning icon SVG */}
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 20 20"
                              fill="none"
                              style={{
                                display: "inline",
                                verticalAlign: "middle",
                              }}
                            >
                              <path
                                d="M10 3.5c-.3 0-.57.16-.71.42l-6.5 12A.75.75 0 0 0 3.5 17h13a.75.75 0 0 0 .67-1.08l-6.5-12A.75.75 0 0 0 10 3.5zm0 2.1 5.2 9.9H4.8L10 5.6zm-.75 3.65a.75.75 0 0 1 1.5 0v3.25a.75.75 0 0 1-1.5 0V9.25zm.75 6.25a.88.88 0 1 1 0-1.75.88.88 0 0 1 0 1.75z"
                                fill="#e11d48"
                              />
                            </svg>
                            Needs to restock
                          </span>
                        ) : (
                          <span style={{ color: "#22c55e", fontWeight: 500 }}>
                            Sufficient
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal for device list by type */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(34,46,58,0.18)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 4px 24px #2563eb18, 0 1.5px 6px #2563eb0a",
              border: "1.5px solid #e0e7ef",
              padding: 32,
              minWidth: 340,
              maxWidth: 600,
              width: "100%",
              maxHeight: 500,
              overflowY: "auto",
              position: "relative",
            }}
          >
            <button
              onClick={() => setModalOpen(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "#e0e7ef",
                border: "none",
                borderRadius: 8,
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 20,
                color: "#233037",
                transition: "background 0.2s",
              }}
              title="Close"
            >
              ×
            </button>
            <div
              style={{
                fontWeight: 700,
                fontSize: 20,
                color: "#2563eb",
                marginBottom: 18,
                textAlign: "center",
              }}
            >
              {modalType} Devices
            </div>
            {modalDevices.length === 0 ? (
              <div
                style={{ color: "#64748b", textAlign: "center", margin: 32 }}
              >
                No devices found.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f7f9fb" }}>
                    <th
                      style={{
                        padding: 8,
                        color: "#64748b",
                        fontWeight: 600,
                        fontSize: 15,
                        borderBottom: "1.5px solid #e0e7ef",
                      }}
                    >
                      Tag
                    </th>
                    <th
                      style={{
                        padding: 8,
                        color: "#64748b",
                        fontWeight: 600,
                        fontSize: 15,
                        borderBottom: "1.5px solid #e0e7ef",
                      }}
                    >
                      Brand
                    </th>
                    <th
                      style={{
                        padding: 8,
                        color: "#64748b",
                        fontWeight: 600,
                        fontSize: 15,
                        borderBottom: "1.5px solid #e0e7ef",
                      }}
                    >
                      Model
                    </th>
                    <th
                      style={{
                        padding: 8,
                        color: "#64748b",
                        fontWeight: 600,
                        fontSize: 15,
                        borderBottom: "1.5px solid #e0e7ef",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: 8,
                        color: "#64748b",
                        fontWeight: 600,
                        fontSize: 15,
                        borderBottom: "1.5px solid #e0e7ef",
                      }}
                    >
                      Assigned To
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {modalDevices.map((dev) => (
                    <tr
                      key={dev.deviceTag}
                      style={{
                        borderBottom: "1px solid #e0e7ef",
                        cursor: modalType === "PC" ? "pointer" : "default",
                        transition: "background-color 0.2s",
                        backgroundColor:
                          hoveredDevice?.deviceTag === dev.deviceTag
                            ? "#f8fafc"
                            : "transparent",
                      }}
                      onMouseEnter={async (e) => {
                        if (modalType === "PC") {
                          console.log("Hovered PC device:", dev); // Debug log
                          setHoveredDevice(dev);
                          setLoadingSpecs(true);
                          setUnitSpecs(null);

                          // Fetch unit specifications by device tag
                          try {
                            const specs = await getUnitSpecsByTag(
                              dev.deviceTag
                            );
                            console.log("Unit specs found:", specs); // Debug log
                            setUnitSpecs(specs);
                          } catch (error) {
                            console.error("Error fetching unit specs:", error);
                          } finally {
                            setLoadingSpecs(false);
                          }
                        }
                      }}
                      onMouseMove={(e) => {
                        if (modalType === "PC" && hoveredDevice) {
                          setPopupPosition({
                            x: e.clientX + 15, // Position popup to the right of cursor
                            y: e.clientY - 10, // Position popup slightly above cursor
                          });
                        }
                      }}
                      onMouseLeave={() => {
                        if (modalType === "PC") {
                          setHoveredDevice(null);
                          setUnitSpecs(null);
                          setLoadingSpecs(false);
                        }
                      }}
                    >
                      <td
                        style={{ padding: 8, color: "#233037", fontSize: 15 }}
                      >
                        {dev.deviceTag}
                      </td>
                      <td
                        style={{ padding: 8, color: "#233037", fontSize: 15 }}
                      >
                        {dev.brand}
                      </td>
                      <td
                        style={{ padding: 8, color: "#233037", fontSize: 15 }}
                      >
                        {dev.model}
                      </td>
                      <td
                        style={{ padding: 8, color: "#233037", fontSize: 15 }}
                      >
                        {dev.status}
                      </td>
                      <td
                        style={{ padding: 8, color: "#233037", fontSize: 15 }}
                      >
                        {dev.assignedTo &&
                        employeeMap[String(dev.assignedTo).trim().toUpperCase()]
                          ? employeeMap[
                              String(dev.assignedTo).trim().toUpperCase()
                            ]
                          : dev.assignedTo || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Device specifications popup for PC devices */}
      {hoveredDevice && modalType === "PC" && (
        <div
          style={{
            position: "fixed",
            left: popupPosition.x,
            top: popupPosition.y,
            background: "#fff",
            border: "1.5px solid #e0e7ef",
            borderRadius: 12,
            boxShadow:
              "0 8px 32px rgba(37, 99, 235, 0.15), 0 2px 8px rgba(37, 99, 235, 0.08)",
            padding: 16,
            zIndex: 4000,
            minWidth: 280,
            maxWidth: 350,
            pointerEvents: "none", // Prevents popup from interfering with mouse events
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: "#2563eb",
              marginBottom: 12,
              borderBottom: "1px solid #e0e7ef",
              paddingBottom: 8,
            }}
          >
            {hoveredDevice.deviceTag} Specifications
          </div>

          {loadingSpecs ? (
            <CardLoadingSpinner text="Loading specifications..." />
          ) : unitSpecs ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontWeight: 600, color: "#64748b", fontSize: 14 }}
                >
                  CPU:
                </span>
                <span
                  style={{ color: "#233037", fontSize: 14, fontWeight: 500 }}
                >
                  {unitSpecs.CPU || "Not specified"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontWeight: 600, color: "#64748b", fontSize: 14 }}
                >
                  RAM:
                </span>
                <span
                  style={{ color: "#233037", fontSize: 14, fontWeight: 500 }}
                >
                  {unitSpecs.RAM || "Not specified"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontWeight: 600, color: "#64748b", fontSize: 14 }}
                >
                  Drive:
                </span>
                <span
                  style={{ color: "#233037", fontSize: 14, fontWeight: 500 }}
                >
                  {unitSpecs.Drive || "Not specified"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontWeight: 600, color: "#64748b", fontSize: 14 }}
                >
                  OS:
                </span>
                <span
                  style={{ color: "#233037", fontSize: 14, fontWeight: 500 }}
                >
                  {unitSpecs.OS || "Not specified"}
                </span>
              </div>
              {unitSpecs.GPU && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{ fontWeight: 600, color: "#64748b", fontSize: 14 }}
                  >
                    GPU:
                  </span>
                  <span
                    style={{ color: "#233037", fontSize: 14, fontWeight: 500 }}
                  >
                    {unitSpecs.GPU}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontWeight: 600, color: "#64748b", fontSize: 14 }}
                >
                  Status:
                </span>
                <span
                  style={{ color: "#233037", fontSize: 14, fontWeight: 500 }}
                >
                  {unitSpecs.Status || "Not specified"}
                </span>
              </div>
              {unitSpecs.Remarks && (
                <div style={{ marginTop: 4 }}>
                  <span
                    style={{ fontWeight: 600, color: "#64748b", fontSize: 14 }}
                  >
                    Remarks:
                  </span>
                  <div
                    style={{
                      color: "#233037",
                      fontSize: 14,
                      fontWeight: 500,
                      marginTop: 4,
                      wordWrap: "break-word",
                    }}
                  >
                    {unitSpecs.Remarks}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px 0",
                color: "#64748b",
                textAlign: "center",
                fontSize: 14,
              }}
            >
              No specifications found for this device
            </div>
          )}
        </div>
      )}

      {/* Export to Excel button at the bottom */}
      <button
        onClick={() =>
          exportDashboardToExcel({
            allDevices,
          })
        }
        style={{
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "10px 22px",
          fontWeight: 700,
          fontSize: 16,
          cursor: "pointer",
          margin: "32px auto 0 auto",
          display: "block",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          transition: "background 0.2s, box-shadow 0.2s",
        }}
        title="Export all device data to Excel"
      >
        Export All Device Data to Excel
      </button>
    </div>
  );
}

// Helper to format device history events
function formatHistoryEvent(entry, employeeMap = {}) {
  const device = entry.deviceTag ? `Device ${entry.deviceTag}` : "Device";
  let employee = entry.employeeName || null;
  if (!employee && entry.employeeId && employeeMap[entry.employeeId]) {
    employee = employeeMap[entry.employeeId];
  }
  // If employee is still null, do not show any employee info
  if (entry.action === "assigned" && device && employee) {
    return `${device} assigned to ${employee}`;
  }
  if (entry.action === "unassigned" && device && employee) {
    return `${device} unassigned from ${employee}`;
  }
  if (entry.action === "returned" && device && employee) {
    return `${device} returned by ${employee}`;
  }
  if (entry.action === "retired" && device) {
    return `${device} retired`;
  }
  if (entry.action === "added" && device) {
    return `${device} added to inventory`;
  }
  if (entry.action === "status change" && device && entry.status) {
    return `${device} status changed to '${entry.status}'`;
  }
  // fallback: show as much as possible
  if (device && employee) {
    return `${device} (${employee}): ${entry.action || "Event"}`;
  }
  if (device) {
    return `${device}: ${entry.action || "Event"}`;
  }
  return entry.action || "Event";
}

// Helper to format date as MM-DD HH:mm
function formatShortDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${min}`;
}

const widgetStyle = {
  background: "#ffffff", // Ensure the fill color is white
  borderRadius: 16,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  border: "1px solid #e0e7ef",
  padding: "20px 28px",
  minWidth: 160,
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center", // Center content vertically
  alignItems: "center",
};

const widgetTitle = {
  color: "#64748b",
  fontWeight: 600,
  fontSize: 15,
  marginBottom: 0, // Remove bottom margin to bring text closer to the top
  letterSpacing: 0.2,
};

const widgetValue = {
  color: "#2563eb",
  fontWeight: 800,
  fontSize: 36, // Increased font size for blue values
  letterSpacing: 1,
  textAlign: "center", // Center the values
};

const cardStyle = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 4px 16px #2563eb18, 0 1.5px 6px #2563eb0a",
  border: "1.5px solid #e0e7ef",
  padding: "24px 28px",
  marginBottom: 0,
  minWidth: 320,
  flex: 1,
  position: "relative",
  overflow: "visible",
};

const sectionTitleStyle = {
  color: "#233037",
  fontWeight: 800,
  fontSize: 26,
  marginBottom: 16,
  fontFamily: 'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const cardTitleStyle = {
  color: "#2563eb",
  fontWeight: 600,
  marginBottom: 18,
  fontSize: 18,
  letterSpacing: 0.2,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

export default Dashboard;
