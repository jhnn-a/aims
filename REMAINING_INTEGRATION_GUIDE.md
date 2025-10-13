# Quick Integration Guide - UnitSpecs.js and UserManagement.js

## UnitSpecs.js

### ✅ Already Added:

- Imports for `useCurrentUser`, `createUserLog`, `ACTION_TYPES`
- `const currentUser = useCurrentUser();` in component

### Functions That Need Logging:

#### 1. Export Function (search for "handleExport" or "exportToExcel")

Add after successful export:

```javascript
await createUserLog(
  currentUser?.uid,
  currentUser?.displayName || currentUser?.email,
  currentUser?.email,
  ACTION_TYPES.UNITSPEC_EXPORT,
  `Exported ${unitsCount} units to Excel`,
  {
    unitsCount: unitsCount,
    collection: activeTab, // InventoryUnits or DeployedUnits
  }
);
```

#### 2. Import Function (search for "handleImport")

Add after successful import:

```javascript
await createUserLog(
  currentUser?.uid,
  currentUser?.displayName || currentUser?.email,
  currentUser?.email,
  ACTION_TYPES.UNITSPEC_IMPORT,
  `Imported ${successCount} units from Excel`,
  {
    successCount: successCount,
    failedCount: failedCount,
  }
);
```

#### 3. Add Unit Function (search for "handleSave" - create case)

Add after adding new unit:

```javascript
await createUserLog(
  currentUser?.uid,
  currentUser?.displayName || currentUser?.email,
  currentUser?.email,
  ACTION_TYPES.UNITSPEC_CREATE,
  `Added new unit ${form.Tag} to ${addTo}`,
  {
    deviceTag: form.Tag,
    deviceType: form.deviceType,
    collection: addTo,
  }
);
```

#### 4. Edit Unit Function (search for "handleSave" - update case)

Add after updating unit:

```javascript
await createUserLog(
  currentUser?.uid,
  currentUser?.displayName || currentUser?.email,
  currentUser?.email,
  ACTION_TYPES.UNITSPEC_UPDATE,
  `Updated unit ${form.Tag}`,
  {
    deviceTag: form.Tag,
    collection: editCollection,
  }
);
```

#### 5. Delete Unit Function (search for "confirmDelete" or "handleDelete")

Add after deleting unit:

```javascript
await createUserLog(
  currentUser?.uid,
  currentUser?.displayName || currentUser?.email,
  currentUser?.email,
  ACTION_TYPES.UNITSPEC_DELETE,
  `Deleted unit ${unit.Tag}`,
  {
    deviceTag: unit.Tag,
    collection: collection,
  }
);
```

---

## UserManagement.js

### Steps:

1. **Add imports at the top:**

```javascript
import { useCurrentUser } from "../CurrentUserContext";
import { createUserLog, ACTION_TYPES } from "../services/userLogService";
```

2. **Add in component function:**

```javascript
const currentUser = useCurrentUser();
```

### Functions That Need Logging:

#### 1. Create User Function (search for "createUser" or "handleAddUser")

Add after successful user creation:

```javascript
await createUserLog(
  currentUser?.uid,
  currentUser?.displayName || currentUser?.email,
  currentUser?.email,
  ACTION_TYPES.USER_CREATE,
  `Created new user ${newUserEmail}`,
  {
    userEmail: newUserEmail,
    role: role,
  }
);
```

#### 2. Edit User Function (search for "updateUser" or "handleEditUser")

Add after successful user update:

```javascript
await createUserLog(
  currentUser?.uid,
  currentUser?.displayName || currentUser?.email,
  currentUser?.email,
  ACTION_TYPES.USER_UPDATE,
  `Updated user ${userEmail}`,
  {
    userEmail: userEmail,
    changes: changes, // What was changed
  }
);
```

#### 3. Delete User Function (search for "deleteUser" or "handleDeleteUser")

Add after successful user deletion:

```javascript
await createUserLog(
  currentUser?.uid,
  currentUser?.displayName || currentUser?.email,
  currentUser?.email,
  ACTION_TYPES.USER_DELETE,
  `Deleted user ${userEmail}`,
  {
    userEmail: userEmail,
  }
);
```

---

## Pattern to Follow:

For ALL logging additions, use this structure:

```javascript
try {
  // Perform the main action (add, update, delete, etc.)
  await someAction();

  // Log to User Logs (NON-BLOCKING - wrap in try-catch if needed)
  await createUserLog(
    currentUser?.uid,
    currentUser?.displayName || currentUser?.email,
    currentUser?.email,
    ACTION_TYPES.APPROPRIATE_ACTION,
    "Clear description of what happened",
    {
      // Relevant data
      key1: value1,
      key2: value2,
    }
  );

  // Show success message
  showSuccess("Action completed");
} catch (error) {
  // Handle error
  showError("Action failed");
}
```

## Important Notes:

1. **Always use optional chaining** (`currentUser?.uid`) to prevent errors if currentUser is null
2. **Log AFTER the main action succeeds** - never before
3. **Use descriptive messages** - they appear in the User Logs table
4. **Include relevant context** in the affectedData object
5. **Don't block the main operation** - if logging fails, the main action should still work

## Testing After Integration:

1. Perform each action in Unit Specs:

   - Add a unit → Check User Logs
   - Edit a unit → Check User Logs
   - Delete a unit → Check User Logs
   - Import units → Check User Logs
   - Export units → Check User Logs

2. Perform each action in User Management:

   - Create a user → Check User Logs
   - Edit a user → Check User Logs
   - Delete a user → Check User Logs

3. Verify in User Logs page:
   - All actions appear
   - Correct timestamps
   - Correct user attribution
   - Correct action descriptions
   - Search works
   - Filters work
   - Export works
