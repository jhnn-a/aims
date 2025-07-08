import React, { useState, useEffect } from "react";
import { getDeviceHistoryByTag, getDeviceHistoryById, createSampleDeviceHistory } from "../services/deviceHistoryService";

// Utility function to format dates consistently as MM/DD/YYYY
const formatDateToMMDDYYYY = (dateValue) => {
  if (!dateValue) return "";
  
  let date;
  if (typeof dateValue === "number") {
    date = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
  } else if (typeof dateValue === "string") {
    date = new Date(dateValue);
  } else if (typeof dateValue === "object" && dateValue.seconds) {
    // Handle Firestore timestamp
    date = new Date(dateValue.seconds * 1000);
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    return "";
  }
  
  if (isNaN(date)) return "";
  
  return (date.getMonth() + 1).toString().padStart(2, "0") +
         "/" +
         date.getDate().toString().padStart(2, "0") +
         "/" +
         date.getFullYear();
};

// Utility function to format time as HH:MM AM/PM
const formatTimeToAMPM = (dateValue) => {
  if (!dateValue) return "";
  
  let date;
  if (typeof dateValue === "string") {
    date = new Date(dateValue);
  } else if (typeof dateValue === "object" && dateValue.seconds) {
    // Handle Firestore timestamp
    date = new Date(dateValue.seconds * 1000);
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    return "";
  }
  
  if (isNaN(date)) return "";
  
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

const DeviceHistory = ({ deviceTag, deviceId, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDeviceHistory();
  }, [deviceTag, deviceId]);

  const handleCreateSampleHistory = async () => {
    try {
      setLoading(true);
      const count = await createSampleDeviceHistory(deviceTag, deviceId);
      console.log(`Created ${count} sample history entries`);
      await fetchDeviceHistory(); // Refresh the history
    } catch (err) {
      console.error("Error creating sample history:", err);
      setError(`Failed to create sample history: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeviceHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let historyData = [];
      
      // Try to get history by deviceTag first, then by deviceId
      if (deviceTag) {
        console.log("Fetching history for deviceTag:", deviceTag);
        historyData = await getDeviceHistoryByTag(deviceTag);
        console.log("Found history records:", historyData.length);
      } else if (deviceId) {
        console.log("Fetching history for deviceId:", deviceId);
        historyData = await getDeviceHistoryById(deviceId);
        console.log("Found history records:", historyData.length);
      } else {
        console.error("No device tag or ID provided");
        setError("No device tag or ID provided");
        setLoading(false);
        return;
      }
      
      // Sort history by date (newest first)
      const sortedHistory = historyData.sort((a, b) => {
        const dateA = a.date ? new Date(
          a.date.seconds 
            ? a.date.seconds * 1000 
            : a.date
        ) : new Date(0);
        
        const dateB = b.date ? new Date(
          b.date.seconds 
            ? b.date.seconds * 1000 
            : b.date
        ) : new Date(0);
        
        // Sort by date descending (newest first)
        return dateB.getTime() - dateA.getTime();
      });
      
      setHistory(sortedHistory);
    } catch (err) {
      console.error("Error fetching device history:", err);
      console.error("Error details:", err.message);
      
      // Check if it's a Firestore index error
      if (err.message && err.message.includes("index")) {
        setError("Database index not configured. Please contact your administrator.");
      } else {
        setError(`Failed to load device history: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "assigned":
        return (
          <svg width="16" height="16" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        );
      case "unassigned":
        return (
          <svg width="16" height="16" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            <line x1="18" y1="6" x2="24" y2="12"/>
            <line x1="24" y1="6" x2="18" y2="12"/>
          </svg>
        );
      case "returned":
        return (
          <svg width="16" height="16" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="7.5,4.21 12,6.81 16.5,4.21"/>
            <polyline points="7.5,19.79 7.5,14.6 3,12"/>
            <polyline points="21,12 16.5,14.6 16.5,19.79"/>
          </svg>
        );
      case "retired":
        return (
          <svg width="16" height="16" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19,6v14a2,2 0,0 1,-2,2H7a2,2 0,0 1,-2,-2V6m3,0V4a2,2 0,0 1,2,-2h4a2,2 0,0 1,2,2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        );
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "assigned":
        return "#10b981";
      case "unassigned":
        return "#f59e0b";
      case "returned":
        return "#3b82f6";
      case "retired":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getActionText = (action) => {
    switch (action) {
      case "assigned":
        return "Assigned";
      case "unassigned":
        return "Unassigned";
      case "returned":
        return "Returned";
      case "retired":
        return "Retired";
      default:
        return action || "Unknown";
    }
  };

  const styles = {
    overlay: {
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
    },
    modal: {
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      width: "90%",
      maxWidth: "800px",
      maxHeight: "90vh",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      padding: "24px 24px 16px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
    },
    closeButton: {
      width: "32px",
      height: "32px",
      border: "none",
      background: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "8px",
      color: "#6b7280",
      transition: "all 0.2s",
    },
    content: {
      padding: "16px 24px 24px",
      flex: 1,
      overflow: "auto",
    },
    loading: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px",
      color: "#6b7280",
    },
    error: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px",
      color: "#ef4444",
      backgroundColor: "#fef2f2",
      borderRadius: "8px",
      margin: "16px 0",
    },
    noHistory: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px",
      color: "#6b7280",
      backgroundColor: "#f9fafb",
      borderRadius: "8px",
      margin: "16px 0",
    },
    historyItem: {
      display: "flex",
      alignItems: "flex-start",
      padding: "16px",
      borderRadius: "8px",
      border: "1px solid #e5e7eb",
      marginBottom: "12px",
      backgroundColor: "#fafafa",
    },
    actionIcon: {
      marginRight: "12px",
      marginTop: "2px",
    },
    historyDetails: {
      flex: 1,
    },
    actionHeader: {
      display: "flex",
      alignItems: "center",
      marginBottom: "8px",
    },
    actionText: {
      fontSize: "16px",
      fontWeight: "600",
      marginRight: "8px",
    },
    employeeName: {
      fontSize: "14px",
      color: "#374151",
      backgroundColor: "#f3f4f6",
      padding: "2px 8px",
      borderRadius: "4px",
    },
    dateTime: {
      fontSize: "12px",
      color: "#6b7280",
      marginBottom: "8px",
    },
    additionalInfo: {
      fontSize: "13px",
      color: "#4b5563",
    },
    infoRow: {
      marginBottom: "4px",
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            Device History - {deviceTag || deviceId}
          </h2>
          <button
            style={styles.closeButton}
            onClick={onClose}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div style={styles.content}>
          {loading && (
            <div style={styles.loading}>
              <div>Loading history...</div>
            </div>
          )}
          
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}
          
          {!loading && !error && history.length === 0 && (
            <div style={styles.noHistory}>
              <div>
                <div>No history found for this device.</div>
                <button
                  onClick={handleCreateSampleHistory}
                  style={{
                    marginTop: "16px",
                    padding: "8px 16px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Create Sample History (Debug)
                </button>
              </div>
            </div>
          )}
          
          {!loading && !error && history.length > 0 && (
            <div>
              {history.map((item) => (
                <div key={item.id} style={styles.historyItem}>
                  <div style={styles.actionIcon}>
                    {getActionIcon(item.action)}
                  </div>
                  <div style={styles.historyDetails}>
                    <div style={styles.actionHeader}>
                      <div 
                        style={{
                          ...styles.actionText,
                          color: getActionColor(item.action),
                        }}
                      >
                        {getActionText(item.action)}
                      </div>
                      {item.employeeName && (
                        <div style={styles.employeeName}>
                          {item.employeeName}
                        </div>
                      )}
                    </div>
                    <div style={styles.dateTime}>
                      {formatDateToMMDDYYYY(item.date)} at {formatTimeToAMPM(item.date)}
                    </div>
                    {(item.reason || item.condition) && (
                      <div style={styles.additionalInfo}>
                        {item.reason && (
                          <div style={styles.infoRow}>
                            <strong>Reason:</strong> {item.reason}
                          </div>
                        )}
                        {item.condition && (
                          <div style={styles.infoRow}>
                            <strong>Condition:</strong> {item.condition}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceHistory;
