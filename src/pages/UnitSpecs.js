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

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 16,
  marginBottom: 0,
  background: "#f8fafc",
  transition: "border 0.2s",
};

const inputGroupStyle = {
  marginBottom: "1rem",
};

const labelStyle = {
  display: "block",
  marginBottom: "0.5rem",
  fontWeight: "600",
  color: "#334155",
};

const selectStyle = {
  ...inputStyle,
  background: "#f8fafc",
  color: "#18181a",
  fontWeight: 500,
};

const osOptions = [
  { label: "Windows 10", value: "WIN10" },
  { label: "Windows 11", value: "WIN11" },
];

const statusOptions = [
  { label: "Good", value: "Good" },
  { label: "Brand New", value: "Brand New" },
  { label: "Defective", value: "Defective" },
];

// --- Modern Table Styles (harmonized with Assets.js palette) ---
const palette = {
  header: "#445F6D",
  background: "#f7f9fb",
  accent: "#70C1B3",
  highlight: "#FFE066",
  text: "#233037",
};

const tableCardStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  background: palette.background,
  borderRadius: 18,
  boxShadow: "0 4px 24px rgba(68,95,109,0.10)",
  marginTop: 18,
  marginBottom: 32,
  overflow: "hidden",
  minWidth: 320,
};

const thModernStyle = {
  background: palette.header,
  color: "#fff",
  fontWeight: 700,
  padding: "14px 10px",
  fontSize: 16,
  letterSpacing: 1,
  border: "none",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
  borderRight: `1px solid ${palette.background}`,
  cursor: "pointer",
  textAlign: "left",
};

const tdModernStyle = {
  padding: "12px 10px",
  fontSize: 15,
  borderBottom: `1px solid #e5e7eb`,
  background: palette.background,
  color: palette.text,
  whiteSpace: "normal", // allow wrapping
  wordBreak: "break-word", // break long words
  verticalAlign: "middle",
  textOverflow: "ellipsis",
  overflow: "hidden",
  maxWidth: 140, // reduce for better fit
  borderRight: `1px solid #e5e7eb`,
  position: "relative",
  transition: "background 0.18s",
};

const trHoverStyle = {
  background: "#eaf4f2",
};

const modernActionBtn = {
  background: palette.accent,
  color: palette.text,
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  transition: "background 0.2s, box-shadow 0.2s",
  boxShadow: "0 2px 8px rgba(112,193,179,0.10)",
  outline: "none",
};
const modernActionBtnHover = {
  background: palette.highlight,
  color: palette.header,
};

const modernDeleteBtn = {
  background: "#e11d48",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 18px",
  fontWeight: 700,
  fontSize: 15,
  marginLeft: 10,
  cursor: "pointer",
  transition: "background 0.2s",
};

const pencilBtn = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: "6px",
  margin: 0,
  display: "flex",
  alignItems: "center",
  opacity: 0.6,
  transition: "opacity 0.2s, background-color 0.2s",
  borderRadius: "50%",
};

const pencilBtnHover = {
  opacity: 1,
  backgroundColor: "#e2e8f0",
};

const trashBtn = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: "6px",
  margin: 0,
  display: "flex",
  alignItems: "center",
  opacity: 0.6,
  transition: "opacity 0.2s, background-color 0.2s",
  borderRadius: "50%",
};

const trashBtnHover = {
  opacity: 1,
  backgroundColor: "#fee2e2",
};

const actionBtnRow = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
};

