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
    { to: "/user-logs", label: "User Logs", icon: <MdHistory size={22} /> },
  ];

  return (
    <nav className={`sidebar-nav ${isDarkMode ? "dark" : ""}`}>
      <ul className="sidebar-list">
        {links.map((link) => (
          <li key={link.to} className="sidebar-list-item">
            <Link
              to={link.to}
              className={`sidebar-link ${
                location.pathname === link.to ? "active" : ""
              } ${isDarkMode ? "dark" : ""}`}
            >
              <span className="sidebar-icon">{link.icon}</span>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      <hr className={`sidebar-divider ${isDarkMode ? "dark" : ""}`} />

      <div className="sidebar-bottom">
        <span
          className={`sidebar-footer-clickable ${
            showCredits ? "sidebar-footer-active" : ""
          } ${isDarkMode ? "dark" : ""}`}
          onMouseEnter={() => setShowCredits(true)}
          onMouseLeave={() => setShowCredits(false)}
        >
          <span className="sidebar-brand">AIMS</span> ©{" "}
          {new Date().getFullYear()}
          {showCredits && (
            <div
              className={`sidebar-credits-tooltip ${isDarkMode ? "dark" : ""}`}
            >
              <div className="sidebar-credits-title">
                <b>Developed by:</b>
              </div>
              <div className="sidebar-credits-names">
                Albert Lago
                <br />
                John Mungcal
                <br />
                Ryan Bumalic
                <br />
                Derek Pallasigue
                <br />
                Liam Manese
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
