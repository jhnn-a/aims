# USER LOGS SYSTEM IMPLEMENTATION

## Overview

The User Logs system provides comprehensive tracking of all user activities and system events in AIMS. This ensures security, traceability, and accountability for all transactions.

## Features Implemented

### 1. **User Logs Page** (`/user-logs`)

- **Location**: New sidebar menu item "User Logs" with history icon
- **Access**: Available to all authenticated users
- **Features**:
  - View all system activity logs
  - Search logs by username, email, action, or description
  - Filter by category (Authentication, Device Management, Employee Management, etc.)
  - Filter by time period (Today, Last 7 Days, Last 30 Days, All Time)
  - Export logs to Excel
  - Real-time statistics (Total logs, Filtered results, Auto-deleted count)
  - Pagination (25/50/100/200 logs per page)
  - Auto-cleanup notification for logs older than 30 days

### 2. **Logging Service** (`userLogService.js`)

Located at: `src/services/userLogService.js`

#### Key Functions:

**`createUserLog(userId, userName, userEmail, actionType, description, affectedData)`**

- Creates a new log entry in the system
- Parameters:
  - `userId`: User ID performing the action
  - `userName`: Full name of the user
  - `userEmail`: Email of the user
  - `actionType`: Type of action (use ACTION_TYPES constants)
  - `description`: Human-readable description
  - `affectedData`: Optional object with additional context

**`getAllUserLogs(filters)`**

- Fetches all logs with optional filtering
- Supports filters: userId, actionType, startDate, endDate

**`deleteOldLogs()`**

- Automatically deletes logs older than 30 days
- Returns count of deleted logs
- Should be called periodically (runs on page load)

#### Action Types Supported:

```javascript
// Authentication
LOGIN, LOGOUT;

// Device Management
DEVICE_CREATE, DEVICE_UPDATE, DEVICE_DELETE;
DEVICE_ASSIGN, DEVICE_UNASSIGN, DEVICE_TRANSFER;
DEVICE_IMPORT, DEVICE_EXPORT;

// Employee Management
EMPLOYEE_CREATE, EMPLOYEE_UPDATE, EMPLOYEE_DELETE;
EMPLOYEE_IMPORT, EMPLOYEE_EXPORT;

// Client Management
CLIENT_CREATE, CLIENT_UPDATE, CLIENT_DELETE;

// Unit Specifications
UNITSPEC_CREATE, UNITSPEC_UPDATE, UNITSPEC_DELETE;
UNITSPEC_IMPORT, UNITSPEC_EXPORT;

// User Management
USER_CREATE, USER_UPDATE, USER_DELETE, USER_ROLE_CHANGE;

// Documents
DOCUMENT_GENERATE, DOCUMENT_DOWNLOAD;

// System
SYSTEM_ERROR, SYSTEM_BACKUP;
```

## How to Use

### Example 1: Log a Device Assignment

```javascript
import { createUserLog, ACTION_TYPES } from "../services/userLogService";

// In your device assignment function:
const assignDevice = async (deviceId, employeeId) => {
  // ... your assignment logic ...

  // Create log entry
  await createUserLog(
    currentUser.uid,
    currentUser.displayName,
    currentUser.email,
    ACTION_TYPES.DEVICE_ASSIGN,
    `Assigned device ${deviceTag} to ${employeeName}`,
    {
      resourceType: "device",
      resourceId: deviceId,
      deviceTag: deviceTag,
      employeeId: employeeId,
      employeeName: employeeName,
    }
  );
};
```

### Example 2: Log User Login

```javascript
import { createUserLog, ACTION_TYPES } from "../services/userLogService";

// In your login success handler:
const handleLoginSuccess = async (user) => {
  await createUserLog(
    user.uid,
    user.displayName,
    user.email,
    ACTION_TYPES.LOGIN,
    `User logged in successfully`,
    {
      resourceType: "authentication",
      loginTime: new Date().toISOString(),
    }
  );
};
```

### Example 3: Log Document Generation

```javascript
import { createUserLog, ACTION_TYPES } from "../services/userLogService";

// In your document generation function:
const generateAccountabilityForm = async (deviceId) => {
  // ... your document generation logic ...

  await createUserLog(
    currentUser.uid,
    currentUser.displayName,
    currentUser.email,
    ACTION_TYPES.DOCUMENT_GENERATE,
    `Generated Asset Accountability Form for ${deviceTag}`,
    {
      resourceType: "document",
      documentType: "accountability_form",
      deviceId: deviceId,
      deviceTag: deviceTag,
    }
  );
};
```

