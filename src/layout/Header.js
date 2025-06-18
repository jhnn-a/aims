function Header() {
  return (
    <header
      style={{
        background: "linear-gradient(90deg, #f8fafc 0%, #e0e7ff 100%)",
        color: "#2563eb",
        padding: "8px 0 8px 18px",
        fontWeight: 800,
        fontSize: 16,
        letterSpacing: 1.1,
        boxShadow: "0 2px 16px rgba(37,99,235,0.07)",
        borderBottom: "1px solid #e5e7eb",
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
      <span style={{ color: "#18181a", fontWeight: 700, fontSize: 14 }}>
        Assets & Inventory Management System
      </span>
    </header>
  );
}

export default Header;
