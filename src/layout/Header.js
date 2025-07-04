import { auth } from "../utils/firebase";
import { useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      alert("Logout failed. Please try again.");
    }
  };

  return (
    <header
      style={{
        background: "#233037", // Gunmetal
        color: "#FFE066", // Naples yellow accent
        padding: "8px 0 8px 18px",
        fontWeight: 800,
        fontSize: 16,
        letterSpacing: 1.1,
        boxShadow: "0 2px 16px rgba(35,48,55,0.12)",
        borderBottom: "2px solid #445F6D", // Harmonize with sidebar
        fontFamily: "Segoe UI, Arial, sans-serif",
        display: "flex",
        alignItems: "center",
        minHeight: 36,
        userSelect: "none",
        justifyContent: "space-between", // Add this for right-aligned button
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <img
          src={require("./joii.png")}
          alt="JOII"
          style={{
            height: 28,
            width: "auto",
            marginRight: 10,
            display: "block",
          }}
        />
        <span
          style={{
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: 0.5,
          }}
        >
          Assets & Inventory Management System
        </span>
      </div>
      <button
        onClick={handleLogout}
        style={{
          background: "#FFE066",
          color: "#233037",
          border: "none",
          borderRadius: 4,
          padding: "6px 18px",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          marginRight: 18,
          boxShadow: "0 1px 4px rgba(35,48,55,0.08)",
          transition: "background 0.2s",
        }}
      >
        Logout
      </button>
    </header>
  );
}

export default Header;
