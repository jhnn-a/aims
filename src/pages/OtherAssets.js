// === OTHER ASSETS PAGE MAIN COMPONENT ===
// This file handles the display and management of other company assets (non-IT assets)
// Main features: View other assets, add/edit/delete assets, import/export, monitoring only

// === IMPORTS ===
import React, { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useSnackbar } from "../components/Snackbar";
import { TableLoadingSpinner } from "../components/LoadingSpinner";
import {
  TextFilter,
  DropdownFilter,
  DateFilter,
  useTableFilters,
} from "../components/TableHeaderFilters";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import * as XLSX from "xlsx";

// === ASSET CATEGORIES CONFIGURATION ===
const ASSET_CATEGORIES = [
  "Office Equipment",
  "Furniture",
  "Other Tools/Equipment",
  "Appliances",
  "Vehicles",
  "Building & Infrastructure",
  "Safety Equipment",
];

// === DEVICE TYPES BY CATEGORY ===
const DEVICE_TYPES_BY_CATEGORY = {
  "Office Equipment": [
    "Printer",
    "Scanner",
    "Copier",
    "Fax Machine",
    "Projector",
    "Whiteboard",
    "Bulletin Board",
    "Filing Cabinet",
    "Shredder",
    "Laminator",
  ],
  Furniture: [
    "Desk",
    "Chair",
    "Table",
    "Cabinet",
    "Shelf",
    "Sofa",
    "Conference Table",
    "Reception Desk",
    "Workstation",
    "Storage Unit",
  ],
  "Other Tools/Equipment": [
    "Drill",
    "Hammer",
    "Screwdriver Set",
    "Ladder",
    "Toolbox",
    "Measuring Tools",
    "Cleaning Equipment",
    "Garden Tools",
  ],
  Appliances: [
    "Refrigerator",
    "Microwave",
    "Coffee Machine",
    "Water Dispenser",
    "Air Conditioner",
    "Electric Fan",
    "Heater",
    "Vacuum Cleaner",
  ],
  Vehicles: ["Company Car", "Delivery Truck", "Motorcycle", "Bicycle", "Van"],
  "Building & Infrastructure": [
    "Generator",
    "Fire Extinguisher",
    "Security Camera",
    "Door Lock",
    "Window",
    "Lighting Fixture",
    "Electrical Panel",
  ],
  "Safety Equipment": [
    "First Aid Kit",
    "Safety Helmet",
    "Safety Vest",
    "Fire Extinguisher",
    "Emergency Light",
    "Safety Goggles",
    "Gloves",
  ],
};

