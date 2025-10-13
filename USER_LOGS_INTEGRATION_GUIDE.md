# User Logs Integration Guide

## Overview

This document outlines the integration of user action logging across all AIMS pages. The logging system tracks all CRUD operations for audit and monitoring purposes.

## Completed Integrations

### ✅ Assets.js

**Imports Added:**

- `useCurrentUser` from CurrentUserContext
- `createUserLog`, `ACTION_TYPES` from userLogService

**Actions Logged:**

1. **Device Unassignment** (confirmUnassign)

   - Action: `ACTION_TYPES.DEVICE_UNASSIGN`
   - Logs: Device tag, type, employee name, reason

2. **Bulk Delete** (confirmBulkDelete)

   - Action: `ACTION_TYPES.DEVICE_DELETE`
   - Logs: Number of devices, device tags list

3. **Bulk Reassignment** (confirmBulkReassign)

   - Action: `ACTION_TYPES.DEVICE_TRANSFER`
   - Logs: Number of devices, transferee info, device tags

4. **Export to Excel** (handleExportToExcel)
   - Action: `ACTION_TYPES.DEVICE_EXPORT`
   - Logs: Number of devices exported

---

## Remaining Integrations

### 🔄 Inventory.js

**Status:** Partially Complete

- Imports added ✅
- currentUser hook added ✅
- Add Device logging added ✅

**Still Needed:**

#### 1. Edit Device (handleSave - update branch)

```javascript
// Add after updateDevice() call around line 2250
await createUserLog(
  currentUser?.uid,
  currentUser?.displayName || currentUser?.email,
  currentUser?.email,
  ACTION_TYPES.DEVICE_UPDATE,
  `Updated device ${payload.deviceTag}`,
  {
    deviceTag: payload.deviceTag,
    changes: changeDescription,
  }
);
```

#### 2. Delete Device (confirmDelete)

```javascript
// Add after deleteDevice() call
await createUserLog(
  currentUser?.uid,
  currentUser?.displayName || currentUser?.email,
  currentUser?.email,
  ACTION_TYPES.DEVICE_DELETE,
  `Deleted device ${deviceToDelete.deviceTag}`,
  {
    deviceTag: deviceToDelete.deviceTag,
    deviceType: deviceToDelete.deviceType,
  }
);
```

#### 3. Assign Device (handleAssignSubmit or confirmAssign)

```javascript
// Add after assignment success
await createUserLog(
  currentUser?.uid,
  currentUser?.displayName || currentUser?.email,
  currentUser?.email,
  ACTION_TYPES.DEVICE_ASSIGN,
  `Assigned device ${device.deviceTag} to ${assigneeName}`,
  {
    deviceTag: device.deviceTag,
    assigneeType: isClient ? "client" : "employee",
    assigneeName: assigneeName,
  }
);
```

#### 4. Import Devices (handleImportExcel)

```javascript
// Add after successful import
await createUserLog(
  currentUser?.uid,
  currentUser?.displayName || currentUser?.email,
  currentUser?.email,
  ACTION_TYPES.DEVICE_IMPORT,
  `Imported ${successCount} devices from Excel`,
  {
    totalImported: successCount,
    failedCount: failedDevices.length,
  }
);
```

#### 5. Export Devices (handleExportToExcel)

```javascript
// Add after export success
await createUserLog(
  currentUser?.uid,
  currentUser?.displayName || currentUser?.email,
  currentUser?.email,
  ACTION_TYPES.DEVICE_EXPORT,
  `Exported ${filteredDevices.length} devices to Excel`,
  {
    deviceCount: filteredDevices.length,
  }
);
```

#### 6. Add Acquisition (handleAddAcquisition)

```javascript
// Add after adding devices for new acquisition
await createUserLog(
  currentUser?.uid,
  currentUser?.displayName || currentUser?.email,
  currentUser?.email,
  ACTION_TYPES.DEVICE_CREATE,
  `Added ${quantity} devices for acquisition ${acquisitionName}`,
  {
    acquisitionName: acquisitionName,
    quantity: quantity,
    deviceType: form.deviceType,
  }
);
```

---

### 📝 Employee.js

**Imports Needed:**

```javascript
import { useCurrentUser } from "../CurrentUserContext";
import { createUserLog, ACTION_TYPES } from "../services/userLogService";
```

**In Component:**

```javascript
const currentUser = useCurrentUser();
```

**Actions to Log:**

#### 1. Import Employees

```javascript
ACTION_TYPES.EMPLOYEE_IMPORT;
Description: "Imported {count} employees from Excel";
```

#### 2. Export Employees

