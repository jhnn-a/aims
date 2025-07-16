import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../utils/firebase";
import { FiLogOut } from "react-icons/fi";
import "./Header.css";

function Header() {
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
        onClick={handleLogout}
        className="header-logout"
        title="Logout"
        aria-label="Logout"
      >
        <FiLogOut size={20} />
      </button>
    </header>
  );
}

export default Header;