### Example 4: Log Bulk Operations

```javascript
import { createUserLog, ACTION_TYPES } from "../services/userLogService";

// In your bulk delete function:
const bulkDeleteDevices = async (deviceIds) => {
  // ... your bulk delete logic ...

  await createUserLog(
    currentUser.uid,
    currentUser.displayName,
    currentUser.email,
    ACTION_TYPES.DEVICE_DELETE,
    `Bulk deleted ${deviceIds.length} devices`,
    {
      resourceType: "device",
      operation: "bulk_delete",
      count: deviceIds.length,
      deviceIds: deviceIds,
    }
  );
};
```

## Integration Checklist

To add logging to an existing feature:

1. **Import the logging service**:

   ```javascript
   import { createUserLog, ACTION_TYPES } from "../services/userLogService";
   import { useCurrentUser } from "../CurrentUserContext";
   ```

2. **Get current user context**:

   ```javascript
   const { currentUser } = useCurrentUser();
   ```

3. **Add log entry after successful operation**:

   ```javascript
   await createUserLog(
     currentUser.uid,
     currentUser.displayName,
     currentUser.email,
     ACTION_TYPES.YOUR_ACTION_TYPE,
     "Description of what happened",
     {
       /* optional additional data */
     }
   );
   ```

4. **Use try-catch for error handling**:
   ```javascript
   try {
     // Your operation
     await createUserLog(/* ... */);
   } catch (error) {
     console.error("Failed to create log:", error);
     // Don't let logging errors break the main operation
   }
   ```

## Data Structure

### Log Entry Schema:

```javascript
{
  id: "auto-generated-id",
  userId: "user-uid",
  userName: "John Doe",
  userEmail: "john@example.com",
  actionType: "device_assign",
  description: "Assigned device PC-001 to Jane Smith",
  affectedData: {
    resourceType: "device",
    resourceId: "device-id",
    deviceTag: "PC-001",
    employeeId: "employee-id",
    employeeName: "Jane Smith",
    timestamp: Timestamp
  },
  timestamp: Timestamp,
  createdAt: Timestamp
}
```

## Automatic Cleanup

- **Retention Period**: 30 days
- **Cleanup Trigger**: Runs automatically when User Logs page is loaded
- **Process**: Batch deletion of logs older than 30 days
- **Performance**: Uses Firebase batch operations for efficient deletion
- **Notification**: Shows count of deleted logs to admin users

## Performance Considerations

1. **Indexed Queries**: Logs are indexed by timestamp for fast retrieval
2. **Pagination**: Limits displayed results to prevent UI slowdown
3. **Batch Operations**: Uses Firebase batch writes for bulk operations
4. **Async Logging**: Log creation is asynchronous and doesn't block main operations
5. **Error Handling**: Logging errors are caught and logged without affecting user operations

## Security

- All logs stored in Firestore with proper security rules
- User information (email, name) stored for audit trail
- No sensitive data (passwords, tokens) should be logged
- Logs are read-only after creation (no updates allowed)
- Access controlled through authentication

## Firebase Security Rules

Add these rules to your Firestore:

```javascript
// User Logs Collection
match /userLogs/{logId} {
  // Only authenticated users can read logs
  allow read: if request.auth != null;

  // Only authenticated users can create logs
  allow create: if request.auth != null
    && request.resource.data.userId == request.auth.uid
    && request.resource.data.timestamp == request.time;

  // No updates or deletes except for cleanup (requires admin)
  allow update, delete: if false;
}
```

## Monitoring and Maintenance

1. **Check logs regularly** for suspicious activity
2. **Export logs monthly** for long-term archival
3. **Monitor storage usage** in Firebase Console
4. **Review cleanup stats** to ensure automatic deletion is working
5. **Add new action types** as new features are developed

## Future Enhancements

- [ ] Advanced filtering (date range picker)
- [ ] User activity heatmap
- [ ] Automated anomaly detection
- [ ] Email alerts for critical actions
- [ ] CSV export in addition to Excel
- [ ] Log retention policy configuration
- [ ] Admin-only view for sensitive logs
- [ ] Integration with external SIEM systems

## Support

For questions or issues with the logging system:

1. Check console logs for error messages
2. Verify Firebase connection and permissions
3. Ensure user is authenticated before logging
4. Check Firestore security rules

## Credits

Developed as part of AIMS (Asset Inventory Management System)
