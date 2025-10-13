// === USER LOG SERVICE ===
// This service handles all user action logging and system event tracking
// Features: Create logs, fetch logs, auto-delete logs older than 30 days

import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  where,
  Timestamp,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../utils/firebase";

const LOGS_COLLECTION = "userLogs";
const LOG_RETENTION_DAYS = 30;

// === ACTION TYPES ===
export const ACTION_TYPES = {
  // Authentication
  LOGIN: "login",
  LOGOUT: "logout",

  // Device Management
  DEVICE_CREATE: "device_create",
  DEVICE_UPDATE: "device_update",
  DEVICE_DELETE: "device_delete",
  DEVICE_ASSIGN: "device_assign",
  DEVICE_UNASSIGN: "device_unassign",
  DEVICE_TRANSFER: "device_transfer",
  DEVICE_IMPORT: "device_import",
  DEVICE_EXPORT: "device_export",

  // Employee Management
  EMPLOYEE_CREATE: "employee_create",
  EMPLOYEE_UPDATE: "employee_update",
  EMPLOYEE_DELETE: "employee_delete",
  EMPLOYEE_IMPORT: "employee_import",
  EMPLOYEE_EXPORT: "employee_export",

  // Client Management
  CLIENT_CREATE: "client_create",
  CLIENT_UPDATE: "client_update",
  CLIENT_DELETE: "client_delete",
  CLIENT_EXPORT: "client_export",

  // Unit Specifications
  UNITSPEC_CREATE: "unitspec_create",
  UNITSPEC_UPDATE: "unitspec_update",
  UNITSPEC_DELETE: "unitspec_delete",
  UNITSPEC_IMPORT: "unitspec_import",
  UNITSPEC_EXPORT: "unitspec_export",

  // User Management
  USER_CREATE: "user_create",
  USER_UPDATE: "user_update",
  USER_DELETE: "user_delete",
  USER_ROLE_CHANGE: "user_role_change",

  // Documents
  DOCUMENT_GENERATE: "document_generate",
  DOCUMENT_DOWNLOAD: "document_download",

  // System
  SYSTEM_ERROR: "system_error",
  SYSTEM_BACKUP: "system_backup",
};

// === CREATE LOG ENTRY ===
/**
 * Creates a new log entry in the system
 * @param {string} userId - User ID performing the action
 * @param {string} userName - Full name of the user
 * @param {string} userEmail - Email of the user
 * @param {string} actionType - Type of action (use ACTION_TYPES constants)
 * @param {string} description - Description of the action
 * @param {Object} affectedData - Data about what was affected (optional)
 * @returns {Promise<string>} - Log entry ID
 */
export const createUserLog = async (
  userId,
  userName,
  userEmail,
  actionType,
  description,
  affectedData = {}
) => {
  try {
    const logEntry = {
      userId: userId || "system",
      userName: userName || "System",
      userEmail: userEmail || "system@aims.local",
      actionType,
      description,
      affectedData: {
        ...affectedData,
        // Ensure we don't store sensitive data
        timestamp: Timestamp.now(),
      },
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, LOGS_COLLECTION), logEntry);
    console.log("User log created:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating user log:", error);
    throw error;
  }
};

// === GET ALL LOGS ===
/**
 * Fetches all user logs with optional filtering
 * @param {Object} filters - Optional filters (userId, actionType, startDate, endDate)
 * @returns {Promise<Array>} - Array of log entries
 */
export const getAllUserLogs = async (filters = {}) => {
  try {
    let q = query(
      collection(db, LOGS_COLLECTION),
      orderBy("timestamp", "desc")
    );

    // Apply filters if provided
    if (filters.userId) {
      q = query(q, where("userId", "==", filters.userId));
    }

    if (filters.actionType) {
      q = query(q, where("actionType", "==", filters.actionType));
    }

    if (filters.startDate) {
      q = query(q, where("timestamp", ">=", filters.startDate));
    }

    if (filters.endDate) {
      q = query(q, where("timestamp", "<=", filters.endDate));
    }

    const querySnapshot = await getDocs(q);
    const logs = [];

    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return logs;
  } catch (error) {
    console.error("Error fetching user logs:", error);
    throw error;
  }
};

// === GET LOGS BY USER ===
/**
 * Fetches logs for a specific user
 * @param {string} userId - User ID to fetch logs for
 * @returns {Promise<Array>} - Array of log entries
 */
