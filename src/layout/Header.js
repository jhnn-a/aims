function Header() {
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
      }}
    >
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
      <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>
        Assets & Inventory Management System
      </span>
    </header>
  );
}

export default Header;
