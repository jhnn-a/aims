// UserManagement.js
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";

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
    <div
      style={{
        width: "100%",
        minHeight: "calc(100vh - 64px)", // assuming header is ~64px
        background: "#f7fafc",
        padding: 0,
        margin: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 24px 0 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              color: "#233037",
              fontWeight: 800,
              fontSize: 28,
              margin: 0,
              textAlign: "left",
              letterSpacing: 0.5,
            }}
          >
            User Management
          </h2>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: "#70C1B3",
              color: "#233037",
              border: "none",
              borderRadius: 8,
              padding: "12px 28px",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
              marginLeft: 12,
              boxShadow: "0 2px 8px rgba(37,99,235,0.08)",
            }}
          >
            + Create New User
          </button>
        </div>
        <h3
          style={{
            marginTop: 18,
            fontWeight: 700,
            color: "#233037",
            fontSize: 20,
            marginBottom: 8,
          }}
        >
          All Users
        </h3>
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 16px rgba(37,99,235,0.06)",
            padding: 0,
            overflow: "auto",
          }}
        >
          {usersLoading ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              Loading users...
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                margin: 0,
                fontSize: 15,
                borderCollapse: "collapse",
                background: "#fff",
              }}
            >
              <thead>
                <tr
                  style={{
                    color: "#888",
                    fontWeight: 600,
                    borderBottom: "2px solid #e5e7eb",
                  }}
                >
                  <th
                    style={{
                      textAlign: "left",
                      width: 40,
                      padding: "12px 8px",
                    }}
                  >
                    #
                  </th>
                  <th style={{ textAlign: "left", padding: "12px 8px" }}>
                    Email
                  </th>
                  <th style={{ textAlign: "left", padding: "12px 8px" }}>
                    Role
                  </th>
                  <th style={{ textAlign: "left", padding: "12px 8px" }}>
                    User UID
                  </th>
                  <th style={{ textAlign: "left", padding: "12px 8px" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        color: "#888",
                        padding: 18,
                      }}
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u, idx) => (
                    <tr
                      key={u.uid}
                      style={{ borderBottom: "1px solid #f1f1f1" }}
                    >
                      <td style={{ padding: "10px 8px" }}>{idx + 1}</td>
                      <td style={{ padding: "10px 8px" }}>{u.email}</td>
                      <td style={{ padding: "10px 8px" }}>
                        {u.role || "unknown"}
                      </td>
                      <td
                        style={{
                          fontSize: 13,
                          color: "#888",
                          padding: "10px 8px",
                        }}
                      >
                        {u.uid}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        {editingUser && editingUser.uid === u.uid ? (
                          <>
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              style={{
                                fontSize: 15,
                                padding: "2px 8px",
                                borderRadius: 6,
                              }}
                            >
                              <option value="viewer">viewer</option>
                              <option value="admin">admin</option>
                            </select>
                            <button
                              onClick={handleSaveRole}
                              style={{
                                marginLeft: 8,
                                background: "#70C1B3",
                                color: "#233037",
                                border: "none",
                                borderRadius: 6,
                                padding: "2px 10px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              style={{
                                marginLeft: 4,
                                background: "#eee",
                                color: "#233037",
                                border: "none",
                                borderRadius: 6,
                                padding: "2px 10px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                            {editStatus && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  color: editStatus.includes("success")
                                    ? "#38a169"
                                    : "#e11d48",
                                }}
                              >
                                {editStatus}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditRole(u)}
                              style={{
                                marginLeft: 0,
                                background: "#eee",
                                color: "#233037",
                                border: "none",
                                borderRadius: 6,
                                padding: "2px 10px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Edit
                            </button>
                            {currentUser.uid !== u.uid && (
                              <button
                                onClick={() => handleDeleteUser(u.uid)}
                                style={{
                                  marginLeft: 8,
                                  background: "#e11d48",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 6,
                                  padding: "2px 10px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
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
              borderRadius: 18,
              boxShadow: "0 12px 48px rgba(37,99,235,0.18)",
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
                  borderRadius: 8,
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
                  borderRadius: 8,
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
                  background: "#70C1B3",
                  color: "#233037",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 22px",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: loading ? "not-allowed" : "pointer",
                  marginTop: 2,
                }}
              >
                {loading ? "Creating..." : "Create User"}
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
    </div>
  );
}

export default UserManagement;
