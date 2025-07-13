import React, { useState } from "react";
import Assets from "./Assets";
import Inventory from "./Inventory";
import LoadingSpinner, { TableLoadingSpinner } from "../components/LoadingSpinner";

const tabStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minHeight: "100vh",
    background: "#f7f9fb",
    fontFamily: "Maax, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  },
  header: {
    fontSize: 28,
    fontWeight: 700,
    color: "#222e3a",
    letterSpacing: 1,
    margin: "32px 0 24px 0",
    padding: "0 24px",
  },
  tabsBar: {
    display: "flex",
    alignItems: "flex-end",
    borderBottom: "2px solid #e0e7ef",
    margin: "0 24px 0 24px",
    gap: 2,
  },
  tab: (active) => ({
    border: "none",
    background: active ? "#fff" : "#e0e7ef",
    color: active ? "#2563eb" : "#64748b",
    fontWeight: active ? 700 : 500,
    fontSize: 16,
    padding: "10px 32px",
    borderRadius: 0,
    cursor: "pointer",
    boxShadow: active ? "0 -2px 8px rgba(68,95,109,0.08)" : "none",
    outline: "none",
    transition: "all 0.2s",
  }),
  tabContent: {
    background: "#fff",
    borderRadius: 0,
    boxShadow: "0 2px 12px rgba(68,95,109,0.10)",
    margin: "0 24px 24px 24px",
    padding: 0,
    minHeight: 600,
  },
};

function CompanyAssets() {
  const [activeTab, setActiveTab] = useState("assets");

  return (
    <div style={tabStyles.container}>
      <div style={tabStyles.header}>COMPANY ASSETS</div>
      <div style={tabStyles.tabsBar}>
        <button
          style={tabStyles.tab(activeTab === "assets")}
          onClick={() => setActiveTab("assets")}
        >
          Assets
        </button>
        <button
          style={tabStyles.tab(activeTab === "inventory")}
          onClick={() => setActiveTab("inventory")}
        >
          Inventory
        </button>
      </div>
      <div style={tabStyles.tabContent}>
        {activeTab === "assets" ? (
          <Assets />
        ) : (
          <Inventory />
        )}
      </div>
    </div>
  );
}

export default CompanyAssets;
