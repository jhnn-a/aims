import { Link, useLocation } from "react-router-dom";

const sidebarStyle = {
  background: "#445F6D", // Payne's gray
  minHeight: "100vh",
  padding: "36px 0 24px 0",
  boxShadow: "2px 0 16px rgba(68,95,109,0.10)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  borderRight: "1px solid #5a768a",
  transition: "background 0.2s",
  zIndex: 10,
  position: "relative",
  minWidth: 120,
  maxWidth: 260,
  width: "fit-content",
};

const ulStyle = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  width: "100%",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const liStyle = {
  width: "100%",
};

const linkStyle = {
  display: "flex",
  alignItems: "center",
  gap: 0,
  width: "100%",
  padding: "12px 22px",
  borderRadius: 18,
  color: "#fff", // White for contrast
  textDecoration: "none",
  fontWeight: 500,
  fontSize: 17,
  letterSpacing: 0.2,
  transition: "background 0.18s, color 0.18s, box-shadow 0.18s",
  background: "none",
  border: "none",
  outline: "none",
  position: "relative",
  boxSizing: "border-box",
  marginRight: 0,
  whiteSpace: "nowrap",
};

const activeLinkStyle = {
  background: "linear-gradient(90deg, #FFE066 60%, #70C1B3 90%, rgba(112,193,179,0) 100%)", // Fade to transparent right
  color: "#233037", // Gunmetal for active
  fontWeight: 700,
  boxShadow: "0 2px 12px 0 #FFE06633",
  borderRadius: 0, // No rounded corners
  marginRight: 0,
};

const dividerStyle = {
  width: "80%",
  height: 1,
  background: "#5a768a", // Slightly lighter than sidebar
  margin: "24px auto 18px auto",
  border: "none",
};

const bottomBoxStyle = {
  marginTop: "auto",
  padding: "18px 0 0 0",
  width: "100%",
  textAlign: "center",
  fontSize: 13,
  color: "#FFE066", // Naples yellow for accent
  letterSpacing: 0.2,
  fontFamily: "Segoe UI, Arial, sans-serif",
};

function Sidebar() {
  const location = useLocation();
  const links = [
    { to: "/", label: "Dashboard" },
    { to: "/assets", label: "Assets" },
    { to: "/inventory", label: "Inventory" },
    { to: "/employees", label: "Employees" },
    { to: "/clients", label: "Clients" },
    { to: "/unit-specs", label: "Unit Specs" },
  ];
  return (
    <nav style={sidebarStyle}>
      <ul style={ulStyle}>
        {links.map((l) => (
          <li key={l.to} style={liStyle}>
            <Link
              to={l.to}
              style={{
                ...linkStyle,
                ...(location.pathname === l.to ? activeLinkStyle : {}),
                marginLeft: 0,
                marginRight: 0,
              }}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <hr style={dividerStyle} />
      <div style={bottomBoxStyle}>
        <span>
          <span style={{ color: "#2563eb", fontWeight: 700 }}>AIMS</span> &copy;{" "}
          {new Date().getFullYear()}
        </span>
      </div>
    </nav>
  );
}

export default Sidebar;
