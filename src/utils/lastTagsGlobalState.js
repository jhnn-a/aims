// Global state manager for Last Tags floating window
// This allows the window to persist across different pages/components

class LastTagsGlobalState {
  constructor() {
    this.listeners = new Set();
    this.state = this.loadFromStorage();
  }

  // Load state from localStorage
  loadFromStorage() {
    try {
      const stored = localStorage.getItem("lastTagsModalState");
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          showModal: parsed.showModal || false,
          data: parsed.data || [],
          isMinimized: parsed.isMinimized || false,
          position: parsed.position || { x: 100, y: 100 },
          isDragging: false,
          dragOffset: { x: 0, y: 0 },
        };
      }
    } catch (error) {
      console.warn("Failed to load Last Tags state from localStorage:", error);
    }

    return {
      showModal: false,
      data: [],
      isMinimized: false,
      position: { x: 100, y: 100 },
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
    };
  }

  // Save state to localStorage
  saveToStorage() {
    try {
      const stateToSave = {
        showModal: this.state.showModal,
        data: this.state.data,
        isMinimized: this.state.isMinimized,
        position: this.state.position,
      };
      localStorage.setItem("lastTagsModalState", JSON.stringify(stateToSave));
    } catch (error) {
      console.warn("Failed to save Last Tags state to localStorage:", error);
    }
  }

  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of state changes
  notifyListeners() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  // Update state and notify listeners
  updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  // Get current state
  getState() {
    return this.state;
  }

  // Specific actions
  showModal(data) {
    this.updateState({
      showModal: true,
      data: data || [],
    });
  }

  hideModal() {
    this.updateState({
      showModal: false,
    });
  }

  setMinimized(isMinimized) {
    this.updateState({
      isMinimized,
    });
  }

  setPosition(position) {
    this.updateState({
      position,
    });
  }

  setDragging(isDragging, dragOffset = null) {
    const updates = { isDragging };
    if (dragOffset) {
      updates.dragOffset = dragOffset;
    }
    this.updateState(updates);
  }

  // Set data and show modal
  setData(data) {
    this.updateState({
      data: data,
      showModal: true,
    });
  }

  // Clear all data and hide modal
  reset() {
    this.updateState({
      showModal: false,
      data: [],
      isMinimized: false,
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
    });
  }
}

// Create singleton instance
const lastTagsGlobalState = new LastTagsGlobalState();

export default lastTagsGlobalState;
