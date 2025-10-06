import { useState, useEffect } from "react";
import lastTagsGlobalState from "../utils/lastTagsGlobalState";

// Custom hook to use Last Tags global state
export const useLastTagsGlobalState = () => {
  const [state, setState] = useState(lastTagsGlobalState.getState());

  useEffect(() => {
    // Subscribe to global state changes
    const unsubscribe = lastTagsGlobalState.subscribe(setState);

    // Update local state with current global state
    setState(lastTagsGlobalState.getState());

    return unsubscribe;
  }, []);

  // Return state and actions
  return {
    // State
    showModal: state.showModal,
    data: state.data,
    isMinimized: state.isMinimized,
    position: state.position,
    isDragging: state.isDragging,
    dragOffset: state.dragOffset,

    // Actions
    setData: (data) => lastTagsGlobalState.setData(data),
    showModalAction: () => lastTagsGlobalState.showModal(),
    hideModal: () => lastTagsGlobalState.hideModal(),
    setMinimized: (isMinimized) =>
      lastTagsGlobalState.setMinimized(isMinimized),
    setPosition: (position) => lastTagsGlobalState.setPosition(position),
    setDragging: (isDragging, dragOffset) =>
      lastTagsGlobalState.setDragging(isDragging, dragOffset),
    reset: () => lastTagsGlobalState.reset(),
  };
};
