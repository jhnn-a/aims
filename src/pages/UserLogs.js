// === USER LOGS PAGE ===
// This page displays all user activity logs and system events
// Features: View logs, filter by user/action/date, export logs, auto-cleanup

import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useCurrentUser } from "../CurrentUserContext";
import {
  getAllUserLogs,
  deleteOldLogs,
  formatActionType,
  getActionCategory,
  getActionColor,
  ACTION_TYPES,
} from "../services/userLogService";
import { TableLoadingSpinner } from "../components/LoadingSpinner";
import { useSnackbar } from "../components/Snackbar";
import * as XLSX from "xlsx";

function UserLogs() {
  const { isDarkMode } = useTheme();
  const { currentUser } = useCurrentUser();
  const { showSuccess, showError, showInfo } = useSnackbar();

  // === STATE ===
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(50);
  const [deletedCount, setDeletedCount] = useState(0);

  // === LOAD LOGS ===
  useEffect(() => {
    loadLogs();
    // Run cleanup on mount
    cleanupOldLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const logsData = await getAllUserLogs();
      setLogs(logsData);
      setFilteredLogs(logsData);
    } catch (error) {
      console.error("Error loading logs:", error);
      showError("Failed to load user logs");
    } finally {
      setLoading(false);
    }
  };

  // === CLEANUP OLD LOGS ===
  const cleanupOldLogs = async () => {
    try {
      const count = await deleteOldLogs();
      if (count > 0) {
        setDeletedCount(count);
        showInfo(`Deleted ${count} logs older than 30 days`);
      }
    } catch (error) {
      console.error("Error cleaning up old logs:", error);
    }
  };

  // === FILTER LOGS ===
  useEffect(() => {
    let filtered = [...logs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          formatActionType(log.actionType)
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Action type filter
    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.actionType === actionFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (log) => getActionCategory(log.actionType) === categoryFilter
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter((log) => {
        if (!log.timestamp || !log.timestamp.seconds) return false;
        const logDate = new Date(log.timestamp.seconds * 1000);

        switch (dateFilter) {
          case "today":
            return logDate >= today;
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return logDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return logDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [searchTerm, actionFilter, categoryFilter, dateFilter, logs]);

  // === PAGINATION ===
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const paginatedLogs = filteredLogs.slice(
    startIndex,
    startIndex + logsPerPage
  );

  // === EXPORT TO EXCEL ===
  const handleExport = () => {
    try {
      const exportData = filteredLogs.map((log) => ({
        Timestamp: log.timestamp
          ? new Date(log.timestamp.seconds * 1000).toLocaleString()
          : "N/A",
        User: log.userName || "N/A",
        Email: log.userEmail || "N/A",
        Action: formatActionType(log.actionType),
        Category: getActionCategory(log.actionType),
        Description: log.description || "N/A",
        "Affected Resource": log.affectedData?.resourceType || "N/A",
        "Resource ID": log.affectedData?.resourceId || "N/A",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "User Logs");
      XLSX.writeFile(
        wb,
        `user_logs_${new Date().toISOString().split("T")[0]}.xlsx`
      );
      showSuccess("Logs exported successfully");
    } catch (error) {
      console.error("Error exporting logs:", error);
      showError("Failed to export logs");
    }
  };

  // === FORMAT DATE ===
  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return "N/A";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return "";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // === GET UNIQUE CATEGORIES ===
  const categories = [
    ...new Set(logs.map((log) => getActionCategory(log.actionType))),
  ].sort();

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
      <style>{`
        /* Custom scrollbar with transparent background */
        .userlogs-main-scroll::-webkit-scrollbar {
          width: 10px;
        }

        .userlogs-main-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .userlogs-main-scroll::-webkit-scrollbar-thumb {
          background: ${
            isDarkMode ? "rgba(156, 163, 175, 0.3)" : "rgba(209, 213, 219, 0.5)"
          };
          border-radius: 5px;
        }

        .userlogs-main-scroll::-webkit-scrollbar-thumb:hover {
          background: ${
            isDarkMode ? "rgba(156, 163, 175, 0.5)" : "rgba(209, 213, 219, 0.8)"
          };
        }

        /* Firefox scrollbar */
        .userlogs-main-scroll {
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
          padding: "20px 24px 16px 24px",
          flexShrink: 0,
        }}
      >
        USER LOGS
      </div>

      {/* Filters and Actions */}
      <div
        style={{
          padding: "0 24px 16px 24px",
          display: "flex",
          gap: 12,
          flexWrap: "nowrap",
          alignItems: "center",
          flexShrink: 0,
          overflowX: "auto",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", width: "1282px", flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
              borderRadius: 6,
              background: isDarkMode ? "#1f2937" : "#fff",
              color: isDarkMode ? "#f3f4f6" : "#374151",
              fontSize: 14,
              outline: "none",
            }}
          />
          <svg
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              width: 14,
              height: 14,
              color: "#9ca3af",
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

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
            borderRadius: 6,
            background: isDarkMode ? "#1f2937" : "#fff",
            color: isDarkMode ? "#f3f4f6" : "#374151",
            fontSize: 14,
            cursor: "pointer",
            flexShrink: 0,
            minWidth: "fit-content",
            marginLeft: "52px",
          }}
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Date Filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
            borderRadius: 6,
            background: isDarkMode ? "#1f2937" : "#fff",
            color: isDarkMode ? "#f3f4f6" : "#374151",
            fontSize: 14,
            cursor: "pointer",
            flexShrink: 0,
            minWidth: "fit-content",
          }}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>

        {/* Export Button */}
        <button
          onClick={handleExport}
          style={{
            padding: "8px 16px",
            background: "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
            whiteSpace: "nowrap",
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>

        {/* Refresh Button */}
        <button
          onClick={loadLogs}
          style={{
            padding: "8px 16px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div
        style={{
          padding: "0 24px 16px 24px",
          display: "flex",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            background: isDarkMode ? "#1f2937" : "#fff",
            border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "12px 16px",
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: isDarkMode ? "#9ca3af" : "#6b7280",
              marginBottom: 4,
            }}
          >
            Total Logs
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: isDarkMode ? "#f3f4f6" : "#1f2937",
            }}
          >
            {logs.length}
          </div>
        </div>
        <div
          style={{
            background: isDarkMode ? "#1f2937" : "#fff",
            border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "12px 16px",
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: isDarkMode ? "#9ca3af" : "#6b7280",
              marginBottom: 4,
            }}
          >
            Filtered Results
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: isDarkMode ? "#f3f4f6" : "#1f2937",
            }}
          >
            {filteredLogs.length}
          </div>
        </div>
        {deletedCount > 0 && (
          <div
            style={{
              background: isDarkMode ? "#1f2937" : "#fff",
              border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "12px 16px",
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: isDarkMode ? "#9ca3af" : "#6b7280",
                marginBottom: 4,
              }}
            >
              Auto-Deleted (30+ days)
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: isDarkMode ? "#f87171" : "#ef4444",
              }}
            >
              {deletedCount}
            </div>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div
        style={{
          flex: 1,
          margin: "0 24px 16px 24px",
          background: isDarkMode ? "#1f2937" : "#fff",
          border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TableLoadingSpinner />
          </div>
        ) : (
          <div
            className="userlogs-main-scroll"
            style={{
              flex: 1,
              overflow: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: isDarkMode ? "#374151" : "#f9fafb",
                  zIndex: 10,
                }}
              >
                <tr>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      borderBottom: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #e5e7eb",
                      width: "15%",
                    }}
                  >
                    Timestamp
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      borderBottom: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #e5e7eb",
                      width: "15%",
                    }}
                  >
                    User
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      borderBottom: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #e5e7eb",
                      width: "15%",
                    }}
                  >
                    Action
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      borderBottom: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #e5e7eb",
                      width: "12%",
                    }}
                  >
                    Category
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: isDarkMode ? "#f3f4f6" : "#374151",
                      borderBottom: isDarkMode
                        ? "1px solid #4b5563"
                        : "1px solid #e5e7eb",
                      width: "43%",
                    }}
                  >
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: isDarkMode ? "#9ca3af" : "#6b7280",
                      }}
                    >
                      No logs found
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          color: isDarkMode ? "#d1d5db" : "#4b5563",
                        }}
                      >
                        <div style={{ fontWeight: 500 }}>
                          {formatDate(log.timestamp)}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: isDarkMode ? "#9ca3af" : "#6b7280",
                          }}
                        >
                          {formatTime(log.timestamp)}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: isDarkMode ? "#d1d5db" : "#4b5563",
                        }}
                      >
                        <div style={{ fontWeight: 500 }}>{log.userName}</div>
                        <div
                          style={{
                            fontSize: 12,
                            color: isDarkMode ? "#9ca3af" : "#6b7280",
                          }}
                        >
                          {log.userEmail}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            background: getActionColor(
                              log.actionType,
                              isDarkMode
                            ),
                            color: "#fff",
                          }}
                        >
                          {formatActionType(log.actionType)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: isDarkMode ? "#d1d5db" : "#4b5563",
                          fontSize: 13,
                        }}
                      >
                        {getActionCategory(log.actionType)}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: isDarkMode ? "#d1d5db" : "#4b5563",
                          fontSize: 13,
                        }}
                      >
                        {log.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {/* Spacer */}
            <div style={{ height: "10px" }}></div>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredLogs.length > 0 && (
          <div
            style={{
              background: isDarkMode ? "#374151" : "#f9fafb",
              borderTop: isDarkMode ? "1px solid #4b5563" : "1px solid #e5e7eb",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            {/* Left: Show per page */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 14,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    fontWeight: 500,
                  }}
                >
                  Show:
                </span>
                <select
                  value={logsPerPage}
                  onChange={(e) => {
                    setLogsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "4px 8px",
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #d1d5db",
                    borderRadius: 4,
                    background: isDarkMode ? "#1f2937" : "#fff",
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>

              <span
                style={{
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                  fontSize: 14,
                }}
              >
                Showing {startIndex + 1} -{" "}
                {Math.min(startIndex + logsPerPage, filteredLogs.length)} of{" "}
                {filteredLogs.length} logs
              </span>
            </div>

            {/* Right: Pagination controls */}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: "6px 12px",
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #d1d5db",
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
                    borderRadius: 6,
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontSize: 14,
                  }}
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: "6px 12px",
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #d1d5db",
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
                    borderRadius: 6,
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontSize: 14,
                  }}
                >
                  Previous
                </button>
                <span
                  style={{
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    fontSize: 14,
                    padding: "0 8px",
                  }}
                >
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  style={{
                    padding: "6px 12px",
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #d1d5db",
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
                    borderRadius: 6,
                    cursor:
                      currentPage === totalPages ? "not-allowed" : "pointer",
                    fontSize: 14,
                  }}
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: "6px 12px",
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #d1d5db",
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
                    borderRadius: 6,
                    cursor:
                      currentPage === totalPages ? "not-allowed" : "pointer",
                    fontSize: 14,
                  }}
                >
                  Last
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserLogs;
