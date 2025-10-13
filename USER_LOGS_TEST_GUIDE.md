# 🎯 User Logs - Quick Test Guide

## How to Test the User Logs System

### Step 1: Perform Actions in AIMS

Go to any of these pages and perform actions:

#### **Assets Page** (`/assets`)

- [ ] Unassign a device from an employee
- [ ] Delete deployed devices (bulk or single)
- [ ] Reassign devices to another employee
- [ ] Export to Excel

#### **Inventory Page** (`/inventory`)

- [ ] Add a new device
- [ ] Edit an existing device
- [ ] Delete a device
- [ ] Export inventory to Excel

#### **Employee Page** (`/employee`)

- [ ] Add a new employee
- [ ] Edit an employee
- [ ] Resign an employee
- [ ] Import employees from Excel
- [ ] Export employees to Excel

#### **Clients Page** (`/clients`)

- [ ] Add a new client
- [ ] Edit a client
- [ ] Delete a client
- [ ] Export clients to Excel

#### **Unit Specs Page** (`/unit-specs`)

- [ ] Import units from Excel
- [ ] Export units to Excel

#### **User Management Page** (`/user-management`)

- [ ] Create a new user
- [ ] Edit a user
- [ ] Delete a user

---

### Step 2: Check User Logs

Navigate to **User Logs** page (`/user-logs`)

You should see:

- ✅ Your recent actions listed
- ✅ Correct timestamps
- ✅ Your name/email as the user
- ✅ Accurate action descriptions
- ✅ Action categories (Device Management, Employee Management, etc.)

---

### Step 3: Test Filtering & Search

#### **Test Search:**

1. Type part of a device tag, employee name, or action in the search bar
2. Results should filter in real-time
3. Clear search to see all logs again

#### **Test Category Filter:**

1. Click "All Categories" dropdown
2. Select a specific category (e.g., "Device Management")
3. Should show only logs from that category
4. Select "All Categories" to see everything

#### **Test Date Filter:**

1. Click "All Time" dropdown
2. Select "Today" - should show only today's logs
3. Select "Last 7 Days" - should show this week's logs
4. Select "Last 30 Days" - should show this month's logs
5. Select "All Time" to see everything

---

### Step 4: Test Export

1. Click the **Export** button
2. An Excel file should download
3. Open the file
4. Verify it contains:
   - Timestamps
   - User names/emails
   - Action types
   - Descriptions
   - Categories

---

### Step 5: Check Statistics

Look at the statistics cards at the top:

- **Total Logs** - Should show all logs
- **Today** - Should show logs from today
- **This Week** - Should show logs from this week
- **This Month** - Should show logs from this month

---

## Expected Results

### ✅ What Should Happen:

- Every action you perform gets logged immediately
- Logs appear in the User Logs page within seconds
- Search and filters work smoothly
- Statistics update automatically
- Export creates a proper Excel file
- User information is accurate (your name/email)
- Timestamps are correct

### ❌ If Something's Wrong:

1. Check browser console for errors
2. Verify you're logged in with a valid user account
3. Check that Firebase is connected
4. Refresh the User Logs page
5. Try performing the action again

---

## Quick Visual Check

When you open User Logs, you should see:

```
┌─────────────────────────────────────────────────────────┐
│  USER LOGS                                              │
├─────────────────────────────────────────────────────────┤
│  📊 Total: 45  📅 Today: 5  📆 Week: 12  📈 Month: 32  │
├─────────────────────────────────────────────────────────┤
│  [Search logs... 🔍]  [All Categories ▼]  [All Time ▼] │
│  [Export 📥]                                            │
├─────────────────────────────────────────────────────────┤
│  Timestamp       User        Category          Action   │
│  Oct 8, 3:45 PM  John Doe    Device Mgmt      Added... │
│  Oct 8, 3:40 PM  Jane Smith  Employee Mgmt    Updated..│
│  Oct 8, 3:35 PM  John Doe    Client Mgmt      Deleted..│
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Common Test Scenarios

### Scenario 1: Device Management Flow

1. Go to Inventory → Add a device → Name it "TEST-DEVICE-001"
2. Go to User Logs → Search "TEST-DEVICE-001"
3. Should see: "Added new device TEST-DEVICE-001 to inventory"

### Scenario 2: Employee Management Flow

1. Go to Employee → Add employee → Name "Test Employee"
2. Edit the employee → Change department
3. Go to User Logs → Filter by "Employee Management"
4. Should see both "Added" and "Updated" actions

### Scenario 3: Export & Import Flow

1. Go to any page → Export to Excel
2. Go to User Logs → Should see "Exported X items"
3. Import data back
4. Go to User Logs → Should see "Imported X items"

---

## Performance Check

The User Logs system should:

- Load quickly (< 2 seconds)
- Search responds instantly (< 500ms)
- Filters apply immediately
- Pagination is smooth
- Export completes within 3-5 seconds

---

## Troubleshooting

### Problem: "Logs not appearing"

**Solution:**

- Check if you're logged in
- Refresh the page
- Check browser console for errors
- Verify Firebase connection

### Problem: "Search not working"

**Solution:**

- Clear the search box and try again
- Check spelling
- Try filtering by category first

### Problem: "Export button doesn't work"

**Solution:**

- Check browser's download settings
- Allow pop-ups if blocked
- Try again with fewer filters applied

---

## Success Criteria ✅

Your User Logs integration is successful if:

1. ✅ All actions across 6 pages are logged
2. ✅ Logs appear immediately after actions
3. ✅ Search and filters work correctly
4. ✅ Statistics are accurate
5. ✅ Export creates valid Excel files
6. ✅ User information is captured correctly
7. ✅ No errors in console
8. ✅ Performance is smooth

---

**Quick Test Time:** ~15 minutes
**Full Test Time:** ~30 minutes

🎉 **You're all set! The User Logs system is fully operational!**
