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
  if (!clientId) return;
  // Count employees with this clientId
  const employeesSnap = await getDocs(collection(db, "employees"));
  const count = employeesSnap.docs.filter(
    (docSnap) => docSnap.data().clientId === clientId
  ).length;
  // Update the client document
  const clientRef = doc(db, "clients", clientId);
  await updateDoc(clientRef, { employeeCount: count });
}

export const addEmployee = async (employeeData) => {
  // Remove id field if present
  const { id, ...dataToSave } = employeeData;
  // Always add a dateAdded field if not present
  if (!dataToSave.dateAdded) {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    dataToSave.dateAdded = new Date(
      now.getTime() - offset * 60 * 1000
    ).toISOString();
  }
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
  const nextEmpId = `EMP${String(maxEmpNum + 1).padStart(4, "0")}`;
  await setDoc(doc(db, "employees", nextEmpId), dataToSave);
  // After adding:
  if (employeeData.clientId) {
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
  // If clientId changed, update both old and new client counts
  if (updatedData.clientId && updatedData.clientId !== oldClientId) {
    if (oldClientId) await updateClientEmployeeCount(oldClientId);
    await updateClientEmployeeCount(updatedData.clientId);
  } else if (updatedData.clientId) {
    await updateClientEmployeeCount(updatedData.clientId);
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
