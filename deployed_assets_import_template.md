# Deployed Assets Import Template

## Required Excel Headers

Your Excel file should contain the following columns (headers must match exactly):

### Required Columns:
- **Employee** - Full name of the employee (e.g., "John Doe")
- **TYPE** - Device type (e.g., "PC", "Laptop", "Monitor", "Printer")
- **BRAND** - Device brand (e.g., "Dell", "HP", "Asus", "Canon")
- **CLIENT** - Client/Owner name OR Client ID (e.g., "Joii Philippines", "TECH001") - **NEW FEATURE**
- **DEVICE TAG** - Device tag (Required - don't create new device if blank, e.g., "JOIIPC0001")
- **DATE DEPLOYED** - Deployment date (Required, e.g., "10/9/2025" or "10-09-2025")
- **EMPLOYEE ID** - Employee ID for validation (Required, e.g., "EMP0001")

### Optional Columns:
- **MODEL** - Device model (e.g., "OptiPlex 7090")
- **SERIAL NUMBER** - Device serial number (e.g., "ABC123456")
- **SPECIFICATIONS** - Technical specifications (e.g., "i5, 8GB RAM, 256GB SSD")
- **WARRANTY** - Warranty information (e.g., "3 years")
- **PURCHASE DATE** - Purchase date (e.g., "9/1/2025")
- **SUPPLIER** - Supplier name (e.g., "Dell Direct")

## Sample Excel Data:

| Employee | TYPE | BRAND | CLIENT | DEVICE TAG | DATE DEPLOYED | EMPLOYEE ID | MODEL | SERIAL NUMBER | SPECIFICATIONS | WARRANTY | PURCHASE DATE | SUPPLIER |
|----------|------|-------|--------|------------|---------------|-------------|-------|---------------|----------------|----------|---------------|----------|
| John Doe | PC | Dell | Joii Philippines | JOIIPC0001 | 10/9/2025 | EMP0001 | OptiPlex 7090 | ABC123456 | i5, 8GB RAM | 3 years | 9/1/2025 | Dell Direct |
| Jane Smith | Laptop | HP | TECH001 | JOIILAP0002 | 10/8/2025 | EMP0002 | ProBook 450 | XYZ789012 | i7, 16GB RAM | 2 years | 9/15/2025 | HP Store |
| Bob Johnson | Monitor | Asus | Joii Philippines | JOIIMON0001 | 10/7/2025 | EMP0003 | VG248QE | MON987654 | 24" 1080p | 1 year | 9/20/2025 | Asus Direct |

## Important Notes:

1. **Client (Enhanced)**: 
   - Supports both Client Name (e.g., "Homecorp") and Client ID (e.g., "CLI0001")
   - Client ID lookup takes priority over name matching for accuracy
   - Case-insensitive matching for both ID and name
   - The actual Client Name will be stored in the device record for display (not the Client ID)
   - If client not found, import will fail for that row with an error message

2. **Device Tag**: 
   - REQUIRED field - cannot be blank
   - If a device tag already exists in the system, the existing device will be UPDATED with the new imported data
   - Multiple rows with the same device tag within a single import file will be rejected (each tag must be unique per import)
   - This allows you to update existing device assignments or correct device information

3. **Employee Lookup**: The system will first try to match by Employee ID, then fall back to full name matching

4. **Date Format**: Supports multiple formats including MM/DD/YYYY, MM-DD-YYYY, and Excel date serials

5. **Case Sensitivity**: Device types and client names are matched case-insensitively

6. **Validation**: 
   - Invalid device types or missing required fields will be skipped with error messages
   - Blank DEVICE TAG values will cause import failure with specific error messages
   - Duplicate DEVICE TAG values within the same import file will be rejected (each tag can only appear once per import)
   - If a DEVICE TAG already exists in the system, the existing device will be UPDATED with the new imported data
   - CLIENT names that don't exist in the system will result in devices imported without client assignment (with warnings)

## Valid Device Types:
- PC
- Laptop
- Monitor
- Printer
- Scanner
- Server
- Network Device
- Phone
- Tablet
- Camera
- Audio Equipment
- Other Equipment

## How to Use:

1. Create an Excel file with the headers above
2. Fill in your data (only Employee, TYPE, and BRAND are required)
3. Go to Employee page in the AIMS system
4. Click the "Import Deployed Assets" button
5. Select your Excel file
6. Review the import results

The system will show success/error counts and detailed error messages for any issues encountered during import.