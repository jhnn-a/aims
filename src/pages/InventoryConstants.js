// Constants and configuration for Inventory page

export const initialForm = {
  deviceType: "",
  deviceTag: "",
  brand: "",
  model: "",
  client: "",
  condition: "",
  remarks: "",
  acquisitionDate: "",
};

export const fieldLabels = {
  deviceType: "Device Type",
  deviceTag: "Device Tag",
  brand: "Brand",
  model: "Model",
  client: "Client",
  condition: "Condition",
  remarks: "Remarks",
  acquisitionDate: "Acquisition Date",
};

export const deviceTypes = [
  { label: "Headset", code: "HS" },
  { label: "Keyboard", code: "KB" },
  { label: "Laptop", code: "LPT" },
  { label: "Monitor", code: "MN" },
  { label: "Mouse", code: "M" },
  { label: "PC", code: "PC" },
  { label: "PSU", code: "PSU" },
  { label: "RAM", code: "RAM" },
  { label: "SSD", code: "SSD" },
  { label: "UPS", code: "UPS" },
  { label: "Webcam", code: "W" },
];

export const conditions = ["BRANDNEW", "GOOD", "DEFECTIVE"];

// Function to get background color based on condition
export const getConditionColor = (condition) => {
  const colorMap = {
    GOOD: "#007BFF", // Blue
    BRANDNEW: "#28A745", // Green
    DEFECTIVE: "#DC3545", // Red
    "NEEDS REPAIR": "#FFC107", // Yellow
    RETIRED: "#6C757D", // Gray
  };
  return colorMap[condition] || "#6C757D"; // Default to gray
};

// Function to get text color for better contrast
export const getConditionTextColor = (condition) => {
  // Yellow background needs dark text for better contrast
  return condition === "NEEDS REPAIR" ? "#000" : "#fff";
};

// Document generation constants
export const ROWS_PER_TABLE = 28;