const pencilIcon = (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path
      d="M14.85 2.85a2.121 2.121 0 0 1 3 3l-9.5 9.5-4 1 1-4 9.5-9.5zM13 4l3 3"
      stroke="#f59e42"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const trashIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#e11d48"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const cpuGenOptions = ["i3", "i5", "i7"];

const ramOptions = Array.from({ length: 32 }, (_, i) => i + 1);

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
      <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
        <table style={tableCardStyle}>
          <thead>
            <tr>
              {deleteMode.active && deleteMode.table === collectionName && (
                <th
                  style={{ ...thModernStyle, width: 40, textAlign: "center" }}
                ></th>
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
                <th
                  key={col}
                  style={{ ...thModernStyle, position: "relative" }}
                >
                  <span
                    // Remove filter for Tag column
                    onClick={
                      col !== "Tag"
                        ? (e) => handleFilterClick(e, col, collectionName)
                        : undefined
                    }
                    style={{
                      marginRight: 8,
                      textDecoration:
                        col !== "Tag" ? "underline dotted" : undefined,
                      cursor: col !== "Tag" ? "pointer" : undefined,
                      color: col === "CPU" ? palette.highlight : undefined,
                      fontWeight: col === "CPU" ? 700 : undefined,
                      fontSize: col === "CPU" ? 16 : undefined,
                      display: "inline-block",
                    }}
                  >
                    {col === "CPU"
                      ? "CPU Gen"
                      : col === "Drive"
                      ? "MAIN DRIVE"
                      : col.toUpperCase()}
                  </span>
                  <span
                    onClick={() => handleSort(col)}
                    style={{ marginLeft: 2, fontSize: 13, cursor: "pointer" }}
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
              <th
                style={{
                  ...thModernStyle,
                  borderRight: "none",
                  position: "relative",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    deleteMode.active && deleteMode.table === collectionName
                      ? 10
                      : 9
                  }
                  style={{
                    textAlign: "center",
                    padding: 24,
                    color: "#64748b",
                    background: palette.background,
                  }}
                >
                  No{" "}
                  {collectionName === "InventoryUnits"
                    ? "inventory"
                    : "deployed"}{" "}
                  units found.
                </td>
              </tr>
            ) : (
              paginatedData.map((unit) => (
                <tr
                  key={unit.id}
                  style={
                    hoveredRow.id === unit.id &&
                    hoveredRow.collection === collectionName
                      ? trHoverStyle
                      : undefined
                  }
                  onMouseEnter={() =>
                    setHoveredRow({ id: unit.id, collection: collectionName })
                  }
                  onMouseLeave={() =>
                    setHoveredRow({ id: null, collection: "" })
                  }
                >
                  {deleteMode.active && deleteMode.table === collectionName && (
                    <td style={{ ...tdModernStyle, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedToDelete.includes(unit.id)}
                        onChange={() => handleSelectToDelete(unit.id)}
                        style={{ width: 18, height: 18 }}
                      />
                    </td>
                  )}
                  <td style={tdModernStyle}>{unit.Tag}</td>
                  <td style={tdModernStyle}>{unit.CPU}</td>
                  <td style={tdModernStyle}>
                    {unit.RAM &&
                      `${(unit.RAM || "").replace(/[^0-9]/g, "")} GB`}
                  </td>
                  <td style={tdModernStyle}>{unit.Drive}</td>
                  <td style={tdModernStyle}>{unit.GPU}</td>
                  <td style={tdModernStyle}>{unit.Status}</td>
                  <td style={tdModernStyle}>{unit.OS}</td>
                  <td style={tdModernStyle}>{unit.Remarks}</td>
                  <td
                    style={{
                      ...tdModernStyle,
                      minWidth: 110,
                      background: "inherit",
                    }}
                  >
                    {!deleteMode.active && (
                      <div style={actionBtnRow}>
                        {collectionName === "InventoryUnits" ? (
                          <button
                            style={{
                              ...modernActionBtn,
                              ...(hoveredRow.id === unit.id &&
                              hoveredRow.collection === collectionName
                                ? modernActionBtnHover
                                : {}),
                            }}
                            onClick={() =>
                              handleMove(
                                unit,
                                "InventoryUnits",
                                "DeployedUnits"
                              )
                            }
                          >
                            Move
                          </button>
                        ) : (
                          <button
                            style={{
                              ...modernActionBtn,
                              ...(hoveredRow.id === unit.id &&
                              hoveredRow.collection === collectionName
                                ? modernActionBtnHover
                                : {}),
                            }}
                            onClick={() =>
                              handleMove(
                                unit,
                                "DeployedUnits",
                                "InventoryUnits"
                              )
                            }
                          >
                            Move
                          </button>
                        )}
                        <button
                          style={{
                            ...pencilBtn,
                            ...(hoveredRow.id === unit.id &&
                            hoveredRow.collection === collectionName
                              ? pencilBtnHover
                              : {}),
                          }}
                          onClick={() => handleEdit(unit, collectionName)}
                          title="Edit"
                        >
                          {pencilIcon}
                        </button>
                        <button
                          style={{
                            ...trashBtn,
                            ...(hoveredRow.id === unit.id &&
                            hoveredRow.collection === collectionName
                              ? trashBtnHover
                              : {}),
                          }}
                          onClick={() =>
                            setConfirmSingleDelete({ unit, collectionName })
                          }
                          title="Delete"
                        >
                          {trashIcon}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 20,
              marginBottom: 10,
            }}
          >
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                ...modernActionBtn,
                background: "#e2e8f0",
                color: palette.text,
              }}
            >
              Previous
            </button>
            <span
              style={{
                margin: "0 16px",
                color: palette.text,
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                ...modernActionBtn,
                background: "#e2e8f0",
                color: palette.text,
              }}
            >
              Next
            </button>
          </div>
        )}
        {deleteMode.active &&
          deleteMode.table === collectionName &&
          selectedToDelete.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <button style={modernDeleteBtn} onClick={handleDeleteSelected}>
                Delete Selected
              </button>
              <button
                style={{
                  background: "#e2e8f0",
                  color: palette.text,
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 22px",
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: "pointer",
                }}
                onClick={cancelDeleteMode}
              >
                Cancel
              </button>
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
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "36px 40px",
          borderRadius: 18,
          minWidth: 400,
          boxShadow: "0 12px 48px rgba(37,99,235,0.18)",
          position: "relative",
          fontFamily:
            'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          maxWidth: 420,
        }}
      >
        <button
          onClick={handleCancelEdit}
          style={{
            position: "absolute",
            top: 14,
            right: 18,
            background: "none",
            border: "none",
            fontSize: 26,
            color: "#888",
            cursor: "pointer",
            fontWeight: 700,
          }}
          aria-label="Close"
          title="Close"
        >
          ×
        </button>
        <h2
          style={{
            margin: "0 0 18px 0",
            fontWeight: 700,
            color: "#18181a",
            letterSpacing: 1,
            fontSize: 22,
            textAlign: "center",
          }}
        >
          {editId ? "Edit Unit" : "Add Unit"}
        </h2>
        <form onSubmit={handleSubmit}>
          {!editId && (
            <select
              value={addTo}
              onChange={handleAddToChange}
              style={{
                ...selectStyle,
                marginBottom: 18,
                background: "#eef2ff",
              }}
            >
              <option value="InventoryUnits">Inventory</option>
              <option value="DeployedUnits">Deployed</option>
            </select>
          )}
          <div style={{ display: "grid", gap: 14 }}>
            <input
              name="Tag"
              placeholder="TAG"
              value={form.Tag}
              onChange={handleChange}
              required
              style={inputStyle}
            />
            {/* New CPU Gen and Model fields */}
            <div style={{ display: "flex", gap: 10 }}>
              <select
                name="cpuGen"
                value={form.cpuGen}
                onChange={handleChange}
                style={{ ...selectStyle, flex: 1 }}
                required
              >
                <option value="">Select Gen</option>
                {cpuGenOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.toUpperCase()}
                  </option>
                ))}
              </select>
              <input
                name="cpuModel"
                placeholder="CPU Model (e.g., 10400)"
                value={form.cpuModel}
                onChange={handleChange}
                style={{ ...inputStyle, flex: 2 }}
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>RAM (GB)</label>
              <select
                name="RAM"
                value={form.RAM}
                onChange={handleChange}
                style={selectStyle}
              >
                <option value="">Select RAM</option>
                {ramOptions.map((ram) => (
                  <option key={ram} value={ram}>
                    {ram} GB
                  </option>
                ))}
              </select>
            </div>
            <input
              name="Drive"
              placeholder="MAIN DRIVE"
              value={form.Drive}
              onChange={handleChange}
              style={inputStyle}
            />
            <input
              name="GPU"
              placeholder="GPU"
              value={form.GPU}
              onChange={handleChange}
              style={inputStyle}
            />
            {/* Status select */}
            <select
              name="Status"
              value={form.Status}
              onChange={handleChange}
              style={selectStyle}
              required
            >
              <option value="">Select Status</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* OS select */}
            <select
              name="OS"
              value={form.OS}
              onChange={handleChange}
              style={selectStyle}
              required
            >
              <option value="">Select OS</option>
              {osOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              name="Remarks"
              placeholder="REMARKS"
              value={form.Remarks}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div
            style={{
              marginTop: 28,
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
            }}
          >
            <button
              type="submit"
              style={{
                background: "#18181a",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 28px",
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37,99,235,0.08)",
              }}
            >
              {editId ? "Save Changes" : "Add Unit"}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{
                background: "#e2e8f0",
                color: "#374151",
                border: "none",
                borderRadius: 8,
                padding: "10px 22px",
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
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

  // --- Modern Header Button Styles (match Assets.js) ---
  const headerBtn = {
    border: "none",
    borderRadius: 20,
    fontWeight: 700,
    fontSize: 15,
    padding: "8px 28px",
    marginLeft: 16,
    cursor: "pointer",
    transition: "background 0.18s, color 0.18s, box-shadow 0.18s",
    boxShadow: "0 2px 8px rgba(68,95,109,0.08)",
    outline: "none",
    display: "inline-block",
  };
  const addBtn = {
    ...headerBtn,
    background: palette.header,
    color: "#fff",
  };
  const importBtn = {
    ...headerBtn,
    background: "#22c55e",
    color: "#fff",
  };
  const deleteBtn = {
    ...headerBtn,
    background: "#e11d48",
    color: "#fff",
  };
  const addBtnHover = { background: "#233037" };
  const importBtnHover = { background: "#16a34a" };
  const deleteBtnHover = { background: "#b91c1c" };

  // --- Modernized Page Container ---
  return (
    <div
      style={{
        padding: 20,
        fontFamily:
          'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ color: "#1e293b", margin: 0, fontWeight: 700 }}>
          Unit Specifications
        </h1>
        <button
          style={{
            background: palette.accent,
            color: palette.text,
            border: "none",
            borderRadius: 8,
            padding: "12px 28px",
            fontWeight: 700,
            fontSize: 17,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(112,193,179,0.10)",
            outline: "none",
            transition: "background 0.2s, box-shadow 0.2s",
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

      {/* Add/Edit Modal */}
      {showModal && (
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
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "36px 40px",
              borderRadius: 18,
              minWidth: 400,
              boxShadow: "0 12px 48px rgba(37,99,235,0.18)",
              position: "relative",
              fontFamily:
                'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              maxWidth: 420,
            }}
          >
            <button
              onClick={handleCancelEdit}
              style={{
                position: "absolute",
                top: 14,
                right: 18,
                background: "none",
                border: "none",
                fontSize: 26,
                color: "#888",
                cursor: "pointer",
                fontWeight: 700,
              }}
              aria-label="Close"
              title="Close"
            >
              ×
            </button>
            <h2
              style={{
                margin: "0 0 18px 0",
                fontWeight: 700,
                color: "#18181a",
                letterSpacing: 1,
                fontSize: 22,
                textAlign: "center",
              }}
            >
              {editId ? "Edit Unit" : "Add Unit"}
            </h2>
            <form onSubmit={handleSubmit}>
              {!editId && (
                <select
                  value={addTo}
                  onChange={handleAddToChange}
                  style={{
                    ...selectStyle,
                    marginBottom: 18,
                    background: "#eef2ff",
                  }}
                >
                  <option value="InventoryUnits">Inventory</option>
                  <option value="DeployedUnits">Deployed</option>
                </select>
              )}
              <div style={{ display: "grid", gap: 14 }}>
                <input
                  name="Tag"
                  placeholder="TAG"
                  value={form.Tag}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                />
                {/* New CPU Gen and Model fields */}
                <div style={{ display: "flex", gap: 10 }}>
                  <select
                    name="cpuGen"
                    value={form.cpuGen}
                    onChange={handleChange}
                    style={{ ...selectStyle, flex: 1 }}
                    required
                  >
                    <option value="">Select Gen</option>
                    {cpuGenOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <input
                    name="cpuModel"
                    placeholder="CPU Model (e.g., 10400)"
                    value={form.cpuModel}
                    onChange={handleChange}
                    style={{ ...inputStyle, flex: 2 }}
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>RAM (GB)</label>
                  <select
                    name="RAM"
                    value={form.RAM}
                    onChange={handleChange}
                    style={selectStyle}
                  >
                    <option value="">Select RAM</option>
                    {ramOptions.map((ram) => (
                      <option key={ram} value={ram}>
                        {ram} GB
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  name="Drive"
                  placeholder="MAIN DRIVE"
                  value={form.Drive}
                  onChange={handleChange}
                  style={inputStyle}
                />
                <input
                  name="GPU"
                  placeholder="GPU"
                  value={form.GPU}
                  onChange={handleChange}
                  style={inputStyle}
                />
                {/* Status select */}
                <select
                  name="Status"
                  value={form.Status}
                  onChange={handleChange}
                  style={selectStyle}
                  required
                >
                  <option value="">Select Status</option>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {/* OS select */}
                <select
                  name="OS"
                  value={form.OS}
                  onChange={handleChange}
                  style={selectStyle}
                  required
                >
                  <option value="">Select OS</option>
                  {osOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  name="Remarks"
                  placeholder="REMARKS"
                  value={form.Remarks}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
              <div
                style={{
                  marginTop: 28,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <button
                  type="submit"
                  style={{
                    background: "#18181a",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 28px",
                    fontWeight: 600,
                    fontSize: 16,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(37,99,235,0.08)",
                  }}
                >
                  {editId ? "Save Changes" : "Add Unit"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{
                    background: "#e2e8f0",
                    color: "#374151",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontWeight: 600,
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Inventory Table */}
        <div>
          <h2
            style={{
              display: "inline-block",
              color: "#18181a",
              fontWeight: 700,
              fontSize: 18,
              margin: 0,
              marginBottom: 12,
            }}
          >
            Inventory Units
          </h2>
          {loading ? (
            <TableLoadingSpinner text="Loading inventory units..." />
          ) : (
            renderTable(
              inventory,
              "InventoryUnits",
              inventoryPage,
              setInventoryPage
            )
          )}
        </div>

        {/* Deployed Table */}
        <div>
          <h2
            style={{
              display: "inline-block",
              color: "#18181a",
              fontWeight: 700,
              fontSize: 18,
              margin: 0,
              marginBottom: 12,
            }}
          >
            Deployed Units
          </h2>
          {loading ? (
            <TableLoadingSpinner text="Loading deployed units..." />
          ) : (
            renderTable(
              deployed,
              "DeployedUnits",
              deployedPage,
              setDeployedPage
            )
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmSingleDelete && renderSingleDeleteConfirmModal()}
    </div>
  );
};

export default UnitSpecs;
