import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../utils/firebase";

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    background: "#1D2536",
    color: "#fff",
    padding: "0 32px",
    position: "fixed", // Make header fixed
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20, // Higher than sidebar to stay on top
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)", // Add shadow for depth
  },
  left: {
    display: "flex",
    alignItems: "center",
  },
  logo: {
    height: 20,
    width: "auto",
    marginRight: 12,
  },
  logoutButton: {
    background: "transparent",
    border: "1px solid #fff",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },
};

const Header = () => {
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch {
      alert("Logout failed. Please try again.");
    }
  }, [navigate]);

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <img src={require("./joii.png")} alt="JOII Logo" style={styles.logo} />
        <span>Assets & Inventory Management System</span>
      </div>
      <button
        onClick={handleLogout}
        style={styles.logoutButton}
        onMouseEnter={(e) => {
          e.target.style.background = "#fff";
          e.target.style.color = "#1D2536";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "transparent";
          e.target.style.color = "#fff";
        }}
      >
        Logout
      </button>
    </header>
  );
};

export default Header;
