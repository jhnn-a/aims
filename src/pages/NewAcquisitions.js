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
  conditions,
  clients,
  formatDateToYYYYMMDD,
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
  return (
    <>
      {showNewAcqModal && (
        <div style={styles.modalOverlay}>
          <div
            className="new-acquisitions-modal"
            style={styles.inventoryModalContent}
          >
            {!showManualSerialPanel ? (
              <>
                <h3 style={styles.inventoryModalTitle}>
                  New Acquisitions (Bulk Add)
                </h3>

                {/* Tab Navigation */}
                <div style={{ width: "100%", marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 2,
                        flex: 1,
                        overflowX: "auto",
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                        WebkitScrollbar: { display: "none" },
                        minWidth: 0,
                      }}
                    >
                      {newAcqTabs.map((tab, index) => (
                        <div
                          key={tab.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          <button
                            onClick={() => switchTab(tab.id)}
                            title={
                              newAcqTabs.length > 6 ? tab.label : undefined
                            }
                            style={{
                              ...styles.tabButton,
                              background:
                                tab.id === activeTabId ? "#2563eb" : "#f1f5f9",
                              color:
                                tab.id === activeTabId ? "#fff" : "#64748b",
                              borderBottomLeftRadius:
                                tab.id === activeTabId ? 0 : 6,
                              borderBottomRightRadius:
                                tab.id === activeTabId ? 0 : 6,
                              // Responsive sizing based on number of tabs
                              minWidth: Math.max(
                                80,
                                Math.min(120, 480 / newAcqTabs.length - 10)
                              ),
                              maxWidth: newAcqTabs.length > 4 ? 100 : 120,
                              fontSize: newAcqTabs.length > 6 ? 11 : 13,
                              padding:
                                newAcqTabs.length > 6 ? "6px 8px" : "8px 12px",
                            }}
                          >
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                              }}
                            >
                              {newAcqTabs.length > 6
                                ? `T${index + 1}`
                                : tab.label}
                            </span>
                            {newAcqTabs.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeTab(tab.id);
                                }}
                                style={{
                                  marginLeft: 4,
                                  background: "none",
                                  border: "none",
                                  color:
                                    tab.id === activeTabId ? "#fff" : "#64748b",
                                  cursor: "pointer",
                                  fontSize: 14,
                                  padding: 0,
                                  width: 16,
                                  height: 16,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 2,
                                  flexShrink: 0,
                                }}
                              >
                                ×
                              </button>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addNewTab}
                      style={{
                        ...styles.addTabButton,
                        marginLeft: 8,
                        flexShrink: 0,
                      }}
                      title="Add another device type"
                    >
                      +
                    </button>
                  </div>

                  {/* Tab Content Border */}
                  <div
                    style={{
                      width: "100%",
                      height: 2,
                      background: "#2563eb",
                      borderRadius: "0 6px 0 0",
                      marginBottom: 16,
                    }}
                  />
                </div>

                {/* Current Tab Content */}
                {(() => {
                  const currentData = getCurrentTabData();
                  const currentTab = newAcqTabs.find(
                    (tab) => tab.id === activeTabId
                  );
                  return (
                    <>
                      {/* Tab Info Banner */}
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 6,
                          padding: "8px 12px",
                          marginBottom: 12,
                          fontSize: 13,
                          color: "#64748b",
                        }}
                      >
                        <strong>Configuring:</strong> {currentTab?.label}
                        {currentData.deviceType && (
                          <span style={{ color: "#2563eb", marginLeft: 8 }}>
                            → {currentData.deviceType}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          width: "100%",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            ...styles.inventoryInputGroup,
                            flex: 1,
                            marginBottom: 0,
                          }}
                        >
                          <label style={styles.inventoryLabel}>
                            Device Type:
                          </label>
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
                        {/* RAM Size Selector - Only shown for RAM devices */}
                        {currentData.deviceType === "RAM" && (
                          <div
                            style={{
                              ...styles.inventoryInputGroup,
                              flex: 1,
                              marginBottom: 0,
                            }}
                          >
                            <label style={styles.inventoryLabel}>
                              RAM Size:
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
                              <span
                                style={{
                                  color: "#f59e0b",
                                  fontSize: 11,
                                  marginTop: 2,
                                }}
                              >
                                RAM size is required for proper tagging
                              </span>
                            )}
                          </div>
                        )}
                        <div
                          style={{
                            ...styles.inventoryInputGroup,
                            flex: 1,
                            marginBottom: 0,
                          }}
                        >
                          <label style={styles.inventoryLabel}>Brand:</label>
                          <input
                            name="brand"
                            value={currentData.brand}
                            onChange={handleNewAcqInput}
                            style={styles.inventoryInput}
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          width: "100%",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            ...styles.inventoryInputGroup,
                            flex: 1,
                            marginBottom: 0,
                          }}
                        >
                          <label style={styles.inventoryLabel}>Model:</label>
                          <input
                            name="model"
                            value={currentData.model}
                            onChange={handleNewAcqInput}
                            style={styles.inventoryInput}
                          />
                        </div>

                        <div
                          style={{
                            ...styles.inventoryInputGroup,
                            flex: 1,
                            marginBottom: 0,
                          }}
                        >
                          <label style={styles.inventoryLabel}>
                            Condition:
                          </label>
                          <select
                            name="condition"
                            value={currentData.condition}
                            onChange={handleNewAcqInput}
                            style={styles.inventoryInput}
                          >
                            <option value="">Select Condition</option>
                            {conditions.map((cond) => (
                              <option key={cond} value={cond}>
                                {cond}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div
                        style={{
                          ...styles.inventoryInputGroup,
                          marginBottom: 10,
                        }}
                      >
                        <label style={styles.inventoryLabel}>Remarks:</label>
                        <input
                          name="remarks"
                          value={currentData.remarks}
                          onChange={handleNewAcqInput}
                          style={styles.inventoryInput}
                        />
                      </div>
                      <div
                        style={{
                          ...styles.inventoryInputGroup,
                          marginBottom: 10,
                        }}
                      >
                        <label style={styles.inventoryLabel}>
                          Acquisition Date:
                        </label>
                        <input
                          name="acquisitionDate"
                          type="date"
                          value={
                            formatDateToYYYYMMDD(currentData.acquisitionDate) ||
                            ""
                          }
                          onChange={handleNewAcqInput}
                          style={{
                            ...styles.inventoryInput,
                            borderColor: !currentData.acquisitionDate
                              ? "#f59e0b"
                              : styles.inventoryInput.borderColor,
                          }}
                          title="Select the date when these devices were acquired"
                        />
                        {!currentData.acquisitionDate && (
                          <span
                            style={{
                              color: "#f59e0b",
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
                            Acquisition date is recommended for proper record
                            keeping
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          ...styles.inventoryInputGroup,
                          marginBottom: 10,
                        }}
                      >
                        <label style={styles.inventoryLabel}>Supplier:</label>
                        <input
                          name="supplier"
                          value={currentData.supplier}
                          onChange={handleNewAcqInput}
                          style={styles.inventoryInput}
                          placeholder="Enter supplier name"
                        />
                      </div>
                      <div
                        style={{
                          ...styles.inventoryInputGroup,
                          marginBottom: 10,
                          position: "relative",
                          zIndex: 10,
                        }}
                      >
                        <label style={styles.inventoryLabel}>Client:</label>
                        <SearchableDropdown
                          value={currentData.client}
                          onChange={handleNewAcqInput}
                          options={clients}
                          placeholder="Search and select client..."
                          displayKey="clientName"
                          valueKey="clientName"
                        />
                      </div>

                      {/* Manual Serial Assignment Option */}
                      <div
                        style={{
                          ...styles.inventoryInputGroup,
                          marginBottom: 10,
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            fontWeight: 500,
                            fontSize: 13,
                            color: "#2563eb",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={currentData.useManualSerial || false}
                            onChange={handleManualSerialToggle}
                            style={{ marginRight: 6, accentColor: "#6b7280" }}
                          />
                          Assign Serial Manually for this Device Type
                        </label>
                      </div>

                      {currentData.useManualSerial ? (
                        <div
                          style={{
                            ...styles.inventoryInputGroup,
                            marginBottom: 10,
                          }}
                        >
                          <label style={styles.inventoryLabel}>Quantity:</label>
                          <input
                            type="number"
                            value={currentData.manualQuantity || ""}
                            onChange={handleQuantityChange}
                            style={styles.inventoryInput}
                            min="1"
                            max="99"
                            maxLength="2"
                            placeholder="Enter quantity"
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            ...styles.inventoryInputGroup,
                            marginBottom: 10,
                          }}
                        >
                          <label style={styles.inventoryLabel}>
                            Quantity (How many devices to add):
                          </label>
                          <input
                            name="quantity"
                            type="number"
                            value={currentData.quantity || ""}
                            onChange={handleNewAcqInput}
                            style={styles.inventoryInput}
                            min="1"
                            max="99"
                            maxLength="2"
                            placeholder="Enter quantity (e.g., 10)"
                          />
                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              marginTop: 4,
                            }}
                          >
                            TAGs will be automatically generated starting from
                            the next available number
                          </div>

                          {/* TAG Preview Section */}
                          {currentData.deviceType && currentData.quantity && (
                            <div
                              style={{
                                marginTop: 8,
                                padding: 8,
                                backgroundColor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: 4,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: isDarkMode ? "#f3f4f6" : "#374151",
                                  marginBottom: 4,
                                }}
                              >
                                Preview TAGs to be generated:
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#64748b",
                                  fontFamily: "monospace",
                                }}
                              >
                                {(() => {
                                  const typeObj = deviceTypes.find(
                                    (t) => t.label === currentData.deviceType
                                  );
                                  if (typeObj) {
                                    // Determine prefix based on device type
                                    let prefix;
                                    if (
                                      currentData.deviceType === "RAM" &&
                                      currentData.ramSize
                                    ) {
                                      // For RAM with size selected, use size-specific prefix
                                      const sizeNumber =
                                        currentData.ramSize.replace("GB", "");
                                      prefix = `JOIIRAM${sizeNumber}`;
                                    } else if (
                                      currentData.deviceType === "RAM"
                                    ) {
                                      // For RAM without size selected, show prompt
                                      return "Select RAM size to preview TAGs";
                                    } else {
                                      prefix = `JOII${typeObj.code}`;
                                    }

                                    const qty =
                                      parseInt(currentData.quantity) || 1;
                                    const nextTag =
                                      currentData.nextAvailableTag || 1;
                                    const tags = [];
                                    for (let i = 0; i < Math.min(qty, 5); i++) {
                                      tags.push(
                                        `${prefix}${String(
                                          nextTag + i
                                        ).padStart(4, "0")}`
                                      );
                                    }
                                    if (qty > 5) {
                                      tags.push(`... and ${qty - 5} more`);
                                    }
                                    return tags.join(", ");
                                  }
                                  return "Select device type to preview TAGs";
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}

                {newAcqError && (
                  <div
                    style={{
                      background: "#fef2f2",
                      color: "#dc2626",
                      padding: "8px 12px",
                      borderRadius: 6,
                      marginBottom: 12,
                      border: "1px solid #fecaca",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      style={{ flexShrink: 0 }}
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    <span>{newAcqError}</span>
                  </div>
                )}

                {/* Progress bar */}
                {newAcqLoading && (
                  <div style={{ width: "100%", marginBottom: 12 }}>
                    <div
                      style={{
                        width: "100%",
                        background: "#e9eef3",
                        borderRadius: 8,
                        height: 8,
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          width: `${progress}%`,
                          background: "#2563eb",
                          height: 8,
                          borderRadius: 8,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        color: "#2563eb",
                        fontWeight: 500,
                        fontSize: 12,
                      }}
                    >
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

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    justifyContent: "center",
                    gap: 8,
                    width: "100%",
                  }}
                >
                  <button
                    onClick={handleNewAcqSubmit}
                    disabled={newAcqLoading}
                    style={{
                      ...styles.inventoryModalButton,
                      opacity: newAcqLoading ? 0.6 : 1,
                    }}
                  >
                    {newAcqLoading
                      ? "Adding..."
                      : newAcqTabs.some((tab) => tab.data.useManualSerial)
                      ? "Proceed to Serial Entry"
                      : "Add Devices"}
                  </button>
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
                            condition: "",
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
                      setImportTexts({}); // Clear all import texts
                    }}
                    style={styles.inventoryModalButtonSecondary}
                    disabled={newAcqLoading}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              /* Manual Serial Entry Panel */
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                    style={{ flexShrink: 0 }}
                    aria-hidden="true"
                  >
                    <path d="M9 12l2 2 4-4" />
                    <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                    <path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                    <path d="M12 3c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                    <path d="M12 21c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                  </svg>
                  <h3
                    style={{
                      ...styles.inventoryModalTitle,
                      marginBottom: 0,
                      color: "#2563eb",
                    }}
                  >
                    Enter Serial Numbers (
                    {
                      newAcqTabs.filter((tab) => tab.data.useManualSerial)
                        .length
                    }{" "}
                    Device Type
                    {newAcqTabs.filter((tab) => tab.data.useManualSerial)
                      .length > 1
                      ? "s"
                      : ""}
                    )
                  </h3>
                </div>

                <div
                  style={{
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    color: "#1d4ed8",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Manually assign serial numbers for each device type below
                </div>

                {(() => {
                  const manualTabs = newAcqTabs.filter(
                    (tab) => tab.data.useManualSerial
                  );
                  const currentManualTab =
                    manualTabs.find((tab) => tab.id === activeManualTabId) ||
                    manualTabs[0];

                  return (
                    <>
                      {manualTabs.length > 1 && (
                        <div style={{ width: "100%", marginBottom: 16 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 2,
                                flex: 1,
                                overflowX: "auto",
                                scrollbarWidth: "none",
                                msOverflowStyle: "none",
                                WebkitScrollbar: { display: "none" },
                                minWidth: 0,
                              }}
                            >
                              {manualTabs.map((tab, index) => (
                                <div
                                  key={tab.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <button
                                    onClick={() => {
                                      setActiveManualTabId(tab.id);
                                    }}
                                    style={{
                                      ...styles.tabButton,
                                      background:
                                        tab.id === activeManualTabId
                                          ? "#2563eb"
                                          : "#f8fafc",
                                      color:
                                        tab.id === activeManualTabId
                                          ? "#fff"
                                          : "#64748b",
                                      borderTopLeftRadius: 6,
                                      borderTopRightRadius: 6,
                                      borderBottomLeftRadius:
                                        tab.id === activeManualTabId ? 0 : 6,
                                      borderBottomRightRadius:
                                        tab.id === activeManualTabId ? 0 : 6,
                                      fontWeight:
                                        tab.id === activeManualTabId
                                          ? 600
                                          : 400,
                                      transition: "all 0.2s",
                                      fontFamily:
                                        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                                      minWidth: Math.max(
                                        80,
                                        Math.min(
                                          120,
                                          480 / manualTabs.length - 10
                                        )
                                      ),
                                      maxWidth:
                                        manualTabs.length > 4 ? 100 : 120,
                                      fontSize: manualTabs.length > 6 ? 11 : 13,
                                      padding:
                                        manualTabs.length > 6
                                          ? "6px 8px"
                                          : "8px 12px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        flex: 1,
                                      }}
                                    >
                                      {manualTabs.length > 6
                                        ? `T${index + 1}`
                                        : tab.data.deviceType || tab.label}
                                    </span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Tab Content Border */}
                          <div
                            style={{
                              width: "100%",
                              height: 2,
                              background: "#22c55e",
                              borderRadius: "0 4px 0 0",
                              marginBottom: 12,
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      )}

                      {currentManualTab && (
                        <>
                          <div
                            style={{
                              marginBottom: 12,
                              padding: 10,
                              background: isDarkMode ? "#374151" : "#f1f5f9",
                              borderRadius: 6,
                              border: isDarkMode
                                ? "1px solid #4b5563"
                                : "1px solid #cbd5e1",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                color: isDarkMode ? "#f3f4f6" : "#64748b",
                                marginBottom: 4,
                              }}
                            >
                              <strong>Device Details:</strong>
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: isDarkMode ? "#d1d5db" : "#475569",
                              }}
                            >
                              Type: {currentManualTab.data.deviceType} | Brand:{" "}
                              {currentManualTab.data.brand} | Model:{" "}
                              {currentManualTab.data.model || "N/A"} |
                              Condition: {currentManualTab.data.condition} |
                              Qty:{" "}
                              {currentManualTab.data.manualSerials?.length || 0}
                            </div>
                          </div>

                          {/* Import Section */}
                          <div
                            style={{
                              width: "100%",
                              marginBottom: 12,
                              padding: 10,
                              background: isDarkMode ? "#374151" : "#f8fafc",
                              border: isDarkMode
                                ? "1px solid #4b5563"
                                : "1px solid #e2e8f0",
                              borderRadius: 6,
                              boxSizing: "border-box",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: isDarkMode ? "#f3f4f6" : "#374151",
                                marginBottom: 6,
                              }}
                            >
                              Quick Import Serial Numbers
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: isDarkMode ? "#d1d5db" : "#64748b",
                                marginBottom: 6,
                              }}
                            >
                              Paste serial numbers below (one per line) and
                              click "Import Serials":
                            </div>
                            <textarea
                              style={{
                                ...styles.inventoryInput,
                                width: "100%",
                                height: 70,
                                padding: "6px 8px",
                                border: isDarkMode
                                  ? "1.5px solid #4b5563"
                                  : "1.5px solid #cbd5e1",
                                borderRadius: 4,
                                fontSize: 13,
                                fontFamily: "Maax, monospace",
                                resize: "vertical",
                                boxSizing: "border-box",
                                marginBottom: 6,
                                outline: "none",
                                transition:
                                  "border-color 0.2s, box-shadow 0.2s",
                                backgroundColor: isDarkMode
                                  ? "#374151"
                                  : "#fff",
                                color: isDarkMode ? "#f3f4f6" : "#000",
                              }}
                              placeholder="Serial1&#10;Serial2&#10;Serial3&#10;..."
                              value={importTexts[currentManualTab.id] || ""}
                              onChange={(e) => {
                                const importText = e.target.value;
                                // Only update the import text state, don't auto-import
                                setImportTexts((prev) => ({
                                  ...prev,
                                  [currentManualTab.id]: importText,
                                }));
                              }}
                            />
                            <button
                              onClick={() => {
                                const importText =
                                  importTexts[currentManualTab.id];
                                if (importText && importText.trim()) {
                                  handleImportSerials(
                                    currentManualTab.id,
                                    importText
                                  );
                                }
                              }}
                              style={{
                                ...styles.inventoryModalButton,
                                background: "#22c55e",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                padding: "8px 16px",
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer",
                                marginBottom: 8,
                                marginRight: 8,
                                transition: "background 0.2s",
                                fontFamily:
                                  "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                                opacity:
                                  importTexts[currentManualTab.id] &&
                                  importTexts[currentManualTab.id].trim()
                                    ? 1
                                    : 0.6,
                              }}
                              disabled={
                                !(
                                  importTexts[currentManualTab.id] &&
                                  importTexts[currentManualTab.id].trim()
                                )
                              }
                            >
                              Import Serials
                              {importTexts[currentManualTab.id] &&
                                importTexts[currentManualTab.id].trim() &&
                                ` (${
                                  importTexts[currentManualTab.id]
                                    .split("\n")
                                    .filter((line) => line.trim()).length
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
                                background: "#6b7280",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                padding: "8px 16px",
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer",
                                marginBottom: 8,
                                transition: "background 0.2s",
                                fontFamily:
                                  "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                              }}
                            >
                              Clear
                            </button>
                            <div
                              style={{
                                fontSize: 11,
                                color: isDarkMode ? "#9ca3af" : "#6b7280",
                                fontStyle: "italic",
                              }}
                            >
                              Tip: Copy from Excel/Notepad, paste here, then
                              click "Import Serials" to fill all serial fields
                            </div>
                          </div>

                          <div
                            style={{
                              width: "100%",
                              maxHeight: 300,
                              overflowY: "auto",
                              border: isDarkMode
                                ? "1px solid #4b5563"
                                : "1px solid #e2e8f0",
                              borderRadius: 8,
                              padding: 12,
                              background: isDarkMode ? "#1f2937" : "#fafbfc",
                              boxSizing: "border-box",
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: 8,
                                width: "100%",
                                justifyContent: "start",
                              }}
                            >
                              {currentManualTab.data.manualSerials?.map(
                                (item, index) => (
                                  <div
                                    key={item.id}
                                    style={{
                                      background: isDarkMode
                                        ? "#374151"
                                        : "#fff",
                                      padding: 8,
                                      borderRadius: 6,
                                      border: isDarkMode
                                        ? "1px solid #4b5563"
                                        : "1px solid #e2e8f0",
                                      boxShadow: isDarkMode
                                        ? "0 1px 2px rgba(0,0,0,0.3)"
                                        : "0 1px 2px rgba(0,0,0,0.05)",
                                      width: "100%",
                                      boxSizing: "border-box",
                                    }}
                                  >
                                    <label
                                      style={{
                                        ...styles.inventoryLabel,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: isDarkMode
                                          ? "#f3f4f6"
                                          : "#374151",
                                        marginBottom: 4,
                                        display: "block",
                                      }}
                                    >
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
                                        backgroundColor: isDarkMode
                                          ? "#374151"
                                          : "#fff",
                                        color: isDarkMode ? "#f3f4f6" : "#000",
                                        border: isDarkMode
                                          ? "1.5px solid #4b5563"
                                          : "1.5px solid #cbd5e1",
                                        borderRadius: 4,
                                        outline: "none",
                                        transition:
                                          "border-color 0.2s, box-shadow 0.2s",
                                        boxSizing: "border-box",
                                        fontFamily:
                                          "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                                      }}
                                      placeholder={`Enter serial number`}
                                      maxLength={64}
                                    />
                                  </div>
                                )
                              ) || []}
                            </div>
                          </div>
                        </>
                      )}

                      {newAcqError && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: "8px 12px",
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: 6,
                            color: "#dc2626",
                            fontSize: 13,
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                          </svg>
                          <span>{newAcqError}</span>
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: 12,
                          display: "flex",
                          justifyContent: "center",
                          gap: 8,
                          width: "100%",
                          padding: "0 4px",
                          boxSizing: "border-box",
                        }}
                      >
                        <button
                          onClick={handleManualSerialSubmit}
                          disabled={newAcqLoading}
                          style={{
                            ...styles.inventoryModalButton,
                            opacity: newAcqLoading ? 0.6 : 1,
                            background: "#22c55e",
                            padding: "8px 16px",
                            fontSize: 13,
                          }}
                        >
                          {newAcqLoading
                            ? "Adding Devices..."
                            : "Add All Devices"}
                        </button>
                        <button
                          onClick={() => {
                            setShowManualSerialPanel(false);
                            setImportTexts({}); // Clear import texts when going back
                          }}
                          style={{
                            ...styles.inventoryModalButtonSecondary,
                            padding: "8px 16px",
                            fontSize: 13,
                          }}
                          disabled={newAcqLoading}
                        >
                          Back to Form
                        </button>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
