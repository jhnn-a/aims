import { db } from "../utils/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { getEmployee } from "./employeeService";

const historyCollection = collection(db, "deviceHistory");

// Log a device assignment/unassignment/return/retire event
export const logDeviceHistory = async ({
  employeeId,
  employeeName, // new: require employeeName
  deviceId,
  deviceTag, // require deviceTag
  action, // 'assigned' | 'unassigned' | 'returned' | 'retired' | 'created' | 'updated'
  date,
  reason, // optional, for unassign
  condition, // optional, for unassign
  changes, // optional, object containing field changes { fieldName: { old: value, new: value } }
  remarks, // optional, for additional notes
}) => {
  let resolvedName = employeeName;
  if (!resolvedName && employeeId) {
    // Try to look up the fullName from the employee service
    const emp = await getEmployee(employeeId);
    resolvedName = emp && emp.fullName ? emp.fullName : null;
  }
  if (employeeId && !resolvedName) {
    throw new Error(
      "Cannot log device history: employee fullName is missing for employeeId " +
        employeeId
    );
  }
  await addDoc(historyCollection, {
    employeeId,
    employeeName: resolvedName || null, // always store as employeeName
    deviceId,
    deviceTag: deviceTag || null, // always store
    action,
    date: date || new Date().toISOString(), // Always store current timestamp when action occurs
    reason: reason || null,
    condition: condition || null,
    changes: changes || null, // Store field-level changes
    remarks: remarks || null, // Store additional remarks
  });
};

// Get all history for an employee, most recent first
export const getDeviceHistoryForEmployee = async (employeeId) => {
  const q = query(
    historyCollection,
    where("employeeId", "==", employeeId),
    orderBy("date", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Get all history for a device by deviceTag, most recent first
export const getDeviceHistoryByTag = async (deviceTag) => {
  console.log("Querying device history for tag:", deviceTag);

  try {
    // Simple query without orderBy first
    const q = query(historyCollection, where("deviceTag", "==", deviceTag));

    console.log("Executing Firestore query...");
    const snapshot = await getDocs(q);
    console.log("Query completed, found documents:", snapshot.size);

    const records = snapshot.docs.map((doc) => {
      const data = { id: doc.id, ...doc.data() };
      console.log("History record:", data);
      return data;
    });

    // Sort by date on client side
    const sortedRecords = records.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA; // Most recent first
    });

    console.log("Returning sorted records:", sortedRecords);
    return sortedRecords;
  } catch (error) {
    console.error("Error in getDeviceHistoryByTag:", error);
    throw error;
  }
};

// Get all history for a device by deviceId, most recent first
export const getDeviceHistoryById = async (deviceId) => {
  console.log("Querying device history for ID:", deviceId);

  try {
    // Simple query without orderBy first
    const q = query(historyCollection, where("deviceId", "==", deviceId));

    console.log("Executing Firestore query...");
    const snapshot = await getDocs(q);
    console.log("Query completed, found documents:", snapshot.size);

    const records = snapshot.docs.map((doc) => {
      const data = { id: doc.id, ...doc.data() };
      console.log("History record:", data);
      return data;
    });

    // Sort by date on client side
    const sortedRecords = records.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA; // Most recent first
    });

    console.log("Returning sorted records:", sortedRecords);
    return sortedRecords;
  } catch (error) {
    console.error("Error in getDeviceHistoryById:", error);
    throw error;
  }
};

// Delete a single history entry by its document ID
export const deleteDeviceHistory = async (historyId) => {
  await deleteDoc(doc(db, "deviceHistory", historyId));
};

