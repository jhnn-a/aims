import React, { createContext, useContext, useState, useCallback } from 'react';

const SnackbarContext = createContext();

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

export const SnackbarProvider = ({ children }) => {
  const [snackbars, setSnackbars] = useState([]);

  const showSnackbar = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    const newSnackbar = {
      id,
      message,
      type, // 'success', 'error', 'warning', 'info'
      duration,
      timestamp: Date.now()
    };

    setSnackbars(prev => [...prev, newSnackbar]);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeSnackbar(id);
      }, duration);
    }

    return id;
  }, []);

  const removeSnackbar = useCallback((id) => {
    setSnackbars(prev => prev.filter(snackbar => snackbar.id !== id));
  }, []);

  const removeAllSnackbars = useCallback(() => {
    setSnackbars([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((message, duration) => 
    showSnackbar(message, 'success', duration), [showSnackbar]);
  
  const showError = useCallback((message, duration) => 
    showSnackbar(message, 'error', duration), [showSnackbar]);
  
  const showWarning = useCallback((message, duration) => 
    showSnackbar(message, 'warning', duration), [showSnackbar]);
  
  const showInfo = useCallback((message, duration) => 
    showSnackbar(message, 'info', duration), [showSnackbar]);

  const value = {
    snackbars,
    showSnackbar,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeSnackbar,
    removeAllSnackbars
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
    </SnackbarContext.Provider>
  );
};