export const getUserLogsByUserId = async (userId) => {
  try {
    const q = query(
      collection(db, LOGS_COLLECTION),
      where("userId", "==", userId),
      orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    const logs = [];

    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return logs;
  } catch (error) {
    console.error("Error fetching user logs:", error);
    throw error;
  }
};

// === GET LOGS BY ACTION TYPE ===
/**
 * Fetches logs by action type
 * @param {string} actionType - Action type to filter by
 * @returns {Promise<Array>} - Array of log entries
 */
export const getLogsByActionType = async (actionType) => {
  try {
    const q = query(
      collection(db, LOGS_COLLECTION),
      where("actionType", "==", actionType),
      orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    const logs = [];

    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return logs;
  } catch (error) {
    console.error("Error fetching logs by action type:", error);
    throw error;
  }
};

// === DELETE OLD LOGS ===
/**
 * Deletes logs older than the retention period (30 days)
 * This function should be called periodically (e.g., daily)
 * @returns {Promise<number>} - Number of logs deleted
 */
export const deleteOldLogs = async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    const q = query(
      collection(db, LOGS_COLLECTION),
      where("timestamp", "<", cutoffTimestamp)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("No old logs to delete");
      return 0;
    }

    // Use batch delete for better performance
    const batch = writeBatch(db);
    let deleteCount = 0;

    querySnapshot.forEach((document) => {
      batch.delete(doc(db, LOGS_COLLECTION, document.id));
      deleteCount++;
    });

    await batch.commit();
    console.log(`Deleted ${deleteCount} old logs`);
    return deleteCount;
  } catch (error) {
    console.error("Error deleting old logs:", error);
    throw error;
  }
};

// === GET LOGS COUNT ===
/**
 * Gets the total count of logs
 * @returns {Promise<number>} - Total number of logs
 */
export const getLogsCount = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, LOGS_COLLECTION));
    return querySnapshot.size;
  } catch (error) {
    console.error("Error getting logs count:", error);
    throw error;
  }
};

