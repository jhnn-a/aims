# DeviceHistory Component

A reusable React component for displaying the complete assignment history of devices in the AIMS system.

## Features

- **Complete History**: Shows all device events including assignment, unassignment, returns, and retirements
- **Visual Timeline**: Each action is displayed with appropriate icons and colors
- **Employee Information**: Shows which employee was involved in each action
- **Date/Time Details**: Displays when each action occurred with both date and time
- **Additional Details**: Shows reasons and conditions when available
- **Responsive Design**: Works well on different screen sizes

## Usage

### Basic Usage

```javascript
import DeviceHistory from '../components/DeviceHistory';

// In your component
const [showHistory, setShowHistory] = useState(false);
const [selectedDevice, setSelectedDevice] = useState(null);

// Handler to open history
const handleShowHistory = (device) => {
  setSelectedDevice(device);
  setShowHistory(true);
};

// Handler to close history
const handleCloseHistory = () => {
  setShowHistory(false);
  setSelectedDevice(null);
};

// In your render method
{showHistory && selectedDevice && (
  <DeviceHistory
    deviceTag={selectedDevice.deviceTag}
    deviceId={selectedDevice.id}
    onClose={handleCloseHistory}
  />
)}
```

### Making Device Tags Clickable

```javascript
// In your table cell
<td style={styles.td}>
  <span 
    onClick={() => handleShowHistory(device)}
    style={{
      cursor: "pointer",
      color: "#2563eb",
      textDecoration: "underline",
      transition: "color 0.2s"
    }}
    onMouseEnter={(e) => e.currentTarget.style.color = "#1d4ed8"}
    onMouseLeave={(e) => e.currentTarget.style.color = "#2563eb"}
    title="Click to view device history"
  >
    {device.deviceTag}
  </span>
</td>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `deviceTag` | string | Yes* | The device tag to look up history for |
| `deviceId` | string | Yes* | The device ID to look up history for |
| `onClose` | function | Yes | Callback function called when the modal is closed |

*Note: Either `deviceTag` or `deviceId` must be provided. The component will prefer `deviceTag` if both are available.

## History Actions

The component displays the following types of actions:

- **assigned**: When a device is assigned to an employee
- **unassigned**: When a device is unassigned from an employee
- **returned**: When a device is returned to inventory
- **retired**: When a device is retired from use
- **added**: When a device is first added to the system

## Dependencies

- React (hooks: useState, useEffect)
- Firebase Firestore
- `../services/deviceHistoryService` (for data fetching)

## Styling

The component uses inline styles for complete portability. All colors, spacing, and animations are self-contained and follow a consistent design system.

## Error Handling

The component gracefully handles:
- Missing device tag or ID
- Network errors when fetching data
- Empty history records
- Invalid date formats

## Implementation Notes

### Device History Logging

For the DeviceHistory component to work properly, ensure that all device operations log history entries:

```javascript
import { logDeviceHistory } from '../services/deviceHistoryService';

// When assigning a device
await logDeviceHistory({
  employeeId: employee.id,
  employeeName: employee.fullName,
  deviceId: device.id,
  deviceTag: device.deviceTag,
  action: "assigned",
  date: new Date().toISOString(),
});

// When unassigning a device
await logDeviceHistory({
  employeeId: employee.id,
  employeeName: employee.fullName,
  deviceId: device.id,
  deviceTag: device.deviceTag,
  action: "unassigned",
  date: new Date().toISOString(),
  reason: "Device returned",
  condition: "Working",
});
```

### Integration with Other Pages

The DeviceHistory component can be easily integrated into any page that displays devices:

1. **Inventory Page**: Already integrated - click device tags to view history
2. **Assets Page**: Can be added to view history of assigned devices
3. **Employee Pages**: Can show device history for specific employees
4. **Reports**: Can be embedded in detailed device reports

## Examples

### Assets Page Integration

```javascript
// Add to Assets.js
import DeviceHistory from '../components/DeviceHistory';

// Add state management
const [showDeviceHistory, setShowDeviceHistory] = useState(false);
const [selectedDeviceForHistory, setSelectedDeviceForHistory] = useState(null);

// Add handlers
const handleShowDeviceHistory = (device) => {
  setSelectedDeviceForHistory(device);
  setShowDeviceHistory(true);
};

const handleCloseDeviceHistory = () => {
  setShowDeviceHistory(false);
  setSelectedDeviceForHistory(null);
};

// Make device tags clickable in the table
<td style={styles.td}>
  <span 
    onClick={() => handleShowDeviceHistory(device)}
    style={{ cursor: "pointer", color: "#2563eb", textDecoration: "underline" }}
    title="Click to view device history"
  >
    {device.deviceTag}
  </span>
</td>

// Add the component to the render method
{showDeviceHistory && selectedDeviceForHistory && (
  <DeviceHistory
    deviceTag={selectedDeviceForHistory.deviceTag}
    deviceId={selectedDeviceForHistory.id}
    onClose={handleCloseDeviceHistory}
  />
)}
```

## Future Enhancements

Potential improvements for the DeviceHistory component:

1. **Export Functionality**: Allow users to export device history as PDF or Excel
2. **Filtering**: Add date range filters or action type filters
3. **Search**: Search within history entries
4. **Bulk Operations**: View history for multiple devices at once
5. **Print View**: Optimized layout for printing
6. **Employee Links**: Click employee names to view their device history
7. **Audit Trail**: More detailed audit information including who made changes
