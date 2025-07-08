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
  action, // 'assigned' | 'unassigned' | 'returned' | 'retired'
  date,
  reason, // optional, for unassign
  condition, // optional, for unassign
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
    date: date || new Date(), // Always store as Date object for consistent timestamps
    reason: reason || null,
    condition: condition || null,
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
    const q = query(
      historyCollection,
      where("deviceTag", "==", deviceTag)
    );
    
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
    const q = query(
      historyCollection,
      where("deviceId", "==", deviceId)
    );
    
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
      condition: "Working",
    }
  ];

  for (const entry of sampleHistory) {
    await addDoc(historyCollection, entry);
  }
  
  return sampleHistory.length;
};
