// Utility functions for Inventory page

// Utility function to format dates as "January 23, 2025"
export const formatDateToFullWord = (dateString) => {
  if (!dateString) return "";

  let date;
  if (typeof dateString === "number") {
    // Excel serial date
    date = new Date(Math.round((dateString - 25569) * 86400 * 1000));
  } else if (typeof dateString === "string") {
    date = new Date(dateString);
  } else {
    return "";
  }

  if (isNaN(date)) return "";

  // Format as "January 23, 2025"
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Convert date to MM/DD/YYYY format
export const formatDateToMMDDYYYY = (dateInput) => {
  if (!dateInput) return "";

  let date;
  if (typeof dateInput === "string") {
    // If it's already in MM/DD/YYYY format, return as is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
      return dateInput;
    }

    // If it's in YYYY-MM-DD format, convert it
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split("-");
      return `${month}/${day}/${year}`;
    }

    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === "number") {
    // Excel serial date
    date = new Date(Math.round((dateInput - 25569) * 86400 * 1000));
  } else {
    return "";
  }

  if (isNaN(date)) return "";

  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
};

// Convert MM/DD/YYYY to YYYY-MM-DD for date inputs
export const formatDateToInputValue = (dateString) => {
  if (!dateString) return "";

  // Handle Firestore Timestamp objects
  if (dateString && typeof dateString === "object" && dateString.seconds) {
    const date = new Date(dateString.seconds * 1000);
    return date.toISOString().split("T")[0];
  }

  // Handle MM/DD/YYYY format
  if (
    typeof dateString === "string" &&
    /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)
  ) {
    const [month, day, year] = dateString.split("/");
    const paddedMonth = month.padStart(2, "0");
    const paddedDay = day.padStart(2, "0");
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  // Handle YYYY-MM-DD format (already correct)
  if (
    typeof dateString === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateString)
  ) {
    return dateString;
  }

  // Handle Date objects
  if (dateString instanceof Date) {
    return dateString.toISOString().split("T")[0];
  }

  // Convert MM/DD/YYYY to YYYY-MM-DD
  const parts = dateString.split("/");
  if (parts.length === 3) {
    const month = parts[0].padStart(2, "0");
    const day = parts[1].padStart(2, "0");
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  return "";
};

// Validate tag uniqueness
export const validateTagUniqueness = async (
  tagToValidate,
  existingDevices = []
) => {
  try {
    // Check against existing devices in memory first
    const existsInMemory = existingDevices.some(
      (device) => device.deviceTag === tagToValidate
    );

    if (existsInMemory) {
      return {
        isValid: false,
        message: `Device tag "${tagToValidate}" already exists in the current dataset.`,
      };
    }

    // If not found in memory, check against database
    // This would require importing getAllDevices, but for now return valid
    return { isValid: true, message: "" };
  } catch (error) {
    return {
      isValid: false,
      message: "Error validating tag uniqueness. Please try again.",
    };
  }
};

// Get unassigned devices with search filter
export const getUnassignedDevices = (devices, searchTerm = "") => {
  return devices.filter((device) => {
    // First filter: Only show devices that are NOT assigned
    const isUnassigned = !device.assignedTo || device.assignedTo === "";
    if (!isUnassigned) return false;

    // Second filter: Search functionality
    if (!searchTerm.trim()) return true;

    const search = searchTerm.toLowerCase();
    return (
      String(device.deviceTag || "")
        .toLowerCase()
        .includes(search) ||
      String(device.deviceType || "")
        .toLowerCase()
        .includes(search) ||
      String(device.brand || "")
        .toLowerCase()
        .includes(search) ||
      String(device.model || "")
        .toLowerCase()
        .includes(search) ||
      String(device.client || "")
        .toLowerCase()
        .includes(search) ||
      String(device.condition || "")
        .toLowerCase()
        .includes(search) ||
      String(device.remarks || "")
        .toLowerCase()
        .includes(search)
    );
  });
};

// Generate next available device tag
export const generateNextDeviceTag = (deviceType, existingDevices) => {
  const deviceTypes = [
    { label: "Headset", code: "H" },
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

  const typeObj = deviceTypes.find((t) => t.label === deviceType);
  if (!typeObj) return "";

  const prefix = `JOII${typeObj.code}`;

  // Find existing tags with this prefix
  const existingTags = existingDevices
    .filter((device) => device.Tag && String(device.Tag).startsWith(prefix))
    .map((device) => {
      const tagNumber = String(device.Tag).replace(prefix, "");
      return parseInt(tagNumber, 10);
    })
    .filter((num) => !isNaN(num))
    .sort((a, b) => b - a);

  const nextNumber = existingTags.length > 0 ? existingTags[0] + 1 : 1;
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

// Utility function to convert MM/DD/YYYY to YYYY-MM-DD for date input
export const formatDateToYYYYMMDD = (dateString) => {
  if (!dateString) return "";

  // If already in YYYY-MM-DD format, return as is
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }

  // Convert MM/DD/YYYY to YYYY-MM-DD
  const parts = dateString.split("/");
  if (parts.length === 3) {
    const month = parts[0].padStart(2, "0");
    const day = parts[1].padStart(2, "0");
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  return "";
};
