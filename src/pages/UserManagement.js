// UserManagement.js
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { getAuth } from "firebase/auth";
import LoadingSpinner, {
  TableLoadingSpinner,
} from "../components/LoadingSpinner";

function UserManagement({ currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");

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
    if (!currentUser || currentUser.role !== "admin") return;
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const idToken = await user.getIdToken();
        const res = await fetch("http://localhost:5001/api/list-users", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (res.ok) setUsers(data.users);
        else setUsers([]);
      } catch (e) {
        setUsers([]);
      }
      setUsersLoading(false);
    };
    fetchUsers();
  }, [currentUser]);

  // Only show if current user is admin
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="clients-page">
        <div className="clients-header">
          <h1 className="clients-title">User Management</h1>
        </div>
        <div style={{ padding: 32, color: "#e11d48", fontWeight: 700 }}>
          Access denied. Admins only.
        </div>
      </div>
    );
  }

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setStatus("");
    setLoading(true);
    try {
      // Get the current user's ID token
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const idToken = await user.getIdToken();
      // Call your backend API endpoint to create a user
      const res = await fetch("http://localhost:5001/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("User created successfully!");
        setEmail("");
        setPassword("");
        setRole("viewer");
      } else {
        setStatus(data.error || "Failed to create user.");
      }
    } catch (err) {
      setStatus("Network error or not authenticated.");
    }
    setLoading(false);
  };

  // Edit user role handler
  const handleEditRole = (user) => {
    setEditingUser(user);
    setEditRole(user.role || "viewer");
    setEditStatus("");
  };

  const handleSaveRole = async () => {
    setEditStatus("");
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const idToken = await user.getIdToken();
      console.log("[DEBUG] Sending update-user-role", {
        uid: editingUser.uid,
        role: editRole,
      });
      const res = await fetch("http://localhost:5001/api/update-user-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid: editingUser.uid, role: editRole }),
      });
      console.log("[DEBUG] update-user-role response status:", res.status);
      const data = await res.json().catch(() => ({}));
      console.log("[DEBUG] update-user-role response data:", data);
      if (res.ok) {
        setEditStatus("Role updated successfully!");
        setEditingUser(null);
        // Refresh users
        setUsersLoading(true);
        const res2 = await fetch("http://localhost:5001/api/list-users", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data2 = await res2.json();
        setUsers(data2.users || []);
        setUsersLoading(false);
      } else {
        setEditStatus(data.error || "Failed to update role.");
      }
    } catch (err) {
      setEditStatus("Network error or not authenticated.");
      console.error("[DEBUG] Caught error in handleSaveRole:", err);
    }
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
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const idToken = await user.getIdToken();
      const res = await fetch("http://localhost:5001/api/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.uid !== uid));
      } else {
        alert("Failed to delete user.");
      }
    } catch (err) {
      alert("Network error or not authenticated.");
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
              onClick={() => alert("Bulk actions coming soon")}
            >
              Delete Selected
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
                y1="13.6464"
                x2="17"
                y2="17.2929"
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
                <th className="clients-table-checkbox">
                  <input
                    type="checkbox"
                    checked={
                      checkedRows.length > 0 &&
                      checkedRows.length === filteredUsers.length &&
                      filteredUsers.length > 0
                    }
                    onChange={handleCheckAll}
                    className="clients-checkbox"
                  />
                </th>
                <th className="clients-table-no">No.</th>
                <th className="clients-table-id">Email</th>
                <th className="clients-table-name">Role</th>
                <th className="clients-table-employees">User UID</th>
                <th className="clients-table-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={6} className="clients-table-empty">
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
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(u.uid)}
                          className="clients-checkbox"
                        />
                      </td>
                      <td>{startIdx + idx}</td>
                      <td>{u.email}</td>
                      <td>{u.role || "unknown"}</td>
                      <td>{u.uid}</td>
                      <td className="clients-table-actions-cell">
                        <button
                          type="button"
                          className="clients-table-actions-btn"
                          title="Actions"
                          onClick={(e) =>
                            setActionMenu({
                              open: true,
                              idx,
                              anchor: e.currentTarget,
                            })
                          }
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <circle cx="4.5" cy="9" r="1.2" fill="#1D2536" />
                            <circle cx="9" cy="9" r="1.2" fill="#1D2536" />
                            <circle cx="13.5" cy="9" r="1.2" fill="#1D2536" />
                          </svg>
                        </button>
                        {actionMenu.open && actionMenu.idx === idx && (
                          <div
                            ref={actionMenuRef}
                            className="clients-table-actions-menu"
                            style={{
                              left:
                                actionMenu.anchor?.getBoundingClientRect()
                                  .left ?? 0,
                              top:
                                actionMenu.anchor?.getBoundingClientRect()
                                  .bottom + 4 ?? 0,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenu({
                                  open: false,
                                  idx: null,
                                  anchor: null,
                                });
                                handleEditRole(u);
                              }}
                            >
                              Edit
                            </button>
                            {currentUser.uid !== u.uid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenu({
                                    open: false,
                                    idx: null,
                                    anchor: null,
                                  });
                                  handleDeleteUser(u.uid);
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
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
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className="clients-modal-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <label style={{ fontSize: 15, color: "#333" }}>
                  <input
                    type="radio"
                    name="role"
                    value="viewer"
                    checked={role === "viewer"}
                    onChange={() => setRole("viewer")}
                    style={{ marginRight: 6 }}
                  />
                  Viewer
                </label>
                <label style={{ fontSize: 15, color: "#333" }}>
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === "admin"}
                    onChange={() => setRole("admin")}
                    style={{ marginRight: 6 }}
                  />
                  Admin
                </label>
              </div>
              <div className="clients-modal-actions">
                <button
                  className="clients-modal-save"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <LoadingSpinner size="small" color="#3B3B4A" />
                      Creating...
                    </div>
                  ) : (
                    "Create User"
                  )}
                </button>
                <button
                  className="clients-modal-cancel"
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
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
    </div>
  );
}

export default UserManagement;
