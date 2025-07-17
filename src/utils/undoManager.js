/**
 * Undo Manager for handling deletion and restoration of items
 */

class UndoManager {
  constructor() {
    this.deletedItems = new Map();
    this.undoTimeouts = new Map();
  }

  /**
   * Store a deleted item with its restoration function
   * @param {string} id - Unique identifier for the deleted item
   * @param {object} item - The deleted item data
   * @param {function} restoreFunction - Function to call to restore the item
   * @param {number} timeout - Time in milliseconds before permanent deletion (default: 5000)
   */
  addDeletedItem(id, item, restoreFunction, timeout = 5000) {
    // Store the deleted item
    this.deletedItems.set(id, {
      item,
      restoreFunction,
      deletedAt: Date.now()
    });

    // Set timeout for permanent deletion
    const timeoutId = setTimeout(() => {
      this.permanentlyDelete(id);
    }, timeout);

    this.undoTimeouts.set(id, timeoutId);
  }

  /**
   * Restore a deleted item
   * @param {string} id - Unique identifier for the deleted item
   * @returns {boolean} - True if restored successfully, false if item not found
   */
  restoreItem(id) {
    const deletedItem = this.deletedItems.get(id);
    if (!deletedItem) {
      return false;
    }

    // Clear the timeout
    const timeoutId = this.undoTimeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.undoTimeouts.delete(id);
    }

    // Restore the item
    try {
      deletedItem.restoreFunction(deletedItem.item);
      this.deletedItems.delete(id);
      return true;
    } catch (error) {
      console.error('Error restoring item:', error);
      return false;
    }
  }

  /**
   * Permanently delete an item (remove from undo history)
   * @param {string} id - Unique identifier for the deleted item
   */
  permanentlyDelete(id) {
    const timeoutId = this.undoTimeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.undoTimeouts.delete(id);
    }
    this.deletedItems.delete(id);
  }

  /**
   * Get all deleted items (for debugging purposes)
   * @returns {Array} - Array of deleted items
   */
  getAllDeletedItems() {
    return Array.from(this.deletedItems.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }

  /**
   * Clear all deleted items and timeouts
   */
  clearAll() {
    // Clear all timeouts
    this.undoTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.undoTimeouts.clear();
    this.deletedItems.clear();
  }
}

// Create a singleton instance
const undoManager = new UndoManager();

export default undoManager;
