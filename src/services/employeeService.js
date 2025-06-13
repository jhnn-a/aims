import { db } from "../utils/firebase";
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

const employeesRef = collection(db, "employees");

export const generateNewEmployeeID = async () => {
  const snapshot = await getDocs(employeesRef);
  const ids = snapshot.docs
    .map((doc) => doc.id)
    .filter((id) => id.startsWith("EMP"))
    .map((id) => parseInt(id.replace("EMP", "")))
    .filter((num) => !isNaN(num));
  const max = ids.length > 0 ? Math.max(...ids) : 0;
  return `EMP${String(max + 1).padStart(4, "0")}`;
};

const updateClientEmployeeCount = async (clientId) => {
  if (!clientId) return;
  const employeesSnapshot = await getDocs(employeesRef);
  const count = employeesSnapshot.docs.filter(
    (doc) => doc.data().clientId === clientId
  ).length;
  const clientRef = doc(db, "clients", clientId);
  await updateDoc(clientRef, { employeeCount: count });
};

export const addEmployee = async (employeeData) => {
  const newID = await generateNewEmployeeID();
  await setDoc(doc(db, "employees", newID), {
    fullName: employeeData.fullName,
    position: employeeData.position,
    clientId: employeeData.clientId,
    department: employeeData.department,
  });
  await updateClientEmployeeCount(employeeData.clientId);
  return newID;
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
  const oldEmployee = await getEmployee(id);
  const employeeRef = doc(db, "employees", id);
  await updateDoc(employeeRef, updatedData);
  if (oldEmployee && oldEmployee.clientId !== updatedData.clientId) {
    await updateClientEmployeeCount(oldEmployee.clientId);
    await updateClientEmployeeCount(updatedData.clientId);
  } else {
    await updateClientEmployeeCount(updatedData.clientId);
  }
};

export const deleteEmployee = async (id) => {
  const employee = await getEmployee(id);
  const employeeRef = doc(db, "employees", id);
  await deleteDoc(employeeRef);
  if (employee && employee.clientId) {
    await updateClientEmployeeCount(employee.clientId);
  }
};
