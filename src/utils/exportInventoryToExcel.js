// Utility to export inventory data to Excel using ExcelJS
import ExcelJS from 'exceljs';

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
  let date;
  if (typeof dateString === "number") {
    // Excel serial date -> JS Date
    date = new Date(Math.round((dateString - 25569) * 86400 * 1000));
  } else if (typeof dateString === "string") {
    date = new Date(dateString);
  } else if (dateString instanceof Date) {
    date = dateString;
  } else {
    return "";
  }
  if (isNaN(date)) return "";
  return (date.getMonth() + 1).toString().padStart(2, "0") +
         "/" +
         date.getDate().toString().padStart(2, "0") +
         "/" +
         date.getFullYear();
}

export async function exportInventoryToExcel({ devices, employees }) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory');

    // Create employee lookup for assigned devices
    const employeeMap = Object.fromEntries(
      (employees || []).map(emp => [emp.id, emp.fullName])
    );

    // Define columns
    worksheet.columns = [
      { header: 'Device Type', key: 'deviceType', width: 15 },
      { header: 'Device Tag', key: 'deviceTag', width: 15 },
      { header: 'Brand', key: 'brand', width: 15 },
      { header: 'Model', key: 'model', width: 20 },
      { header: 'Client', key: 'client', width: 20 },
      { header: 'Condition', key: 'condition', width: 12 },
      { header: 'Remarks', key: 'remarks', width: 25 },
      { header: 'Acquisition Date', key: 'acquisitionDate', width: 15 },
      { header: 'Assigned To', key: 'assignedTo', width: 20 },
      { header: 'Assignment Date', key: 'assignmentDate', width: 15 },
    ];

    // Add rows
    (devices || []).forEach(device => {
      worksheet.addRow({
        deviceType: device.deviceType || '',
        deviceTag: device.deviceTag || '',
        brand: device.brand || '',
        model: device.model || '',
        client: device.client || '',
        condition: device.condition || '',
        remarks: device.remarks || '',
        acquisitionDate: device.acquisitionDate ? formatDateForDisplay(device.acquisitionDate) : '',
        assignedTo: device.assignedTo ? (employeeMap[device.assignedTo] || device.assignedTo) : '',
        assignmentDate: device.assignmentDate ? formatDateForDisplay(device.assignmentDate) : '',
      });
    });

    // Write to buffer and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getExportFilename();
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);

    return true;
  } catch (error) {
    console.error('Export error:', error);
    throw new Error('Failed to export inventory data. Please try again.');
  }
}

// Helper function to export rows to Excel
async function exportRowsToExcel(rows, sheetName = 'Sheet1', fileName = 'export.xlsx') {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Define columns explicitly to control header names and widths:
  worksheet.columns = [
    { header: 'Header A', key: 'colA', width: 20 },
    { header: 'Header B', key: 'colB', width: 25 },
    // add more columns to match your rows objects
  ];

  // Add rows (rows should be array of objects matching column keys)
  worksheet.addRows(rows);

  // Optionally style header row:
  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}
