import { collection, getDocs } from "firebase/firestore";
import { db } from "../utils/firebase";

// Get all unit specifications from both InventoryUnits and DeployedUnits collections
export const getAllUnitSpecs = async () => {
  try {
    const [inventorySnapshot, deployedSnapshot] = await Promise.all([
      getDocs(collection(db, "InventoryUnits")),
      getDocs(collection(db, "DeployedUnits"))
    ]);

    const inventoryUnits = inventorySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      source: "inventory"
    }));

    const deployedUnits = deployedSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      source: "deployed"
    }));

    // Combine both collections
    return [...inventoryUnits, ...deployedUnits];
  } catch (error) {
    console.error("Error fetching unit specifications:", error);
    return [];
  }
};

// Get unit specifications by Tag
export const getUnitSpecsByTag = async (tag) => {
  try {
    const allUnits = await getAllUnitSpecs();
    return allUnits.find(unit => unit.Tag === tag || unit.id === tag);
  } catch (error) {
    console.error("Error fetching unit specifications by tag:", error);
    return null;
  }
};