// === HELPER: Format Action Type for Display ===
export const formatActionType = (actionType) => {
  return actionType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// === HELPER: Get Action Category ===
export const getActionCategory = (actionType) => {
  if (actionType.startsWith("device")) return "Device Management";
  if (actionType.startsWith("employee")) return "Employee Management";
  if (actionType.startsWith("client")) return "Client Management";
  if (actionType.startsWith("unitspec")) return "Unit Specifications";
  if (actionType.startsWith("user")) return "User Management";
  if (actionType.startsWith("document")) return "Documents";
  if (actionType.startsWith("system")) return "System";
  if (actionType === "login" || actionType === "logout")
    return "Authentication";
  return "Other";
};

// === HELPER: Get Action Color ===
export const getActionColor = (actionType, isDarkMode = false) => {
  // Color mapping based on action type:
  // Creating/Adding - Green
  // Removing/Deleting - Red
  // Updating - Blue
  // Assigning - Purple
  // Reassigning - Aquamarine
  // Unassigning - Maroon
  // Importing - Blue Green (Teal)
  // Exporting - Orange

  if (isDarkMode) {
    // Dark mode colors (lighter shades)
    switch (actionType) {
      // Creating/Adding - Green
      case ACTION_TYPES.DEVICE_CREATE:
      case ACTION_TYPES.EMPLOYEE_CREATE:
      case ACTION_TYPES.CLIENT_CREATE:
      case ACTION_TYPES.UNITSPEC_CREATE:
      case ACTION_TYPES.USER_CREATE:
        return "#34d399"; // Light Green

      // Removing/Deleting - Red
      case ACTION_TYPES.DEVICE_DELETE:
      case ACTION_TYPES.EMPLOYEE_DELETE:
      case ACTION_TYPES.CLIENT_DELETE:
      case ACTION_TYPES.UNITSPEC_DELETE:
      case ACTION_TYPES.USER_DELETE:
        return "#f87171"; // Light Red

      // Updating - Blue
      case ACTION_TYPES.DEVICE_UPDATE:
      case ACTION_TYPES.EMPLOYEE_UPDATE:
      case ACTION_TYPES.CLIENT_UPDATE:
      case ACTION_TYPES.UNITSPEC_UPDATE:
      case ACTION_TYPES.USER_UPDATE:
        return "#60a5fa"; // Light Blue

      // Assigning - Purple
      case ACTION_TYPES.DEVICE_ASSIGN:
        return "#c084fc"; // Light Purple

      // Reassigning/Transfer - Aquamarine
      case ACTION_TYPES.DEVICE_TRANSFER:
        return "#5eead4"; // Light Aquamarine (Teal)

      // Unassigning - Maroon
      case ACTION_TYPES.DEVICE_UNASSIGN:
        return "#e879f9"; // Light Maroon (Pink-Red)

      // Importing - Blue Green (Teal)
      case ACTION_TYPES.DEVICE_IMPORT:
      case ACTION_TYPES.EMPLOYEE_IMPORT:
      case ACTION_TYPES.UNITSPEC_IMPORT:
        return "#2dd4bf"; // Light Teal

      // Exporting - Orange
      case ACTION_TYPES.DEVICE_EXPORT:
      case ACTION_TYPES.EMPLOYEE_EXPORT:
      case ACTION_TYPES.UNITSPEC_EXPORT:
      case ACTION_TYPES.CLIENT_EXPORT:
        return "#fb923c"; // Light Orange

      // Authentication - Blue
      case ACTION_TYPES.LOGIN:
      case ACTION_TYPES.LOGOUT:
        return "#60a5fa"; // Light Blue

      // Documents - Orange
      case ACTION_TYPES.DOCUMENT_GENERATE:
      case ACTION_TYPES.DOCUMENT_DOWNLOAD:
        return "#fb923c"; // Light Orange

      // System - Red
      case ACTION_TYPES.SYSTEM_ERROR:
      case ACTION_TYPES.SYSTEM_BACKUP:
        return "#f87171"; // Light Red

      // Role Change - Purple
      case ACTION_TYPES.USER_ROLE_CHANGE:
        return "#c084fc"; // Light Purple

      default:
        return "#9ca3af"; // Gray
    }
  } else {
    // Light mode colors (darker shades)
    switch (actionType) {
      // Creating/Adding - Green
      case ACTION_TYPES.DEVICE_CREATE:
      case ACTION_TYPES.EMPLOYEE_CREATE:
      case ACTION_TYPES.CLIENT_CREATE:
      case ACTION_TYPES.UNITSPEC_CREATE:
      case ACTION_TYPES.USER_CREATE:
        return "#10b981"; // Green

      // Removing/Deleting - Red
      case ACTION_TYPES.DEVICE_DELETE:
      case ACTION_TYPES.EMPLOYEE_DELETE:
      case ACTION_TYPES.CLIENT_DELETE:
      case ACTION_TYPES.UNITSPEC_DELETE:
      case ACTION_TYPES.USER_DELETE:
        return "#ef4444"; // Red

      // Updating - Blue
      case ACTION_TYPES.DEVICE_UPDATE:
      case ACTION_TYPES.EMPLOYEE_UPDATE:
      case ACTION_TYPES.CLIENT_UPDATE:
      case ACTION_TYPES.UNITSPEC_UPDATE:
      case ACTION_TYPES.USER_UPDATE:
        return "#3b82f6"; // Blue

      // Assigning - Purple
      case ACTION_TYPES.DEVICE_ASSIGN:
        return "#8b5cf6"; // Purple

      // Reassigning/Transfer - Aquamarine
      case ACTION_TYPES.DEVICE_TRANSFER:
        return "#14b8a6"; // Aquamarine (Teal)

      // Unassigning - Maroon
      case ACTION_TYPES.DEVICE_UNASSIGN:
        return "#be123c"; // Maroon (Dark Red-Pink)

      // Importing - Blue Green (Teal)
      case ACTION_TYPES.DEVICE_IMPORT:
      case ACTION_TYPES.EMPLOYEE_IMPORT:
      case ACTION_TYPES.UNITSPEC_IMPORT:
        return "#0d9488"; // Teal (Blue Green)

      // Exporting - Orange
      case ACTION_TYPES.DEVICE_EXPORT:
      case ACTION_TYPES.EMPLOYEE_EXPORT:
      case ACTION_TYPES.UNITSPEC_EXPORT:
      case ACTION_TYPES.CLIENT_EXPORT:
        return "#f97316"; // Orange

      // Authentication - Blue
      case ACTION_TYPES.LOGIN:
      case ACTION_TYPES.LOGOUT:
        return "#3b82f6"; // Blue

      // Documents - Orange
      case ACTION_TYPES.DOCUMENT_GENERATE:
      case ACTION_TYPES.DOCUMENT_DOWNLOAD:
        return "#f97316"; // Orange

      // System - Red
      case ACTION_TYPES.SYSTEM_ERROR:
      case ACTION_TYPES.SYSTEM_BACKUP:
        return "#ef4444"; // Red

      // Role Change - Purple
      case ACTION_TYPES.USER_ROLE_CHANGE:
        return "#8b5cf6"; // Purple

      default:
        return "#6b7280"; // Gray
    }
  }
};