// === MAIN OTHER ASSETS COMPONENT ===
function OtherAssets() {
  const { isDarkMode } = useTheme();
  const { showSuccess, showError } = useSnackbar();

  // === STATE MANAGEMENT ===
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    deviceType: "",
    acquisitionDate: new Date().toISOString().split("T")[0],
    location: "",
    ownedBy: "",
    qty: 1,
    remarks: "",
  });

  // === TABLE FILTERING SYSTEM ===
  const {
    filters: headerFilters,
    updateFilter: updateHeaderFilter,
    clearAllFilters: clearAllHeaderFilters,
    hasActiveFilters: hasActiveHeaderFilters,
  } = useTableFilters();

  // === LOAD ASSETS ===
  const loadAssets = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "otherAssets"));
      const assetsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAssets(assetsData);
    } catch (error) {
      console.error("Error loading other assets:", error);
      showError("Failed to load other assets");
    } finally {
      setLoading(false);
    }
  };

  // === LOAD DATA ON COMPONENT MOUNT ===
  useEffect(() => {
    loadAssets();
  }, []);

  // === FILTERED ASSETS ===
  const filteredAssets = assets.filter((asset) => {
    // Search filter
    const searchTerm = search.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      asset.category?.toLowerCase().includes(searchTerm) ||
      asset.deviceType?.toLowerCase().includes(searchTerm) ||
      asset.location?.toLowerCase().includes(searchTerm) ||
      asset.ownedBy?.toLowerCase().includes(searchTerm) ||
      asset.remarks?.toLowerCase().includes(searchTerm);

    // Header filters
    const matchesCategory =
      !headerFilters.category || asset.category === headerFilters.category;
    const matchesDeviceType =
      !headerFilters.deviceType ||
      asset.deviceType === headerFilters.deviceType;
    const matchesLocation =
      !headerFilters.location ||
      asset.location
        ?.toLowerCase()
        .includes(headerFilters.location.toLowerCase());
    const matchesOwnedBy =
      !headerFilters.ownedBy ||
      asset.ownedBy
        ?.toLowerCase()
        .includes(headerFilters.ownedBy.toLowerCase());
    const matchesAcquisitionDate =
      !headerFilters.acquisitionDate ||
      asset.acquisitionDate?.includes(headerFilters.acquisitionDate);
    const matchesQty =
      !headerFilters.qty || asset.qty?.toString().includes(headerFilters.qty);
    const matchesRemarks =
      !headerFilters.remarks ||
      asset.remarks
        ?.toLowerCase()
        .includes(headerFilters.remarks.toLowerCase());

    return (
      matchesSearch &&
      matchesCategory &&
      matchesDeviceType &&
      matchesLocation &&
      matchesOwnedBy &&
      matchesAcquisitionDate &&
      matchesQty &&
      matchesRemarks
    );
  });

  // === FORM HANDLERS ===
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "category") {
      // Reset device type when category changes
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        deviceType: "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      category: "",
      deviceType: "",
      acquisitionDate: new Date().toISOString().split("T")[0],
      location: "",
      ownedBy: "",
      qty: 1,
      remarks: "",
    });
  };

  // === ADD ASSET ===
  const handleAddAsset = async () => {
    try {
      if (
        !formData.category ||
        !formData.deviceType ||
        !formData.location ||
        !formData.ownedBy
      ) {
        showError("Please fill in all required fields");
        return;
      }

      await addDoc(collection(db, "otherAssets"), {
        ...formData,
        qty: parseInt(formData.qty) || 1,
        createdAt: new Date().toISOString(),
      });

      showSuccess("Asset added successfully");
      setShowAddModal(false);
      resetForm();
      loadAssets();
    } catch (error) {
      console.error("Error adding asset:", error);
      showError("Failed to add asset");
    }
  };

  // === EDIT ASSET ===
  const handleEditAsset = async () => {
    try {
      if (
        !formData.category ||
        !formData.deviceType ||
        !formData.location ||
        !formData.ownedBy
      ) {
        showError("Please fill in all required fields");
        return;
      }

      await updateDoc(doc(db, "otherAssets", selectedAsset.id), {
        ...formData,
        qty: parseInt(formData.qty) || 1,
        updatedAt: new Date().toISOString(),
      });

      showSuccess("Asset updated successfully");
      setShowEditModal(false);
      setSelectedAsset(null);
      resetForm();
      loadAssets();
    } catch (error) {
      console.error("Error updating asset:", error);
      showError("Failed to update asset");
    }
  };

  // === DELETE ASSET ===
  const handleDeleteAsset = async () => {
    try {
      await deleteDoc(doc(db, "otherAssets", selectedAsset.id));
      showSuccess("Asset deleted successfully");
      setShowDeleteConfirm(false);
      setSelectedAsset(null);
      loadAssets();
    } catch (error) {
      console.error("Error deleting asset:", error);
      showError("Failed to delete asset");
    }
  };

  // === OPEN EDIT MODAL ===
  const openEditModal = (asset) => {
    setSelectedAsset(asset);
    setFormData({
      category: asset.category || "",
      deviceType: asset.deviceType || "",
      acquisitionDate: asset.acquisitionDate || "",
      location: asset.location || "",
      ownedBy: asset.ownedBy || "",
      qty: asset.qty || 1,
      remarks: asset.remarks || "",
    });
    setShowEditModal(true);
  };

  // === OPEN DELETE CONFIRMATION ===
  const openDeleteConfirm = (asset) => {
    setSelectedAsset(asset);
    setShowDeleteConfirm(true);
  };

  // === EXPORT TO EXCEL ===
  const handleExport = () => {
    try {
      const exportData = filteredAssets.map((asset, index) => ({
        "No.": index + 1,
        Category: asset.category,
        "Device Type": asset.deviceType,
        "Acquisition Date": asset.acquisitionDate,
        Location: asset.location,
        "Owned By": asset.ownedBy,
        Qty: asset.qty,
        Remarks: asset.remarks || "",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Other Assets");
      XLSX.writeFile(
        wb,
        `Other_Assets_${new Date().toISOString().split("T")[0]}.xlsx`
      );

      showSuccess("Other assets exported successfully");
    } catch (error) {
      console.error("Error exporting:", error);
      showError("Failed to export other assets");
    }
  };

  // === IMPORT FROM EXCEL ===
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        const totalRows = jsonData.length;

        showSuccess(`Starting import of ${totalRows} rows...`);

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          try {
            const assetData = {
              category: row["Category"] || "",
              deviceType: row["Device Type"] || "",
              acquisitionDate: row["Acquisition Date"] || "",
              location: row["Location"] || "",
              ownedBy: row["Owned By"] || "",
              qty: parseInt(row["Qty"]) || 1,
              remarks: row["Remarks"] || "",
              createdAt: new Date().toISOString(),
            };

            // Check if required fields are present
            if (
              !assetData.category ||
              !assetData.deviceType ||
              !assetData.location ||
              !assetData.ownedBy
            ) {
              skippedCount++;
              continue;
            }

            // Check for valid category
            if (!ASSET_CATEGORIES.includes(assetData.category)) {
              skippedCount++;
              continue;
            }

            // Check for valid device type for the category
            if (
              !DEVICE_TYPES_BY_CATEGORY[assetData.category]?.includes(
                assetData.deviceType
              )
            ) {
              skippedCount++;
              continue;
            }

            await addDoc(collection(db, "otherAssets"), assetData);
            successCount++;
          } catch (error) {
            console.error(`Error importing row ${i + 1}:`, error);
            errorCount++;
          }
        }

        // Show detailed import results
        if (successCount > 0 || skippedCount > 0 || errorCount > 0) {
          const messages = [];
          if (successCount > 0)
            messages.push(`${successCount} imported successfully`);
          if (skippedCount > 0)
            messages.push(`${skippedCount} skipped (invalid data)`);
          if (errorCount > 0) messages.push(`${errorCount} failed`);

          if (successCount > 0) {
            showSuccess(`Import completed: ${messages.join(", ")}`);
            loadAssets();
          } else if (skippedCount > 0 || errorCount > 0) {
            showError(`Import completed with issues: ${messages.join(", ")}`);
          }
        } else {
          showError("No valid data found to import");
        }
      } catch (error) {
        console.error("Error importing file:", error);
        showError(
          "Failed to import file. Please check the file format and try again."
        );
      } finally {
        setImporting(false);
      }
    };

    reader.onerror = () => {
      setImporting(false);
      showError("Failed to read the file. Please try again.");
    };

    reader.readAsBinaryString(file);
    event.target.value = ""; // Reset file input
  };

  // === RENDER MODAL ===
  const renderModal = (isEdit = false) => (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: isDarkMode ? "#1f2937" : "#ffffff",
          borderRadius: "8px",
          padding: "24px",
          width: "90%",
          maxWidth: "400px",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "600",
              color: isDarkMode ? "#f3f4f6" : "#374151",
            }}
          >
            {isEdit ? "Edit Asset" : "Add New Asset"}
          </h2>
          <button
            onClick={() => {
              if (isEdit) {
                setShowEditModal(false);
                setSelectedAsset(null);
              } else {
                setShowAddModal(false);
              }
              resetForm();
            }}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: isDarkMode ? "#9ca3af" : "#6b7280",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Category */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: "500",
                color: isDarkMode ? "#f3f4f6" : "#374151",
              }}
            >
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                borderRadius: "4px",
                background: isDarkMode ? "#374151" : "#ffffff",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            >
              <option value="">Select Category</option>
              {ASSET_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Device Type */}
          {formData.category && (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                }}
              >
                Device Type *
              </label>
              <select
                name="deviceType"
                value={formData.deviceType}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                  borderRadius: "4px",
                  background: isDarkMode ? "#374151" : "#ffffff",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              >
                <option value="">Select Device Type</option>
                {DEVICE_TYPES_BY_CATEGORY[formData.category]?.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Acquisition Date */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: "500",
                color: isDarkMode ? "#f3f4f6" : "#374151",
              }}
            >
              Acquisition Date
            </label>
            <input
              type="date"
              name="acquisitionDate"
              value={formData.acquisitionDate}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                borderRadius: "4px",
                background: isDarkMode ? "#374151" : "#ffffff",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Location */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: "500",
                color: isDarkMode ? "#f3f4f6" : "#374151",
              }}
            >
              Location *
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Enter location"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                borderRadius: "4px",
                background: isDarkMode ? "#374151" : "#ffffff",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Owned By */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: "500",
                color: isDarkMode ? "#f3f4f6" : "#374151",
              }}
            >
              Owned By *
            </label>
            <input
              type="text"
              name="ownedBy"
              value={formData.ownedBy}
              onChange={handleInputChange}
              placeholder="Department or person responsible"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                borderRadius: "4px",
                background: isDarkMode ? "#374151" : "#ffffff",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Quantity */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: "500",
                color: isDarkMode ? "#f3f4f6" : "#374151",
              }}
            >
              Quantity
            </label>
            <input
              type="number"
              name="qty"
              value={formData.qty}
              onChange={handleInputChange}
              min="1"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                borderRadius: "4px",
                background: isDarkMode ? "#374151" : "#ffffff",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Remarks */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: "500",
                color: isDarkMode ? "#f3f4f6" : "#374151",
              }}
            >
              Remarks
            </label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              placeholder="Additional notes or information"
              rows="3"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                borderRadius: "4px",
                background: isDarkMode ? "#374151" : "#ffffff",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: "14px",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "24px",
          }}
        >
          <button
            onClick={() => {
              if (isEdit) {
                setShowEditModal(false);
                setSelectedAsset(null);
              } else {
                setShowAddModal(false);
              }
              resetForm();
            }}
            style={{
              padding: "8px 16px",
              border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
              borderRadius: "4px",
              background: isDarkMode ? "#374151" : "#ffffff",
              color: isDarkMode ? "#f3f4f6" : "#374151",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={isEdit ? handleEditAsset : handleAddAsset}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            {isEdit ? "Update Asset" : "Add Asset"}
          </button>
        </div>
      </div>
    </div>
  );

  // === RENDER DELETE CONFIRMATION ===
  const renderDeleteConfirm = () => (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: isDarkMode ? "#1f2937" : "#ffffff",
          borderRadius: "8px",
          padding: "24px",
          width: "90%",
          maxWidth: "400px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px 0",
            fontSize: "18px",
            fontWeight: "600",
            color: isDarkMode ? "#f3f4f6" : "#374151",
          }}
        >
          Confirm Delete
        </h3>
        <p
          style={{
            margin: "0 0 24px 0",
            color: isDarkMode ? "#d1d5db" : "#6b7280",
          }}
        >
          Are you sure you want to delete this asset? This action cannot be
          undone.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            onClick={() => {
              setShowDeleteConfirm(false);
              setSelectedAsset(null);
            }}
            style={{
              padding: "8px 16px",
              border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
              borderRadius: "4px",
              background: isDarkMode ? "#374151" : "#ffffff",
              color: isDarkMode ? "#f3f4f6" : "#374151",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteAsset}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              background: "#dc2626",
              color: "#ffffff",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  // === MAIN RENDER ===
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
        fontFamily:
          'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: "hidden",
        boxSizing: "border-box",
        color: isDarkMode ? "#f3f4f6" : "#222e3a",
      }}
    >
      <style>{`
        /* Custom scrollbar with transparent background */
        .other-assets-main-scroll::-webkit-scrollbar {
          width: 10px;
        }

        .other-assets-main-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .other-assets-main-scroll::-webkit-scrollbar-thumb {
          background: ${
            isDarkMode ? "rgba(156, 163, 175, 0.3)" : "rgba(209, 213, 219, 0.5)"
          };
          border-radius: 5px;
        }

        .other-assets-main-scroll::-webkit-scrollbar-thumb:hover {
          background: ${
            isDarkMode ? "rgba(156, 163, 175, 0.5)" : "rgba(209, 213, 219, 0.8)"
          };
        }

        /* Firefox scrollbar */
        .other-assets-main-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${
            isDarkMode ? "rgba(156, 163, 175, 0.3)" : "rgba(209, 213, 219, 0.5)"
          } transparent;
        }
      `}</style>

      {/* Fixed Header - Search bar and buttons section */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          flexShrink: 0,
          background: isDarkMode ? "#1f2937" : "rgb(255, 255, 255)",
          borderBottom: `1px solid ${isDarkMode ? "#374151" : "#e5e7eb"}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: `1px solid ${isDarkMode ? "#374151" : "#e5e7eb"}`,
            gap: "12px",
            flexWrap: "wrap",
          }}
          className="other-assets-search-container"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: isDarkMode ? "#374151" : "#f9fafb",
              borderRadius: "6px",
              border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
              padding: "10px 14px",
              flex: 1,
              maxWidth: "400px",
              minWidth: "280px",
            }}
          >
            <svg
              width="18"
              height="18"
              style={{
                color: isDarkMode ? "#9ca3af" : "#6b7280",
                opacity: 0.8,
              }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search other assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "14px",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                padding: "0 0 0 10px",
                width: "100%",
                fontWeight: 400,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginLeft: "auto",
              flexWrap: "wrap",
            }}
          >
            {/* Clear Filters Button */}
            {hasActiveHeaderFilters && (
              <button
                onClick={clearAllHeaderFilters}
                style={{
                  padding: "9px 16px",
                  border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                  borderRadius: "6px",
                  background: isDarkMode ? "#374151" : "#f3f4f6",
                  color: isDarkMode ? "#f3f4f6" : "#374151",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                Clear Filters
              </button>
            )}

            {/* Import Button */}
            <label
              style={{
                padding: "10px 16px",
                border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                borderRadius: "6px",
                background: importing
                  ? isDarkMode
                    ? "#374151"
                    : "#f3f4f6"
                  : isDarkMode
                  ? "#374151"
                  : "#ffffff",
                color: importing
                  ? isDarkMode
                    ? "#6b7280"
                    : "#9ca3af"
                  : isDarkMode
                  ? "#f3f4f6"
                  : "#374151",
                fontSize: "14px",
                fontWeight: "500",
                cursor: importing ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: importing ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              {importing ? "Importing..." : "Import"}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                disabled={importing}
                style={{ display: "none" }}
              />
            </label>

            {/* Export Button */}
            <button
              onClick={handleExport}
              style={{
                padding: "10px 16px",
                border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                borderRadius: "6px",
                background: isDarkMode ? "#374151" : "#ffffff",
                color: isDarkMode ? "#f3f4f6" : "#374151",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Export
            </button>

            {/* Add Device Button */}
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: "10px 16px",
                border: "none",
                borderRadius: "6px",
                background: "#2563eb",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Add Device
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div
        className="other-assets-main-scroll"
        style={{
          flex: 1,
          overflow: "auto",
          background: isDarkMode ? "#1f2937" : "#ffffff",
          padding: "0 20px 20px 20px",
        }}
      >
        {loading ? (
          <TableLoadingSpinner />
        ) : (
          <div
            style={{
              overflowX: "auto",
              overflowY: "auto",
              maxHeight: "100%",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "900px", // Increased for better laptop/desktop display
                borderCollapse: "collapse",
                background: isDarkMode ? "#1f2937" : "#fff",
                fontSize: "14px",
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
                tableLayout: "fixed", // Fixed layout for better column control
              }}
            >
              <thead style={{ position: "sticky", top: "0", zIndex: "10" }}>
                {/* Header Row */}
                <tr style={{ background: isDarkMode ? "#374151" : "#f9fafb" }}>
                  <th
                    style={{
                      padding: "12px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      color: isDarkMode ? "#f3f4f6" : "rgb(55, 65, 81)",
                      fontWeight: 500,
                      fontSize: 12,
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      textAlign: "left",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                      width: "60px",
                    }}
                  >
                    NO.
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      color: isDarkMode ? "#f3f4f6" : "rgb(55, 65, 81)",
                      fontWeight: 500,
                      fontSize: 12,
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      textAlign: "left",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                    }}
                  >
                    CATEGORY
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      color: isDarkMode ? "#f3f4f6" : "rgb(55, 65, 81)",
                      fontWeight: 500,
                      fontSize: 12,
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      textAlign: "left",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                    }}
                  >
                    DEVICE TYPE
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      color: isDarkMode ? "#f3f4f6" : "rgb(55, 65, 81)",
                      fontWeight: 500,
                      fontSize: 12,
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      textAlign: "left",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                    }}
                  >
                    ACQUISITION DATE
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      color: isDarkMode ? "#f3f4f6" : "rgb(55, 65, 81)",
                      fontWeight: 500,
                      fontSize: 12,
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      textAlign: "left",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                    }}
                  >
                    LOCATION
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      color: isDarkMode ? "#f3f4f6" : "rgb(55, 65, 81)",
                      fontWeight: 500,
                      fontSize: 12,
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      textAlign: "left",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                    }}
                  >
                    OWNED BY
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      color: isDarkMode ? "#f3f4f6" : "rgb(55, 65, 81)",
                      fontWeight: 500,
                      fontSize: 12,
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      textAlign: "center",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                      width: "80px",
                    }}
                  >
                    QTY
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      color: isDarkMode ? "#f3f4f6" : "rgb(55, 65, 81)",
                      fontWeight: 500,
                      fontSize: 12,
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      textAlign: "left",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                    }}
                  >
                    REMARKS
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      color: isDarkMode ? "#f3f4f6" : "rgb(55, 65, 81)",
                      fontWeight: 500,
                      fontSize: 12,
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      textAlign: "center",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                      width: "120px",
                    }}
                  >
                    ACTION
                  </th>
                </tr>

                {/* Filter Row */}
                <tr
                  style={{
                    background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                    borderBottom: `2px solid ${
                      isDarkMode ? "#1f2937" : "#374151"
                    }`,
                  }}
                >
                  <th
                    style={{
                      padding: "8px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      position: "sticky",
                      top: "46px",
                      zIndex: 9,
                    }}
                  >
                    {/* Empty cell for No. column */}
                  </th>
                  <th
                    style={{
                      padding: "8px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      position: "sticky",
                      top: "46px",
                      zIndex: 9,
                    }}
                  >
                    <DropdownFilter
                      value={headerFilters.category || ""}
                      onChange={(value) =>
                        updateHeaderFilter("category", value)
                      }
                      options={[
                        ...new Set(
                          assets.map((asset) => asset.category).filter(Boolean)
                        ),
                      ]}
                      placeholder="All Categories"
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      position: "sticky",
                      top: "46px",
                      zIndex: 9,
                    }}
                  >
                    <DropdownFilter
                      value={headerFilters.deviceType || ""}
                      onChange={(value) =>
                        updateHeaderFilter("deviceType", value)
                      }
                      options={[
                        ...new Set(
                          assets
                            .map((asset) => asset.deviceType)
                            .filter(Boolean)
                        ),
                      ]}
                      placeholder="All Device Types"
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      position: "sticky",
                      top: "46px",
                      zIndex: 9,
                    }}
                  >
                    <DateFilter
                      value={headerFilters.acquisitionDate || ""}
                      onChange={(value) =>
                        updateHeaderFilter("acquisitionDate", value)
                      }
                      placeholder="Filter by date..."
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      position: "sticky",
                      top: "46px",
                      zIndex: 9,
                    }}
                  >
                    <TextFilter
                      value={headerFilters.location || ""}
                      onChange={(value) =>
                        updateHeaderFilter("location", value)
                      }
                      placeholder="Filter by location..."
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      position: "sticky",
                      top: "46px",
                      zIndex: 9,
                    }}
                  >
                    <TextFilter
                      value={headerFilters.ownedBy || ""}
                      onChange={(value) => updateHeaderFilter("ownedBy", value)}
                      placeholder="Filter by owner..."
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      position: "sticky",
                      top: "46px",
                      zIndex: 9,
                    }}
                  >
                    <TextFilter
                      value={headerFilters.qty || ""}
                      onChange={(value) => updateHeaderFilter("qty", value)}
                      placeholder="Filter qty..."
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      position: "sticky",
                      top: "46px",
                      zIndex: 9,
                    }}
                  >
                    <TextFilter
                      value={headerFilters.remarks || ""}
                      onChange={(value) => updateHeaderFilter("remarks", value)}
                      placeholder="Filter remarks..."
                    />
                  </th>
                  <th
                    style={{
                      padding: "8px 16px",
                      background: isDarkMode ? "#374151" : "rgb(255, 255, 255)",
                      border: `1px solid ${isDarkMode ? "#4b5563" : "#e5e7eb"}`,
                      position: "sticky",
                      top: "46px",
                      zIndex: 9,
                    }}
                  >
                    {/* Empty cell for Action column */}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: isDarkMode ? "#9ca3af" : "#6b7280",
                        fontStyle: "italic",
                        fontSize: 14,
                        background: isDarkMode ? "#1f2937" : "#fff",
                        borderBottom: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                      }}
                    >
                      {hasActiveHeaderFilters || search
                        ? "No assets match the current filters."
                        : 'No other assets found. Click "Add Device" to add your first asset.'}
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset, index) => (
                    <tr
                      key={asset.id}
                      style={{
                        borderBottom: isDarkMode
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          color: isDarkMode ? "#f3f4f6" : "#374151",
                          fontSize: 14,
                          borderBottom: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          borderRight: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          background: isDarkMode ? "#1f2937" : "#fff",
                          verticalAlign: "middle",
                        }}
                      >
                        {index + 1}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: isDarkMode ? "#f3f4f6" : "#374151",
                          fontSize: 14,
                          borderBottom: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          borderRight: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          background: isDarkMode ? "#1f2937" : "#fff",
                          verticalAlign: "middle",
                          wordBreak: "break-word",
                        }}
                      >
                        {asset.category}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: isDarkMode ? "#f3f4f6" : "#374151",
                          fontSize: 14,
                          borderBottom: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          borderRight: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          background: isDarkMode ? "#1f2937" : "#fff",
                          verticalAlign: "middle",
                          wordBreak: "break-word",
                        }}
                      >
                        {asset.deviceType}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: isDarkMode ? "#f3f4f6" : "#374151",
                          fontSize: 14,
                          borderBottom: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          borderRight: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          background: isDarkMode ? "#1f2937" : "#fff",
                          verticalAlign: "middle",
                          wordBreak: "break-word",
                        }}
                      >
                        {asset.acquisitionDate}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: isDarkMode ? "#f3f4f6" : "#374151",
                          fontSize: 14,
                          borderBottom: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          borderRight: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          background: isDarkMode ? "#1f2937" : "#fff",
                          verticalAlign: "middle",
                          wordBreak: "break-word",
                        }}
                      >
                        {asset.location}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: isDarkMode ? "#f3f4f6" : "#374151",
                          fontSize: 14,
                          borderBottom: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          borderRight: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          background: isDarkMode ? "#1f2937" : "#fff",
                          verticalAlign: "middle",
                          wordBreak: "break-word",
                        }}
                      >
                        {asset.ownedBy}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "center",
                          color: isDarkMode ? "#f3f4f6" : "#374151",
                          fontSize: 14,
                          borderBottom: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          borderRight: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          background: isDarkMode ? "#1f2937" : "#fff",
                          verticalAlign: "middle",
                        }}
                      >
                        {asset.qty}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: isDarkMode ? "#f3f4f6" : "#374151",
                          fontSize: 14,
                          borderBottom: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          borderRight: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          background: isDarkMode ? "#1f2937" : "#fff",
                          verticalAlign: "middle",
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {asset.remarks || "-"}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "center",
                          fontSize: 14,
                          borderBottom: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                          background: isDarkMode ? "#1f2937" : "#fff",
                          verticalAlign: "middle",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            style={{
                              background: "transparent",
                              border: "none",
                              borderRadius: "4px",
                              padding: "3px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s ease",
                              color: isDarkMode ? "#9ca3af" : "#6b7280",
                              minWidth: "24px",
                              minHeight: "24px",
                            }}
                            title="Edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(asset);
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#3b82f6";
                              e.currentTarget.style.color = "#ffffff";
                              e.currentTarget.style.transform = "scale(1.1)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(59, 130, 246, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = isDarkMode
                                ? "#9ca3af"
                                : "#6b7280";
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                          </button>
                          <button
                            style={{
                              background: "transparent",
                              border: "none",
                              borderRadius: "4px",
                              padding: "3px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s ease",
                              color: isDarkMode ? "#9ca3af" : "#6b7280",
                              minWidth: "24px",
                              minHeight: "24px",
                            }}
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteConfirm(asset);
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#dc2626";
                              e.currentTarget.style.color = "#ffffff";
                              e.currentTarget.style.transform = "scale(1.1)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(220, 38, 38, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = isDarkMode
                                ? "#9ca3af"
                                : "#6b7280";
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              viewBox="0 0 24 24"
                            >
                              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && renderModal(false)}
      {showEditModal && renderModal(true)}
      {showDeleteConfirm && renderDeleteConfirm()}
    </div>
  );
}

export default OtherAssets;
