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
    date: date || new Date().toISOString(),
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
