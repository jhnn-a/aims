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
  return snapshot.docs.map((doc) => {
    let data = doc.data();
    if (data.clientName) {
      const norm = data.clientName.trim().toLowerCase();
      if (norm === "joii philippines" || norm === "joii philiipines" || norm === "joii phillipines" || norm === "joii philipines") data.clientName = "Workstream PH";
      else if (norm === "joii ph - other services") data.clientName = "WPH - Other Services";
    }
    return {
      id: doc.id,
      ...data,
    };
  });
};

export const getClient = async (id) => {
  const docRef = doc(db, "clients", id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  let data = docSnap.data();
  if (data.clientName) {
    const norm = data.clientName.trim().toLowerCase();
    if (norm === "joii philippines" || norm === "joii philiipines" || norm === "joii phillipines" || norm === "joii philipines") data.clientName = "Workstream PH";
    else if (norm === "joii ph - other services") data.clientName = "WPH - Other Services";
  }
  return { id: docSnap.id, ...data };
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
