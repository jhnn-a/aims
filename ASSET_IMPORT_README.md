# Asset Import Feature - Deployed Employee Assets

## Overview
This feature allows you to import deployed assets from an Excel file directly into the AIMS system. The import process will create new devices in the Asset table and automatically assign them to employees.

## Excel File Format

### Required Headers (Column Names)
Your Excel file must have the following headers in the first row:

| Column Name | Required | Description |
|-------------|----------|-------------|
| Employee | No* | Full name of the employee (fallback if Employee ID not found) |
| TYPE | Yes | Device type (e.g., Laptop, Monitor, Keyboard, Mouse, etc.) |
| BRAND | Yes | Brand/manufacturer of the device |
| DEVICE TAG | No | Unique device identifier (auto-generated if blank) |
| DATE DEPLOYED | No | Date when device was deployed (uses placeholder "-" if blank) |
| EMPLOYEE ID | Recommended | Employee ID from the system (preferred over name) |

*Either Employee name or Employee ID must be provided

### Optional Headers (Additional Information)
You can also include these columns for more detailed device information:

| Column Name | Description |
|-------------|-------------|
| MODEL | Device model/version |
| SERIAL NUMBER | Device serial number |
| SPECIFICATIONS | Technical specifications |
| WARRANTY | Warranty information |
| PURCHASE DATE | When the device was purchased |
| SUPPLIER | Device supplier/vendor |

## Usage Instructions

1. **Navigate to Employee Management**
   - Go to the Employee page in AIMS
   - Make sure you're on the "Active" employees tab

2. **Prepare Your Excel File**
   - Create an Excel file (.xlsx or .xls) with the required headers
   - Fill in the data for each deployed asset
   - Save the file

3. **Import the Assets**
   - Click the green "Import Deployed Assets" button
   - Select your Excel file
   - Wait for the import process to complete

## Import Process Details

### Employee Matching
- **Primary**: System looks for employees by Employee ID (exact match)
- **Fallback**: If Employee ID not found, searches by full name (case-insensitive)
- **Skip**: If neither matches, the row is skipped and logged

### Device Tag Generation
- If DEVICE TAG is blank, system automatically generates one
- If DEVICE TAG already exists (duplicate), system generates a new unique one
- Format: `[TYPE_PREFIX][NUMBER]` (e.g., LPT0001 for laptops, KB0001 for keyboards)
- Ensures uniqueness across all existing devices and within the import session

### Date Handling
- Valid dates are converted to YYYY-MM-DD format
- Invalid or missing dates use placeholder: "-"
- This placeholder appears in the UI and reports

### Device Type Prefixes
| Device Type | Tag Prefix | Example |
|-------------|------------|---------|
| Headset | HS | HS0001 |
| Keyboard | KB | KB0001 |
| Laptop | LPT | LPT0001 |
| Monitor | MN | MN0001 |
| Mouse | M | M0001 |
| PC | PC | PC0001 |
| PSU | PSU | PSU0001 |
| RAM | RAM | RAM0001 |
| SSD | SSD | SSD0001 |
| UPS | UPS | UPS0001 |
| Webcam | W | W0001 |
| Other | DEV | DEV0001 |

## Error Handling

### Common Issues and Solutions

1. **"Employee not found"**
   - Check Employee ID is correct (exact match required)
   - Verify employee name spelling matches exactly
   - Ensure employee exists in the system

2. **"Device tag already exists"**
   - ~~Duplicate device tags are not allowed~~ **RESOLVED**: System now auto-generates new unique tags
   - Device tags are automatically made unique during import
   - Both blank and duplicate tags are handled automatically

3. **"Missing required fields"**
   - TYPE and BRAND are mandatory
   - Check for empty cells in these columns

## Import Results

After import completion, you'll see a summary:
- **Successful**: Number of assets successfully imported
- **Errors**: Number of rows with errors (logged for review)
- **Skipped**: Number of rows skipped (usually due to employee not found)

## Post-Import Verification

1. **Check Assets Page**: Verify imported devices appear in the Assets table
2. **Check Employee Assets**: Click on employee names to see assigned devices
3. **Review Device History**: Each import creates an assignment history entry

## Sample Excel Format

```
Employee         | TYPE    | BRAND | DEVICE TAG | DATE DEPLOYED | EMPLOYEE ID
John Doe        | Laptop  | Dell  | LPT0001   | 2024-01-15   | EMP0001
Jane Smith      | Monitor | LG    |           | 2024-01-16   | EMP0002
Bob Johnson     | Mouse   | Logitech |        |              | EMP0003
```

## Technical Notes

- Import creates devices with "GOOD" condition and "GOOD" status by default
- All imported devices are automatically assigned to employees
- Device history is automatically logged for assignment tracking
- Import process validates and auto-generates unique device tags to prevent duplicates
- Duplicate device tags are automatically resolved by generating new unique tags

## Troubleshooting

If you encounter issues:
1. Check the browser console (F12) for detailed error messages
2. Verify Excel file format matches the requirements
3. Ensure all employee IDs exist in the system
4. Check for special characters or formatting issues in the Excel file

For additional support, contact your system administrator.
