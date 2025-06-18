import React, { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
// Import XLSX for Excel import
import * as XLSX from "xlsx";

const emptyUnit = {
  Tag: "",
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

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  marginTop: 18,
  marginBottom: 32,
  overflow: "hidden",
};

const thStyle = {
  background: "#18181a",
  color: "#fff",
  fontWeight: 600,
  padding: "12px 8px",
  fontSize: 15,
  letterSpacing: 1,
  border: "none",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
  borderRight: "1px solid #cbd5e1",
  cursor: "pointer",
};

const tdStyle = {
  padding: "10px 8px",
  fontSize: 15,
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
  textOverflow: "ellipsis",
  overflow: "hidden",
  maxWidth: 180,
  borderRight: "1px solid #cbd5e1",
  position: "relative",
};

const actionBtn = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 20px",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
  marginRight: 8,
  transition: "background 0.2s, box-shadow 0.2s",
  boxShadow: "0 2px 8px rgba(37,99,235,0.10)",
};

const pencilBtn = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  margin: 0,
  position: "absolute",
  top: "50%",
  right: 25,
  transform: "translateY(-50%)",
  display: "flex",
  alignItems: "center",
  opacity: 0.3,
  transition: "opacity 0.2s",
  zIndex: 2,
};

const pencilBtnHover = {
  opacity: 1,
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

const cpuGenOptions = ["i3", "i5", "i7"];

const UnitSpecs = () => {
  const [inventory, setInventory] = useState([]);
  const [deployed, setDeployed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyUnit);
  const [addTo, setAddTo] = useState("InventoryUnits");
  const [editId, setEditId] = useState(null);
  const [editCollection, setEditCollection] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [hoveredRow, setHoveredRow] = useState({ id: null, collection: "" });

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
      alert("Import successful!");
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
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddToChange = (e) => {
    setAddTo(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.Tag || form.Tag.trim() === "") {
      alert("TAG is required.");
      return;
    }
    if (editId) {
      const collectionName = editCollection;
      await setDoc(doc(db, collectionName, form.Tag), form);
      if (editId !== form.Tag) {
        await deleteDoc(doc(db, collectionName, editId));
      }
      setEditId(null);
      setEditCollection("");
    } else {
      await setDoc(doc(db, addTo, form.Tag), form);
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
  };

  const handleEdit = (unit, collectionName) => {
    setForm({
      Tag: unit.Tag || "",
      CPU: unit.CPU || "",
      RAM: unit.RAM || "",
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
  };

  const cancelDeleteMode = () => {
    setDeleteMode({ table: null, active: false });
    setSelectedToDelete([]);
    setShowDeleteConfirm(false);
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

  // Delete confirmation modal
  const renderDeleteConfirmModal = () => {
    const table = deleteMode.table;
    const data = table === "InventoryUnits" ? inventory : deployed;
    const units = data.filter((u) => selectedToDelete.includes(u.id));
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
            borderRadius: 16,
            minWidth: 340,
            boxShadow: "0 8px 32px rgba(37,99,235,0.18)",
            position: "relative",
            fontFamily: "Segoe UI, Arial, sans-serif",
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
            Are you sure you want to delete the following unit
            {units.length > 1 ? "s" : ""}?
            <ul
              style={{
                margin: "12px 0 0 18px",
                color: "#e11d48",
                fontWeight: 700,
              }}
            >
              {units.map((u) => (
                <li key={u.id}>
                  {u.Tag} {u.CPU && `- ${u.CPU}`}
                </li>
              ))}
            </ul>
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
              onClick={confirmDelete}
            >
              Confirm
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
              onClick={cancelDeleteMode}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Table with Sorting and Filtering ---
  const renderTable = (data, collectionName) => {
    // Use correct filter state
    const filters =
      collectionName === "InventoryUnits" ? inventoryFilters : deployedFilters;
    let filtered = filterData(data, filters);
    let sorted = sortData(filtered);

    return (
      <div style={{ position: "relative" }}>
        {deleteMode.active && deleteMode.table === collectionName && (
          <div
            style={{
              marginBottom: 10,
              color: "#e11d48",
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            Click the checkbox next to the unit that you want to delete.
            {selectedToDelete.length === 0 && (
              <button
                style={{
                  marginLeft: 18,
                  background: "#e2e8f0",
                  color: "#18181a",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 18px",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                }}
                onClick={cancelDeleteMode}
              >
                Cancel
              </button>
            )}
          </div>
        )}
        <table style={tableStyle}>
          <thead>
            <tr>
              {deleteMode.active && deleteMode.table === collectionName && (
                <th style={{ ...thStyle, width: 40, textAlign: "center" }}></th>
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
                      color: col === "CPU" ? "#fff" : undefined,
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
                  ...thStyle,
                  borderRight: "none",
                  position: "relative",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
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
                    background: "#f1f5f9",
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
              sorted.map((unit) => (
                <tr
                  key={unit.id}
                  onMouseEnter={() =>
                    setHoveredRow({ id: unit.id, collection: collectionName })
                  }
                  onMouseLeave={() =>
                    setHoveredRow({ id: null, collection: "" })
                  }
                >
                  {deleteMode.active && deleteMode.table === collectionName && (
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedToDelete.includes(unit.id)}
                        onChange={() => handleSelectToDelete(unit.id)}
                        style={{ width: 18, height: 18 }}
                      />
                    </td>
                  )}
                  <td style={tdStyle}>{unit.Tag}</td>
                  <td style={tdStyle}>{unit.CPU}</td>
                  <td style={tdStyle}>{unit.RAM}</td>
                  <td style={tdStyle}>{unit.Drive}</td>
                  <td style={tdStyle}>{unit.GPU}</td>
                  <td style={tdStyle}>{unit.Status}</td>
                  <td style={tdStyle}>{unit.OS}</td>
                  <td style={tdStyle}>{unit.Remarks}</td>
                  <td
                    style={{
                      ...tdStyle,
                      position: "relative",
                      minWidth: 110,
                      paddingRight: 30,
                    }}
                  >
                    {!deleteMode.active && (
                      <>
                        {collectionName === "InventoryUnits" ? (
                          <button
                            style={actionBtn}
                            onClick={() =>
                              handleMove(
                                unit,
                                "InventoryUnits",
                                "DeployedUnits"
                              )
                            }
                          >
                            Move to Deployed
                          </button>
                        ) : (
                          <button
                            style={actionBtn}
                            onClick={() =>
                              handleMove(
                                unit,
                                "DeployedUnits",
                                "InventoryUnits"
                              )
                            }
                          >
                            Move to Inventory
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
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {/* Delete button appears when at least one checkbox is selected */}
        {deleteMode.active &&
          deleteMode.table === collectionName &&
          selectedToDelete.length > 0 && (
            <div style={{ marginTop: 16 }}>
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
                  marginRight: 12,
                }}
                onClick={handleDeleteSelected}
              >
                Delete Selected
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
          fontFamily: "Segoe UI, Arial, sans-serif",
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
            <input
              name="CPU"
              placeholder="CPU Gen"
              value={form.CPU}
              onChange={handleChange}
              style={inputStyle}
            />
            <input
              name="RAM"
              placeholder="RAM"
              value={form.RAM}
              onChange={handleChange}
              style={inputStyle}
            />
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

  return (
    <div
      style={{
        fontFamily: "Segoe UI, Arial, sans-serif",
        background: "#f1f5f9",
        minHeight: "100vh",
        padding: "32px 0",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          width: "100%",
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
          padding: "32px 36px",
        }}
      >
        {/* Inventory Units Table */}
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: 10 }}
        >
          <h2
            style={{
              display: "inline-block",
              color: "#18181a",
              fontWeight: 700,
              fontSize: 22,
              margin: 0,
            }}
          >
            Inventory Units
          </h2>
          <button
            style={{
              ...actionBtn,
              background: "#18181a",
              color: "#fff",
              marginLeft: 18,
              padding: "8px 22px",
              fontSize: 15,
            }}
            onClick={() => {
              setAddTo("InventoryUnits");
              setShowModal(true);
            }}
          >
            Add Unit
          </button>
          {/* Import Excel Button */}
          <label
            style={{
              background: "#22c55e",
              color: "#fff",
              borderRadius: 8,
              padding: "8px 22px",
              fontWeight: 700,
              fontSize: 15,
              marginLeft: 10,
              cursor: "pointer",
              display: "inline-block",
            }}
          >
            Import
            <input
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) => handleImportExcel(e, "InventoryUnits")}
            />
          </label>
          {!deleteMode.active && (
            <button
              style={{
                background: "#e11d48",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 22px",
                fontWeight: 700,
                fontSize: 15,
                marginLeft: 10,
                cursor: "pointer",
              }}
              onClick={() => {
                setDeleteMode({ table: "InventoryUnits", active: true });
                setSelectedToDelete([]);
              }}
            >
              Delete
            </button>
          )}
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 30 }}>Loading...</div>
        ) : (
          renderTable(inventory, "InventoryUnits")
        )}

        {/* Deployed Units Table */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 10,
            marginTop: 38,
          }}
        >
          <h2
            style={{
              display: "inline-block",
              color: "#18181a",
              fontWeight: 700,
              fontSize: 22,
              margin: 0,
            }}
          >
            Deployed Units
          </h2>
          <button
            style={{
              ...actionBtn,
              background: "#18181a",
              color: "#fff",
              marginLeft: 18,
              padding: "8px 22px",
              fontSize: 15,
            }}
            onClick={() => {
              setAddTo("DeployedUnits");
              setShowModal(true);
            }}
          >
            Add Unit
          </button>
          {/* Import Excel Button for Deployed */}
          <label
            style={{
              background: "#22c55e",
              color: "#fff",
              borderRadius: 8,
              padding: "8px 22px",
              fontWeight: 700,
              fontSize: 15,
              marginLeft: 10,
              cursor: "pointer",
              display: "inline-block",
            }}
          >
            Import
            <input
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) => handleImportExcel(e, "DeployedUnits")}
            />
          </label>
          {!deleteMode.active && (
            <button
              style={{
                background: "#e11d48",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 22px",
                fontWeight: 700,
                fontSize: 15,
                marginLeft: 10,
                cursor: "pointer",
              }}
              onClick={() => {
                setDeleteMode({ table: "DeployedUnits", active: true });
                setSelectedToDelete([]);
              }}
            >
              Delete
            </button>
          )}
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 30 }}>Loading...</div>
        ) : (
          renderTable(deployed, "DeployedUnits")
        )}
      </div>
      {/* Modal for Add/Edit */}
      {showModal && renderModal()}
      {/* Delete confirmation modal */}
      {showDeleteConfirm && renderDeleteConfirmModal()}
    </div>
  );
};

export default UnitSpecs;
