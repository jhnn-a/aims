import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
// ...existing code...
import { FiLogOut } from "react-icons/fi";
import "./Header.css";

function Header({ user, onLogout }) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = React.useState(false);

  // Show confirmation modal before logout
  const handleLogoutClick = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const confirmLogout = useCallback(() => {
    setShowConfirm(false);
    if (typeof onLogout === "function") {
      onLogout();
    } else {
      navigate("/login");
    }
  }, [navigate, onLogout]);

  const cancelLogout = useCallback(() => {
    setShowConfirm(false);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <img
          src={require("./joii.png")}
          alt="JOII Logo"
          className="header-logo"
        />
        <span>Assets & Inventory Management System</span>
      </div>
      <button
        onClick={handleLogoutClick}
        className="header-logout"
        title="Logout"
        aria-label="Logout"
      >
        <FiLogOut size={20} />
      </button>

      {/* Logout Confirmation Modal */}
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(34,46,58,0.18)",
            zIndex: 4000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 4px 24px #2563eb18, 0 1.5px 6px #2563eb0a",
              border: "1.5px solid #e0e7ef",
              padding: 32,
              minWidth: 320,
              maxWidth: 400,
              width: "100%",
              textAlign: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 20,
                color: "#233037",
                marginBottom: 18,
              }}
            >
              Are you sure you want to logout?
            </div>
            <div
              style={{
                display: "flex",
                gap: 18,
                justifyContent: "center",
                marginTop: 18,
              }}
            >
              <button
                onClick={confirmLogout}
                style={{
                  background: "#e11d48",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 22px",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "background 0.2s, box-shadow 0.2s",
                }}
              >
                Yes, Logout
              </button>
              <button
                onClick={cancelLogout}
                style={{
                  background: "#e0e7ef",
                  color: "#233037",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 22px",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "background 0.2s, box-shadow 0.2s",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
