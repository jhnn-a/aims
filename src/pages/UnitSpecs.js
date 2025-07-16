import React, { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import LoadingSpinner, {
  TableLoadingSpinner,
} from "../components/LoadingSpinner";
// Import XLSX for Excel import
import * as XLSX from "xlsx";
// Import snackbar for notifications
import { useSnackbar } from "../components/Snackbar";

const emptyUnit = {
  Tag: "",
  cpuGen: "", // New field for CPU generation
  cpuModel: "", // New field for CPU model
  CPU: "",
  RAM: "",
  Drive: "",
  GPU: "",
  Status: "",
  OS: "",
  Remarks: "",
};

const cpuGenOptions = ["i3", "i5", "i7"];
const ramOptions = Array.from({ length: 32 }, (_, i) => i + 1);

const osOptions = [
  { label: "Windows 10", value: "WIN10" },
  { label: "Windows 11", value: "WIN11" },
];

const statusOptions = [
  { label: "Good", value: "Good" },
  { label: "Brand New", value: "Brand New" },
  { label: "Defective", value: "Defective" },
];

// --- Modern Table Styles (matching Assets.js design) ---
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
  fontSize: "14px",
};

const thStyle = {
  color: "#374151",
  fontWeight: 500,
  padding: "12px 16px",
  border: "none",
  textAlign: "left",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  background: "rgb(255, 255, 255)",
  borderBottom: "1px solid #e5e7eb",
  cursor: "pointer",
};

const tdStyle = {
  padding: "12px 16px",
  color: "#6b7280",
  fontSize: "14px",
  borderBottom: "1px solid #f3f4f6",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
};

const trStyle = (index) => ({
  background: index % 2 === 0 ? "rgb(250, 250, 252)" : "rgb(240, 240, 243)",
  cursor: "pointer",
  transition: "background 0.15s",
  borderBottom: "1px solid #f3f4f6",
});

const trHoverStyle = (index) => ({
  background: index % 2 === 0 ? "rgb(235, 235, 240)" : "rgb(225, 225, 235)",
});

const actionButtonStyle = {
  background: "transparent",
  border: "none",
  borderRadius: "6px",
  padding: "6px",
  margin: "0 2px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
  color: "#6b7280",
  width: "32px",
  height: "32px",
};