// Fetch all device history entries
export const getDeviceHistory = async () => {
  const snapshot = await getDocs(historyCollection);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Add a new device history entry
export const addDeviceHistoryEntry = async (entry) => {
  // Always require deviceTag and employeeName
  // action can be 'assigned', 'unassigned', 'returned', 'retired', etc.
  let resolvedName = entry.employeeName;
  if (!resolvedName && entry.employeeId) {
    const emp = await getEmployee(entry.employeeId);
    resolvedName = emp && emp.fullName ? emp.fullName : null;
  }
  if (entry.employeeId && !resolvedName) {
    throw new Error(
      "Cannot log device history: employee fullName is missing for employeeId " +
        entry.employeeId
    );
  }
  await addDoc(historyCollection, {
    ...entry,
    employeeName: resolvedName || null, // always store as employeeName
    deviceTag: entry.deviceTag || null,
  });
};

// Test function to create sample device history
export const createSampleDeviceHistory = async (deviceTag, deviceId) => {
  const sampleHistory = [
    {
      employeeId: null,
      employeeName: null,
      deviceId: deviceId,
      deviceTag: deviceTag,
      action: "added",
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      reason: null,
      condition: null,
    },
    {
      employeeId: "EMP001",
      employeeName: "John Doe",
      deviceId: deviceId,
      deviceTag: deviceTag,
      action: "assigned",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      reason: null,
      condition: null,
    },
    {
      employeeId: "EMP001",
      employeeName: "John Doe",
      deviceId: deviceId,
      deviceTag: deviceTag,
      action: "unassigned",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      reason: "Device upgrade",
      condition: "GOOD",
    },
  ];

  for (const entry of sampleHistory) {
    await addDoc(historyCollection, entry);
  }

  return sampleHistory.length;
};

/**
 * Format a history entry into a human-readable description
 * @param {Object} historyItem - The history entry object
 * @returns {Object} - Formatted history with title and details
 */
export const formatHistoryEntry = (historyItem) => {
  const { action, employeeName, changes, reason, condition, remarks } =
    historyItem;

  let title = "";
  let details = [];

  switch (action) {
    case "created":
      title = "Asset Created";
      details.push("Device added to inventory");
      if (remarks) details.push(`Notes: ${remarks}`);
      break;

    case "assigned":
      title = "Asset Assigned";
      if (employeeName) {
        details.push(`Assigned to: ${employeeName}`);
      }
      if (condition) details.push(`Condition: ${condition}`);
      if (remarks) details.push(`Notes: ${remarks}`);
      break;

    case "unassigned":
    case "returned":
      title = action === "returned" ? "Asset Returned" : "Asset Unassigned";
      if (employeeName) {
        details.push(`Returned by: ${employeeName}`);
      }
      if (reason) details.push(`Reason: ${reason}`);
      if (condition) details.push(`Condition: ${condition}`);
      if (remarks) details.push(`Notes: ${remarks}`);
      break;

    case "reassigned":
      title = "Asset Reassigned";
      if (employeeName) {
        details.push(`Reassigned to: ${employeeName}`);
      }
      if (changes && changes.previousEmployee) {
        details.push(`From: ${changes.previousEmployee}`);
      }
      if (condition) details.push(`Condition: ${condition}`);
      break;

    case "updated":
      title = "Asset Information Updated";
      if (changes && typeof changes === "object") {
        Object.entries(changes).forEach(([field, change]) => {
          if (
            change &&
            typeof change === "object" &&
            "old" in change &&
            "new" in change
          ) {
            const oldVal = change.old || "(empty)";
            const newVal = change.new || "(empty)";
            const fieldName =
              field.charAt(0).toUpperCase() +
              field.slice(1).replace(/([A-Z])/g, " $1");
            details.push(`${fieldName}: "${oldVal}" → "${newVal}"`);
          }
        });
      }
      if (remarks) details.push(`Notes: ${remarks}`);
      break;

    case "retired":
      title = "Asset Retired";
      if (reason) details.push(`Reason: ${reason}`);
      if (condition) details.push(`Final Condition: ${condition}`);
      break;

    case "added":
      title = "Remarks Added";
      if (remarks) details.push(remarks);
      break;

    case "removed":
      title = "Information Removed";
      if (remarks) details.push(remarks);
      break;

    default:
      title = action || "Unknown Action";
      if (employeeName) details.push(`Employee: ${employeeName}`);
      if (remarks) details.push(remarks);
  }

  return {
    title,
    details,
    hasDetails: details.length > 0,
  };
};
