# Session Management System - Documentation

## Summary

Implemented comprehensive session management including:

- **Server-side session expiration** (handles browser closures)
- **Concurrent login prevention** (single device at a time)
- **Admin force logout** (kick out unauthorized users)

---

## Files Modified

### 1. useIdleTimer.js

**Path:** `src/hooks/useIdleTimer.js`

**New Features:**

- `userId` parameter for Firestore sync
- `activitySyncInterval` (default: 2 minutes)
- Periodic sync of `lastActivity` to Firestore
- Uses refs for callbacks to avoid stale closures

---

### 2. SessionTimeout.jsx

**Path:** `src/components/Auth/SessionTimeout.jsx`

**Changes:**

- Passes `userId` to `useIdleTimer`
- Clears `sessionToken` and `lastActivity` on logout
- 15-minute timeout with 1-minute warning modal

---

### 3. PrivateRoute.jsx

**Path:** `src/auth/PrivateRoute.jsx`

**New Features:**

- Checks `lastActivity` on app load
- If `Date.now() - lastActivity > 15 min` → force logout
- Handles browser closure: user is logged out when they return after timeout

---

### 4. login.jsx

**Path:** `src/auth/login.jsx`

**Changes:**

- Sets `lastActivity` on successful login
- Stale session detection: `!lastActivity || timeout exceeded`
- Allows login if existing session is expired

---

### 5. header.jsx

**Path:** `src/components/Layout/header.jsx`

**Changes:**

- Manual logout clears both `sessionToken` and `lastActivity`

---

### 6. mainLayout.jsx

**Path:** `src/components/Layout/mainLayout.jsx`

**Changes:**

- Detects force logout: kicks user when Firestore token is `null` or mismatched
- Real-time listener for session invalidation
- Closeable modal with clear messaging

---

### 7. UserManagement.jsx

**Path:** `src/pages/admin/UserManagement.jsx`

**Changes:**

- Force logout clears: `sessionToken`, `lastActivity`, `lastSeen`
- User status (Active/Inactive) preserved
- Force Logout button disabled for offline users

---

## Session Flow

```

User Login
    ↓
Set sessionToken + lastActivity
    ↓
User Active? ──Yes──→ Sync lastActivity every 2 min
    │
    No (14 min)
    ↓
Show Warning Modal
    │
    ├── User responds → Reset timer
    │
    └── No response (1 min) → Auto Logout


Browser Closed
    ↓
Reopen < 15 min → Still Logged In
Reopen > 15 min → Session Expired → Redirect to Login


Admin Force Logout
    ↓
Clear sessionToken + lastActivity + lastSeen
    ↓
User immediately kicked out
    ↓
User can login again
```

---

## Key Logic

### Stale Session Check (login.jsx)

```javascript
const isSessionStale =
  !lastActivity || Date.now() - lastActivity > SESSION_TIMEOUT;
```

- `null` lastActivity = stale (allow login)
- Timeout exceeded = stale (allow login)

### Force Logout Detection (mainLayout.jsx)

```javascript
const shouldForceLogout =
  currentToken && (!firestoreToken || firestoreToken !== currentToken);
```

- Local token exists but Firestore token is `null` = admin force logout
- Tokens mismatch = logged in elsewhere

---

## Testing Checklist

- [ ] Login → close browser → reopen < 15 min → still logged in
- [ ] Login → close browser → reopen > 15 min → logged out
- [ ] Login on Device A → try login on Device B → blocked
- [ ] Login on Device A → wait > 15 min → Device B can login
- [ ] Admin force logout → user kicked immediately
- [ ] After force logout → user can login again

---

## Manual Testing Guide

### Test 1: Idle Timeout Warning Modal

**Purpose:** Verify the warning modal appears before auto-logout.