```javascript
ACTION_TYPES.EMPLOYEE_EXPORT;
Description: "Exported {count} employees to Excel";
```

#### 3. Add Employee

```javascript
ACTION_TYPES.EMPLOYEE_CREATE;
Description: "Added employee {fullName}";
```

#### 4. Resign Employee

```javascript
ACTION_TYPES.EMPLOYEE_UPDATE;
Description: "Resigned employee {fullName}";
```

#### 5. Edit Employee

```javascript
ACTION_TYPES.EMPLOYEE_UPDATE;
Description: "Updated employee {fullName}";
```

---

### 👥 Clients.js

**Imports Needed:**

```javascript
import { useCurrentUser } from "../CurrentUserContext";
import { createUserLog, ACTION_TYPES } from "../services/userLogService";
```

**In Component:**

```javascript
const currentUser = useCurrentUser();
```

**Actions to Log:**

#### 1. Add Client

```javascript
ACTION_TYPES.CLIENT_CREATE;
Description: "Added client {fullName}";
```

#### 2. Export Clients

```javascript
ACTION_TYPES.CLIENT_EXPORT;
Description: "Exported {count} clients to Excel";
```

#### 3. Edit Client

```javascript
ACTION_TYPES.CLIENT_UPDATE;
Description: "Updated client {fullName}";
```

#### 4. Delete Client

```javascript
ACTION_TYPES.CLIENT_DELETE;
Description: "Deleted client {fullName}";
```

---

### 🖥️ UnitSpecs.js

**Imports Needed:**

```javascript
import { useCurrentUser } from "../CurrentUserContext";
import { createUserLog, ACTION_TYPES } from "../services/userLogService";
```

**In Component:**

```javascript
const currentUser = useCurrentUser();
```

**Actions to Log:**

#### 1. Export Units

```javascript
ACTION_TYPES.UNITSPEC_EXPORT;
Description: "Exported {count} units to Excel";
```

#### 2. Import Units

```javascript
ACTION_TYPES.UNITSPEC_IMPORT;
Description: "Imported {count} units from Excel";
```

#### 3. Add Unit

```javascript
ACTION_TYPES.UNITSPEC_CREATE;
Description: "Added unit {deviceTag}";
```

#### 4. Edit Unit

```javascript
ACTION_TYPES.UNITSPEC_UPDATE;
Description: "Updated unit {deviceTag}";
```

#### 5. Delete Unit

```javascript
ACTION_TYPES.UNITSPEC_DELETE;
Description: "Deleted unit {deviceTag}";
```

---

### 👤 UserManagement.js

**Imports Needed:**

```javascript
import { useCurrentUser } from "../CurrentUserContext";
import { createUserLog, ACTION_TYPES } from "../services/userLogService";
```

**In Component:**

```javascript
const currentUser = useCurrentUser();
```

**Actions to Log:**

#### 1. Create User

```javascript
ACTION_TYPES.USER_CREATE;
Description: "Created new user {email}";
```

#### 2. Edit User

```javascript
ACTION_TYPES.USER_UPDATE;
Description: "Updated user {email}";
```

#### 3. Delete User

```javascript
ACTION_TYPES.USER_DELETE;
Description: "Deleted user {email}";
```

---

## Implementation Pattern

For each action, use this pattern:

```javascript
try {
  // Perform the action (add, update, delete, etc.)

  // Log to User Logs
  await createUserLog(
    currentUser?.uid,
    currentUser?.displayName || currentUser?.email,
    currentUser?.email,
    ACTION_TYPES.APPROPRIATE_ACTION,
    "Human-readable description of what happened",
    {
      // Relevant data about the action
      key1: value1,
      key2: value2,
    }
  );

  // Show success message
} catch (error) {
  // Handle error
}
```

## Testing Checklist

After implementing all logging:

- [ ] Test each CRUD operation in Assets.js
- [ ] Test each CRUD operation in Inventory.js
- [ ] Test each CRUD operation in Employee.js
- [ ] Test each CRUD operation in Clients.js
- [ ] Test each CRUD operation in UnitSpecs.js
- [ ] Test each CRUD operation in UserManagement.js
- [ ] Verify logs appear in User Logs page
- [ ] Verify log details are correct
- [ ] Verify user information is captured
- [ ] Test filtering by category
- [ ] Test search functionality
- [ ] Test export functionality

## Notes

- Always wrap logging in try-catch to prevent it from breaking the main operation
- Include relevant context in affectedData object
- Use descriptive messages that clearly indicate what action was performed
- Ensure currentUser is available before logging (use optional chaining: currentUser?.uid)
- The logging is non-blocking - if it fails, the main operation should still succeed
