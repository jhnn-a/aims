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
} from "firebase/firestore";
import { useSnackbar } from "../components/Snackbar";
import LoadingSpinner, {
  TableLoadingSpinner,
} from "../components/LoadingSpinner";
import { SnackbarContainer } from "../components/Snackbar";

// Modal Components with Employee-style design
function UserFormModal({ isOpen, onClose, onSubmit, isLoading = false, error = "", isEdit = false, initialData = null }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    rePassword: ""
  });

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (isEdit && initialData) {
      setFormData({
        username: initialData.username || "",
        email: initialData.email || "",
        password: "",
        rePassword: ""
      });
    } else if (!isEdit) {
      setFormData({
        username: "",
        email: "",
        password: "",
        rePassword: ""
      });
    }
  }, [isEdit, initialData, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.username.trim()) return;
    if (!formData.email.trim()) return;
    if (!isEdit && !formData.password) return;
    if (!isEdit && formData.password !== formData.rePassword) return;
    if (isEdit && formData.password && formData.password !== formData.rePassword) return;
    
    onSubmit(formData);
  };

  if (!isOpen) return null;

  const isValid = formData.username && formData.email && 
    (!isEdit ? (formData.password && formData.rePassword && formData.password === formData.rePassword) : 
     (formData.password === "" || (formData.password && formData.rePassword && formData.password === formData.rePassword)));
  
  return (
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
        padding: "clamp(16px, 2vw, 20px)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: "clamp(16px, 2vw, 24px)",
          width: "100%",
          maxWidth: "min(480px, 90vw)",
          maxHeight: "95vh",
          overflow: "auto",
          fontFamily: 'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: "0 20px 32px rgba(34, 46, 58, 0.2)",
          margin: "auto",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(18px, 2vw, 22px)",
            fontWeight: 700,
            color: "#222e3a",
            marginBottom: "clamp(16px, 2vw, 20px)",
            marginTop: 0,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {isEdit ? "Edit User" : "Create New User"}
        </h2>
        
        <div 
          style={{ 
            flex: 1,
            overflow: "auto",
            minHeight: 0,
            paddingRight: "4px",
            marginRight: "-4px",
          }}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: "clamp(10px, 1.2vw, 14px)" }}>
              <div>
                <label style={{ 
                  display: "block",
                  fontSize: "clamp(12px, 1.1vw, 14px)",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 4,
                }}>
                  Username:
                </label>
                <input
                  name="username"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  style={{
                    width: "100%",
                    padding: "clamp(6px, 0.8vw, 10px)",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(12px, 1.1vw, 14px)",
                    fontFamily: 'inherit',
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ 
                  display: "block",
                  fontSize: "clamp(12px, 1.1vw, 14px)",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 4,
                }}>
                  Email:
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  style={{
                    width: "100%",
                    padding: "clamp(6px, 0.8vw, 10px)",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(12px, 1.1vw, 14px)",
                    fontFamily: 'inherit',
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ 
                  display: "block",
                  fontSize: "clamp(12px, 1.1vw, 14px)",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 4,
                }}>
                  {isEdit ? "New Password (leave blank to keep):" : "Password:"}
                </label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  style={{
                    width: "100%",
                    padding: "clamp(6px, 0.8vw, 10px)",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(12px, 1.1vw, 14px)",
                    fontFamily: 'inherit',
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  required={!isEdit}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: "block",
                  fontSize: "clamp(12px, 1.1vw, 14px)",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 4,
                }}>
                  Re-enter Password:
                </label>
                <input
                  name="rePassword"
                  type="password"
                  value={formData.rePassword}
                  onChange={(e) => handleChange('rePassword', e.target.value)}
                  style={{
                    width: "100%",
                    padding: "clamp(6px, 0.8vw, 10px)",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(12px, 1.1vw, 14px)",
                    fontFamily: 'inherit',
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  required={!isEdit || formData.password !== ""}
                />
              </div>
              
              {error && (
                <div style={{
                  color: "#dc2626",
                  fontSize: "clamp(12px, 1.1vw, 14px)",
                  marginTop: "8px",
                  textAlign: "center",
                  fontWeight: 500,
                }}>
                  {error}
                </div>
              )}
            </div>
          </form>
        </div>
        
        <div style={{ 
          display: "flex", 
          gap: "clamp(6px, 0.8vw, 10px)", 
          justifyContent: "flex-end",
          marginTop: "clamp(12px, 1.5vw, 16px)",
          flexWrap: "wrap",
          flexShrink: 0,
          paddingTop: "clamp(8px, 1vw, 12px)",
          borderTop: "1px solid #f3f4f6",
        }}>
          <button 
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: "clamp(6px, 0.8vw, 10px) clamp(10px, 1.2vw, 14px)",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "white",
              color: "#374151",
              fontSize: "clamp(12px, 1.1vw, 14px)",
              fontWeight: 500,
              cursor: isLoading ? "not-allowed" : "pointer",
              fontFamily: 'inherit',
              minWidth: "70px",
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            style={{
              padding: "clamp(6px, 0.8vw, 10px) clamp(10px, 1.2vw, 14px)",
              border: "none",
              borderRadius: 6,
              background: (isValid && !isLoading) ? "#2563eb" : "#9ca3af",
              color: "white",
              fontSize: "clamp(12px, 1.1vw, 14px)",
              fontWeight: 500,
              cursor: (isValid && !isLoading) ? "pointer" : "not-allowed",
              fontFamily: 'inherit',
              minWidth: "70px",
            }}
          >
            {isLoading ? "Saving..." : (isEdit ? "Save Changes" : "Create User")}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, isLoading = false, itemName = "", itemType = "item" }) {
  if (!isOpen) return null;
  
  return (
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
        padding: "clamp(16px, 2vw, 20px)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: "clamp(16px, 2vw, 24px)",
          width: "100%",
          maxWidth: "min(400px, 90vw)",
          fontFamily: 'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: "0 20px 32px rgba(34, 46, 58, 0.2)",
          margin: "auto",
          boxSizing: "border-box",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(18px, 2vw, 22px)",
            fontWeight: 700,
            color: "#dc2626",
            marginBottom: "clamp(16px, 2vw, 20px)",
            marginTop: 0,
          }}
        >
          Confirm Delete
        </h2>
        
        <p style={{
          fontSize: "clamp(14px, 1.1vw, 16px)",
          color: "#374151",
          marginBottom: "clamp(16px, 2vw, 20px)",
          lineHeight: 1.5,
        }}>
          Are you sure you want to delete {itemType} "{itemName}"? This action cannot be undone.
        </p>
        
        <div style={{ 
          display: "flex", 
          gap: "clamp(6px, 0.8vw, 10px)", 
          justifyContent: "center",
          flexWrap: "wrap",
        }}>
          <button 
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: "clamp(6px, 0.8vw, 10px) clamp(10px, 1.2vw, 14px)",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "white",
              color: "#374151",
              fontSize: "clamp(12px, 1.1vw, 14px)",
              fontWeight: 500,
              cursor: isLoading ? "not-allowed" : "pointer",
              fontFamily: 'inherit',
              minWidth: "70px",
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: "clamp(6px, 0.8vw, 10px) clamp(10px, 1.2vw, 14px)",
              border: "none",
              borderRadius: 6,
              background: isLoading ? "#9ca3af" : "#dc2626",
              color: "white",
              fontSize: "clamp(12px, 1.1vw, 14px)",
              fontWeight: 500,
              cursor: isLoading ? "not-allowed" : "pointer",
              fontFamily: 'inherit',
              minWidth: "70px",
            }}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserManagement() {
  const { currentUser } = useCurrentUser();
  const { showSuccess, showError, showWarning } = useSnackbar();
  
  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (checkedRows.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${checkedRows.length} user(s)? This cannot be undone.`)) {
      return;
    }
    
    setUsersLoading(true);
    try {
      const db = getFirestore();
      await Promise.all(
        checkedRows.map(uid => deleteDoc(doc(db, "users", uid)))
      );
      setUsers(prev => prev.filter(user => !checkedRows.includes(user.uid)));
      setCheckedRows([]);
      showSuccess(`${checkedRows.length} user(s) deleted successfully`);
    } catch (err) {
      showError("Failed to delete users: " + err.message);
      console.error("Bulk delete error:", err);
    }
    setUsersLoading(false);
  };
  
  const [showModal, setShowModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, uid: null, username: "" });
  const [editModal, setEditModal] = useState({ open: false, user: null });
  
  // Modal loading and error states
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  
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

  const handleCreateUser = async (formData) => {
    setModalLoading(true);
    setModalError("");
    
    try {
      const db = getFirestore();
      await addDoc(collection(db, "users"), {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        createdAt: new Date().toISOString(),
      });
      
      setShowModal(false);
      showSuccess("User created successfully");
      
      // Refresh users list
      const usersCol = collection(db, "users");
      const snapshot = await getDocs(usersCol);
      const usersList = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    } catch (err) {
      setModalError("Error creating user: " + err.message);
      showError("Failed to create user");
      console.error("Firestore add error:", err);
    }
    setModalLoading(false);
  };

  const handleEditUser = async (formData) => {
    setModalLoading(true);
    setModalError("");
    
    try {
      const db = getFirestore();
      const userRef = doc(db, "users", editModal.user.uid);
      const { updateDoc } = await import("firebase/firestore");
      
      await updateDoc(userRef, {
        username: formData.username,
        email: formData.email,
        ...(formData.password !== "" ? { password: formData.password } : {}),
      });
      
      setEditModal({ open: false, user: null });
      showSuccess("User updated successfully");
      
      // Refresh users list
      const usersCol = collection(db, "users");
      const snapshot = await getDocs(usersCol);
      const usersList = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    } catch (err) {
      setModalError("Error updating user: " + err.message);
      showError("Failed to update user");
      console.error("Firestore update error:", err);
    }
    setModalLoading(false);
  };

  const handleDeleteUser = async (uid) => {
    setDeleteModal({ open: true, uid, username: users.find(u => u.uid === uid)?.username || "Unknown User" });
  };

  const confirmDeleteUser = async () => {
    setDeleteLoading(true);
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, "users", deleteModal.uid));
      setUsers((prev) => prev.filter((u) => u.uid !== deleteModal.uid));
      setDeleteModal({ open: false, uid: null, username: "" });
      showSuccess("User deleted successfully");
    } catch (err) {
      showError("Failed to delete user: " + err.message);
      console.error("Firestore delete error:", err);
    }
    setDeleteLoading(false);
  };

  return (
    <div className="clients-page">
      <div className="clients-header">
        <h1 className="clients-title">User Management</h1>
        <div className="clients-header-actions">
          <button
            className="clients-add-btn"
            onClick={() => setShowModal(true)}
          >
            + Create New User
          </button>
          {checkedRows.length > 0 && (
            <button
              className="clients-delete-btn"
              onClick={handleBulkDelete}
              disabled={usersLoading}
            >
              {usersLoading ? "Deleting..." : "Delete Selected"}
            </button>
          )}
        </div>
      </div>
      <div className="clients-search-bar">
        <div className="clients-search-input-wrapper">
          <input
            type="text"
            placeholder="Search by Email or UID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="clients-search-input"
          />
          <span className="clients-search-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle
                cx="8"
                cy="8"
                r="6.5"
                stroke="#A0AEC0"
                strokeWidth="1.5"
              />
              <line
                x1="13.3536"
                x2="17"
                stroke="#A0AEC0"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>
      </div>
      {checkedRows.length > 0 && (
        <div className="clients-bulk-toolbar">
          <span className="clients-bulk-count">{checkedRows.length}</span>
          <span className="clients-bulk-label">
            {checkedRows.length === 1 ? "user" : "users"} selected.
          </span>
        </div>
      )}
      <div className="clients-content">
        <div className="clients-table-container">
          <table className="clients-table">
            <thead>
              <tr className="clients-table-header">
                <th
                  className="clients-table-checkbox-cell"
                  style={{ width: 48, textAlign: "center" }}
                >
                  <input
                    type="checkbox"
                    checked={
                      checkedRows.length > 0 &&
                      checkedRows.length === filteredUsers.length &&
                      filteredUsers.length > 0
                    }
                    onChange={handleCheckAll}
                    className="clients-checkbox"
                    style={{ margin: "0 auto", display: "block" }}
                  />
                </th>
                <th
                  className="clients-table-username"
                  style={{ width: "25%", textAlign: "left" }}
                >
                  Username
                </th>
                <th
                  className="clients-table-id"
                  style={{ width: "25%", textAlign: "left" }}
                >
                  Email
                </th>
                <th
                  className="clients-table-date"
                  style={{ width: "25%", textAlign: "left" }}
                >
                  Date Created
                </th>
                <th
                  className="clients-table-actions"
                  style={{ width: "25%", textAlign: "left" }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={3} className="clients-table-empty">
                    <TableLoadingSpinner />
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, idx) => {
                  const isChecked = checkedRows.includes(u.uid);
                  const selectedIndex = checkedRows.indexOf(u.uid);
                  const rowClass = isChecked
                    ? selectedIndex % 2 === 0
                      ? "clients-table-row selected"
                      : "clients-table-row selected-alt"
                    : idx % 2 === 0
                    ? "clients-table-row unselected"
                    : "clients-table-row unselected-alt";
                  return (
                    <tr
                      key={u.uid}
                      className={rowClass}
                      onMouseEnter={(e) =>
                        !isChecked && e.currentTarget.classList.add("hover")
                      }
                      onMouseLeave={(e) =>
                        !isChecked && e.currentTarget.classList.remove("hover")
                      }
                    >
                      <td className="clients-table-checkbox-cell">
                        {String(currentUser.uid) === String(u.uid) ? (
                          <span
                            style={{ color: "#A0AEC0", fontStyle: "italic" }}
                          >
                            —
                          </span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(u.uid)}
                            className="clients-checkbox"
                          />
                        )}
                      </td>
                      <td>{u.username || "-"}</td>
                      <td>{u.email}</td>
                      <td>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="clients-table-actions-cell">
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="clients-table-actions-btn"
                            title="Edit User"
                            onClick={() => {
                              setEditModal({ open: true, user: u });
                            }}
                          >
                            Edit
                          </button>
                          {String(currentUser.uid) !== String(u.uid) && (
                            <button
                              type="button"
                              className="clients-table-actions-btn"
                              title="Delete User"
                              onClick={() => handleDeleteUser(u.uid)}
                            >
                              Delete
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
        {/* Pagination Footer */}
        <div className="clients-pagination-footer">
          <button
            className="clients-pagination-btn"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            First
          </button>
          <button
            className="clients-pagination-btn"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          {getPageNumbers().map((page) => (
            <button
              key={page}
              className={`clients-pagination-btn${
                page === currentPage ? " selected" : ""
              }`}
              onClick={() => setCurrentPage(page)}
              disabled={page === currentPage}
            >
              {page}
            </button>
          ))}
          <button
            className="clients-pagination-btn"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <button
            className="clients-pagination-btn"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </button>
          <span className="clients-pagination-info">
            Showing {startIdx} - {endIdx} of {filteredUsers.length} users
          </span>
          <span className="clients-pagination-select">
            Show:
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="clients-rows-select"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </span>
        </div>
      </div>
      
      {/* New Modal Components */}
      <UserFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateUser}
        isLoading={modalLoading}
        error={modalError}
      />

      <UserFormModal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, user: null })}
        onSubmit={handleEditUser}
        isLoading={modalLoading}
        error={modalError}
        isEdit={true}
        initialData={editModal.user}
      />

      <DeleteConfirmationModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, uid: null, username: "" })}
        onConfirm={confirmDeleteUser}
        isLoading={deleteLoading}
        itemName={deleteModal.username}
        itemType="user"
      />

      <SnackbarContainer />
    </div>
  );
}

export default UserManagement;
