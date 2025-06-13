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

const clientsRef = collection(db, "clients");

export const generateNewClientID = async () => {
  const snapshot = await getDocs(clientsRef);
  const ids = snapshot.docs
    .map((doc) => doc.id)
    .filter((id) => id.startsWith("CLI"))
    .map((id) => parseInt(id.replace("CLI", "")))
    .filter((num) => !isNaN(num));
  const max = ids.length > 0 ? Math.max(...ids) : 0;
  return `CLI${String(max + 1).padStart(4, "0")}`;
};

export const addClient = async (clientData) => {
  const newID = await generateNewClientID();
  const { clientName, employeeCount } = clientData;
  const dataToWrite = { clientName };
  if (typeof employeeCount === "number")
    dataToWrite.employeeCount = employeeCount;
  await setDoc(doc(db, "clients", newID), dataToWrite);
  return newID;
};

export const getAllClients = async () => {
  const snapshot = await getDocs(clientsRef);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const getClient = async (id) => {
  const docRef = doc(db, "clients", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const updateClient = async (id, updatedData) => {
  const { clientName, employeeCount } = updatedData;
  const dataToUpdate = {};
  if (typeof clientName === "string") dataToUpdate.clientName = clientName;
  if (typeof employeeCount === "number")
    dataToUpdate.employeeCount = employeeCount;
  const docRef = doc(db, "clients", id);
  await updateDoc(docRef, dataToUpdate);
};

export const deleteClient = async (id) => {
  const clientRef = doc(db, "clients", id);
  await deleteDoc(clientRef);
};