| Step | Action                                 | Expected Result                                          |
| ---- | -------------------------------------- | -------------------------------------------------------- |
| 1    | Login to the app                       | Successfully logged in                                   |
| 2    | Leave the app idle for 14 minutes      | No action                                                |
| 3    | Wait 1 more minute (total 15 min idle) | Warning modal appears: "Your session is about to expire" |
| 4    | Click "Stay Logged In"                 | Modal closes, timer resets                               |
| 5    | OR ignore the modal for 1 minute       | Auto-logout, redirect to login page                      |

> **Tip:** For faster testing, temporarily change `TIMEOUT_DURATION` in `SessionTimeout.jsx` to `1000 * 60 * 2` (2 minutes).

---

### Test 2: Browser Close + Return Before Timeout

**Purpose:** Verify session persists if user returns quickly.

| Step | Action                             | Expected Result                 |
| ---- | ---------------------------------- | ------------------------------- |
| 1    | Login to the app                   | Successfully logged in          |
| 2    | Close the browser completely       | Browser closed                  |
| 3    | Wait 5 minutes                     | -                               |
| 4    | Reopen browser and navigate to app | Still logged in (session valid) |

---

### Test 3: Browser Close + Return After Timeout

**Purpose:** Verify session expires after timeout.

| Step | Action                             | Expected Result                                     |
| ---- | ---------------------------------- | --------------------------------------------------- |
| 1    | Login to the app                   | Successfully logged in                              |
| 2    | Close the browser completely       | Browser closed                                      |
| 3    | Wait > 15 minutes                  | -                                                   |
| 4    | Reopen browser and navigate to app | Redirected to login, "Session Expired" notification |

> **Tip:** For faster testing, change `SESSION_TIMEOUT` in `PrivateRoute.jsx` to `1000 * 60 * 2` (2 minutes).

---

### Test 4: Concurrent Login Prevention

**Purpose:** Verify only one device can be logged in at a time.

| Step | Action                                      | Expected Result                                              |
| ---- | ------------------------------------------- | ------------------------------------------------------------ |
| 1    | Login on Device A (or Browser A)            | Successfully logged in                                       |
| 2    | On Device B, try to login with same account | Error: "This account is already logged in on another device" |
| 3    | On Device A, logout properly                | Logged out                                                   |
| 4    | On Device B, try to login again             | Successfully logged in                                       |

---

### Test 5: Admin Force Logout

**Purpose:** Verify admin can kick out users remotely.

| Step | Action                                  | Expected Result       |
| ---- | --------------------------------------- | --------------------- |
| 1    | User logs into the app                  | User is logged in     |
| 2    | Admin goes to User Management page      | User list visible     |
| 3    | Admin clicks ⋮ menu on user row         | Menu opens            |
| 4    | Admin clicks "Force Logout"             | Success notification  |
| 5    | User's green dot turns gray immediately | User shows as offline |
| 6    | User sees "Session Ended" modal         | User is kicked out    |
| 7    | User can now login again                | Login successful      |

---

### Test 6: Stale Session Recovery

**Purpose:** Verify login works after session expires naturally.

| Step | Action                              | Expected Result                                    |
| ---- | ----------------------------------- | -------------------------------------------------- |
| 1    | Login on Device A                   | Successfully logged in                             |
| 2    | Wait > 15 minutes (session expires) | Session expired                                    |
| 3    | On Device B, try to login           | Successfully logged in (stale session overwritten) |

---

## Quick Testing Tips

To speed up testing, temporarily modify these values:

```javascript
// SessionTimeout.jsx
const TIMEOUT_DURATION = 1000 * 60 * 2; // 2 minutes instead of 15
const PROMPT_BEFORE = 1000 * 30; // 30 seconds instead of 1 min

// PrivateRoute.jsx
const SESSION_TIMEOUT = 1000 * 60 * 2; // 2 minutes instead of 15

// login.jsx
const SESSION_TIMEOUT = 1000 * 60 * 2; // 2 minutes instead of 15
```

**⚠️ Remember to revert these changes before deploying!**
