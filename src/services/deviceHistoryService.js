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

const historyCollection = collection(db, "deviceHistory");

// Log a device assignment/unassignment event
export const logDeviceHistory = async ({
  employeeId,
  deviceId,
  deviceTag,
  action, // 'assigned' | 'unassigned'
  date,
  reason, // optional, for unassign
  condition, // optional, for unassign
}) => {
  await addDoc(historyCollection, {
    employeeId,
    deviceId,
    deviceTag,
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
