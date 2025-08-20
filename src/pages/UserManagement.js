// UserManagement.js
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useCurrentUser } from "../CurrentUserContext";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import LoadingSpinner, {
  TableLoadingSpinner,
} from "../components/LoadingSpinner";
// Import theme context for dark mode
import { useTheme } from "../context/ThemeContext";

function UserManagement() {
  const { currentUser } = useCurrentUser();
  const { isDarkMode } = useTheme();
  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (checkedRows.length === 0) return;
    setBulkDeleteModal({ open: true, count: checkedRows.length });
  };

  const confirmBulkDelete = async () => {
    const deletedCount = bulkDeleteModal.count;
    const usersToDelete = users.filter((u) => checkedRows.includes(u.uid));

    setBulkDeleteModal({ open: false, count: 0 });
    setUsersLoading(true);
    try {
      const db = getFirestore();
      for (const uid of checkedRows) {
        await deleteDoc(doc(db, "users", uid));
      }
      setUsers((prev) => prev.filter((u) => !checkedRows.includes(u.uid)));
      setCheckedRows([]);

      // Show snackbar with undo functionality
      setSnackbar({
        open: true,
        message: `${deletedCount} user(s) deleted from the database.`,
        type: "success",
        undoAction: "bulkDeleteUsers",
        undoData: usersToDelete,
      });
    } catch (err) {
      setStatus("Error deleting users: " + err.message);
      console.error("Firestore bulk delete error:", err);
    }
    setUsersLoading(false);
  };
  const [showModal, setShowModal] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "success",
    undoAction: null,
    undoData: null,
  });
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rePassword, setRePassword] = useState("");
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    open: false,
    uid: null,
    username: "",
  });
  const [bulkDeleteModal, setBulkDeleteModal] = useState({
    open: false,
    count: 0,
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Search and selection state for table
  const [search, setSearch] = useState("");
  const [checkedRows, setCheckedRows] = useState([]);
  const [actionMenu, setActionMenu] = useState({
    open: false,
    idx: null,
    anchor: null,
  });
  const actionMenuRef = useRef();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Filtered users
  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.uid && String(u.uid).toLowerCase().includes(search.toLowerCase()))
      ),
    [users, search]
  );

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const paginatedUsers = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return filteredUsers.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredUsers, currentPage, rowsPerPage]);

  const startIdx =
    filteredUsers.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIdx = Math.min(currentPage * rowsPerPage, filteredUsers.length);

  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  useEffect(() => {
    const validIds = new Set(filteredUsers.map((u) => u.uid));
    setCheckedRows((prev) => prev.filter((id) => validIds.has(id)));
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [filteredUsers, currentPage, totalPages]);

  const handleCheckboxChange = useCallback((uid) => {
    setCheckedRows((prev) =>
      prev.includes(uid)
        ? prev.filter((rowId) => rowId !== uid)
        : [...prev, uid]
    );
  }, []);

  const handleCheckAll = useCallback(
    (e) => {
      if (e.target.checked) {
        setCheckedRows(filteredUsers.map((u) => u.uid));
      } else {
        setCheckedRows([]);
      }
    },
    [filteredUsers]
  );

  // Close menu on click outside
  useEffect(() => {
    if (!actionMenu.open) return;
    function handleClick(e) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setActionMenu({ open: false, idx: null, anchor: null });
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [actionMenu.open]);

  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const db = getFirestore();
        const usersCol = collection(db, "users");
        const snapshot = await getDocs(usersCol);
        const usersList = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));
        setUsers(usersList);
      } catch (e) {
        setUsers([]);
      }
      setUsersLoading(false);
    };
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setStatus("");
    if (!username.trim()) {
      setStatus("Username is required.");
      return;
    }
    if (password !== rePassword) {
      setStatus("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const db = getFirestore();
      const docRef = await addDoc(collection(db, "users"), {
        username,
        email,
        password,
        createdAt: new Date().toISOString(),
      });

      const createdUserData = {
        uid: docRef.id,
        username,
        email,
        password,
        createdAt: new Date().toISOString(),
      };

      setUsername("");
      setEmail("");
      setPassword("");
      setRePassword("");
      setShowModal(false);
      setSnackbar({
        open: true,
        message: "Account created successfully!",
        type: "success",
        undoAction: "deleteUser",
        undoData: createdUserData,
      });
      // Refresh users list
      const usersCol = collection(db, "users");
      const snapshot = await getDocs(usersCol);
      const usersList = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    } catch (err) {
      setStatus("Error adding user: " + err.message);
      console.error("Firestore add error:", err);
    }
    setLoading(false);
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setStatus("");
    if (!editModal.user?.username?.trim()) {
      setStatus("Username is required.");
      return;
    }
    if (editPassword !== "" && editPassword !== rePassword) {
      setStatus("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const db = getFirestore();
      const userRef = doc(db, "users", editModal.user.uid);
      // Use updateDoc from Firestore
      const { updateDoc } = await import("firebase/firestore");
      await updateDoc(userRef, {
        username: editModal.user.username,
        email: editModal.user.email,
        ...(editPassword !== "" ? { password: editPassword } : {}),
      });
      setEditModal({ open: false, user: null });
      setSnackbar({
        open: true,
        message: "User updated successfully!",
        type: "success",
        undoAction: null,
        undoData: null,
      });
      // Refresh users list
      const usersCol = collection(db, "users");
      const snapshot = await getDocs(usersCol);
      const usersList = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    } catch (err) {
      setStatus("Error updating user: " + err.message);
      console.error("Firestore update error:", err);
    }
    setLoading(false);
  };

  const handleDeleteUser = async (uid) => {
    const user = users.find((u) => u.uid === uid);
    setDeleteConfirmModal({
      open: true,
      uid: uid,
      username: user?.username || user?.email || "Unknown User",
    });
  };

  const confirmDeleteUser = async () => {
    const uid = deleteConfirmModal.uid;
    const userToDelete = users.find((u) => u.uid === uid);
    
    setDeleteConfirmModal({ open: false, uid: null, username: "" });
    setUsersLoading(true);
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, "users", uid));
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      
      // Show snackbar with undo functionality
      setSnackbar({
        open: true,
        message: "1 user deleted from the database.",
        type: "success",
        undoAction: "deleteUser",
        undoData: userToDelete,
      });
    } catch (err) {
      setStatus("Error deleting user: " + err.message);
      console.error("Firestore delete error:", err);
    }
    setUsersLoading(false);
  };

  // Auto-dismiss snackbar after 8 seconds
  useEffect(() => {
    if (snackbar.open) {
      const timer = setTimeout(() => {
        setSnackbar({
          open: false,
          message: "",
          type: "success",
          undoAction: null,
          undoData: null,
        });
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [snackbar.open]);

  // Undo action handler
  const handleUndo = async () => {
    if (!snackbar.undoAction || !snackbar.undoData) return;

    setUsersLoading(true);
    try {
      const db = getFirestore();

      if (snackbar.undoAction === "deleteUser") {
        // Undo single user deletion by restoring the user
        await setDoc(doc(db, "users", snackbar.undoData.uid), {
          username: snackbar.undoData.username,
          email: snackbar.undoData.email,
          password: snackbar.undoData.password,
          isAdmin: snackbar.undoData.isAdmin || false,
          createdAt: snackbar.undoData.createdAt,
          updatedAt: new Date(),
        });
        // Add the restored user back to the users state
        setUsers((prev) => [...prev, snackbar.undoData]);
      } else if (snackbar.undoAction === "bulkDeleteUsers") {
        // Undo bulk delete by restoring all deleted users
        for (const user of snackbar.undoData) {
          await setDoc(doc(db, "users", user.uid), {
            username: user.username,
            email: user.email,
            password: user.password,
            isAdmin: user.isAdmin || false,
            createdAt: user.createdAt,
            updatedAt: new Date(),
          });
        }
        // Add the restored users back to the users state
        setUsers((prev) => [...prev, ...snackbar.undoData]);
      }

      setSnackbar({
        open: false,
        message: "",
        type: "success",
        undoAction: null,
        undoData: null,
      });

      // Refresh users list
      const usersCol = collection(db, "users");
      const snapshot = await getDocs(usersCol);
      const usersList = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    } catch (err) {
      console.error("Undo error:", err);
    }
    setUsersLoading(false);
  };

  return (
    <div>
      <style>{`
        .user-management-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: ${isDarkMode ? "#111827" : "#f8fafc"};
          font-family: Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .user-management-header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .user-management-header-title {
          flex-shrink: 0;
        }
        
        .user-management-header-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          min-width: 0;
        }
        
        .user-management-search-container {
          max-width: 300px;
          min-width: 200px;
        }
        
        @media (min-width: 768px) {
          .user-management-search-container {
            max-width: 350px;
            min-width: 250px;
          }
        }
        
        @media (min-width: 1024px) {
          .user-management-search-container {
            max-width: 400px;
            min-width: 300px;
          }
        }
        
        @media (max-width: 767px) {
          .user-management-add-btn-text {
            display: none;
          }
          .user-management-delete-btn-text {
            display: none;
          }
        }
        
        .search-input-dark::placeholder {
          color: #ffffff !important;
        }
        
        .search-input-light::placeholder {
          color: #9ca3af !important;
        }
      `}</style>

      <div className="user-management-page">
        {/* Header Section with Search and Actions */}
        <div
          style={{
            padding: "20px 16px 16px 16px",
            background: "transparent",
          }}
        >
          <div className="user-management-header-container">
            <h1
              className="user-management-header-title"
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: isDarkMode ? "#ffffff" : "#222e3a",
                margin: 0,
                fontFamily:
                  "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                letterSpacing: "1px",
              }}
            >
              USER MANAGEMENT
            </h1>

            {/* Search and Actions Controls */}
            <div className="user-management-header-controls">
              {/* Search Bar */}
              <div
                className="user-management-search-container"
                style={{
                  display: "flex",
                  alignItems: "center",
                  position: "relative",
                  background: isDarkMode ? "#374151" : "#fff",
                  borderRadius: "8px",
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #d1d5db",
                  overflow: "hidden",
                  boxShadow:
                    "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: isDarkMode ? "#ffffff" : "#9ca3af",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by Email or Username..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={
                    isDarkMode ? "search-input-dark" : "search-input-light"
                  }
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    padding: "10px 12px 10px 40px",
                    fontSize: "14px",
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    background: "transparent",
                    fontFamily:
                      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {/* Add User Button */}
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow:
                      "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                    fontFamily:
                      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#1d4ed8";
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow =
                      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#2563eb";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow =
                      "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                  <span className="user-management-add-btn-text">
                    Create New User
                  </span>
                </button>

                {/* Delete Selected Button */}
                {checkedRows.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={usersLoading}
                    style={{
                      background: "#dc2626",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 16px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: usersLoading ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      opacity: usersLoading ? 0.6 : 1,
                      boxShadow:
                        "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      if (!usersLoading) {
                        e.target.style.background = "#b91c1c";
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow =
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!usersLoading) {
                        e.target.style.background = "#dc2626";
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow =
                          "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
                      }
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <polyline points="3,6 5,6 21,6" />
                      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
                    </svg>
                    <span className="user-management-delete-btn-text">
                      Delete ({checkedRows.length})
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Selection Info Bar */}
        {checkedRows.length > 0 && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              flexShrink: 0,
              background: isDarkMode ? "#1e3a8a" : "#f0f9ff",
              border: isDarkMode ? "1px solid #3b82f6" : "1px solid #0ea5e9",
              borderLeft: "none",
              borderRight: "none",
              padding: "8px 16px",
              fontSize: "14px",
              color: isDarkMode ? "#93c5fd" : "#0369a1",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ fontWeight: 600 }}>{checkedRows.length}</span>
            <span>{checkedRows.length === 1 ? "user" : "users"} selected</span>
          </div>
        )}

        {/* Main Content Card */}
        <div
          style={{
            height: "calc(100vh - 200px)",
            minHeight: "500px",
            maxHeight: "800px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            margin: "0 16px 16px 16px",
            background: isDarkMode ? "#1f2937" : "#fff",
            borderRadius: "8px",
            border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
            boxShadow:
              "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
          }}
        >
          {usersLoading && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TableLoadingSpinner />
            </div>
          )}

          {!usersLoading && (
            <div
              style={{
                flex: 1,
                overflow: "auto",
                background: "transparent",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: "900px",
                  borderCollapse: "collapse",
                  background: isDarkMode ? "#1f2937" : "#fff",
                  fontSize: "14px",
                  border: isDarkMode
                    ? "1px solid #374151"
                    : "1px solid #d1d5db",
                  tableLayout: "fixed",
                }}
              >
                <thead
                  style={{
                    position: "sticky",
                    top: "0",
                    background: isDarkMode ? "#374151" : "#f9fafb",
                    zIndex: 10,
                  }}
                >
                  <tr
                    style={{ background: isDarkMode ? "#374151" : "#f9fafb" }}
                  >
                    <th
                      style={{
                        width: "4%",
                        padding: "8px 4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        textAlign: "center",
                        border: isDarkMode
                          ? "1px solid #4b5563"
                          : "1px solid #d1d5db",
                        position: "sticky",
                        top: 0,
                        background: isDarkMode ? "#374151" : "#f9fafb",
                        zIndex: 10,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          checkedRows.length > 0 &&
                          checkedRows.length === filteredUsers.length &&
                          filteredUsers.length > 0
                        }
                        onChange={handleCheckAll}
                        style={{
                          width: 16,
                          height: 16,
                          margin: 0,
                          accentColor: isDarkMode ? "#6b7280" : undefined,
                          colorScheme: isDarkMode ? "dark" : "light",
                        }}
                      />
                    </th>
                    <th
                      style={{
                        width: "25%",
                        padding: "8px 6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        textAlign: "center",
                        border: isDarkMode
                          ? "1px solid #4b5563"
                          : "1px solid #d1d5db",
                        position: "sticky",
                        top: 0,
                        background: isDarkMode ? "#374151" : "#f9fafb",
                        zIndex: 10,
                      }}
                    >
                      USERNAME
                    </th>
                    <th
                      style={{
                        width: "25%",
                        padding: "8px 6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        textAlign: "center",
                        border: isDarkMode
                          ? "1px solid #4b5563"
                          : "1px solid #d1d5db",
                        position: "sticky",
                        top: 0,
                        background: isDarkMode ? "#374151" : "#f9fafb",
                        zIndex: 10,
                      }}
                    >
                      EMAIL
                    </th>
                    <th
                      style={{
                        width: "25%",
                        padding: "8px 6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        textAlign: "center",
                        border: isDarkMode
                          ? "1px solid #4b5563"
                          : "1px solid #d1d5db",
                        position: "sticky",
                        top: 0,
                        background: isDarkMode ? "#374151" : "#f9fafb",
                        zIndex: 10,
                      }}
                    >
                      DATE CREATED
                    </th>
                    <th
                      style={{
                        width: "21%",
                        padding: "8px 4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                        textAlign: "center",
                        border: isDarkMode
                          ? "1px solid #4b5563"
                          : "1px solid #d1d5db",
                        position: "sticky",
                        top: 0,
                        background: isDarkMode ? "#374151" : "#f9fafb",
                        zIndex: 10,
                      }}
                    >
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: "40px 20px",
                          textAlign: "center",
                          color: isDarkMode ? "#9ca3af" : "#9ca3af",
                          fontSize: "14px",
                          fontWeight: "400",
                          border: isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #d1d5db",
                          backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                        }}
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u, idx) => {
                      const isChecked = checkedRows.includes(u.uid);
                      const isCurrentUser =
                        String(currentUser.uid) === String(u.uid);
                      return (
                        <tr
                          key={u.uid}
                          style={{
                            borderBottom: isDarkMode
                              ? "1px solid #374151"
                              : "1px solid #d1d5db",
                            background:
                              idx % 2 === 0
                                ? isDarkMode
                                  ? "#1f2937"
                                  : "rgb(250, 250, 252)"
                                : isDarkMode
                                ? "#111827"
                                : "rgb(240, 240, 243)",
                            cursor: "pointer",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isChecked) {
                              e.currentTarget.style.background = isDarkMode
                                ? "#374151"
                                : "#f3f4f6";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isChecked) {
                              e.currentTarget.style.background =
                                idx % 2 === 0
                                  ? isDarkMode
                                    ? "#1f2937"
                                    : "rgb(250, 250, 252)"
                                  : isDarkMode
                                  ? "#111827"
                                  : "rgb(240, 240, 243)";
                            }
                          }}
                        >
                          <td
                            style={{
                              width: "4%",
                              padding: "8px 4px",
                              textAlign: "center",
                              border: isDarkMode
                                ? "1px solid #374151"
                                : "1px solid #d1d5db",
                            }}
                          >
                            {isCurrentUser ? (
                              <span
                                style={{
                                  color: "#A0AEC0",
                                  fontStyle: "italic",
                                }}
                              >
                                —
                              </span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleCheckboxChange(u.uid)}
                                style={{
                                  width: 16,
                                  height: 16,
                                  margin: 0,
                                  accentColor: isDarkMode ? "#6b7280" : "",
                                  colorScheme: isDarkMode ? "dark" : "light",
                                }}
                              />
                            )}
                          </td>
                          <td
                            style={{
                              width: "25%",
                              padding: "8px 6px",
                              fontSize: "14px",
                              color: isDarkMode ? "#f3f4f6" : "#374151",
                              border: isDarkMode
                                ? "1px solid #374151"
                                : "1px solid #d1d5db",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {u.username || "-"}
                          </td>
                          <td
                            style={{
                              width: "25%",
                              padding: "8px 6px",
                              fontSize: "14px",
                              color: isDarkMode ? "#f3f4f6" : "#374151",
                              border: isDarkMode
                                ? "1px solid #374151"
                                : "1px solid #d1d5db",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {u.email}
                          </td>
                          <td
                            style={{
                              width: "25%",
                              padding: "8px 6px",
                              fontSize: "14px",
                              color: isDarkMode ? "#f3f4f6" : "#374151",
                              border: isDarkMode
                                ? "1px solid #374151"
                                : "1px solid #d1d5db",
                              textAlign: "center",
                            }}
                          >
                            {u.createdAt
                              ? new Date(u.createdAt).toLocaleString()
                              : "-"}
                          </td>
                          <td
                            style={{
                              width: "21%",
                              padding: "8px 4px",
                              textAlign: "center",
                              border: isDarkMode
                                ? "1px solid #374151"
                                : "1px solid #d1d5db",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                              }}
                            >
                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditModal({ open: true, user: u });
                                  setEditUsername(u.username || "");
                                  setEditEmail(u.email || "");
                                  setEditPassword("");
                                  setEditShowPassword(false);
                                }}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "6px",
                                  borderRadius: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "background 0.2s",
                                  color: "#059669",
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = "transparent";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = "transparent";
                                }}
                                title="Edit user"
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                </svg>
                              </button>

                              {/* Delete Button */}
                              {!isCurrentUser && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.uid)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "6px",
                                    borderRadius: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "background 0.2s",
                                    color: "#dc2626",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.background = "transparent";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.background = "transparent";
                                  }}
                                  title="Delete user"
                                >
                                  <svg
                                    width="16"
                                    height="16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    viewBox="0 0 24 24"
                                  >
                                    <polyline points="3,6 5,6 21,6" />
                                    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {/* Pagination Footer */}
          <div
            style={{
              background: isDarkMode ? "#1f2937" : "#f9fafb",
              borderTop: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              fontSize: "14px",
            }}
          >
            {/* Pagination Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  padding: "6px 12px",
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #d1d5db",
                  background:
                    currentPage === 1
                      ? isDarkMode
                        ? "#374151"
                        : "#f9fafb"
                      : isDarkMode
                      ? "#1f2937"
                      : "#fff",
                  color:
                    currentPage === 1
                      ? isDarkMode
                        ? "#9ca3af"
                        : "#9ca3af"
                      : isDarkMode
                      ? "#f3f4f6"
                      : "#374151",
                  borderRadius: "6px",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  transition: "all 0.2s",
                }}
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "6px 12px",
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #d1d5db",
                  background:
                    currentPage === 1
                      ? isDarkMode
                        ? "#374151"
                        : "#f9fafb"
                      : isDarkMode
                      ? "#1f2937"
                      : "#fff",
                  color:
                    currentPage === 1
                      ? isDarkMode
                        ? "#9ca3af"
                        : "#9ca3af"
                      : isDarkMode
                      ? "#f3f4f6"
                      : "#374151",
                  borderRadius: "6px",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  transition: "all 0.2s",
                }}
              >
                Previous
              </button>

              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  disabled={page === currentPage}
                  style={{
                    padding: "6px 12px",
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #d1d5db",
                    background:
                      page === currentPage
                        ? "#2563eb"
                        : isDarkMode
                        ? "#1f2937"
                        : "#fff",
                    color:
                      page === currentPage
                        ? "#fff"
                        : isDarkMode
                        ? "#f3f4f6"
                        : "#374151",
                    borderRadius: "6px",
                    cursor: page === currentPage ? "default" : "pointer",
                    fontSize: "14px",
                    fontWeight: page === currentPage ? "600" : "400",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (page !== currentPage) {
                      e.target.style.background = isDarkMode
                        ? "#374151"
                        : "#f3f4f6";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (page !== currentPage) {
                      e.target.style.background = isDarkMode
                        ? "#1f2937"
                        : "#fff";
                    }
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                style={{
                  padding: "6px 12px",
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #d1d5db",
                  background:
                    currentPage === totalPages
                      ? isDarkMode
                        ? "#374151"
                        : "#f9fafb"
                      : isDarkMode
                      ? "#1f2937"
                      : "#fff",
                  color:
                    currentPage === totalPages
                      ? isDarkMode
                        ? "#9ca3af"
                        : "#9ca3af"
                      : isDarkMode
                      ? "#f3f4f6"
                      : "#374151",
                  borderRadius: "6px",
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  transition: "all 0.2s",
                }}
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "6px 12px",
                  border: isDarkMode
                    ? "1px solid #4b5563"
                    : "1px solid #d1d5db",
                  background:
                    currentPage === totalPages
                      ? isDarkMode
                        ? "#374151"
                        : "#f9fafb"
                      : isDarkMode
                      ? "#1f2937"
                      : "#fff",
                  color:
                    currentPage === totalPages
                      ? isDarkMode
                        ? "#9ca3af"
                        : "#9ca3af"
                      : isDarkMode
                      ? "#f3f4f6"
                      : "#374151",
                  borderRadius: "6px",
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  transition: "all 0.2s",
                }}
              >
                Last
              </button>
            </div>

            {/* Info and Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span
                style={{
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                  fontSize: "14px",
                }}
              >
                Showing {startIdx} - {endIdx} of {filteredUsers.length} users
              </span>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span
                  style={{
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  Show:
                </span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "4px 8px",
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #d1d5db",
                    borderRadius: "4px",
                    background: isDarkMode ? "#1f2937" : "#fff",
                    fontSize: "14px",
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    cursor: "pointer",
                  }}
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Create User Modal */}
        {showModal && (
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
                background: isDarkMode ? "#1f2937" : "#fff",
                padding: 20,
                borderRadius: 12,
                minWidth: 480,
                maxWidth: 520,
                width: "70vw",
                boxShadow: "0 6px 24px rgba(34,46,58,0.13)",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                position: "relative",
                border: isDarkMode
                  ? "1.5px solid #374151"
                  : "1.5px solid #e5e7eb",
                transition: "box-shadow 0.2s",
                maxHeight: "85vh",
                overflowY: "auto",
                fontFamily:
                  "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                  lineHeight: 1,
                  padding: "4px",
                  borderRadius: "4px",
                  transition: "color 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = isDarkMode ? "#f3f4f6" : "#374151";
                  e.target.style.background = isDarkMode
                    ? "#374151"
                    : "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = isDarkMode ? "#9ca3af" : "#6b7280";
                  e.target.style.background = "none";
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
                  color: "#2563eb",
                  marginBottom: 14,
                  letterSpacing: 0.5,
                  textAlign: "center",
                  width: "100%",
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                Create New User
              </h3>
              <form
                onSubmit={handleCreateUser}
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    style={{
                      fontWeight: 500,
                      color: isDarkMode ? "#f3f4f6" : "#222e3a",
                      fontSize: 13,
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      fontSize: 13,
                      padding: "8px 12px",
                      borderRadius: 5,
                      border: isDarkMode
                        ? "1.2px solid #4b5563"
                        : "1.2px solid #cbd5e1",
                      background: isDarkMode ? "#374151" : "#f1f5f9",
                      color: isDarkMode ? "#f3f4f6" : "#222e3a",
                      height: "38px",
                      boxSizing: "border-box",
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#2563eb";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(37, 99, 235, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode
                        ? "#4b5563"
                        : "#cbd5e1";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    style={{
                      fontWeight: 500,
                      color: isDarkMode ? "#f3f4f6" : "#222e3a",
                      fontSize: 13,
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      fontSize: 13,
                      padding: "8px 12px",
                      borderRadius: 5,
                      border: isDarkMode
                        ? "1.2px solid #4b5563"
                        : "1.2px solid #cbd5e1",
                      background: isDarkMode ? "#374151" : "#f1f5f9",
                      color: isDarkMode ? "#f3f4f6" : "#222e3a",
                      height: "38px",
                      boxSizing: "border-box",
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#2563eb";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(37, 99, 235, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode
                        ? "#4b5563"
                        : "#cbd5e1";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    style={{
                      fontWeight: 500,
                      color: isDarkMode ? "#f3f4f6" : "#222e3a",
                      fontSize: 13,
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      fontSize: 13,
                      padding: "8px 12px",
                      borderRadius: 5,
                      border: isDarkMode
                        ? "1.2px solid #4b5563"
                        : "1.2px solid #cbd5e1",
                      background: isDarkMode ? "#374151" : "#f1f5f9",
                      color: isDarkMode ? "#f3f4f6" : "#222e3a",
                      height: "38px",
                      boxSizing: "border-box",
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#2563eb";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(37, 99, 235, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode
                        ? "#4b5563"
                        : "#cbd5e1";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    style={{
                      fontWeight: 500,
                      color: isDarkMode ? "#f3f4f6" : "#222e3a",
                      fontSize: 13,
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter Password"
                    value={rePassword}
                    onChange={(e) => setRePassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      fontSize: 13,
                      padding: "8px 12px",
                      borderRadius: 5,
                      border: isDarkMode
                        ? "1.2px solid #4b5563"
                        : "1.2px solid #cbd5e1",
                      background: isDarkMode ? "#374151" : "#f1f5f9",
                      color: isDarkMode ? "#f3f4f6" : "#222e3a",
                      height: "38px",
                      boxSizing: "border-box",
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#2563eb";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(37, 99, 235, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#cbd5e1";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 20px",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "background 0.2s",
                      flex: 1,
                      opacity: loading ? 0.6 : 1,
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) e.target.style.background = "#1d4ed8";
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) e.target.style.background = "#2563eb";
                    }}
                  >
                    {loading ? "Creating..." : "Create User"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={loading}
                    style={{
                      background: "#64748b",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 20px",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "background 0.2s",
                      flex: 1,
                      opacity: loading ? 0.6 : 1,
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) e.target.style.background = "#475569";
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) e.target.style.background = "#64748b";
                    }}
                  >
                    Cancel
                  </button>
                </div>
                {status && (
                  <div
                    style={{
                      color: status.includes("success") ? "#059669" : "#dc2626",
                      textAlign: "center",
                      fontWeight: 600,
                      fontSize: 13,
                      padding: "8px 12px",
                      background: status.includes("success")
                        ? "#d1fae5"
                        : "#fee2e2",
                      borderRadius: 6,
                      border: `1px solid ${
                        status.includes("success") ? "#059669" : "#dc2626"
                      }`,
                    }}
                  >
                    {status}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editModal.open && (
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
                background: isDarkMode ? "#1f2937" : "#fff",
                padding: 20,
                borderRadius: 12,
                minWidth: 480,
                maxWidth: 520,
                width: "70vw",
                boxShadow: "0 6px 24px rgba(34,46,58,0.13)",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                position: "relative",
                border: isDarkMode
                  ? "1.5px solid #374151"
                  : "1.5px solid #e5e7eb",
                transition: "box-shadow 0.2s",
                maxHeight: "85vh",
                overflowY: "auto",
                fontFamily:
                  "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              <button
                onClick={() => setEditModal({ open: false, user: null })}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                  lineHeight: 1,
                  padding: "4px",
                  borderRadius: "4px",
                  transition: "color 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = isDarkMode ? "#f3f4f6" : "#374151";
                  e.target.style.background = isDarkMode
                    ? "#374151"
                    : "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = isDarkMode ? "#9ca3af" : "#6b7280";
                  e.target.style.background = "none";
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
                  color: "#2563eb",
                  marginBottom: 14,
                  letterSpacing: 0.5,
                  textAlign: "center",
                  width: "100%",
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                Edit User
              </h3>
              <form
                onSubmit={handleEditUser}
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    style={{
                      fontWeight: 500,
                      color: isDarkMode ? "#f3f4f6" : "#222e3a",
                      fontSize: 13,
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="Username"
                    value={editModal.user?.username || ""}
                    onChange={(e) =>
                      setEditModal((prev) => ({
                        ...prev,
                        user: { ...prev.user, username: e.target.value },
                      }))
                    }
                    required
                    style={{
                      width: "100%",
                      fontSize: 13,
                      padding: "8px 12px",
                      borderRadius: 5,
                      border: isDarkMode
                        ? "1.2px solid #4b5563"
                        : "1.2px solid #cbd5e1",
                      background: isDarkMode ? "#374151" : "#f1f5f9",
                      color: isDarkMode ? "#f3f4f6" : "#222e3a",
                      height: "38px",
                      boxSizing: "border-box",
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#2563eb";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(37, 99, 235, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode
                        ? "#4b5563"
                        : "#cbd5e1";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    style={{
                      fontWeight: 500,
                      color: isDarkMode ? "#f3f4f6" : "#222e3a",
                      fontSize: 13,
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={editModal.user?.email || ""}
                    onChange={(e) =>
                      setEditModal((prev) => ({
                        ...prev,
                        user: { ...prev.user, email: e.target.value },
                      }))
                    }
                    required
                    style={{
                      width: "100%",
                      fontSize: 13,
                      padding: "8px 12px",
                      borderRadius: 5,
                      border: isDarkMode
                        ? "1.2px solid #4b5563"
                        : "1.2px solid #cbd5e1",
                      background: isDarkMode ? "#374151" : "#f1f5f9",
                      color: isDarkMode ? "#f3f4f6" : "#222e3a",
                      height: "38px",
                      boxSizing: "border-box",
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#2563eb";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(37, 99, 235, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#cbd5e1";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 20px",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "background 0.2s",
                      flex: 1,
                      opacity: loading ? 0.6 : 1,
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) e.target.style.background = "#1d4ed8";
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) e.target.style.background = "#2563eb";
                    }}
                  >
                    {loading ? "Updating..." : "Update User"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditModal({ open: false, user: null })}
                    disabled={loading}
                    style={{
                      background: "#64748b",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 20px",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "background 0.2s",
                      flex: 1,
                      opacity: loading ? 0.6 : 1,
                      fontFamily:
                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) e.target.style.background = "#475569";
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) e.target.style.background = "#64748b";
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmModal.open && (
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
                background: isDarkMode ? "#1f2937" : "#fff",
                padding: 24,
                borderRadius: 12,
                minWidth: 400,
                maxWidth: 480,
                width: "60vw",
                boxShadow: "0 6px 24px rgba(34,46,58,0.13)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                border: isDarkMode
                  ? "1.5px solid #374151"
                  : "1.5px solid #e5e7eb",
                fontFamily:
                  "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {/* Warning Icon */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "#fef3cd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <svg
                  width="24"
                  height="24"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" />
                  <path d="m12 17 .01 0" />
                </svg>
              </div>

              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  marginBottom: 12,
                  textAlign: "center",
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                Delete User
              </h3>

              <p
                style={{
                  fontSize: 14,
                  color: isDarkMode ? "#d1d5db" : "#6b7280",
                  textAlign: "center",
                  marginBottom: 24,
                  lineHeight: 1.5,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                Are you sure you want to delete{" "}
                <strong style={{ color: isDarkMode ? "#f3f4f6" : "#374151" }}>
                  {deleteConfirmModal.username}
                </strong>
                ?
                <br />
                This action cannot be undone.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setDeleteConfirmModal({
                      open: false,
                      uid: null,
                      username: "",
                    })
                  }
                  style={{
                    background: isDarkMode ? "#374151" : "#f3f4f6",
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #d1d5db",
                    borderRadius: 8,
                    padding: "10px 20px",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    flex: 1,
                    fontFamily:
                      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = isDarkMode
                      ? "#4b5563"
                      : "#e5e7eb";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = isDarkMode
                      ? "#374151"
                      : "#f3f4f6";
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteUser}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 20px",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 0.2s",
                    flex: 1,
                    fontFamily:
                      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#b91c1c";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#dc2626";
                  }}
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation Modal */}
        {bulkDeleteModal.open && (
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
                background: isDarkMode ? "#1f2937" : "#fff",
                padding: 24,
                borderRadius: 12,
                minWidth: 400,
                maxWidth: 500,
                width: "65vw",
                boxShadow: "0 6px 24px rgba(34,46,58,0.13)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                border: isDarkMode
                  ? "1.5px solid #374151"
                  : "1.5px solid #e5e7eb",
                fontFamily:
                  "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {/* Warning Icon */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "#fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <svg
                  width="24"
                  height="24"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polyline points="3,6 5,6 21,6" />
                  <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </div>

              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: isDarkMode ? "#f3f4f6" : "#222e3a",
                  marginBottom: 12,
                  textAlign: "center",
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                Delete Multiple Users
              </h3>

              <p
                style={{
                  fontSize: 14,
                  color: isDarkMode ? "#d1d5db" : "#6b7280",
                  textAlign: "center",
                  marginBottom: 24,
                  lineHeight: 1.5,
                  fontFamily:
                    "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                Are you sure you want to delete{" "}
                <strong style={{ color: isDarkMode ? "#f3f4f6" : "#374151" }}>
                  {bulkDeleteModal.count} selected user
                  {bulkDeleteModal.count === 1 ? "" : "s"}
                </strong>
                ?
                <br />
                This action cannot be undone and will permanently remove{" "}
                {bulkDeleteModal.count === 1 ? "this user" : "these users"} from
                the system.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => setBulkDeleteModal({ open: false, count: 0 })}
                  style={{
                    background: isDarkMode ? "#374151" : "#f3f4f6",
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #d1d5db",
                    borderRadius: 8,
                    padding: "10px 20px",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    flex: 1,
                    fontFamily:
                      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = isDarkMode
                      ? "#4b5563"
                      : "#e5e7eb";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = isDarkMode
                      ? "#374151"
                      : "#f3f4f6";
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmBulkDelete}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 20px",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 0.2s",
                    flex: 1,
                    fontFamily:
                      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#b91c1c";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#dc2626";
                  }}
                >
                  Delete {bulkDeleteModal.count} User
                  {bulkDeleteModal.count === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Snackbar */}
        {snackbar.open && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              background: isDarkMode ? "#1f2937" : "#fff",
              color: isDarkMode ? "#f3f4f6" : "#374151",
              padding: "16px 20px",
              borderRadius: 12,
              fontWeight: 500,
              boxShadow: isDarkMode
                ? "0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)"
                : "0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)",
              zIndex: 9999,
              fontFamily:
                "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
              minWidth: "320px",
              maxWidth: "400px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {/* Success Icon */}
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="12"
                height="12"
                fill="none"
                stroke="#fff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>

            {/* Message */}
            <span style={{ flex: 1, fontSize: "14px" }}>
              {snackbar.message}
            </span>

            {/* Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Undo Button */}
              {snackbar.undoAction && (
                <button
                  onClick={handleUndo}
                  style={{
                    background: "transparent",
                    border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                    color: isDarkMode ? "#f3f4f6" : "#374151",
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily:
                      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = isDarkMode
                      ? "#374151"
                      : "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "transparent";
                  }}
                >
                  Undo
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={() =>
                  setSnackbar({
                    open: false,
                    message: "",
                    type: "success",
                    undoAction: null,
                    undoData: null,
                  })
                }
                style={{
                  background: "transparent",
                  border: "none",
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = isDarkMode ? "#f3f4f6" : "#374151";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = isDarkMode ? "#9ca3af" : "#6b7280";
                }}
                aria-label="Close"
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
