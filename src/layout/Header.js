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
      <button onClick={handleLogout}>Logout</button>
    </header>
  );
};

export default Header;
