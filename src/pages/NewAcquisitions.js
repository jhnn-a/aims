export const NewAcquisitionsModal = ({
  showNewAcqModal,
  setShowNewAcqModal,
  newAcqTabs,
  setNewAcqTabs,
  activeTabId,
  setActiveTabId,
  nextTabId,
  setNextTabId,
  newAcqError,
  setNewAcqError,
  newAcqLoading,
  setNewAcqLoading,
  progress,
  setProgress,
  showManualSerialPanel,
  setShowManualSerialPanel,
  activeManualTabId,
  setActiveManualTabId,
  importTexts,
  setImportTexts,
  styles,
  isDarkMode,
  deviceTypes,
  clients,
  formatDateToYYYYMMDD,
  acquisitionDocFormat,
  setAcquisitionDocFormat,
  SearchableDropdown,
  handleNewAcqInput,
  handleManualSerialToggle,
  handleQuantityChange,
  handleNewAcqSubmit,
  handleImportSerials,
  handleManualSerialChange,
  handleManualSerialSubmit,
  switchTab,
  removeTab,
  addNewTab,
  getCurrentTabData,
}) => {
  const renderFormatPicker = () => (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: isDarkMode ? "#d1d5db" : "#374151",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Save File As
      </span>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 8,
          border:
            acquisitionDocFormat === "word"
              ? "1px solid #2563eb"
              : isDarkMode
              ? "1px solid #4b5563"
              : "1px solid #d1d5db",
          background:
            acquisitionDocFormat === "word"
              ? isDarkMode
                ? "rgba(37,99,235,0.15)"
                : "#eff6ff"
              : isDarkMode
              ? "#374151"
              : "#ffffff",
          cursor: newAcqLoading ? "not-allowed" : "pointer",
          color: isDarkMode ? "#f3f4f6" : "#374151",
          fontSize: 13,
        }}
      >
        <input
          type="radio"
          name="acquisitionDocFormat"
          checked={acquisitionDocFormat === "word"}
          onChange={() => setAcquisitionDocFormat("word")}
          disabled={newAcqLoading}
        />
        Word (.docx)
      </label>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 8,
          border:
            acquisitionDocFormat === "pdf"
              ? "1px solid #2563eb"
              : isDarkMode
              ? "1px solid #4b5563"
              : "1px solid #d1d5db",
          background:
            acquisitionDocFormat === "pdf"
              ? isDarkMode
                ? "rgba(37,99,235,0.15)"
                : "#eff6ff"
              : isDarkMode
              ? "#374151"
              : "#ffffff",
          cursor: newAcqLoading ? "not-allowed" : "pointer",
          color: isDarkMode ? "#f3f4f6" : "#374151",
          fontSize: 13,
        }}
      >
        <input
          type="radio"
          name="acquisitionDocFormat"
          checked={acquisitionDocFormat === "pdf"}
          onChange={() => setAcquisitionDocFormat("pdf")}
          disabled={newAcqLoading}
        />
        PDF (.pdf)
      </label>
    </div>
  );

  return (
    <>
      {showNewAcqModal && (
        <div style={styles.modalOverlay}>
          <div
            className="new-acquisitions-modal"
            style={styles.inventoryModalContent}
          >
            <style>{`
              /* ── Button hover effects ── */
              .new-acquisitions-modal .add-device-btn:hover {
                background: #1d4ed8 !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.1) !important;
              }
              .new-acquisitions-modal .add-device-btn:active {
                transform: scale(0.97);
              }

              /* ── Sidebar item ── */
              .device-sidebar-item {
                transition: all 0.18s ease;
              }
              .device-sidebar-item:hover {
                background-color: rgba(37,99,235,0.07) !important;
                border-left-color: #2563eb !important;
              }

              /* ── Form inputs ── */
              .new-acquisitions-modal select,
              .new-acquisitions-modal input[type="text"],
              .new-acquisitions-modal input[type="number"],
              .new-acquisitions-modal input[type="date"] {
                height: 38px;
                font-size: 14px;
              }

              /* ── Toggle Switch ── */
              .acq-toggle-wrap {
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                user-select: none;
              }
              .acq-toggle-track {
                position: relative;
                width: 44px;
                height: 24px;
                border-radius: 12px;
                transition: background 0.25s;
                flex-shrink: 0;
              }
              .acq-toggle-thumb {
                position: absolute;
                top: 3px;
                left: 3px;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #fff;
                box-shadow: 0 1px 4px rgba(0,0,0,0.25);
                transition: transform 0.25s cubic-bezier(.4,0,.2,1);
              }
              .acq-toggle-wrap input[type="checkbox"] {
                position: absolute;
                opacity: 0;
                width: 0;
                height: 0;
              }
            `}</style>

            {/* ─── MAIN FORM PANEL ─────────────────────────────────── */}
            {!showManualSerialPanel ? (
              <>
                {/* Header */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                  position: "relative",
                  width: "100%",
                }}>
                  <h3 style={{ ...styles.inventoryModalTitle, margin: 0 }}>
                    New Acquisitions
                  </h3>
                  <button
                    onClick={() => {
                      setShowNewAcqModal(false);
                      setNewAcqTabs([
                        {
                          id: 1,
                          label: "Device Type 1",
                          data: {
                            deviceType: "",
                            brand: "",
                            model: "",
                            condition: "BRANDNEW",
                            remarks: "",
                            acquisitionDate: "",
                            quantity: 1,
                            supplier: "",
                            client: "",
                            useManualSerial: false,
                            manualQuantity: 1,
                            manualSerials: [],
                          },
                        },
                      ]);
                      setActiveTabId(1);
                      setNextTabId(2);
                      setShowManualSerialPanel(false);
                      setImportTexts({});
                      setAcquisitionDocFormat("word");
                    }}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      background: "none",
                      border: "none",
                      fontSize: 28,
                      cursor: "pointer",
                      color: isDarkMode ? "#9ca3af" : "#6b7280",
                      padding: "0px 8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                      transition: "color 0.2s",
                      width: 32,
                      height: 32,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = isDarkMode ? "#f3f4f6" : "#1f2937";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = isDarkMode ? "#9ca3af" : "#6b7280";
                    }}
                    title="Close"
                  >
                    ×
                  </button>
                </div>

                {/* Two-Column Layout: Sidebar + Content */}
                <div style={{
                  display: "flex",
                  gap: 20,
                  width: "100%",
                  flex: 1,
                  minHeight: 0,
                  marginBottom: 20,
                }}>
                  {/* LEFT SIDEBAR: Device Types List */}
                  <div style={{
                    width: 240,
                    flexShrink: 0,
                    maxHeight: 480,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    border: isDarkMode ? "1px solid #374151" : "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "8px 6px",
                    backgroundColor: isDarkMode ? "#1f2937" : "#f8fafc",
                  }}>
                    {/* Sidebar header */}
                    <div style={{
                      padding: "4px 8px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.7px",
                      color: isDarkMode ? "#6b7280" : "#9ca3af",
                      borderBottom: isDarkMode ? "1px solid #374151" : "1px solid #e9eef3",
                      marginBottom: 4,
                    }}>
                      Device Types ({newAcqTabs.length})
                    </div>

                    {newAcqTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => switchTab(tab.id)}
                        className="device-sidebar-item"
                        style={{
                          background:
                            tab.id === activeTabId
                              ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                              : isDarkMode
                              ? "#2d3748"
                              : "#fff",
                          color:
                            tab.id === activeTabId
                              ? "#fff"
                              : isDarkMode
                              ? "#e5e7eb"
                              : "#374151",
                          border: tab.id === activeTabId
                            ? "none"
                            : isDarkMode
                            ? "1px solid #374151"
                            : "1px solid #e9eef3",
                          borderLeft: `4px solid ${
                            tab.id === activeTabId ? "#60a5fa" : "transparent"
                          }`,
                          padding: "10px 12px",
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: tab.id === activeTabId ? 600 : 500,
                          borderRadius: 8,
                          transition: "all 0.18s",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                          boxShadow: tab.id === activeTabId
                            ? "0 2px 8px rgba(37,99,235,0.3)"
                            : "none",
                        }}
                        title={tab.label}
                      >
                        <div style={{
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                          minWidth: 0,
                          gap: 2,
                        }}>
                          <span style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {tab.label}
                          </span>
                          {tab.data.deviceType ? (
                            <span style={{
                              fontSize: 11,
                              opacity: 0.75,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}>
                              <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 12l2 2 4-4m7-4a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              {tab.data.deviceType}
                              {tab.data.useManualSerial && (
                                <span style={{
                                  marginLeft: 2,
                                  fontSize: 10,
                                  background: tab.id === activeTabId
                                    ? "rgba(255,255,255,0.25)"
                                    : "#dbeafe",
                                  color: tab.id === activeTabId ? "#fff" : "#1d4ed8",
                                  borderRadius: 4,
                                  padding: "0 4px",
                                  fontWeight: 600,
                                }}>Manual</span>
                              )}
                            </span>
                          ) : (
                            <span style={{
                              fontSize: 11,
                              opacity: 0.5,
                              fontStyle: "italic",
                            }}>
                              Not configured
                            </span>
                          )}
                        </div>
                        {newAcqTabs.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTab(tab.id);
                            }}
                            style={{
                              background: tab.id === activeTabId
                                ? "rgba(255,255,255,0.2)"
                                : "none",
                              border: "none",
                              color: "inherit",
                              cursor: "pointer",
                              fontSize: 16,
                              padding: 0,
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: 0.7,
                              transition: "all 0.2s",
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.7)}
                            title="Remove this device type"
                          >
                            ×
                          </button>
                        )}
                      </button>
                    ))}

                    {/* Add Device button at the bottom of sidebar */}
                    <button
                      onClick={addNewTab}
                      className="add-device-btn"
                      style={{
                        ...styles.addTabButton,
                        marginTop: 6,
                        padding: "9px 12px",
                        fontSize: 13,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        width: "100%",
                      }}
                      title="Add another device type"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Add Device Type
                    </button>
                  </div>

                  {/* RIGHT CONTENT: Form */}
                  <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                  }}>
                    {/* Current Tab Content */}
                    {(() => {
                      const currentData = getCurrentTabData();
                      const currentTab = newAcqTabs.find(
                        (tab) => tab.id === activeTabId
                      );
                      return (
                        <>
                          {/* Tab Info Banner */}
                          <div style={{
                            background: isDarkMode ? "#1e3a5f" : "#eff6ff",
                            border: `1px solid ${isDarkMode ? "#2563eb" : "#bfdbfe"}`,
                            borderRadius: 10,
                            padding: "12px 16px",
                            marginBottom: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              fontSize: 13,
                              color: isDarkMode ? "#93c5fd" : "#1d4ed8",
                            }}>
                              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 12l2 2 4-4m7-4a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <span style={{ fontWeight: 600 }}>{currentTab?.label}</span>
                                {currentData.deviceType && (
                                  <span style={{
                                    color: isDarkMode ? "#fbbf24" : "#ea580c",
                                    marginLeft: 8,
                                    fontWeight: 500,
                                  }}>
                                    → {currentData.deviceType}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ── Section: Device Info ── */}
                          <div style={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.7px",
                            color: isDarkMode ? "#6b7280" : "#9ca3af",
                            marginBottom: 10,
                          }}>
                            Device Information
                          </div>

                          {/* Row 1: Device Type | RAM Size or Brand */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 14,
                            marginBottom: 14,
                          }}>
                            <div style={{ ...styles.inventoryInputGroup, marginBottom: 0 }}>
                              <label style={styles.inventoryLabel}>Device Type <span style={{ color: "#ef4444" }}>*</span></label>
                              <select
                                name="deviceType"
                                value={currentData.deviceType}
                                onChange={handleNewAcqInput}
                                style={styles.inventoryInput}
                              >
                                <option value="">Select Device Type</option>
                                {deviceTypes.map((type) => (
                                  <option key={type.label} value={type.label}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {currentData.deviceType === "RAM" ? (
                              <div style={{ ...styles.inventoryInputGroup, marginBottom: 0 }}>
                                <label style={styles.inventoryLabel}>
                                  RAM Size <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <select
                                  name="ramSize"
                                  value={currentData.ramSize}
                                  onChange={handleNewAcqInput}
                                  style={{
                                    ...styles.inventoryInput,
                                    borderColor: !currentData.ramSize
                                      ? "#f59e0b"
                                      : styles.inventoryInput.borderColor,
                                  }}
                                >
                                  <option value="">Select RAM Size</option>
                                  <option value="4GB">4GB</option>
                                  <option value="8GB">8GB</option>
                                  <option value="16GB">16GB</option>
                                  <option value="32GB">32GB</option>
                                  <option value="64GB">64GB</option>
                                </select>
                                {!currentData.ramSize && (
                                  <span style={{ color: "#f59e0b", fontSize: 11, marginTop: 2 }}>
                                    RAM size required
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div style={{ ...styles.inventoryInputGroup, marginBottom: 0 }}>
                                <label style={styles.inventoryLabel}>Brand <span style={{ color: "#ef4444" }}>*</span></label>
                                <input
                                  name="brand"
                                  value={currentData.brand}
                                  onChange={handleNewAcqInput}
                                  style={styles.inventoryInput}
                                  autoComplete="off"
                                  placeholder="e.g. Logitech, Dell, HP"
                                />
                              </div>
                            )}
                          </div>

                          {/* Row 2: Model | Brand (RAM only) */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: currentData.deviceType === "RAM" ? "1fr 1fr" : "1fr",
                            gap: 14,
                            marginBottom: 14,
                          }}>
                            <div style={{ ...styles.inventoryInputGroup, marginBottom: 0 }}>
                              <label style={styles.inventoryLabel}>Model</label>
                              <input
                                name="model"
                                value={currentData.model}
                                onChange={handleNewAcqInput}
                                style={styles.inventoryInput}
                                placeholder="e.g. MX Master 3"
                              />
                            </div>
                            {currentData.deviceType === "RAM" && (
                              <div style={{ ...styles.inventoryInputGroup, marginBottom: 0 }}>
                                <label style={styles.inventoryLabel}>Brand <span style={{ color: "#ef4444" }}>*</span></label>
                                <input
                                  name="brand"
                                  value={currentData.brand}
                                  onChange={handleNewAcqInput}
                                  style={styles.inventoryInput}
                                  autoComplete="off"
                                  placeholder="e.g. Kingston, Crucial"
                                />
                              </div>
                            )}
                          </div>

                          {/* Remarks */}
                          <div style={{ ...styles.inventoryInputGroup, marginBottom: 14 }}>
                            <label style={styles.inventoryLabel}>Remarks</label>
                            <input
                              name="remarks"
                              value={currentData.remarks}
                              onChange={handleNewAcqInput}
                              style={styles.inventoryInput}
                              placeholder="Optional notes about this batch"
                            />
                          </div>

                          {/* ── Section: Acquisition Details ── */}
                          <div style={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.7px",
                            color: isDarkMode ? "#6b7280" : "#9ca3af",
                            marginBottom: 10,
                            marginTop: 4,
                          }}>
                            Acquisition Details
                          </div>

                          {/* Row 3: Acquisition Date | Quantity */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 14,
                            marginBottom: 14,
                          }}>
                            <div style={{ ...styles.inventoryInputGroup, marginBottom: 0 }}>
                              <label style={styles.inventoryLabel}>Acquisition Date</label>
                              <input
                                name="acquisitionDate"
                                type="date"
                                value={formatDateToYYYYMMDD(currentData.acquisitionDate) || ""}
                                onChange={handleNewAcqInput}
                                style={styles.inventoryInput}
                              />
                            </div>
                            <div style={{ ...styles.inventoryInputGroup, marginBottom: 0 }}>
                              <label style={styles.inventoryLabel}>Quantity <span style={{ color: "#ef4444" }}>*</span></label>
                              <input
                                name="quantity"
                                type="number"
                                value={currentData.quantity ?? ""}
                                onChange={handleQuantityChange}
                                onBlur={(e) => {
                                  if (e.target.value === "") {
                                    handleQuantityChange({
                                      target: { value: "1" },
                                    });
                                  }
                                }}
                                style={styles.inventoryInput}
                                min="1"
                                max="99"
                                step="1"
                              />
                            </div>
                          </div>

                          {/* Row 4: Supplier | Client */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 14,
                            marginBottom: 18,
                          }}>
                            <div style={{ ...styles.inventoryInputGroup, marginBottom: 0 }}>
                              <label style={styles.inventoryLabel}>Supplier</label>
                              <input
                                name="supplier"
                                value={currentData.supplier}
                                onChange={handleNewAcqInput}
                                style={styles.inventoryInput}
                                placeholder="Enter supplier name"
                              />
                            </div>
                            <div style={{ ...styles.inventoryInputGroup, marginBottom: 0 }}>
                              <label style={styles.inventoryLabel}>Client</label>
                              <SearchableDropdown
                                value={currentData.client}
                                onChange={handleNewAcqInput}
                                options={clients || []}
                                placeholder="Select client..."
                                displayKey="clientName"
                                valueKey="clientName"
                              />
                            </div>
                          </div>

                          {/* ── Serial Number Assignment ── */}
                          <div style={{ marginTop: 4 }}>
                            <div style={{
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.7px",
                              color: isDarkMode ? "#6b7280" : "#9ca3af",
                              marginBottom: 8,
                            }}>
                              Serial Number Assignment
                            </div>
                            <div style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 10,
                            }}>
                              {/* Option 1: Auto-Generate */}
                              <label
                                onClick={() => { if (currentData.useManualSerial) handleManualSerialToggle(); }}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 12,
                                  padding: "13px 14px",
                                  borderRadius: 8,
                                  border: `1.5px solid ${
                                    !currentData.useManualSerial
                                      ? "#2563eb"
                                      : isDarkMode ? "#374151" : "#e2e8f0"
                                  }`,
                                  background: !currentData.useManualSerial
                                    ? isDarkMode ? "rgba(37,99,235,0.12)" : "#eff6ff"
                                    : isDarkMode ? "#1f2937" : "#fafafa",
                                  cursor: "pointer",
                                  transition: "all 0.18s",
                                  userSelect: "none",
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`serialMode_${activeTabId}`}
                                  checked={!currentData.useManualSerial}
                                  onChange={() => { if (currentData.useManualSerial) handleManualSerialToggle(); }}
                                  style={{ marginTop: 2, accentColor: "#2563eb", flexShrink: 0 }}
                                />
                                <div>
                                  <div style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: !currentData.useManualSerial
                                      ? isDarkMode ? "#93c5fd" : "#1d4ed8"
                                      : isDarkMode ? "#d1d5db" : "#374151",
                                    marginBottom: 3,
                                  }}>
                                    Auto-Generate
                                  </div>
                                  <div style={{
                                    fontSize: 11,
                                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                                    lineHeight: 1.4,
                                  }}>
                                    Serial numbers are generated automatically by the system
                                  </div>
                                </div>
                              </label>

                              {/* Option 2: Assign Manually */}
                              <label
                                onClick={() => { if (!currentData.useManualSerial) handleManualSerialToggle(); }}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 12,
                                  padding: "13px 14px",
                                  borderRadius: 8,
                                  border: `1.5px solid ${
                                    currentData.useManualSerial
                                      ? "#2563eb"
                                      : isDarkMode ? "#374151" : "#e2e8f0"
                                  }`,
                                  background: currentData.useManualSerial
                                    ? isDarkMode ? "rgba(37,99,235,0.12)" : "#eff6ff"
                                    : isDarkMode ? "#1f2937" : "#fafafa",
                                  cursor: "pointer",
                                  transition: "all 0.18s",
                                  userSelect: "none",
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`serialMode_${activeTabId}`}
                                  checked={currentData.useManualSerial || false}
                                  onChange={() => { if (!currentData.useManualSerial) handleManualSerialToggle(); }}
                                  style={{ marginTop: 2, accentColor: "#2563eb", flexShrink: 0 }}
                                />
                                <div>
                                  <div style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: currentData.useManualSerial
                                      ? isDarkMode ? "#93c5fd" : "#1d4ed8"
                                      : isDarkMode ? "#d1d5db" : "#374151",
                                    marginBottom: 3,
                                  }}>
                                    Assign Manually
                                  </div>
                                  <div style={{
                                    fontSize: 11,
                                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                                    lineHeight: 1.4,
                                  }}>
                                    You will enter each serial number individually on the next step
                                  </div>
                                </div>
                              </label>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {/* Error message */}
                    {newAcqError && (
                      <div style={{
                        background: isDarkMode ? "rgba(220,38,38,0.1)" : "#fef2f2",
                        color: "#dc2626",
                        padding: "10px 14px",
                        borderRadius: 8,
                        marginTop: 14,
                        border: "1px solid #fecaca",
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}>
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        <span>{newAcqError}</span>
                      </div>
                    )}

                    {/* Progress bar */}
                    {newAcqLoading && (
                      <div style={{ width: "100%", marginTop: 14 }}>
                        <div style={{
                          width: "100%",
                          background: isDarkMode ? "#374151" : "#e9eef3",
                          borderRadius: 8,
                          height: 8,
                          marginBottom: 6,
                          overflow: "hidden",
                        }}>
                          <div style={{
                            width: `${progress}%`,
                            background: "linear-gradient(90deg, #2563eb, #60a5fa)",
                            height: 8,
                            borderRadius: 8,
                            transition: "width 0.3s",
                          }} />
                        </div>
                        <span style={{ color: "#2563eb", fontWeight: 500, fontSize: 12 }}>
                          {progress < 40
                            ? "Preparing devices..."
                            : progress < 70
                            ? "Adding to database..."
                            : progress < 100
                            ? "Generating document..."
                            : "Complete!"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  paddingTop: 16,
                  borderTop: isDarkMode ? "1px solid #374151" : "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                }}>
                  {renderFormatPicker()}
                  <button
                    onClick={handleNewAcqSubmit}
                    disabled={newAcqLoading}
                    style={{
                      ...styles.inventoryModalButton,
                      opacity: newAcqLoading ? 0.6 : 1,
                      padding: "9px 24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {newAcqLoading ? (
                      "Adding..."
                    ) : newAcqTabs.some((tab) => tab.data.useManualSerial) ? (
                      <>Proceed to Serial Entry <span style={{ fontSize: 16 }}>→</span></>
                    ) : (
                      <>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Add Devices
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* ─── MANUAL SERIAL ENTRY PANEL ───────────────────────── */
              <>
                {/* Panel Header */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #16a34a, #15803d)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(22,163,74,0.35)",
                  }}>
                    <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4M7 20H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ ...styles.inventoryModalTitle, marginBottom: 2, color: "#22c55e" }}>
                      Assign Serial Numbers
                    </h3>
                    <p style={{ margin: 0, fontSize: 12, color: isDarkMode ? "#9ca3af" : "#6b7280" }}>
                      Enter serial numbers for each device below
                    </p>
                  </div>
                </div>

                {/* Two-Column Layout for Manual Serial Entry */}
                <div style={{
                  display: "flex",
                  gap: 20,
                  width: "100%",
                  flex: 1,
                  minHeight: 0,
                  marginBottom: 20,
                }}>
                  {/* LEFT SIDEBAR */}
                  <div style={{
                    width: 220,
                    flexShrink: 0,
                    maxHeight: 480,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    backgroundColor: isDarkMode ? "#1f2937" : "#f8fafc",
                    border: isDarkMode ? "1px solid #374151" : "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "8px 6px",
                  }}>
                    <div style={{
                      padding: "4px 8px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.7px",
                      color: isDarkMode ? "#6b7280" : "#9ca3af",
                      borderBottom: isDarkMode ? "1px solid #374151" : "1px solid #e9eef3",
                      marginBottom: 4,
                    }}>
                      Serial Entry
                    </div>

                    {newAcqTabs
                      .filter((tab) => tab.data.useManualSerial)
                      .map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveManualTabId(tab.id)}
                          className="device-sidebar-item"
                          style={{
                            background:
                              tab.id === activeManualTabId
                                ? "linear-gradient(135deg, #16a34a, #15803d)"
                                : isDarkMode
                                ? "#2d3748"
                                : "#fff",
                            color:
                              tab.id === activeManualTabId
                                ? "#fff"
                                : isDarkMode
                                ? "#e5e7eb"
                                : "#374151",
                            border: tab.id === activeManualTabId
                              ? "none"
                              : isDarkMode ? "1px solid #374151" : "1px solid #e9eef3",
                            borderLeft: `4px solid ${
                              tab.id === activeManualTabId ? "#4ade80" : "transparent"
                            }`,
                            padding: "10px 12px",
                            textAlign: "left",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: tab.id === activeManualTabId ? 600 : 500,
                            borderRadius: 8,
                            transition: "all 0.18s",
                            display: "flex",
                            flexDirection: "column",
                            gap: 3,
                            boxShadow: tab.id === activeManualTabId
                              ? "0 2px 8px rgba(22,163,74,0.3)"
                              : "none",
                          }}
                        >
                          <span style={{
                            fontWeight: 600,
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {tab.data.deviceType}
                          </span>
                          <span style={{ fontSize: 11, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {tab.data.brand} {tab.data.model && `• ${tab.data.model}`}
                          </span>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: tab.id === activeManualTabId ? "rgba(255,255,255,0.8)" : "#22c55e",
                          }}>
                            {tab.data.manualSerials?.filter(s => s.serial?.trim()).length || 0} / {tab.data.manualQuantity || 0} filled
                          </span>
                        </button>
                      ))}
                  </div>

                  {/* RIGHT CONTENT: Serial Entry Form */}
                  <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                  }}>
                    {(() => {
                      const manualTabs = newAcqTabs.filter(
                        (tab) => tab.data.useManualSerial
                      );
                      const currentManualTab =
                        manualTabs.find((tab) => tab.id === activeManualTabId) ||
                        manualTabs[0];

                      if (!currentManualTab) {
                        return (
                          <div style={{ padding: 24, textAlign: "center", color: isDarkMode ? "#9ca3af" : "#6b7280" }}>
                            No devices selected for serial entry
                          </div>
                        );
                      }

                      return (
                        <>
                          {/* Device Info Banner */}
                          <div style={{
                            background: isDarkMode ? "rgba(34,197,94,0.1)" : "#ecfdf5",
                            border: `1px solid ${isDarkMode ? "#22c55e" : "#86efac"}`,
                            borderRadius: 10,
                            padding: "12px 16px",
                            marginBottom: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: 13,
                          }}>
                            <div>
                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                color: isDarkMode ? "#86efac" : "#15803d",
                                fontWeight: 600,
                                marginBottom: 4,
                              }}>
                                <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 12l2 2 4-4m7-4a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {currentManualTab.data.deviceType}
                              </div>
                              <div style={{ fontSize: 12, color: isDarkMode ? "#d1d5db" : "#374151", opacity: 0.85 }}>
                                {currentManualTab.data.brand}
                                {currentManualTab.data.model && ` • ${currentManualTab.data.model}`}
                                {" · "}Qty: <strong>{currentManualTab.data.manualQuantity}</strong>
                              </div>
                            </div>
                            {/* Fill progress */}
                            <div style={{ textAlign: "right" }}>
                              <div style={{
                                fontSize: 20,
                                fontWeight: 700,
                                color: isDarkMode ? "#4ade80" : "#16a34a",
                                lineHeight: 1,
                              }}>
                                {currentManualTab.data.manualSerials?.filter(s => s.serial?.trim()).length || 0}
                                <span style={{ fontSize: 13, fontWeight: 400, color: isDarkMode ? "#9ca3af" : "#6b7280" }}>
                                  /{currentManualTab.data.manualQuantity || 0}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: isDarkMode ? "#9ca3af" : "#6b7280" }}>filled</div>
                            </div>
                          </div>

                          {/* Import Section */}
                          <div style={{
                            background: isDarkMode ? "#1f2937" : "#f8fafc",
                            border: `1px solid ${isDarkMode ? "#374151" : "#e2e8f0"}`,
                            borderRadius: 10,
                            padding: 16,
                            marginBottom: 16,
                          }}>
                            <div style={{
                              fontSize: 12,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.6px",
                              color: isDarkMode ? "#9ca3af" : "#6b7280",
                              marginBottom: 10,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}>
                              <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 12l2 2 4-4m9-3H5m14 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Bulk Import
                            </div>
                            <p style={{ margin: "0 0 8px", fontSize: 12, color: isDarkMode ? "#d1d5db" : "#64748b" }}>
                              Paste serial numbers below (one per line):
                            </p>
                            <textarea
                              style={{
                                width: "100%",
                                height: 90,
                                padding: "8px 12px",
                                border: `1.5px solid ${isDarkMode ? "#4b5563" : "#cbd5e1"}`,
                                borderRadius: 8,
                                fontSize: 13,
                                fontFamily: "monospace",
                                resize: "vertical",
                                boxSizing: "border-box",
                                marginBottom: 8,
                                outline: "none",
                                backgroundColor: isDarkMode ? "#111827" : "#fff",
                                color: isDarkMode ? "#f3f4f6" : "#000",
                              }}
                              placeholder={"SN123456789\nSN987654321\nSN456789123\n..."}
                              value={importTexts[currentManualTab.id] || ""}
                              onChange={(e) => {
                                setImportTexts((prev) => ({
                                  ...prev,
                                  [currentManualTab.id]: e.target.value,
                                }));
                              }}
                            />
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <button
                                onClick={() => {
                                  const importText = importTexts[currentManualTab.id];
                                  if (importText && importText.trim()) {
                                    handleImportSerials(currentManualTab.id, importText);
                                  }
                                }}
                                style={{
                                  ...styles.inventoryModalButton,
                                  background: "#22c55e",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 7,
                                  padding: "7px 16px",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  opacity:
                                    importTexts[currentManualTab.id] &&
                                    importTexts[currentManualTab.id].trim()
                                      ? 1
                                      : 0.5,
                                }}
                                disabled={
                                  !(importTexts[currentManualTab.id] &&
                                    importTexts[currentManualTab.id].trim())
                                }
                              >
                                Import
                                {importTexts[currentManualTab.id] &&
                                  importTexts[currentManualTab.id].trim() &&
                                  ` (${
                                    importTexts[currentManualTab.id]
                                      .split("\n")
                                      .filter((l) => l.trim()).length
                                  })`}
                              </button>
                              <button
                                onClick={() => {
                                  setImportTexts((prev) => ({
                                    ...prev,
                                    [currentManualTab.id]: "",
                                  }));
                                }}
                                style={{
                                  ...styles.inventoryModalButton,
                                  background: isDarkMode ? "#374151" : "#f3f4f6",
                                  color: isDarkMode ? "#d1d5db" : "#6b7280",
                                  border: isDarkMode ? "1px solid #4b5563" : "1px solid #e2e8f0",
                                  borderRadius: 7,
                                  padding: "7px 14px",
                                  fontSize: 13,
                                  fontWeight: 500,
                                  cursor: "pointer",
                                }}
                              >
                                Clear
                              </button>
                              <span style={{
                                fontSize: 11,
                                color: isDarkMode ? "#9ca3af" : "#6b7280",
                                fontStyle: "italic",
                              }}>
                                Copy from Excel/Notepad, paste, then import
                              </span>
                            </div>
                          </div>

                          {/* Serial Number Inputs Grid */}
                          <div style={{
                            width: "100%",
                            maxHeight: 280,
                            overflowY: "auto",
                            border: isDarkMode ? "1px solid #374151" : "1px solid #e2e8f0",
                            borderRadius: 10,
                            padding: 12,
                            background: isDarkMode ? "#111827" : "#fafbfc",
                            boxSizing: "border-box",
                          }}>
                            <div style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                              gap: 8,
                              width: "100%",
                            }}>
                              {currentManualTab.data.manualSerials?.map(
                                (item, index) => (
                                  <div
                                    key={item.id}
                                    style={{
                                      background: isDarkMode ? "#1f2937" : "#fff",
                                      padding: 8,
                                      borderRadius: 8,
                                      border: item.serial?.trim()
                                        ? isDarkMode ? "1px solid #22c55e" : "1px solid #86efac"
                                        : isDarkMode ? "1px solid #374151" : "1px solid #e2e8f0",
                                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                                      width: "100%",
                                      boxSizing: "border-box",
                                      transition: "border-color 0.2s",
                                    }}
                                  >
                                    <label style={{
                                      ...styles.inventoryLabel,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: isDarkMode ? "#9ca3af" : "#6b7280",
                                      marginBottom: 4,
                                      display: "block",
                                    }}>
                                      Device #{index + 1}
                                    </label>
                                    <input
                                      type="text"
                                      value={item.serial || ""}
                                      onChange={(e) =>
                                        handleManualSerialChange(
                                          currentManualTab.id,
                                          index,
                                          e.target.value
                                        )
                                      }
                                      style={{
                                        ...styles.inventoryInput,
                                        width: "100%",
                                        padding: "6px 8px",
                                        fontSize: 13,
                                        height: "32px",
                                        backgroundColor: isDarkMode ? "#374151" : "#fff",
                                        color: isDarkMode ? "#f3f4f6" : "#000",
                                        border: item.serial?.trim()
                                          ? "1.5px solid #22c55e"
                                          : isDarkMode ? "1.5px solid #4b5563" : "1.5px solid #cbd5e1",
                                        borderRadius: 6,
                                        outline: "none",
                                        transition: "border-color 0.2s",
                                        boxSizing: "border-box",
                                        fontFamily: "monospace",
                                      }}
                                      placeholder="Enter serial number"
                                      maxLength={64}
                                    />
                                  </div>
                                )
                              ) || []}
                            </div>
                          </div>

                          {/* Error */}
                          {newAcqError && (
                            <div style={{
                              marginTop: 12,
                              padding: "10px 14px",
                              background: isDarkMode ? "rgba(220,38,38,0.1)" : "#fef2f2",
                              border: "1px solid #fecaca",
                              borderRadius: 8,
                              color: "#dc2626",
                              fontSize: 13,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}>
                              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                              </svg>
                              <span>{newAcqError}</span>
                            </div>
                          )}

                          {/* Footer */}
                          <div style={{
                            marginTop: 16,
                            paddingTop: 14,
                            borderTop: isDarkMode ? "1px solid #374151" : "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                            width: "100%",
                          }}>
                            {renderFormatPicker()}
                            <button
                              onClick={() => {
                                setShowManualSerialPanel(false);
                                setImportTexts({});
                              }}
                              style={{
                                ...styles.inventoryModalButtonSecondary,
                                padding: "9px 18px",
                                fontSize: 14,
                              }}
                              disabled={newAcqLoading}
                            >
                              ← Back to Form
                            </button>
                            <button
                              onClick={handleManualSerialSubmit}
                              disabled={newAcqLoading}
                              style={{
                                ...styles.inventoryModalButton,
                                opacity: newAcqLoading ? 0.6 : 1,
                                background: "linear-gradient(135deg, #16a34a, #15803d)",
                                padding: "9px 22px",
                                fontSize: 14,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              {newAcqLoading ? (
                                "Adding Devices..."
                              ) : (
                                <>
                                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <path d="M9 12l2 2 4-4m7-4a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Add All Devices
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
