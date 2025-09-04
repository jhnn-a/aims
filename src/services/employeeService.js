import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../utils/firebase";

// Use this reference for employees collection
const employeesRef = collection(db, "employees");

// Helper to get next available EMP ID
export async function getNextEmpId() {
  const snapshot = await getDocs(employeesRef);
  let maxEmpNum = 0;
  snapshot.forEach((docSnap) => {
    const id = docSnap.id;
    if (id.startsWith("EMP")) {
      const num = parseInt(id.replace("EMP", ""), 10);
      if (!isNaN(num) && num > maxEmpNum) maxEmpNum = num;
    }
  });
  return maxEmpNum + 1;
}

// Helper to update the employee count for a client
export async function updateClientEmployeeCount(clientId) {
  if (!clientId || clientId === "" || clientId === "entity") return;

  try {
    // Count active employees (not resigned and not entities) with this clientId
    const employeesSnap = await getDocs(collection(db, "employees"));
    const count = employeesSnap.docs.filter((docSnap) => {
      const data = docSnap.data();
      return data.clientId === clientId && !data.isResigned && !data.isEntity;
    }).length;

    // Update the client document only if it exists
    const clientRef = doc(db, "clients", clientId);
    const clientSnap = await getDoc(clientRef);
    if (clientSnap.exists()) {
      await updateDoc(clientRef, { employeeCount: count });
    }
  } catch (error) {
    console.error(`Error updating client count for ${clientId}:`, error);
    // Don't throw the error to prevent blocking the main operation
  }
}

export const addEmployee = async (employeeData) => {
  // Always add a dateAdded field if not present
  if (!employeeData.dateAdded) {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    employeeData.dateAdded = new Date(
      now.getTime() - offset * 60 * 1000
    ).toISOString();
  }

  let documentId;
  let dataToSave;

  // Handle entities differently from employees
  if (employeeData.isEntity) {
    // For entities, use the provided ID and don't generate EMP ID
    documentId = employeeData.id;
    dataToSave = { ...employeeData };
  } else {
    // For regular employees, remove id field and generate EMP ID
    const { id, ...restData } = employeeData;
    dataToSave = restData;

    // Generate EMP ID
    const snapshot = await getDocs(employeesRef);
    let maxEmpNum = 0;
    snapshot.forEach((docSnap) => {
      const id = docSnap.id;
      if (id.startsWith("EMP")) {
        const num = parseInt(id.replace("EMP", ""), 10);
        if (!isNaN(num) && num > maxEmpNum) maxEmpNum = num;
      }
    });
    documentId = `EMP${String(maxEmpNum + 1).padStart(4, "0")}`;
  }

  await setDoc(doc(db, "employees", documentId), dataToSave);

  // After adding: Only update client count for employees with valid clientId
  if (employeeData.clientId && !employeeData.isEntity) {
    await updateClientEmployeeCount(employeeData.clientId);
  }
};

export const getAllEmployees = async () => {
  const snapshot = await getDocs(employeesRef);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const getEmployee = async (id) => {
  const docRef = doc(db, "employees", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const updateEmployee = async (id, updatedData) => {
  // Always add a dateAdded field if not present (for legacy)
  if (!updatedData.dateAdded) {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    updatedData.dateAdded = new Date(
      now.getTime() - offset * 60 * 1000
    ).toISOString();
  }
  // Get the old employee data
  const empRef = doc(db, "employees", id);
  const empSnap = await getDoc(empRef);
  let oldClientId = null;
  if (empSnap.exists()) {
    oldClientId = empSnap.data().clientId;
  }
  await updateDoc(empRef, updatedData);

  // Only update client counts for employees, not entities
  if (!updatedData.isEntity) {
    // If clientId changed, update both old and new client counts
    if (updatedData.clientId && updatedData.clientId !== oldClientId) {
      if (oldClientId) await updateClientEmployeeCount(oldClientId);
      await updateClientEmployeeCount(updatedData.clientId);
    } else if (updatedData.clientId) {
      await updateClientEmployeeCount(updatedData.clientId);
    }
  }
};

export const undoResignation = async (id) => {
  // Get the employee data first
  const empRef = doc(db, "employees", id);
  const empSnap = await getDoc(empRef);

  if (!empSnap.exists()) {
    throw new Error("Employee not found");
  }

  const employeeData = empSnap.data();

  if (!employeeData.isResigned) {
    throw new Error("Employee is not resigned");
  }

  const clientId = employeeData.clientId;

  // Remove resignation fields and restore to active status
  const restoredData = {
    ...employeeData,
    isResigned: false,
  };

  // Remove resignation-specific fields
  delete restoredData.dateResigned;
  delete restoredData.resignationReason;

  await updateDoc(empRef, restoredData);

  // Update client employee count (now includes this employee again)
  if (clientId) {
    await updateClientEmployeeCount(clientId);
  }
};

export const resignEmployee = async (id, reason = "") => {
  // Get the employee data first
  const empRef = doc(db, "employees", id);
  const empSnap = await getDoc(empRef);

  if (!empSnap.exists()) {
    throw new Error("Employee not found");
  }

  const employeeData = empSnap.data();
  const clientId = employeeData.clientId;

  // Update employee with resignation info
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const resignationData = {
    ...employeeData,
    isResigned: true,
    dateResigned: new Date(now.getTime() - offset * 60 * 1000).toISOString(),
    resignationReason: reason,
  };

  await updateDoc(empRef, resignationData);

  // Update client employee count (only count active employees)
  if (clientId) {
    await updateClientEmployeeCount(clientId);
  }
};

export const deleteEmployee = async (id) => {
  // Get the employee's clientId before deleting
  const empRef = doc(db, "employees", id);
  const empSnap = await getDoc(empRef);
  let clientId = null;
  if (empSnap.exists()) {
    clientId = empSnap.data().clientId;
  }
  await deleteDoc(empRef);
  if (clientId) {
    await updateClientEmployeeCount(clientId);
  }
};
