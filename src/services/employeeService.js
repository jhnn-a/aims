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
  const newID = `EMP${String(max + 1).padStart(4, "0")}`;
  return newID;
};

export const addEmployee = async (employeeData) => {
  const newID = await generateNewEmployeeID();
  await setDoc(doc(db, "employees", newID), employeeData);
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
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  } else {
    return null;
  }
};

export const updateEmployee = async (id, updatedData) => {
  const docRef = doc(db, "employees", id);
  await updateDoc(docRef, updatedData);
};

export const deleteEmployee = async (id) => {
  const docRef = doc(db, "employees", id);
  await deleteDoc(docRef);
};
