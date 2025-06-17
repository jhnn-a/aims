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

// Helper to get next available DEV ID
async function getNextDevId() {
  const snapshot = await getDocs(collection(db, "devices"));
  let maxDevNum = 0;
  snapshot.forEach((docSnap) => {
    const id = docSnap.id;
    if (id.startsWith("DEV")) {
      const num = parseInt(id.replace("DEV", ""), 10);
      if (!isNaN(num) && num > maxDevNum) maxDevNum = num;
    }
  });
  return maxDevNum + 1;
}

// Helper to get next available deviceTag number for a given prefix
function getNextDeviceTagNumber(snapshot, tagPrefix) {
  let maxTagNum = 0;
  snapshot.forEach((docSnap) => {
    const tag = docSnap.data().deviceTag;
    if (tag && tag.startsWith(tagPrefix)) {
      const num = parseInt(tag.replace(tagPrefix, ""), 10);
      if (!isNaN(num) && num > maxTagNum) maxTagNum = num;
    }
  });
  return maxTagNum + 1;
}

export const addDevice = async (deviceData, tagPrefix = "DEV") => {
  const snapshot = await getDocs(collection(db, "devices"));
  let maxDevNum = 0;
  snapshot.forEach((docSnap) => {
    const id = docSnap.id;
    if (id.startsWith("DEV")) {
      const num = parseInt(id.replace("DEV", ""), 10);
      if (!isNaN(num) && num > maxDevNum) maxDevNum = num;
    }
  });
  const nextDevId = `DEV${String(maxDevNum + 1).padStart(4, "0")}`;

  // Set deviceTag as a field, not as the document ID
  await setDoc(doc(db, "devices", nextDevId), {
    ...deviceData,
    deviceTag: deviceData.deviceTag, // e.g., JOIIKB0001
  });
};

export async function addMultipleDevices(deviceData, quantity, tagPrefix) {
  const snapshot = await getDocs(collection(db, "devices"));

  // Find next DEV id
  let maxDevNum = 0;
  snapshot.forEach((docSnap) => {
    const id = docSnap.id;
    if (id.startsWith("DEV")) {
      const num = parseInt(id.replace("DEV", ""), 10);
      if (!isNaN(num) && num > maxDevNum) maxDevNum = num;
    }
  });

  // Find next deviceTag number for the prefix
  let maxTagNum = 0;
  snapshot.forEach((docSnap) => {
    const tag = docSnap.data().deviceTag;
    if (tag && tag.startsWith(tagPrefix)) {
      const num = parseInt(tag.replace(tagPrefix, ""), 10);
      if (!isNaN(num) && num > maxTagNum) maxTagNum = num;
    }
  });

  // Create devices
  for (let i = 1; i <= quantity; i++) {
    const devId = `DEV${String(maxDevNum + i).padStart(4, "0")}`;
    const deviceTag = `${tagPrefix}${String(maxTagNum + i).padStart(4, "0")}`;
    await setDoc(doc(db, "devices", devId), {
      ...deviceData,
      deviceTag,
    });
  }
}

export const getAllDevices = async () => {
  const snapshot = await getDocs(collection(db, "devices"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const getDevice = async (id) => {
  const docRef = doc(db, "devices", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const updateDevice = async (id, updatedData) => {
  const deviceRef = doc(db, "devices", id);
  await updateDoc(deviceRef, updatedData);
};

export const deleteDevice = async (id) => {
  const deviceRef = doc(db, "devices", id);
  await deleteDoc(deviceRef);
};
