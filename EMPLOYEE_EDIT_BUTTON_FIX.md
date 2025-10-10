# Employee Edit Action Button Fix

## Issue

The Edit Action Button in Employee.js was showing an error when trying to save employee changes:

```
Error saving employee: Function addDoc() called with invalid data. Unsupported field value: undefined (found in field affectedData.isEntity in document userLogs/...)
```

## Root Cause

The `isEntity` field was being passed as `undefined` to the user logging system in two scenarios:

1. **When editing existing employees**: The original employee data might not have an `isEntity` field, so `form.isEntity` became `undefined`
2. **When adding new employees**: The form initialization for new employees only set `dateHired` but not `isEntity`

## Solution Applied

### 1. Fixed Employee Edit Form Initialization

**File**: `src/pages/Employee.js` - Lines ~6445-6460

**Before**:

```javascript
const formattedEmployee = {
  ...employee,
  dateHired: formatDateForInput(employee.dateHired),
  department: employee.department || "",
  clientId: employee.clientId || "",
  fullName: employee.fullName || "",
  position: employee.position || "",
  ...splitFullName(employee.fullName || ""),
};
```

**After**:

```javascript
const formattedEmployee = {
  ...employee,
  dateHired: formatDateForInput(employee.dateHired),
  department: employee.department || "",
  clientId: employee.clientId || "",
  fullName: employee.fullName || "",
  position: employee.position || "",
  // Ensure isEntity is properly set for employees
  isEntity: employee.isEntity || false,
  ...splitFullName(employee.fullName || ""),
};
```

### 2. Fixed New Employee Form Initialization

**File**: `src/pages/Employee.js` - Lines ~5747-5752

**Before**:

```javascript
onClick={() => {
  setForm({ dateHired: getCurrentDate() });
  setShowForm(true);
}}
```

**After**:

```javascript
onClick={() => {
  setForm({
    dateHired: getCurrentDate(),
    isEntity: false
  });
  setShowForm(true);
}}
```

## Impact

- ✅ Edit Employee button now works without throwing undefined field errors
- ✅ Add Employee button properly initializes with `isEntity: false`
- ✅ User logging for both add and edit operations now receives proper boolean values
- ✅ Entity editing already worked correctly (was setting `isEntity: true` properly)

## Technical Details

### User Logging Structure

The user logging system expects:

```javascript
createUserLog(uid, username, email, actionType, description, affectedData);
```

Where `affectedData` includes:

```javascript
{
  employeeId: form.id,
  employeeName: dataToSave.fullName || dataToSave.description,
  isEntity: form.isEntity, // Must be boolean, not undefined
}
```

### Form State Management

The form state starts as `{}` and is populated when:

- Adding new employee: `{ dateHired: "...", isEntity: false }`
- Adding new entity: `{ description: "", department: "", isEntity: true }`
- Editing employee: `{ ...employee, isEntity: false, ... }`
- Editing entity: `{ ...employee, isEntity: true, ... }`

## Testing

After applying the fix:

1. ✅ Create new employee → No undefined isEntity error
2. ✅ Edit existing employee → No undefined isEntity error
3. ✅ Create new entity → Still works (was already correct)
4. ✅ Edit existing entity → Still works (was already correct)

## Files Modified

- `src/pages/Employee.js` (2 locations fixed)

## Implementation Date

October 9, 2025
