// Utility to export dashboard data to Excel using ExcelJS and a template
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
  return `${yyyy}-${mm}-${dd}_${hh}-${min}_export_AIMS.xlsx`;
}

export async function exportDashboardToExcel({ allDevices }) {
  // Load the template
  const response = await fetch('/src/Excel/Template.xlsx');
  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.worksheets[0];

  // Write data starting at row 3 (A3:E3)
  const startRow = 3;
  (allDevices || []).forEach((dev, i) => {
    const row = worksheet.getRow(startRow + i);
    row.getCell(1).value = dev.deviceTag || ''; // Column A: Device Tag
    row.getCell(2).value = dev.deviceType || ''; // Column B: Device Type
    row.getCell(3).value = dev.brand || ''; // Column C: Brand
    row.getCell(4).value = dev.model || ''; // Column D: Model
    row.getCell(5).value = dev.condition || ''; // Column E: Condition

    row.commit();
  });

  // Export the file
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
}
