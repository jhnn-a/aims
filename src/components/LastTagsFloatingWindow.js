import React, { useCallback, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useLastTagsGlobalState } from "../hooks/useLastTagsGlobalState";

const LastTagsFloatingWindow = () => {
  const { isDarkMode } = useTheme();
  const {
    showModal,
    data,
    isMinimized,
    position,
    isDragging,
    dragOffset,
    hideModal,
    setMinimized,
    setPosition,
    setDragging,
  } = useLastTagsGlobalState();

  // Use ref to avoid excessive re-renders during drag
  const animationFrameRef = useRef(null);

  // --- Floating Window Drag Functionality ---
  const handleMouseDown = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setDragging(true, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      e.preventDefault();
    },
    [setDragging]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging && !animationFrameRef.current) {
        // Prevent multiple requestAnimationFrame calls
        animationFrameRef.current = requestAnimationFrame(() => {
          const newX = e.clientX - dragOffset.x;
          const newY = e.clientY - dragOffset.y;

          // Keep window within viewport bounds
          const maxX = window.innerWidth - 400; // Window width
          const maxY = window.innerHeight - 100; // Minimum visible height

          setPosition({
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY)),
          });

          animationFrameRef.current = null;
        });
      }
    },
    [isDragging, dragOffset, setPosition]
  );

  const handleMouseUp = useCallback(() => {
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setDragging(false);
  }, [setDragging]);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "grabbing";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
      // Cancel any pending animation frame on cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMinimize = useCallback(() => {
    setMinimized(true);
  }, [setMinimized]);

  const handleRestore = useCallback(() => {
    setMinimized(false);
  }, [setMinimized]);

  const handleClose = useCallback(() => {
    hideModal();
    setMinimized(false);
  }, [hideModal, setMinimized]);

  // Don't render if modal is not shown
  if (!showModal) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: isMinimized ? "250px" : "400px",
        height: isMinimized ? "50px" : "auto",
        maxHeight: isMinimized ? "50px" : "600px",
        background: isDarkMode ? "#1f2937" : "#ffffff",
        borderRadius: "12px",
        boxShadow: isDarkMode
          ? "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)"
          : "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
        border: isDarkMode ? "2px solid #374151" : "2px solid #e5e7eb",
        zIndex: 9999, // Higher z-index to ensure it's above everything
        fontFamily:
          'Maax, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: "hidden",
        transition: isDragging ? "none" : "all 0.3s ease",
      }}
    >
      {/* Header Bar - Always visible and draggable */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "10px 10px 0 0",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
          borderBottom: isMinimized
            ? "none"
            : isDarkMode
            ? "2px solid #374151"
            : "2px solid #e5e7eb",
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#ffffff",
          }}
        >
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
          </svg>
          <span
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#ffffff",
            }}
          >
            {isMinimized ? "Last Tags" : "Last Used Tags"}
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {/* Minimize/Restore Button */}
          <button
            onClick={isMinimized ? handleRestore : handleMinimize}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: "4px",
              padding: "4px",
              cursor: "pointer",
              color: "#ffffff",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.2)";
            }}
          >
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              {isMinimized ? (
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              ) : (
                <path d="M19 13H5v-2h14v2z" />
              )}
            </svg>
          </button>

          {/* Close Button */}
          <button
            onClick={handleClose}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: "4px",
              padding: "4px",
              cursor: "pointer",
              color: "#ffffff",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 100, 100, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.2)";
            }}
          >
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.3 5.71c-.39-.39-1.02-.39-1.41 0L12 10.59 7.11 5.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.59 12 5.7 16.89c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l4.89 4.88c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content - Only visible when not minimized */}
      {!isMinimized && (
        <div
          style={{
            padding: "16px",
            maxHeight: "500px",
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: isDarkMode ? "#4b5563 #374151" : "#cbd5e1 #f8fafc",
          }}
        >
          {data.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: isDarkMode ? "#9ca3af" : "#6b7280",
                fontSize: "14px",
                fontStyle: "italic",
                padding: "20px",
              }}
            >
              No tag data available
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {data.map((item, index) => (
                <div
                  key={index}
                  style={{
                    background: isDarkMode ? "#374151" : "#f8fafc",
                    borderRadius: "8px",
                    padding: "12px",
                    border: isDarkMode
                      ? "1px solid #4b5563"
                      : "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "#fff",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "700",
                        minWidth: "50px",
                        textAlign: "center",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      {item.code}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: isDarkMode ? "#f3f4f6" : "#374151",
                      }}
                    >
                      {item.deviceType}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        background:
                          item.lastTag === "No tags used yet"
                            ? "#fee2e2"
                            : "#dbeafe",
                        color:
                          item.lastTag === "No tags used yet"
                            ? "#dc2626"
                            : "#1d4ed8",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        fontFamily: "monospace",
                        border:
                          item.lastTag === "No tags used yet"
                            ? "1px solid #fecaca"
                            : "1px solid #93c5fd",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      }}
                    >
                      {item.lastTag}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        color: isDarkMode ? "#9ca3af" : "#6b7280",
                        fontWeight: "500",
                        background: isDarkMode ? "#4b5563" : "#f1f5f9",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {item.totalCount} used
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LastTagsFloatingWindow;
