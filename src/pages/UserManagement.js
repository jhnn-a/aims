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

  // Filtered users (no pagination)
  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.uid && String(u.uid).toLowerCase().includes(search.toLowerCase()))
      ),
    [users, search]
  );

  useEffect(() => {
    const validIds = new Set(filteredUsers.map((u) => u.uid));
    setCheckedRows((prev) => prev.filter((id) => validIds.has(id)));
  }, [filteredUsers]);

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
      <div style={{ padding: 32, color: "#e11d48", fontWeight: 700 }}>
        Access denied. Admins only.
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
    <main
      style={{
        background: "#FAFAFC",
        minHeight: "100vh",
        width: "100vw",
        boxSizing: "border-box",
        display: "block",
        paddingLeft: 0, // Remove sidebar offset
        paddingTop: 32,
        paddingRight: 0,
        paddingBottom: 32,
        overflowX: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1700,
          margin: "0 auto",
          background: "#FAFAFC",
          boxSizing: "border-box",
          padding: "0 32px 32px 32px",
          borderRadius: 0,
          boxShadow: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch", // Fix: allow table to fill container
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1614,
            margin: "0 auto",
            paddingRight: 16,
            paddingLeft: 16,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "IBM Plex Sans",
                  fontSize: 28,
                  lineHeight: "37.24px",
                  fontWeight: 400,
                  letterSpacing: "normal",
                  color: "#2B2C3B",
                }}
              >
                User Management
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {checkedRows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => alert("Bulk actions coming soon")}
                    style={{
                      fontFamily:
                        'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      fontSize: 14,
                      lineHeight: "20.0004px",
                      fontWeight: 500,
                      letterSpacing: "normal",  
                      color: "#D32F2F",
                      background: "#f2f2f2",
                      minWidth: 87.625,
                      height: 30.6667,
                      borderRadius: 6,
                      border: "none",
                      outline: "none",
                      cursor: "pointer",
                      transition: "background 0.2s, color 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      userSelect: "none",
                      boxShadow: "none",
                      padding: "0 16px",
                      whiteSpace: "nowrap",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "#F1C9BF";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "#f2f2f2";
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.background = "#F1C9BF";
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.background = "#f2f2f2";
                    }}
                  >
                    Delete Selected
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  style={{
                    fontFamily:
                      'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 14,
                    lineHeight: "20.0004px",
                    fontWeight: 500,
                    letterSpacing: "normal",
                    color: "#3B3B4A",
                    background: "#f2f2f2",
                    minWidth: 87.625,
                    height: 30.6667,
                    borderRadius: 6,
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    transition: "background 0.2s, color 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    userSelect: "none",
                    boxShadow: "none",
                    padding: "0 16px",
                    whiteSpace: "nowrap",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#E5E5E5";
                    e.currentTarget.style.color = "#3B3B4A";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#f2f2f2";
                    e.currentTarget.style.color = "#3B3B4A";
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.background = "#E5E5E5";
                    e.currentTarget.style.color = "#3B3B4A";
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.background = "#f2f2f2";
                    e.currentTarget.style.color = "#3B3B4A";
                  }}
                >
                  + Create New User
                </button>
              </div>
            </div>
            {/* Table Toolbar with search bar and action buttons */}
            <div
              style={{
                width: "100%",
                maxWidth: 1614,
                height: 40,
                background: "#fff",
                border: "1px solid #d7d7e0",
                borderBottom: "none",
                borderRadius: 0,
                margin: "0 auto",
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                padding: 8,
                gap: 12,
                justifyContent: "space-between",
              }}
            >
              {/* Left: Search bar */}
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 4,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    alignItems: "center",
                    pointerEvents: "none",
                    color: "#1D2536",
                    fontSize: 16,
                    paddingLeft: 0,
                    paddingRight: 4,
                    height: 20,
                  }}
                >
                  {/* Simple magnifier glass SVG icon */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="7"
                      cy="7"
                      r="5.5"
                      stroke="#1D2536"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="11.3536"
                      y1="11.6464"
                      x2="15"
                      y2="15.2929"
                      stroke="#1D2536"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search by Email or UID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    fontFamily:
                      'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 14,
                    lineHeight: "20.0004px",
                    fontWeight: 400,
                    letterSpacing: "normal",
                    color: "#2B2C3B",
                    background: "#F8F8F8",
                    width: 270,
                    height: 28,
                    borderRadius: 6,
                    border: "1px solid #d7d7e0",
                    outline: "none",
                    marginRight: 16,
                    padding: "4px 8px 4px 28px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            {/* Secondary toolbar for row selection actions */}
            {checkedRows.length > 0 && (
              <div
                style={{
                  width: "100%",
                  maxWidth: 1614,
                  height: 32,
                  background: "#fff",
                  border: "1px solid #d7d7e0",
                  borderTop: "none",
                  borderBottom: "none",
                  borderRadius: 0,
                  margin: "0 auto",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 8px",
                  gap: 12,
                  justifyContent: "flex-start",
                }}
              >
                <span
                  style={{
                    fontFamily: "IBM Plex Sans",
                    fontSize: 12,
                    lineHeight: "17.04px",
                    fontWeight: 400,
                    letterSpacing: "normal",
                    color: "#3B3B4A",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 0",
                  }}
                >
                  <span style={{ fontWeight: 700, marginRight: 2 }}>
                    {checkedRows.length}
                  </span>
                  {checkedRows.length === 1 ? "user" : "users"} selected.
                </span>
              </div>
            )}
            {/* Table Header */}
            <table
              border="1"
              style={{
                borderCollapse: "collapse",
                width: "100%",
                maxWidth: 1614,
                tableLayout: "fixed",
                boxShadow: "none",
                border: "1px solid #d7d7e0",
                background: "#FFFFFF",
                fontFamily:
                  'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSize: 14,
                lineHeight: "20.0004px",
                color: "rgb(59, 59, 74)",
                letterSpacing: "normal",
                fontWeight: 400,
                margin: "0 auto",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "center",
                      verticalAlign: "middle",
                      fontWeight: 400,
                      width: 40,
                      minWidth: 40,
                      maxWidth: 40,
                      whiteSpace: "nowrap",
                      background: "#FFFFFF",
                      fontFamily:
                        'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      fontSize: 14,
                      lineHeight: "20.0004px",
                      color: "rgb(59, 59, 74)",
                      letterSpacing: "normal",
                      padding: 0,
                      border: "1px solid #d7d7e0",
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
                        border: "1px solid #d7d7e0",
                        boxSizing: "border-box",
                        width: 16,
                        height: 16,
                        margin: 0,
                        display: "block",
                        position: "relative",
                        left: "50%",
                        transform: "translateX(-50%)",
                      }}
                    />
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      verticalAlign: "middle",
                      fontWeight: 400,
                      width: "1%",
                      whiteSpace: "nowrap",
                      background: "#FFFFFF",
                      fontFamily:
                        'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      fontSize: 14,
                      lineHeight: "20.0004px",
                      color: "rgb(59, 59, 74)",
                      letterSpacing: "normal",
                      padding: "8px 12px",
                      border: "1px solid #d7d7e0",
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      verticalAlign: "middle",
                      fontWeight: 400,
                      width: "32%",
                      background: "#FFFFFF",
                      fontFamily:
                        'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      fontSize: 14,
                      lineHeight: "20.0004px",
                      color: "rgb(59, 59, 74)",
                      letterSpacing: "normal",
                      padding: "8px 12px",
                      border: "1px solid #d7d7e0",
                    }}
                  >
                    Email
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      verticalAlign: "middle",
                      fontWeight: 400,
                      width: "18%",
                      background: "#FFFFFF",
                      fontFamily:
                        'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      fontSize: 14,
                      lineHeight: "20.0004px",
                      color: "rgb(59, 59, 74)",
                      letterSpacing: "normal",
                      padding: "8px 12px",
                      border: "1px solid #d7d7e0",
                    }}
                  >
                    Role
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      verticalAlign: "middle",
                      fontWeight: 400,
                      width: "32%",
                      background: "#FFFFFF",
                      fontFamily:
                        'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      fontSize: 14,
                      lineHeight: "20.0004px",
                      color: "rgb(59, 59, 74)",
                      letterSpacing: "normal",
                      padding: "8px 12px",
                      border: "1px solid #d7d7e0",
                    }}
                  >
                    User UID
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      verticalAlign: "middle",
                      fontWeight: 400,
                      width: "17%",
                      background: "#FFFFFF",
                      fontFamily:
                        'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      fontSize: 14,
                      lineHeight: "20.0004px",
                      color: "rgb(59, 59, 74)",
                      letterSpacing: "normal",
                      padding: "8px 12px",
                      border: "1px solid #d7d7e0",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
            </table>
            {/* Table Body */}
            <div
              style={{
                width: "100%",
                maxWidth: 1614,
                height: 706,
                maxHeight: 706,
                overflowY: "scroll",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                margin: "0 auto",
                background: "#fff",
                borderRadius: 0,
                boxShadow: "none",
              }}
            >
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  width: "100%",
                  maxWidth: 1614,
                  margin: "0 auto",
                }}
              >
                <table
                  border="1"
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    maxWidth: 1614,
                    tableLayout: "fixed",
                    boxShadow: "none",
                    border: "1px solid #d7d7e0",
                    fontFamily:
                      'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 14,
                    lineHeight: "20.0004px",
                    color: "rgb(59, 59, 74)",
                    letterSpacing: "normal",
                    fontWeight: 400,
                    margin: "0 auto",
                  }}
                >
                  <tbody>
                    {usersLoading ? (
                      <tr>
                        <td
                          colSpan="6"
                          style={{ textAlign: "center", padding: "40px 0" }}
                        >
                          <TableLoadingSpinner />
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u, idx) => {
                        const isChecked = checkedRows.includes(u.uid);
                        let rowBg;
                        if (isChecked) {
                          rowBg = idx % 2 === 0 ? "#F1C9BF" : "#EAC2B8";
                        } else {
                          rowBg = idx % 2 === 0 ? "#FAFAFC" : "#F0F0F3";
                        }
                        const isLastRow = idx === filteredUsers.length - 1;
                        const getCellBorderStyle = (cellIdx) => ({
                          width:
                            cellIdx === 0
                              ? 40
                              : cellIdx === 1
                              ? "1%"
                              : cellIdx === 2
                              ? "32%"
                              : cellIdx === 3
                              ? "18%"
                              : cellIdx === 4
                              ? "32%"
                              : "17%",
                          minWidth: cellIdx === 0 ? 40 : undefined,
                          maxWidth: cellIdx === 0 ? 40 : undefined,
                          textAlign: cellIdx === 0 ? "center" : "left",
                          verticalAlign: "middle",
                          whiteSpace: cellIdx <= 1 ? "nowrap" : undefined,
                          borderLeft: "1px solid #d7d7e0",
                          borderRight: "1px solid #d7d7e0",
                          borderTop: "none",
                          borderBottom: isLastRow ? "none" : "none",
                          padding: cellIdx === 0 ? 0 : "8px 12px",
                          color: "rgb(59, 59, 74)",
                        });
                        return (
                          <tr
                            key={u.uid}
                            style={{
                              background: rowBg,
                              cursor: "pointer",
                              transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              if (!isChecked)
                                e.currentTarget.style.background = "#E5E5E8";
                            }}
                            onMouseLeave={(e) => {
                              if (!isChecked)
                                e.currentTarget.style.background = rowBg;
                            }}
                          >
                            <td style={getCellBorderStyle(0)}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleCheckboxChange(u.uid)}
                                style={{
                                  border: "1px solid #d7d7e0",
                                  boxSizing: "border-box",
                                  width: 16,
                                  height: 16,
                                  margin: 0,
                                  display: "block",
                                  position: "relative",
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                }}
                              />
                            </td>
                            <td style={getCellBorderStyle(1)}>{idx + 1}</td>
                            <td style={getCellBorderStyle(2)}>{u.email}</td>
                            <td style={getCellBorderStyle(3)}>
                              {u.role || "unknown"}
                            </td>
                            <td style={getCellBorderStyle(4)}>{u.uid}</td>
                            <td style={getCellBorderStyle(5)}>
                              {/* Actions: Edit/Delete buttons, similar to Clients */}
                              <button
                                type="button"
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 28,
                                  height: 28,
                                  borderRadius: 4,
                                  transition:
                                    "background 0.2s, box-shadow 0.2s",
                                }}
                                title="Actions"
                                onClick={(e) => {
                                  setActionMenu({
                                    open: true,
                                    idx,
                                    anchor: e.currentTarget,
                                  });
                                }}
                              >
                                {/* Triple dot icon */}
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 18 18"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <circle
                                    cx="4.5"
                                    cy="9"
                                    r="1.2"
                                    fill="#1D2536"
                                  />
                                  <circle
                                    cx="9"
                                    cy="9"
                                    r="1.2"
                                    fill="#1D2536"
                                  />
                                  <circle
                                    cx="13.5"
                                    cy="9"
                                    r="1.2"
                                    fill="#1D2536"
                                  />
                                </svg>
                              </button>
                              {actionMenu.open && actionMenu.idx === idx && (
                                <div
                                  ref={actionMenuRef}
                                  style={{
                                    position: "absolute",
                                    top: 36,
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    background: "#fff",
                                    border: "1px solid #d7d7e0",
                                    borderRadius: 0,
                                    boxShadow: "0 4px 16px 0 #00000014",
                                    zIndex: 10,
                                    minWidth: 120,
                                    padding: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
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
                                    style={{
                                      fontFamily:
                                        'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                      fontSize: 14,
                                      color: "#3B3B4A",
                                      background: "none",
                                      border: "none",
                                      borderBottom: "1px solid #eee",
                                      padding: "12px 20px",
                                      cursor: "pointer",
                                      textAlign: "center",
                                      width: "100%",
                                      transition: "background 0.2s",
                                    }}
                                    onMouseOver={(e) =>
                                      (e.currentTarget.style.background =
                                        "#F0F0F3")
                                    }
                                    onMouseOut={(e) =>
                                      (e.currentTarget.style.background =
                                        "none")
                                    }
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
                                      style={{
                                        fontFamily:
                                          'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                        fontSize: 14,
                                        color: "#D32F2F",
                                        background: "none",
                                        border: "none",
                                        padding: "12px 20px",
                                        cursor: "pointer",
                                        textAlign: "center",
                                        width: "100%",
                                        transition: "background 0.2s",
                                      }}
                                      onMouseOver={(e) =>
                                        (e.currentTarget.style.background =
                                          "#F1C9BF")
                                      }
                                      onMouseOut={(e) =>
                                        (e.currentTarget.style.background =
                                          "none")
                                      }
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
              {/* Sticky Footer Table */}
              <div
                style={{
                  position: "sticky",
                  bottom: 0,
                  left: 0,
                  width: "100%",
                  maxWidth: 1614,
                  background: "#fff",
                  zIndex: 2,
                  borderTop: "1px solid #d7d7e0",
                  flexShrink: 0,
                  margin: "0 auto",
                }}
              >
                <table
                  border="1"
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    maxWidth: 1614,
                    tableLayout: "fixed",
                    boxShadow: "none",
                    border: "1px solid #d7d7e0",
                    borderTop: "none",
                    fontFamily:
                      'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 14,
                    lineHeight: "20.0004px",
                    color: "rgb(59, 59, 74)",
                    letterSpacing: "normal",
                    fontWeight: 400,
                    margin: "0 auto",
                  }}
                >
                  <tfoot>
                    <tr style={{ height: 40 }}>
                      <td
                        style={{
                          width: "1%",
                          whiteSpace: "nowrap",
                          padding: "8px 12px",
                          color: "rgb(59, 59, 74)",
                          background: "#FFFFFF",
                          borderColor: "#d7d7e0",
                          borderLeft: "1px solid #d7d7e0",
                          borderRight: "none",
                          height: 40,
                        }}
                      ></td>
                      <td
                        style={{
                          width: "1%",
                          whiteSpace: "nowrap",
                          padding: "8px 12px",
                          color: "rgb(59, 59, 74)",
                          background: "#FFFFFF",
                          borderColor: "#d7d7e0",
                          borderLeft: "none",
                          borderRight: "none",
                          height: 40,
                        }}
                      ></td>
                      <td
                        style={{
                          width: "32%",
                          padding: "8px 12px",
                          color: "rgb(59, 59, 74)",
                          background: "#FFFFFF",
                          borderColor: "#d7d7e0",
                          borderLeft: "none",
                          borderRight: "none",
                          height: 40,
                        }}
                      ></td>
                      <td
                        style={{
                          width: "18%",
                          padding: "8px 12px",
                          color: "rgb(59, 59, 74)",
                          background: "#FFFFFF",
                          borderColor: "#d7d7e0",
                          borderLeft: "none",
                          borderRight: "none",
                          height: 40,
                        }}
                      ></td>
                      <td
                        style={{
                          width: "32%",
                          padding: "8px 12px",
                          color: "rgb(59, 59, 74)",
                          background: "#FFFFFF",
                          borderColor: "#d7d7e0",
                          borderLeft: "none",
                          borderRight: "none",
                          height: 40,
                        }}
                      ></td>
                      <td
                        style={{
                          width: "17%",
                          padding: "8px 12px",
                          color: "rgb(59, 59, 74)",
                          background: "#FFFFFF",
                          borderColor: "#d7d7e0",
                          borderLeft: "none",
                          borderRight: "1px solid #d7d7e0",
                          height: 40,
                        }}
                      ></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <style>{`
                div[style*='overflowY: scroll']::-webkit-scrollbar { display: none; }
              `}</style>
            </div>
          </div>
        </div>
      </div>
      {/* Modals */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.25)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 0,
              boxShadow: "none",
              padding: 32,
              minWidth: 340,
              maxWidth: 420,
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: "absolute",
                top: 12,
                right: 16,
                background: "none",
                border: "none",
                fontSize: 22,
                color: "#888",
                cursor: "pointer",
              }}
              aria-label="Close"
            >
              ×
            </button>
            <h2
              style={{
                color: "#233037",
                fontWeight: 800,
                fontSize: 22,
                marginBottom: 18,
                textAlign: "center",
              }}
            >
              Create New User
            </h2>
            <form
              onSubmit={handleCreateUser}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  padding: "10px 14px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 16,
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  padding: "10px 14px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 16,
                }}
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
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: "#f2f2f2",
                  color: "#3B3B4A",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 22px",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: loading ? "not-allowed" : "pointer",
                  marginTop: 2,
                  fontFamily:
                    'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  transition: "background 0.2s, color 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#E5E5E5";
                  e.currentTarget.style.color = "#3B3B4A";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#f2f2f2";
                  e.currentTarget.style.color = "#3B3B4A";
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.background = "#E5E5E5";
                  e.currentTarget.style.color = "#3B3B4A";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.background = "#f2f2f2";
                  e.currentTarget.style.color = "#3B3B4A";
                }}
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
              {status && (
                <div
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
    </main>
  );
}

export default UserManagement;
