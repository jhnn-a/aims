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
import LoadingSpinner, {
  TableLoadingSpinner,
} from "../components/LoadingSpinner";

function UserManagement() {
  const { currentUser } = useCurrentUser();
  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (checkedRows.length === 0) return;
    if (
      !window.confirm(
        `Delete ${checkedRows.length} selected user(s)? This cannot be undone.`
      )
    )
      return;
    setUsersLoading(true);
    try {
      const db = getFirestore();
      for (const uid of checkedRows) {
        await deleteDoc(doc(db, "users", uid));
      }
      setUsers((prev) => prev.filter((u) => !checkedRows.includes(u.uid)));
      setCheckedRows([]);
      setStatus(`${checkedRows.length} user(s) deleted from Firestore.`);
    } catch (err) {
      setStatus("Error deleting users: " + err.message);
      console.error("Firestore bulk delete error:", err);
    }
    setUsersLoading(false);
  };
  const [showModal, setShowModal] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
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
      await addDoc(collection(db, "users"), {
        username,
        email,
        password,
        createdAt: new Date().toISOString(),
      });
      setUsername("");
      setEmail("");
      setPassword("");
      setRePassword("");
      setShowModal(false);
      setSnackbar({ open: true, message: "Account created." });
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
    if (!editUsername.trim()) {
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
        username: editUsername,
        email: editEmail,
        ...(editPassword !== "" ? { password: editPassword } : {}),
      });
      setStatus("User updated.");
      setEditModal({ open: false, user: null });
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
    if (
      !window.confirm(
        "Are you sure you want to delete this user? This cannot be undone."
      )
    )
      return;
    setUsersLoading(true);
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, "users", uid));
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      setStatus("User deleted from Firestore.");
    } catch (err) {
      setStatus("Error deleting user: " + err.message);
      console.error("Firestore delete error:", err);
    }
    setUsersLoading(false);
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
                              setEditUsername(u.username || "");
                              setEditEmail(u.email || "");
                              setEditPassword("");
                              setEditShowPassword(false);
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
      {/* Modals */}
      {showModal && (
        <div className="clients-modal-overlay">
          <div className="clients-modal-box">
            <button
              className="clients-modal-close"
              onClick={() => setShowModal(false)}
              aria-label="Close"
              title="Close"
            >
              ×
            </button>
            <h3 className="clients-modal-title">Create New User</h3>
            <form onSubmit={handleCreateUser} className="clients-modal-form">
              <input
                className="clients-modal-input"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <input
                className="clients-modal-input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className="clients-modal-input"
                type="text"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <input
                className="clients-modal-input"
                type="text"
                placeholder="Re-enter Password"
                value={rePassword}
                onChange={(e) => setRePassword(e.target.value)}
                required
              />
              <div className="clients-modal-actions">
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    className="clients-modal-save"
                    type="submit"
                    disabled={loading}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    Create User
                  </button>
                  <button
                    className="clients-modal-cancel"
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={loading}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {snackbar.open && (
                <div
                  style={{
                    position: "fixed",
                    bottom: 32,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#38a169",
                    color: "#fff",
                    padding: "12px 32px",
                    borderRadius: 8,
                    fontWeight: 600,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    zIndex: 9999,
                  }}
                  onClick={() => setSnackbar({ open: false, message: "" })}
                >
                  {snackbar.message}
                </div>
              )}
              {status && (
                <div
                  className="clients-modal-error"
                  style={{
                    color: status.includes("success") ? "#38a169" : "#e11d48",
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                >
                  {status}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {editModal.open && (
        <div className="clients-modal-overlay">
          <div className="clients-modal-box">
            <button
              className="clients-modal-close"
              onClick={() => setEditModal({ open: false, user: null })}
              aria-label="Close"
              title="Close"
            >
              ×
            </button>
            <h3 className="clients-modal-title">Edit User</h3>
            <form onSubmit={handleEditUser} className="clients-modal-form">
              <input
                className="clients-modal-input"
                type="text"
                placeholder="Username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                required
              />
              <input
                className="clients-modal-input"
                type="email"
                placeholder="Email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
              <div style={{ position: "relative" }}>
                <input
                  className="clients-modal-input"
                  type="text"
                  placeholder="New Password (leave blank to keep)"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
              </div>
              <input
                className="clients-modal-input"
                type={editShowPassword ? "text" : "password"}
                placeholder="Re-enter New Password"
                value={rePassword}
                onChange={(e) => setRePassword(e.target.value)}
                disabled={editPassword === ""}
                required={editPassword !== ""}
              />
              <div className="clients-modal-actions">
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    className="clients-modal-save"
                    type="submit"
                    disabled={loading}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    Save Changes
                  </button>
                  <button
                    className="clients-modal-cancel"
                    type="button"
                    onClick={() => setEditModal({ open: false, user: null })}
                    disabled={loading}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {status && status !== "User deleted from Firestore." && (
                <div
                  className="clients-modal-error"
                  style={{
                    color: status.includes("success") ? "#38a169" : "#e11d48",
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                >
                  {status}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;

// test
