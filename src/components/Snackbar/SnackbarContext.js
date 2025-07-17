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

  const showSnackbar = useCallback((message, type = 'info', duration = 4000, undoAction = null) => {
    const id = Date.now() + Math.random();
    const newSnackbar = {
      id,
      message,
      type, // 'success', 'error', 'warning', 'info'
      duration,
      timestamp: Date.now(),
      undoAction, // Function to call when undo is clicked
      undoTimeout: null // Store timeout reference for undo
    };

    setSnackbars(prev => [...prev, newSnackbar]);

    // Auto remove after duration
    if (duration > 0) {
      const timeout = setTimeout(() => {
        removeSnackbar(id);
      }, duration);
      
      // Store timeout reference
      setSnackbars(prev => prev.map(snackbar => 
        snackbar.id === id ? { ...snackbar, undoTimeout: timeout } : snackbar
      ));
    }

    return id;
  }, []);

  const removeSnackbar = useCallback((id) => {
    setSnackbars(prev => {
      const snackbar = prev.find(s => s.id === id);
      if (snackbar?.undoTimeout) {
        clearTimeout(snackbar.undoTimeout);
      }
      return prev.filter(snackbar => snackbar.id !== id);
    });
  }, []);

  const removeAllSnackbars = useCallback(() => {
    setSnackbars(prev => {
      // Clear all timeouts
      prev.forEach(snackbar => {
        if (snackbar.undoTimeout) {
          clearTimeout(snackbar.undoTimeout);
        }
      });
      return [];
    });
  }, []);

  // Handle undo action
  const handleUndo = useCallback((id) => {
    const snackbar = snackbars.find(s => s.id === id);
    if (snackbar?.undoAction) {
      snackbar.undoAction();
      removeSnackbar(id);
    }
  }, [snackbars, removeSnackbar]);

  // Convenience methods
  const showSuccess = useCallback((message, duration) => 
    showSnackbar(message, 'success', duration), [showSnackbar]);
  
  const showError = useCallback((message, duration) => 
    showSnackbar(message, 'error', duration), [showSnackbar]);
  
  const showWarning = useCallback((message, duration) => 
    showSnackbar(message, 'warning', duration), [showSnackbar]);
  
  const showInfo = useCallback((message, duration) => 
    showSnackbar(message, 'info', duration), [showSnackbar]);

  // New method for showing undo notifications
  const showUndoNotification = useCallback((message, undoAction, duration = 5000) => {
    return showSnackbar(message, 'warning', duration, undoAction);
  }, [showSnackbar]);

  const value = {
    snackbars,
    showSnackbar,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showUndoNotification,
    removeSnackbar,
    removeAllSnackbars,
    handleUndo
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
    </SnackbarContext.Provider>
  );
};
