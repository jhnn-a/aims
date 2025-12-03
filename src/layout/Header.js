import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";
import "./Header.css";

function Header({ user, onLogout }) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = React.useState(false);
  const { isDarkMode, toggleDarkMode } = useTheme();

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
    <header className={`header ${isDarkMode ? "dark" : ""}`}>
      <div className="header-left">
        <img
          src={require("./joii.png")}
          alt="JOII Logo"
          className="header-logo"
        />
        <span className={`header-title ${isDarkMode ? "dark" : ""}`}>
          Assets & Inventory Management System
        </span>
      </div>

      <div className="header-right">
        <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />

        <button
          onClick={handleLogoutClick}
          className={`header-logout ${isDarkMode ? "dark" : ""}`}
          title="Logout"
          aria-label="Logout"
        >
          <FiLogOut size={20} />
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showConfirm && (
        <div className="logout-overlay">
          <div className={`logout-modal ${isDarkMode ? "dark" : ""}`}>
            <div className="logout-title">Are you sure you want to logout?</div>

            <div className="logout-actions">
              <button className="logout-confirm" onClick={confirmLogout}>
                Yes, Logout
              </button>

              <button
                className={`logout-cancel ${isDarkMode ? "dark" : ""}`}
                onClick={cancelLogout}
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
