# User Management Guide

Developer documentation for the User Management module.

---

## Navigation

**Path:** Sidebar → Administration → User Management  
**Route:** `/user-management`  
**Access:** Admin only

---

## Features Overview

### 1. User List

| Column  | Description                                           |
| ------- | ----------------------------------------------------- |
| User    | Avatar, username, email, online indicator (green dot) |
| Role    | `admin`, `supervisor`, or `inspector`                 |
| Status  | Toggle switch (Active/Inactive)                       |
| Flags   | Shows "Reset Pending" if first login required         |
| Actions | Edit button + menu with more options                  |

### 2. Filters

- **Search:** Filter by username or email
- **Role:** All / Admin / Supervisor / Inspector
- **Status:** All / Active / Inactive

---

## User Actions

### Create User

1. Click **"Add User"** button
2. Fill in: Role, Username, Email, Initial Password
3. Click **"Create User"**
4. User receives "Reset Pending" flag for first login

### Edit User

1. Click the **pencil icon** on user row
2. Modify: Username, Role, Active status
3. Click **"Save Changes"**

### Toggle Status (Activate/Deactivate)

1. Click the **toggle switch** in Status column
2. Confirm in the modal
3. **If deactivating:** User is immediately logged out

### Delete User

> ⚠️ Only works for **inactive** users

1. First deactivate the user (toggle off)
2. Click **⋮ menu** → **Delete User**
3. Confirm permanent deletion
4. **What happens:**
   - Firebase Auth account deleted
   - Firestore user document deleted
   - Notifications deleted
   - Inspections **preserved** (inspector marked as "Deleted")

### Force Logout

1. Click **⋮ menu** → **Force Logout**
2. User's session is invalidated
3. They see "Session Ended" modal

### Send Password Reset

1. Click **⋮ menu** → **Send Password Reset**
2. Email sent to user with reset link

---

## Audit Logging

All actions are logged to `auditLogs` collection:

- `USER_CREATED`
- `USER_UPDATED`
- `USER_ACTIVATED`
- `USER_DEACTIVATED`
- `USER_DELETED_COMPLETE`
- `FORCE_LOGOUT`
- `PASSWORD_RESET_SENT`

View logs at: **Sidebar → Administration → Audit Logs**

---

## Related Files

| File                                 | Purpose                              |
| ------------------------------------ | ------------------------------------ |
| `src/pages/admin/UserManagement.jsx` | Main UI component                    |
| `src/services/userService.js`        | User CRUD operations                 |
| `src/services/auditService.js`       | Audit logging                        |
| `functions/index.js`                 | Cloud Function for complete deletion |

---

## Cloud Function Deployment

```bash
cd functions
firebase deploy --only functions
```

Required: Firebase Blaze (pay-as-you-go) plan
