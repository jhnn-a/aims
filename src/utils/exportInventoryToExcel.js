// Utility to export inventory data to Excel
import * as XLSX from 'xlsx';

// Helper to format date/time for filename
function getExportFilename() {
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `${yyyy}-${mm}-${dd}_${hh}-${min}_inventory_export.xlsx`;
}

// Helper to format dates as MM/DD/YYYY for display
function formatDateForDisplay(dateString) {
  if (!dateString) return "";
  
  // Handle different date formats
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
  
  // Format as MM/DD/YYYY
  return (date.getMonth() + 1).toString().padStart(2, "0") +
         "/" +
         date.getDate().toString().padStart(2, "0") +
         "/" +
         date.getFullYear();
}

export async function exportInventoryToExcel({ devices, employees }) {
  try {
    // Create employee lookup for assigned devices
    const employeeMap = Object.fromEntries(
      employees.map(emp => [emp.id, emp.fullName])
    );

    // Prepare data for export
    const exportData = devices.map((device) => ({
      "Device Type": device.deviceType || "",
      "Device Tag": device.deviceTag || "",
      "Brand": device.brand || "",
      "Model": device.model || "",
      "Client": device.client || "",
      "Condition": device.condition || "",
      "Remarks": device.remarks || "",
      "Acquisition Date": device.acquisitionDate ? formatDateForDisplay(device.acquisitionDate) : "",
      "Assigned To": device.assignedTo ? (employeeMap[device.assignedTo] || device.assignedTo) : "",
      "Assignment Date": device.assignmentDate ? formatDateForDisplay(device.assignmentDate) : "",
    }));

    // Create a new workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const colWidths = [
      { wch: 15 }, // Device Type
      { wch: 15 }, // Device Tag
      { wch: 15 }, // Brand
      { wch: 20 }, // Model
      { wch: 20 }, // Client
      { wch: 12 }, // Condition
      { wch: 25 }, // Remarks
      { wch: 15 }, // Acquisition Date
      { wch: 20 }, // Assigned To
      { wch: 15 }, // Assignment Date
    ];
    ws['!cols'] = colWidths;

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");

    // Generate filename with current date
    const filename = getExportFilename();

    // Save the file
    XLSX.writeFile(wb, filename);

    return true;
  } catch (error) {
    console.error("Export error:", error);
    throw new Error("Failed to export inventory data. Please try again.");
  }
}
