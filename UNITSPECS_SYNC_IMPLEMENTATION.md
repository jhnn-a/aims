# UnitSpecs Sync Implementation

## Overview

This document describes the implementation of automatic synchronization between the Inventory system and UnitSpecs tables for PC and Laptop devices.

## Implementation Details

### 1. Enhanced syncToUnitSpecs Function

The `syncToUnitSpecs` function has been enhanced to:

- **Support More Device Types**: Now supports PC, Laptop, Desktop, Notebook, Computer, and Workstation
- **Enhanced Data Mapping**: Includes additional fields like brand, model, acquisitionDate, assignedTo, and assignmentDate
- **Better CPU Detection**: Improved extraction of CPU information from various fields (cpuGen, cpu, cpuSystemUnit)
- **Smart Collection Targeting**: Automatically determines whether to sync to InventoryUnits or DeployedUnits based on assignment status

### 2. Automatic Sync Triggers

#### When Adding New PC/Laptop to Inventory:

- **Individual Device Creation** (via form): ✅ Syncs to InventoryUnits
- **Bulk Device Creation** (via New Acquisitions): ✅ Syncs to InventoryUnits
- **Excel Import**: ✅ Syncs to InventoryUnits (newly added)
- **Device Updates** (editing existing): ✅ Updates corresponding UnitSpecs record

#### When Assigning/Deploying PC/Laptop:

- **Regular Assignment** (via assignment modal): ✅ Syncs to DeployedUnits + Moves from InventoryUnits
- **Temporary Deployment**: ✅ Syncs to DeployedUnits + Moves from InventoryUnits
- **Bulk Assignment**: ✅ Syncs to DeployedUnits + Moves from InventoryUnits

### 3. Data Mapping Structure

```javascript
const unitSpecData = {
  Tag: deviceData.deviceTag,
  deviceType: deviceData.deviceType,
  category: deviceData.category,
  cpuGen: extractCpuGen(
    deviceData.cpuGen || deviceData.cpu || deviceData.cpuSystemUnit
  ),
  cpuModel: extractCpuModel(deviceData.cpuGen || deviceData.cpu),
  CPU: deviceData.cpuGen || deviceData.cpu || deviceData.cpuSystemUnit,
  RAM: extractRamSize(deviceData.ram),
  Drive: deviceData.drive1 || deviceData.mainDrive,
  GPU: deviceData.gpu,
  Status: deviceData.condition,
  OS: deviceData.os || deviceData.operatingSystem,
  Remarks: deviceData.remarks,
  lifespan: deviceData.lifespan,
  brand: deviceData.brand,
  model: deviceData.model,
  acquisitionDate: deviceData.acquisitionDate,
  assignedTo: deviceData.assignedTo,
  assignmentDate: deviceData.assignmentDate,
};
```

### 4. Helper Functions Enhanced

#### extractCpuGen Function

- Now supports i3, i5, i7, and i9 processors
- Works with various input formats (full CPU strings, cpuSystemUnit values)

#### extractCpuModel Function

- Improved to handle i9 processors
- Better cleanup of CPU model strings

### 5. Collection Management

#### InventoryUnits Collection

- Contains PC/Laptop devices that are **NOT assigned** to any employee
- Automatically populated when new PC/Laptop devices are added to inventory
- Devices are **moved from** this collection when assigned

#### DeployedUnits Collection

- Contains PC/Laptop devices that **ARE assigned** to employees
- Automatically populated when PC/Laptop devices are assigned
- Devices are **moved to** this collection when assigned

### 6. Sync Points Summary

| Action             | Trigger Location            | Sync Behavior                  |
| ------------------ | --------------------------- | ------------------------------ |
| Add New Device     | `handleSave()`              | → InventoryUnits               |
| Edit Device        | `handleSave()`              | → Updates existing record      |
| Bulk Add           | `addDevicesInBulk()`        | → InventoryUnits               |
| Excel Import       | `handleImportExcel()`       | → InventoryUnits               |
| Regular Assignment | `handleDownloadAndAssign()` | InventoryUnits → DeployedUnits |
| Temp Deployment    | `handleTempDeployDone()`    | InventoryUnits → DeployedUnits |

### 7. Error Handling

- All sync operations include try-catch blocks
- Sync failures do not block the main inventory operations
- Console logging for successful syncs and error reporting

### 8. Benefits

- **Real-time Sync**: UnitSpecs tables are always up-to-date with inventory changes
- **Automatic Movement**: Devices automatically move between InventoryUnits and DeployedUnits based on assignment status
- **Comprehensive Coverage**: All methods of adding/assigning PC/Laptop devices are covered
- **Non-blocking**: Sync failures don't prevent inventory operations from completing

## Testing Recommendations

1. **Add PC/Laptop via form** → Verify appears in UnitSpecs InventoryUnits
2. **Import PC/Laptop via Excel** → Verify appears in UnitSpecs InventoryUnits
3. **Assign PC/Laptop to employee** → Verify moves from InventoryUnits to DeployedUnits
4. **Edit PC/Laptop details** → Verify UnitSpecs record is updated
5. **Bulk add via New Acquisitions** → Verify all appear in UnitSpecs InventoryUnits

## Files Modified

- `src/pages/Inventory.js` - Enhanced syncToUnitSpecs function and added sync to Excel import

## Dependencies

- Firebase Firestore (already imported)
- Uses existing `doc`, `setDoc`, `deleteDoc` from firebase/firestore
