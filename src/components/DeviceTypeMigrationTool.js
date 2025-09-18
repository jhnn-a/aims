import React, { useState } from "react";
import {
  migrateDeviceTypes,
  previewDeviceTypeMigration,
} from "../utils/deviceTypeMigration";

const DeviceTypeMigrationTool = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);

  const handlePreview = async () => {
    setIsLoading(true);
    try {
      const previewData = await previewDeviceTypeMigration();
      setPreview(previewData);
    } catch (error) {
      console.error("Preview failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigrate = async () => {
    setIsLoading(true);
    try {
      const migrationResults = await migrateDeviceTypes();
      setResults(migrationResults);
      setPreview(null); // Clear preview after migration
    } catch (error) {
      console.error("Migration failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        border: "2px solid #e5e7eb",
        borderRadius: "8px",
        backgroundColor: "#f9fafb",
        margin: "20px 0",
      }}
    >
      <h3 style={{ margin: "0 0 16px 0", color: "#374151" }}>
        🔧 Device Type Normalization Tool
      </h3>

      <p style={{ color: "#6b7280", marginBottom: "16px" }}>
        This tool fixes case sensitivity issues by normalizing device types to
        canonical forms (e.g., "WEBCAM" → "Webcam", "HEADSET" → "Headset").
      </p>

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <button
          onClick={handlePreview}
          disabled={isLoading}
          style={{
            padding: "8px 16px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? "Loading..." : "Preview Changes"}
        </button>

        <button
          onClick={handleMigrate}
          disabled={isLoading || !preview || preview.length === 0}
          style={{
            padding: "8px 16px",
            backgroundColor: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor:
              isLoading || !preview || preview.length === 0
                ? "not-allowed"
                : "pointer",
            opacity: isLoading || !preview || preview.length === 0 ? 0.6 : 1,
          }}
        >
          Run Migration
        </button>
      </div>

      {preview && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            backgroundColor: "#fffbeb",
            border: "1px solid #f59e0b",
            borderRadius: "6px",
          }}
        >
          <h4 style={{ margin: "0 0 8px 0", color: "#92400e" }}>
            Preview: {preview.length} devices to update
          </h4>
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {preview.slice(0, 10).map((item, index) => (
              <div
                key={index}
                style={{
                  fontSize: "14px",
                  color: "#78350f",
                  marginBottom: "4px",
                }}
              >
                • {item.deviceTag || item.id}: "{item.currentType}" → "
                {item.normalizedType}"
              </div>
            ))}
            {preview.length > 10 && (
              <div
                style={{
                  fontSize: "14px",
                  color: "#78350f",
                  fontStyle: "italic",
                }}
              >
                ...and {preview.length - 10} more
              </div>
            )}
          </div>
        </div>
      )}

      {results && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            backgroundColor: results.success ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${results.success ? "#10b981" : "#ef4444"}`,
            borderRadius: "6px",
          }}
        >
          <h4
            style={{
              margin: "0 0 8px 0",
              color: results.success ? "#065f46" : "#991b1b",
            }}
          >
            {results.success ? "✅ Migration Completed" : "❌ Migration Failed"}
          </h4>

          {results.success ? (
            <div style={{ fontSize: "14px", color: "#065f46" }}>
              Successfully updated {results.updatedCount} device types.
              {results.totalChecked && (
                <div>Checked {results.totalChecked} total devices.</div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "14px", color: "#991b1b" }}>
              {results.error || "Unknown error occurred"}
            </div>
          )}
        </div>
      )}

      {preview && preview.length === 0 && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            backgroundColor: "#ecfdf5",
            border: "1px solid #10b981",
            borderRadius: "6px",
          }}
        >
          <div style={{ fontSize: "14px", color: "#065f46" }}>
            ✅ All device types are already normalized. No migration needed.
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceTypeMigrationTool;
