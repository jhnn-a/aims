import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  MdDashboard,
  MdBusinessCenter,
  MdPeople,
  MdHandshake,
  MdComputer,
  MdAdminPanelSettings,
} from "react-icons/md";
import "./Sidebar.css";

function Sidebar({ user }) {
  const location = useLocation();
  const [showCredits, setShowCredits] = useState(false);

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
  ];
  if (user && user.role === "admin") {
    links.push({
      to: "/user-management",
      label: "User Management",
      icon: <MdAdminPanelSettings size={22} />,
    });
  }

  return (
    <nav className="sidebar-nav">
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
      <hr className="sidebar-divider" />
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
          }}
          onMouseEnter={() => setShowCredits(true)}
          onMouseLeave={() => setShowCredits(false)}
        >
          Copyright &copy; AIMS 2025.
          <br />
          All rights reserved.
          {showCredits && (
            <div className="sidebar-credits-tooltip">
              <div className="sidebar-credits-title">Developed by</div>
              <div className="sidebar-credits-names">
                Albert Lago
                <br />
                Ryan Bumalic
                <br />
                John Mungcal
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
