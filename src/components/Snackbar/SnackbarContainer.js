import React from 'react';
import { useSnackbar } from './SnackbarContext';

const SnackbarContainer = () => {
  const { snackbars, removeSnackbar } = useSnackbar();

  if (snackbars.length === 0) return null;

  return (
    <>
      {snackbars.map((snackbar, index) => (
        <div
          key={snackbar.id}
          style={{
            position: "fixed",
            bottom: 20 + (index * 70), // Stack multiple notifications
            right: 20,
            background: 
              snackbar.type === 'warning' ? "#eab308" : 
              snackbar.type === 'error' ? "#dc2626" : 
              snackbar.type === 'info' ? "#0284c7" : "#059669",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            zIndex: 1000,
            maxWidth: 400,
            fontFamily: "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            animation: "slideIn 0.3s ease-out",
          }}
        >
          <span>{snackbar.message}</span>
          <button
            onClick={() => removeSnackbar(snackbar.id)}
            style={{
              background: "transparent",
              border: "1px solid #fff",
              color: "#fff",
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 12,
              cursor: "pointer",
              transition: "background 0.18s",
              marginLeft: "auto",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            ✕
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default SnackbarContainer;
