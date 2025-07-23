Sample Excel File for Asset Import Testing

Since I cannot create actual Excel files in this environment, here's the exact format you should use:

## Sample Data Structure

**File name**: sample_deployed_assets.xlsx

**Sheet 1** (with headers in row 1):

| Employee | TYPE | BRAND | DEVICE TAG | DATE DEPLOYED | EMPLOYEE ID |
|----------|------|-------|------------|---------------|-------------|
| John Doe | Laptop | Dell | LPT0001 | 2024-01-15 | EMP0001 |
| Jane Smith | Monitor | LG |  | 2024-01-16 | EMP0002 |
| Bob Johnson | Mouse | Logitech |  |  | EMP0003 |
| Alice Brown | Keyboard | Microsoft | KB0010 | 2024-01-17 | EMP0004 |
| Mike Wilson | Headset | Sony |  | 2024-01-18 | EMP0005 |

## Notes for Testing:
1. Create this in Excel with the exact headers shown
2. Replace the Employee IDs (EMP0001, etc.) with actual Employee IDs from your system
3. You can find Employee IDs in the Employee page - they're shown in the first column
4. Blank DEVICE TAG entries will be auto-generated
5. Blank DATE DEPLOYED entries will use "-" as placeholder
6. Make sure the employees exist in your system before importing

## Expected Results:
- 5 devices should be created
- Each device will be assigned to the respective employee
- Device tags will be auto-generated for blank entries
- Assignment history will be logged for each device

To create the Excel file:
1. Open Excel
2. Create headers in row 1 exactly as shown above
3. Add your data in rows 2-6
4. Save as .xlsx format
5. Use the "Import Deployed Assets" button in AIMS to upload it
