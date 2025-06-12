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

// Reference to the 'clients' collection
const clientsRef = collection(db, "clients");

// Generate new client ID: CLI0001, CLI0002, ...
export const generateNewClientID = async () => {
  const snapshot = await getDocs(clientsRef);
  const ids = snapshot.docs
    .map((doc) => doc.id)
    .filter((id) => id.startsWith("CLI"))
    .map((id) => parseInt(id.replace("CLI", "")))
    .filter((num) => !isNaN(num));

  const max = ids.length > 0 ? Math.max(...ids) : 0;
  const newID = `CLI${String(max + 1).padStart(4, "0")}`;
  return newID;
};

// Add a new client
export const addClient = async (clientData) => {
  const newID = await generateNewClientID();
  await setDoc(doc(db, "clients", newID), clientData);
  return newID;
};

// Get all clients
export const getAllClients = async () => {
  const snapshot = await getDocs(clientsRef);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Get a single client by ID
export const getClient = async (id) => {
  const docRef = doc(db, "clients", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

// Update a client
export const updateClient = async (id, updatedData) => {
  const docRef = doc(db, "clients", id);
  await updateDoc(docRef, updatedData);
};

// Delete a client
export const deleteClient = async (id) => {
  const docRef = doc(db, "clients", id);
  await deleteDoc(docRef);
};
