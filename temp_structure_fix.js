// Simplified version to check syntax
function Inventory() {
  // Helper function to render cells with tooltip for text wrapping
  const renderCellWithTooltip = (text, maxLength = 20) => {
    if (!text) return "-";
    
    const shouldTruncate = text.length > maxLength;
    const displayText = shouldTruncate ? `${text.substring(0, maxLength)}...` : text;
    
    return (
      <div 
        title={shouldTruncate ? text : ""} 
        className="cell-with-tooltip"
      >
        {displayText}
      </div>
    );
  };

  return (
    <div className="inventory-container">
      <div className="content-area">
        {/* Your existing content */}
      </div>
    </div>
  );
}

export default Inventory;

const styles = {
  // Styles go here
};
