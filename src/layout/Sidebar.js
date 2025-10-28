import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  MdDashboard,
  MdBusinessCenter,
  MdPeople,
  MdHandshake,
  MdComputer,
  MdAdminPanelSettings,
  MdHistory,
} from "react-icons/md";
import { useTheme } from "../context/ThemeContext";
import "./Sidebar.css";

function Sidebar({ user }) {
  const location = useLocation();
  const [showCredits, setShowCredits] = useState(false);
  const { isDarkMode } = useTheme();

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: <MdDashboard size={22} /> },
    {
      to: "/company-assets",
      label: "Company Assets",
      icon: <MdBusinessCenter size={22} />,
    },
    { to: "/employees", label: "Employees", icon: <MdPeople size={22} /> },
    { to: "/clients", label: "Clients", icon: <MdHandshake size={22} /> },
    { to: "/unit-specs", label: "Unit Specs", icon: <MdComputer size={22} /> },
    {
      to: "/user-management",
      label: "User Management",
      icon: <MdAdminPanelSettings size={22} />,
    },
    {
      to: "/user-logs",
      label: "User Logs",
      icon: <MdHistory size={22} />,
    },
  ];

  return (
    <nav
      className="sidebar-nav"
      style={{
        backgroundColor: isDarkMode ? "#1f2937" : undefined,
        borderRight: isDarkMode ? "1px solid #374151" : undefined,
      }}
    >
      <ul className="sidebar-list">
        {links.map((link) => (
          <li key={link.to} className="sidebar-list-item">
            <Link
              to={link.to}
              className={
                location.pathname === link.to
                  ? "sidebar-link active"
                  : "sidebar-link"
              }
              style={{
                color: isDarkMode ? "#d1d5db" : undefined,
                ...(location.pathname === link.to && isDarkMode
                  ? {
                      backgroundColor: "#374151",
                      color: "#60a5fa",
                    }
                  : {}),
              }}
            >
              <span
                style={{
                  marginRight: 12,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {link.icon}
              </span>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <hr
        className="sidebar-divider"
        style={{
          borderColor: isDarkMode ? "#374151" : undefined,
        }}
      />
      <div className="sidebar-bottom">
        <span
          className={`sidebar-footer-clickable${
            showCredits ? " sidebar-footer-active" : ""
          }`}
          style={{
            cursor: "pointer",
            display: "inline-block",
            position: "relative",
            fontWeight: 700,
            color: isDarkMode ? "#9ca3af" : undefined,
          }}
          onMouseEnter={() => setShowCredits(true)}
          onMouseLeave={() => setShowCredits(false)}
        >
          <span className="sidebar-brand" style={{ color: "inherit" }}>
            AIMS
          </span>{" "}
          &copy; {new Date().getFullYear()}
          {showCredits && (
            <div
              className="sidebar-credits-tooltip"
              style={{
                backgroundColor: isDarkMode ? "#374151" : undefined,
                color: isDarkMode ? "#f3f4f6" : undefined,
                border: isDarkMode ? "1px solid #4b5563" : undefined,
              }}
            >
              <div className="sidebar-credits-title"><b>Developed by:</b></div>
              <div className="sidebar-credits-names">
                Ryan Bumalic
                <br />
                John Mungcal
                <br />
                Albert Lago
                <br />
                Derek Pallasigue
              </div>
              <div className="sidebar-credits-pointer" />
            </div>
          )}
        </span>
      </div>
    </nav>
  );
}

export default Sidebar;