const moveButtonStyle = {
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.2s ease",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const editIcon = (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const deleteIcon = (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    <polyline points="3,6 5,6 21,6" />
    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const UnitSpecs = () => {
  // Initialize snackbar hook
  const { showSuccess, showError, showInfo } = useSnackbar();
  
  const [inventory, setInventory] = useState([]);
  const [deployed, setDeployed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyUnit);
  const [addTo, setAddTo] = useState("InventoryUnits");
  const [editId, setEditId] = useState(null);
  const [editCollection, setEditCollection] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [hoveredRow, setHoveredRow] = useState({ id: null, collection: "" });
  const [confirmSingleDelete, setConfirmSingleDelete] = useState(null);

  // Tab State
  const [activeTab, setActiveTab] = useState("InventoryUnits");

  // Pagination State
  const [inventoryPage, setInventoryPage] = useState(1);
  const [deployedPage, setDeployedPage] = useState(1);
  const ITEMS_PER_PAGE = 10; // Number of items per page

  // Sorting and Filtering State
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "desc",
  });

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        // Toggle direction
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  // Separate filter state for inventory and deployed
  const [inventoryFilters, setInventoryFilters] = useState({
    Tag: [],
    CPU: [],
    RAM: [],
    Drive: [],
    GPU: [],
    Status: [],
    OS: [],
    Remarks: [],
  });
  const [deployedFilters, setDeployedFilters] = useState({
    Tag: [],
    CPU: [],
    RAM: [],
    Drive: [],
    GPU: [],
    Status: [],
    OS: [],
    Remarks: [],
  });

  // Track which table's filter popup is open
  const [filterPopup, setFilterPopup] = useState({
    open: false,
    column: null,
    table: null,
    anchor: null,
  });

  // Delete mode state
  const [deleteMode, setDeleteMode] = useState({ table: null, active: false });
  const [selectedToDelete, setSelectedToDelete] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Close filter popup when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (filterPopup.open) {
        setFilterPopup({
          open: false,
          column: null,
          table: null,
          anchor: null,
        });
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [filterPopup.open]);

  // Import Excel handler
  const handleImportExcel = async (e, targetTable = "InventoryUnits") => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

      // Expect columns: Tag, CPU, RAM, Drive, GPU, Status, OS, Remarks
      for (const row of data) {
        if (!row.Tag) continue;
        const unit = {
          Tag: row.Tag || "",
          CPU: row.CPU || "",
          RAM: row.RAM || "",
          Drive: row.Drive || "",
          GPU: row.GPU || "",
          Status: row.Status || "",
          OS: row.OS || "",
          Remarks: row.Remarks || "",
        };
        await setDoc(doc(db, targetTable, unit.Tag), unit);
      }
      fetchData();
      showSuccess("Excel data imported successfully!");
    };
    reader.readAsBinaryString(file);
    // Reset input so same file can be re-imported if needed
    e.target.value = "";
  };

  // Fetch data from Firestore on mount and after changes
  const fetchData = async () => {
    setLoading(true);
    const inventorySnapshot = await getDocs(collection(db, "InventoryUnits"));
    setInventory(
      inventorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    );
    const deployedSnapshot = await getDocs(collection(db, "DeployedUnits"));
    setDeployed(
      deployedSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => {
      const newForm = { ...prevForm, [name]: value };

      // Combine cpuGen and cpuModel into the main CPU field
      if (name === "cpuGen" || name === "cpuModel") {
        newForm.CPU = `${newForm.cpuGen} - ${newForm.cpuModel}`.trim();
      }

      return newForm;
    });
  };

  const handleAddToChange = (e) => {
    setAddTo(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.Tag || form.Tag.trim() === "") {
      showError("TAG is a required field.");
      return;
    }

    // --- Create a new object for submission with formatted RAM ---
    const unitData = {
      ...form,
      // Ensure RAM is stored with "GB" suffix
      RAM: form.RAM ? `${form.RAM}GB` : "",
    };

    // --- Improved Validation ---
    // 1. RAM validation (now checks the numeric part from the form state)
    if (form.RAM && !/^\d+$/.test(form.RAM.toString())) {
      showError("RAM must be a valid number.");
      return;
    }

    // 2. CPU validation (must contain i3, i5, or i7)
    if (unitData.CPU && !/i[357]/i.test(unitData.CPU)) {
      showError("CPU format must include i3, i5, or i7.");
      return;
    }

    // 3. Duplicate Tag validation
    if (!editId) {
      // Only for new units
      const allUnits = [...inventory, ...deployed];
      const tagExists = allUnits.some((unit) => unit.Tag === unitData.Tag);
      if (tagExists) {
        showError(`Tag '${unitData.Tag}' already exists.`);
        return;
      }
    }

    if (editId) {
      const collectionName = editCollection;
      await setDoc(doc(db, collectionName, unitData.Tag), unitData);
      if (editId !== unitData.Tag) {
        await deleteDoc(doc(db, collectionName, editId));
      }
      setEditId(null);
      setEditCollection("");
      showSuccess(`Unit ${unitData.Tag} updated successfully!`);
    } else {
      await setDoc(doc(db, addTo, unitData.Tag), unitData);
      showSuccess(
        `Unit ${unitData.Tag} added to ${
          addTo === "InventoryUnits" ? "Inventory" : "Deployed"
        }!`
      );
    }
    setForm(emptyUnit);
    setShowModal(false);
    fetchData();
  };

  const handleMove = async (unit, from, to) => {
    const newUnit = { ...unit };
    delete newUnit.id;
    await setDoc(doc(db, to, newUnit.Tag), newUnit);
    await deleteDoc(doc(db, from, unit.id));
    fetchData();
    showSuccess(
      `Unit ${unit.Tag} moved to ${
        to === "InventoryUnits" ? "Inventory" : "Deployed"
      }.`
    );
  };

  const handleEdit = (unit, collectionName) => {
    // Parse CPU field to populate cpuGen and cpuModel for editing
    const cpuParts = (unit.CPU || "").split(" - ");
    const cpuGen = cpuParts[0] || "";
    const cpuModel = cpuParts.length > 1 ? cpuParts.slice(1).join(" - ") : "";

    setForm({
      Tag: unit.Tag || "",
      cpuGen: cpuGen,
      cpuModel: cpuModel,
      CPU: unit.CPU || "",
      RAM: parseRam(unit.RAM) || "",
      Drive: unit.Drive || "",
      GPU: unit.GPU || "",
      Status: unit.Status || "",
      OS: unit.OS || "",
      Remarks: unit.Remarks || "",
    });
    setEditId(unit.id);
    setEditCollection(collectionName);
    setShowModal(true);
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setEditCollection("");
    setForm(emptyUnit);
    setShowModal(false);
  };

  // --- Sorting and Filtering Logic ---
  // RAM sorting: expects RAM like "8gb", "16gb", "32gb"
  const parseRam = (ram) => {
    if (!ram) return 0;
    const match = ram.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // CPU Gen filter: expects CPU like "i5 - 10400"
  const parseCpuGen = (cpu) => {
    if (!cpu) return "";
    const match = cpu.match(/(i[357])/i);
    return match ? match[1].toLowerCase() : "";
  };

  // Get unique values for a column (always from data, not static)
  const getUniqueColumnValues = (data, key) => {
    if (key === "CPU") {
      // Combine cpuGenOptions and any new CPU gens found in data
      const found = Array.from(
        new Set(
          data
            .map((u) => {
              const match = (u.CPU || "").match(/(i[357])/i);
              return match ? match[1].toLowerCase() : null;
            })
            .filter(Boolean)
        )
      );
      return Array.from(new Set([...cpuGenOptions, ...found]));
    }
    if (key === "RAM")
      return Array.from(
        new Set(data.map((u) => (u.RAM || "").replace(/[^0-9]/g, "")))
      )
        .filter(Boolean)
        .sort((a, b) => a - b);
    if (key === "Drive")
      return Array.from(new Set(data.map((u) => u.Drive))).filter(Boolean);
    if (key === "GPU")
      return Array.from(new Set(data.map((u) => u.GPU))).filter(Boolean);
    if (key === "Status")
      return Array.from(new Set(data.map((u) => u.Status))).filter(Boolean);
    if (key === "OS")
      return Array.from(new Set(data.map((u) => u.OS))).filter(Boolean);
    // Remove filter for Tag
    // if (key === 'Tag') return Array.from(new Set(data.map(u => u.Tag))).filter(Boolean);
    if (key === "Remarks")
      return Array.from(new Set(data.map((u) => u.Remarks))).filter(Boolean);
    return [];
  };

  // Filtering logic for all columns (now takes filters as argument)
  const filterData = (data, filters) => {
    let filtered = data;
    Object.keys(filters).forEach((key) => {
      if (filters[key] && filters[key].length > 0) {
        if (key === "CPU") {
          filtered = filtered.filter((unit) => {
            const gen = parseCpuGen(unit.CPU);
            return filters.CPU.includes(gen);
          });
        } else if (key === "RAM") {
          filtered = filtered.filter((unit) => {
            const ramVal = (unit.RAM || "").replace(/[^0-9]/g, "");
            return filters.RAM.includes(ramVal);
          });
        } else if (key !== "Tag") {
          // Don't filter by Tag
          filtered = filtered.filter((unit) =>
            filters[key].includes(unit[key])
          );
        }
      }
    });
    return filtered;
  };

  const sortData = (data) => {
    if (!sortConfig.key) return data;
    let sorted = [...data];
    if (sortConfig.key === "RAM") {
      sorted.sort((a, b) => {
        const aRam = parseRam(a.RAM);
        const bRam = parseRam(b.RAM);
        return sortConfig.direction === "asc" ? aRam - bRam : bRam - aRam;
      });
    } else {
      sorted.sort((a, b) => {
        const aVal = (a[sortConfig.key] || "").toString().toLowerCase();
        const bVal = (b[sortConfig.key] || "").toString().toLowerCase();
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  };

  // Open/close filter popup for a column and table (toggle)
  const handleFilterClick = (e, column, table) => {
    e.stopPropagation();
    if (
      filterPopup.open &&
      filterPopup.column === column &&
      filterPopup.table === table
    ) {
      setFilterPopup({ open: false, column: null, table: null, anchor: null });
    } else {
      setFilterPopup({ open: true, column, table, anchor: e.target });
    }
  };

  // Toggle filter value for a column and table
  const handleFilterCheck = (column, value, table) => {
    if (table === "InventoryUnits") {
      setInventoryFilters((prev) => {
        const arr = prev[column] || [];
        return {
          ...prev,
          [column]: arr.includes(value)
            ? arr.filter((v) => v !== value)
            : [...arr, value],
        };
      });
      setInventoryPage(1); // Reset to first page on filter change
    } else {
      setDeployedFilters((prev) => {
        const arr = prev[column] || [];
        return {
          ...prev,
          [column]: arr.includes(value)
            ? arr.filter((v) => v !== value)
            : [...arr, value],
        };
      });
      setDeployedPage(1); // Reset to first page on filter change
    }
  };

  // Delete logic
  const handleSelectToDelete = (id) => {
    setSelectedToDelete((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    const table = deleteMode.table;
    for (const id of selectedToDelete) {
      await deleteDoc(doc(db, table, id));
    }
    setShowDeleteConfirm(false);
    setDeleteMode({ table: null, active: false });
    setSelectedToDelete([]);
    fetchData();
    showSuccess(`${selectedToDelete.length} unit(s) deleted successfully.`);
  };

  const cancelDeleteMode = () => {
    setDeleteMode({ table: null, active: false });
    setSelectedToDelete([]);
    setShowDeleteConfirm(false);
  };

  const handleConfirmSingleDelete = async () => {
    if (!confirmSingleDelete) return;
    const { unit, collectionName } = confirmSingleDelete;
    try {
      await deleteDoc(doc(db, collectionName, unit.id));
      fetchData();
      showSuccess(`Unit ${unit.Tag} has been deleted.`);
    } catch (error) {
      showError("Failed to delete unit.");
      console.error("Error deleting document: ", error);
    }
    setConfirmSingleDelete(null);
  };

  // Render filter popup for any column
  const renderFilterPopup = (column, data, table) => {
    // Always get unique values from current data, not just static options
    const options = getUniqueColumnValues(data, column);

    // Calculate popup position to avoid cropping
    let popupStyle = {
      position: "fixed",
      background: "#18181a",
      border: "1.5px solid #2563eb",
      borderRadius: 8,
      boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
      padding: 14,
      zIndex: 9999,
      minWidth: 170,
      color: "#fff",
      left: 0,
      top: 0,
    };

    if (filterPopup.anchor) {
      const rect = filterPopup.anchor.getBoundingClientRect();
      popupStyle.left = Math.min(rect.left, window.innerWidth - 220) + "px";
      popupStyle.top = rect.bottom + 4 + "px";
    }

    // Use correct filter state
    const filterState =
      table === "InventoryUnits" ? inventoryFilters : deployedFilters;

    return (
      <div style={popupStyle} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            fontWeight: 700,
            marginBottom: 10,
            fontSize: 16,
            color: "#fff",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Filter {column === "CPU" ? "CPU Gen" : column}
        </div>
        {options.map((opt) => (
          <label
            key={opt}
            style={{
              display: "block",
              marginBottom: 8,
              fontSize: 15,
              cursor: "pointer",
              fontWeight: column === "CPU" ? 700 : 500,
              color: "#fff",
              letterSpacing: column === "CPU" ? 1 : 0,
            }}
          >
            <input
              type="checkbox"
              checked={filterState[column]?.includes(opt)}
              onChange={() => handleFilterCheck(column, opt, table)}
              style={{ marginRight: 8 }}
            />
            {column === "CPU" ? opt.toUpperCase() : opt}
          </label>
        ))}
      </div>
    );
  };

  const renderSingleDeleteConfirmModal = () => {
    if (!confirmSingleDelete) return null;
    const { unit } = confirmSingleDelete;
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "32px 36px",
            borderRadius: "16px",
            minWidth: 340,
            boxShadow: "0 8px 32px rgba(37,99,235,0.18)",
            position: "relative",
            fontFamily:
              'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            maxWidth: 420,
          }}
        >
          <h2
            style={{
              margin: "0 0 18px 0",
              fontWeight: 700,
              color: "#e11d48",
              letterSpacing: 1,
              fontSize: 20,
              textAlign: "center",
            }}
          >
            Confirm Delete
          </h2>
          <div style={{ marginBottom: 18, color: "#18181a", fontWeight: 500 }}>
            Are you sure you want to delete the following unit?
            <div
              style={{
                margin: "12px 0",
                padding: "10px",
                background: "#fee2e2",
                borderRadius: "8px",
                textAlign: "center",
                color: "#b91c1c",
                fontWeight: 700,
              }}
            >
              {unit.Tag} {unit.CPU && `- ${unit.CPU}`}
            </div>
            This action cannot be undone.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button
              style={{
                background: "#e11d48",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 28px",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
              }}
              onClick={handleConfirmSingleDelete}
            >
              Delete
            </button>
            <button
              style={{
                background: "#e2e8f0",
                color: "#18181a",
                border: "none",
                borderRadius: 8,
                padding: "10px 22px",
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
              }}
              onClick={() => setConfirmSingleDelete(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Table with Sorting and Filtering ---
  const renderTable = (data, collectionName, currentPage, setCurrentPage) => {
    // Use correct filter state
    const filters =
      collectionName === "InventoryUnits" ? inventoryFilters : deployedFilters;
    let filtered = filterData(data, filters);
    let sorted = sortData(filtered);

    // --- Pagination Logic ---
    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginatedData = sorted.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (newPage) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
      }
    };

    return (
      <div style={{ background: "#fff", border: "none", flex: "1", overflow: "auto", minHeight: "0" }}>
        <div style={{ overflowX: "auto", width: "100%", height: "100%" }}>
          <table style={tableStyle}>
            <thead style={{ position: "sticky", top: "0", zIndex: "5" }}>
              <tr style={{ background: "rgb(255, 255, 255)", borderBottom: "1px solid #e5e7eb" }}>
                {deleteMode.active && deleteMode.table === collectionName && (
                  <th style={{ ...thStyle, width: "40px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
                    />
                  </th>
                )}
                {[
                  "Tag",
                  "CPU",
                  "RAM",
                  "Drive",
                  "GPU",
                  "Status",
                  "OS",
                  "Remarks",
                ].map((col) => (
                  <th key={col} style={{ ...thStyle, position: "relative" }}>
                    <span
                      onClick={col !== "Tag" ? (e) => handleFilterClick(e, col, collectionName) : undefined}
                      style={{
                        marginRight: 8,
                        textDecoration: col !== "Tag" ? "underline dotted" : undefined,
                        cursor: col !== "Tag" ? "pointer" : undefined,
                        display: "inline-block",
                      }}
                    >
                      {col === "CPU" ? "CPU Gen" : col === "Drive" ? "Main Drive" : col}
                    </span>
                    <span
                      onClick={() => handleSort(col)}
                      style={{ marginLeft: 2, fontSize: 10, cursor: "pointer" }}
                    >
                      ⇅
                    </span>
                    {col !== "Tag" &&
                      filterPopup.open &&
                      filterPopup.column === col &&
                      filterPopup.table === collectionName &&
                      renderFilterPopup(col, data, collectionName)}
                  </th>
                ))}
                <th style={{ ...thStyle, width: "120px", textAlign: "center" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={deleteMode.active && deleteMode.table === collectionName ? 10 : 9}
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "#9ca3af",
                      fontSize: "14px",
                      fontWeight: "400",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    No {collectionName === "InventoryUnits" ? "inventory" : "deployed"} units found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((unit, index) => (
                  <tr
                    key={unit.id}
                    style={{
                      ...trStyle(index),
                      ...(hoveredRow.id === unit.id && hoveredRow.collection === collectionName
                        ? trHoverStyle(index)
                        : {}),
                    }}
                    onMouseEnter={() => setHoveredRow({ id: unit.id, collection: collectionName })}
                    onMouseLeave={() => setHoveredRow({ id: null, collection: "" })}
                  >
                    {deleteMode.active && deleteMode.table === collectionName && (
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedToDelete.includes(unit.id)}
                          onChange={() => handleSelectToDelete(unit.id)}
                          style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
                        />
                      </td>
                    )}
                    <td style={tdStyle}>{unit.Tag}</td>
                    <td style={tdStyle}>{unit.CPU}</td>
                    <td style={tdStyle}>
                      {unit.RAM && `${(unit.RAM || "").replace(/[^0-9]/g, "")} GB`}
                    </td>
                    <td style={tdStyle}>{unit.Drive}</td>
                    <td style={tdStyle}>{unit.GPU}</td>
                    <td style={tdStyle}>{unit.Status}</td>
                    <td style={tdStyle}>{unit.OS}</td>
                    <td style={tdStyle}>{unit.Remarks}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {!deleteMode.active && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                          <button
                            style={moveButtonStyle}
                            onClick={() =>
                              collectionName === "InventoryUnits"
                                ? handleMove(unit, "InventoryUnits", "DeployedUnits")
                                : handleMove(unit, "DeployedUnits", "InventoryUnits")
                            }
                          >
                            {collectionName === "InventoryUnits" ? "Deploy" : "Return"}
                          </button>
                          <button
                            style={actionButtonStyle}
                            onClick={() => handleEdit(unit, collectionName)}
                            title="Edit"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#3b82f6";
                              e.currentTarget.style.color = "#ffffff";
                              e.currentTarget.style.transform = "scale(1.1)";
                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "#6b7280";
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            {editIcon}
                          </button>
                          <button
                            style={actionButtonStyle}
                            onClick={() => setConfirmSingleDelete({ unit, collectionName })}
                            title="Delete"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#ef4444";
                              e.currentTarget.style.color = "#ffffff";
                              e.currentTarget.style.transform = "scale(1.1)";
                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "#6b7280";
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            {deleteIcon}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "12px 20px",
              background: "#fff",
              borderTop: "1px solid #e5e7eb",
              position: "sticky",
              bottom: "0",
              zIndex: "10",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e0e7ef",
                  background: currentPage === 1 ? "#f5f7fa" : "#fff",
                  color: currentPage === 1 ? "#9ca3af" : "#374151",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Previous
              </button>
              <span style={{ margin: "0 12px", color: "#374151", fontWeight: 500, fontSize: 14 }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e0e7ef",
                  background: currentPage === totalPages ? "#f5f7fa" : "#fff",
                  color: currentPage === totalPages ? "#9ca3af" : "#374151",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderModal = () => (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(34, 46, 58, 0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 28,
          borderRadius: 14,
          minWidth: 260,
          maxWidth: 340,
          boxShadow: "0 4px 16px rgba(68,95,109,0.14)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          border: "2px solid #70C1B3",
        }}
      >
        <button
          onClick={handleCancelEdit}
          style={{
            position: "absolute",
            top: 8,
            right: 12,
            background: "none",
            border: "none",
            fontSize: 20,
            color: "#888",
            cursor: "pointer",
            fontWeight: 700,
          }}
          aria-label="Close"
          title="Close"
        >
          ×
        </button>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#233037",
            marginBottom: 12,
            textAlign: "center",
            margin: "0 0 16px 0",
          }}
        >
          {editId ? "Edit Unit" : "Add Unit"}
        </h3>
        <form onSubmit={handleSubmit}>
          {!editId && (
            <div style={{ marginBottom: 10, width: "90%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <label style={{ color: "#445F6D", fontWeight: 600, display: "block", marginBottom: 4, fontSize: 13, alignSelf: "flex-start" }}>
                Add to:
              </label>
              <select
                value={addTo}
                onChange={handleAddToChange}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "1.5px solid #445F6D",
                  fontSize: 14,
                  background: "#f7f9fb",
                  color: "#233037",
                  marginTop: 2,
                  marginBottom: 4,
                  textAlign: "center",
                }}
              >
                <option value="InventoryUnits">Inventory</option>
                <option value="DeployedUnits">Deployed</option>
              </select>
            </div>
          )}
          <div style={{ marginBottom: 10, width: "90%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <label style={{ color: "#445F6D", fontWeight: 600, display: "block", marginBottom: 4, fontSize: 13, alignSelf: "flex-start" }}>
              TAG:
            </label>
            <input
              name="Tag"
              placeholder="TAG"
              value={form.Tag}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1.5px solid #445F6D",
                fontSize: 14,
                background: "#f7f9fb",
                color: "#233037",
                marginTop: 2,
                marginBottom: 4,
                textAlign: "center",
              }}
            />
          </div>
          {/* CPU Gen and Model fields */}
          <div style={{ marginBottom: 10, width: "90%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <label style={{ color: "#445F6D", fontWeight: 600, display: "block", marginBottom: 4, fontSize: 13, alignSelf: "flex-start" }}>
              CPU:
            </label>
            <div style={{ display: "flex", gap: 6, width: "100%" }}>
              <select
                name="cpuGen"
                value={form.cpuGen}
                onChange={handleChange}
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "1.5px solid #445F6D",
                  fontSize: 14,
                  background: "#f7f9fb",
                  color: "#233037",
                  textAlign: "center",
                }}
                required
              >
                <option value="">Gen</option>
                {cpuGenOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.toUpperCase()}
                  </option>
                ))}
              </select>
              <input
                name="cpuModel"
                placeholder="Model"
                value={form.cpuModel}
                onChange={handleChange}
                style={{
                  flex: 2,
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "1.5px solid #445F6D",
                  fontSize: 14,
                  background: "#f7f9fb",
                  color: "#233037",
                  textAlign: "center",
                }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 10, width: "90%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <label style={{ color: "#445F6D", fontWeight: 600, display: "block", marginBottom: 4, fontSize: 13, alignSelf: "flex-start" }}>
              RAM (GB):
            </label>
            <select
              name="RAM"
              value={form.RAM}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1.5px solid #445F6D",
                fontSize: 14,
                background: "#f7f9fb",
                color: "#233037",
                marginTop: 2,
                marginBottom: 4,
                textAlign: "center",
              }}
            >
              <option value="">Select RAM</option>
              {ramOptions.map((ram) => (
                <option key={ram} value={ram}>
                  {ram} GB
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 10, width: "90%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <label style={{ color: "#445F6D", fontWeight: 600, display: "block", marginBottom: 4, fontSize: 13, alignSelf: "flex-start" }}>
              Drive:
            </label>
            <input
              name="Drive"
              placeholder="MAIN DRIVE"
              value={form.Drive}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1.5px solid #445F6D",
                fontSize: 14,
                background: "#f7f9fb",
                color: "#233037",
                marginTop: 2,
                marginBottom: 4,
                textAlign: "center",
              }}
            />
          </div>
          <div style={{ marginBottom: 10, width: "90%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <label style={{ color: "#445F6D", fontWeight: 600, display: "block", marginBottom: 4, fontSize: 13, alignSelf: "flex-start" }}>
              GPU:
            </label>
            <input
              name="GPU"
              placeholder="GPU"
              value={form.GPU}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1.5px solid #445F6D",
                fontSize: 14,
                background: "#f7f9fb",
                color: "#233037",
                marginTop: 2,
                marginBottom: 4,
                textAlign: "center",
              }}
            />
          </div>
          <div style={{ marginBottom: 10, width: "90%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <label style={{ color: "#445F6D", fontWeight: 600, display: "block", marginBottom: 4, fontSize: 13, alignSelf: "flex-start" }}>
              Status:
            </label>
            <select
              name="Status"
              value={form.Status}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1.5px solid #445F6D",
                fontSize: 14,
                background: "#f7f9fb",
                color: "#233037",
                marginTop: 2,
                marginBottom: 4,
                textAlign: "center",
              }}
              required
            >
              <option value="">Select Status</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 10, width: "90%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <label style={{ color: "#445F6D", fontWeight: 600, display: "block", marginBottom: 4, fontSize: 13, alignSelf: "flex-start" }}>
              OS:
            </label>
            <select
              name="OS"
              value={form.OS}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1.5px solid #445F6D",
                fontSize: 14,
                background: "#f7f9fb",
                color: "#233037",
                marginTop: 2,
                marginBottom: 4,
                textAlign: "center",
              }}
              required
            >
              <option value="">Select OS</option>
              {osOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 10, width: "90%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <label style={{ color: "#445F6D", fontWeight: 600, display: "block", marginBottom: 4, fontSize: 13, alignSelf: "flex-start" }}>
              Remarks:
            </label>
            <input
              name="Remarks"
              placeholder="REMARKS"
              value={form.Remarks}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1.5px solid #445F6D",
                fontSize: 14,
                background: "#f7f9fb",
                color: "#233037",
                marginTop: 2,
                marginBottom: 4,
                textAlign: "center",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
            <button
              type="submit"
              style={{
                background: "#70C1B3",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                padding: "8px 18px",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                transition: "background 0.2s, box-shadow 0.2s",
              }}
            >
              {editId ? "Save Changes" : "Add Unit"}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{
                background: "#445F6D",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                padding: "8px 18px",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                transition: "background 0.2s, box-shadow 0.2s",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Close filter popup when clicking anywhere else
  useEffect(() => {
    if (!filterPopup.open) return;
    const close = () =>
      setFilterPopup({ open: false, column: null, table: null, anchor: null });
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [filterPopup.open]);

  // --- Main Component Render ---
  return (
    <div
      style={{
        height: "calc(100vh - 30px)",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
        fontFamily: "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: "hidden",
        boxSizing: "border-box",
        margin: "20px",
        marginTop: "10px",
      }}
    >
      {/* Fixed Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          flexShrink: 0,
          background: "rgb(255, 255, 255)",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
            gap: "12px",
          }}
        >
          <h1 style={{ color: "#1e293b", margin: 0, fontWeight: 700, fontSize: "24px" }}>
            Unit Specifications
          </h1>
          <button
            style={{
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "9px 16px",
              fontWeight: 500,
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
            onClick={() => {
              setForm(emptyUnit);
              setEditId(null);
              setEditCollection("");
              setShowModal(true);
            }}
          >
            + Add Unit
          </button>
        </div>

        {/* Tab Bar */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb" }}>
          <button
            onClick={() => setActiveTab("InventoryUnits")}
            style={{
              background: activeTab === "InventoryUnits" ? "#fff" : "#f1f5f9",
              color: activeTab === "InventoryUnits" ? "#374151" : "#64748b",
              border: "none",
              borderBottom: activeTab === "InventoryUnits" ? "2px solid #3b82f6" : "2px solid transparent",
              fontWeight: 500,
              fontSize: "14px",
              padding: "12px 24px",
              cursor: "pointer",
              outline: "none",
              transition: "all 0.2s",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Inventory Units
          </button>
          <button
            onClick={() => setActiveTab("DeployedUnits")}
            style={{
              background: activeTab === "DeployedUnits" ? "#fff" : "#f1f5f9",
              color: activeTab === "DeployedUnits" ? "#374151" : "#64748b",
              border: "none",
              borderBottom: activeTab === "DeployedUnits" ? "2px solid #3b82f6" : "2px solid transparent",
              fontWeight: 500,
              fontSize: "14px",
              padding: "12px 24px",
              cursor: "pointer",
              outline: "none",
              transition: "all 0.2s",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Deployed Units
          </button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && renderModal()}

      {/* Main Content: Tabbed Tables */}
      <div style={{ background: "#fff", border: "none", flex: "1", overflow: "auto", minHeight: "0" }}>
        {activeTab === "InventoryUnits" && (
          <>
            {loading ? (
              <div style={{ padding: "0", border: "none" }}>
                <TableLoadingSpinner text="Loading inventory units..." />
              </div>
            ) : (
              renderTable(inventory, "InventoryUnits", inventoryPage, setInventoryPage)
            )}
          </>
        )}
        {activeTab === "DeployedUnits" && (
          <>
            {loading ? (
              <div style={{ padding: "0", border: "none" }}>
                <TableLoadingSpinner text="Loading deployed units..." />
              </div>
            ) : (
              renderTable(deployed, "DeployedUnits", deployedPage, setDeployedPage)
            )}
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmSingleDelete && renderSingleDeleteConfirmModal()}
    </div>
  );
};

export default UnitSpecs;
