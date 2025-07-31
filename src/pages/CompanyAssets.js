import React, { useState } from "react";
import Assets from "./Assets";
import Inventory from "./Inventory";
import LoadingSpinner, {
  TableLoadingSpinner,
} from "../components/LoadingSpinner";

const tabStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100vh", // Fixed height to viewport
    background: "#f7f9fb",
    fontFamily:
      'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    overflow: "hidden", // Prevent scrolling on the main container
    boxSizing: "border-box",
  },
  header: {
    fontSize: 28,
    fontWeight: 700,
    color: "#222e3a",
    letterSpacing: 1,
    padding: "20px 24px 16px 24px", // Reduced margin for fixed layout
    flexShrink: 0, // Prevent header from shrinking
  },
  tabsBar: {
    display: "flex",
    alignItems: "flex-end",
    borderBottom: "2px solid #e0e7ef",
    margin: "0 24px 0 24px",
    gap: 2,
    flexShrink: 0, // Prevent tabs from shrinking
    paddingBottom: 0,
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
    flex: 1, // Take remaining space
    overflow: "hidden", // Let child components handle their own scrolling
    minHeight: 0, // Allow flex child to shrink below content size
    display: "flex",
    flexDirection: "column",
  },
};

function CompanyAssets() {
  const [activeTab, setActiveTab] = useState("assets");

  return (
    <div style={tabStyles.container}>
      <div style={tabStyles.header}>COMPANY ASSETS2025</div>
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
        {activeTab === "assets" ? <Assets /> : <Inventory />}
      </div>
    </div>
  );
}

export default CompanyAssets;
