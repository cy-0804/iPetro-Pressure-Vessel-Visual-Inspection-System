# Session Timeout Testing Guide

A simple guide to test the session management features.

---

## Test 1: Auto Logout (Idle Timeout)

1. **Login** to the app
2. **Do nothing** for 14 minutes (leave the app idle)
3. **Wait** - A warning modal should appear: "Your session is about to expire"
4. **Option A:** Click "Stay Logged In" → Timer resets, you stay logged in
5. **Option B:** Ignore the modal for 1 minute → You get logged out automatically

✅ **Pass if:** Warning modal appears and auto-logout works

---

## Test 2: Force Logout by Admin

**You need 2 people or 2 browsers for this test.**

### Person A (Admin):

1. Login as **Admin**
2. Go to **User Management**
3. Find the user you want to kick out
4. Click the **⋮ menu** → Click **"Force Logout"**

### Person B (User being kicked):

1. Login as a regular user
2. While logged in, wait for Admin to click Force Logout
3. You should see: **"Session Ended"** modal
4. You are redirected to login page
5. Try logging in again → Should work normally

✅ **Pass if:** User is instantly kicked out and can login again

---

## Test 3: Block Login from Another Device

**You need 2 devices/browsers for this test.**

1. **Device A:** Login with account `testuser`
2. **Device B:** Try to login with the same account `testuser`
3. **Device B** should see: "This account is already logged in on another device"
4. **Device A:** Logout properly
5. **Device B:** Try login again → Should work now

✅ **Pass if:** Second device is blocked while first is active

---

## Test 4: Session Expired After Browser Close

1. **Login** to the app
2. **Close the browser** completely (not just the tab)
3. **Wait more than 15 minutes**
4. **Reopen the browser** and go to the app
5. You should be **redirected to login page**
6. Notification shows: "Session Expired"

✅ **Pass if:** You're logged out after 15+ minutes

---

## Quick Reference

| Feature                         | Timeout    |
| ------------------------------- | ---------- |
| Idle warning                    | 14 minutes |
| Auto logout                     | 15 minutes |
| Session expiry (browser closed) | 15 minutes |

---

## Troubleshooting

**Modal not appearing?**

- Make sure you're truly idle (no mouse movement, no clicks)
- Check browser console for errors

**Can't test concurrent login?**

- Use incognito/private window as second "device"
- Or use different browsers (Chrome + Firefox)

**Force Logout not working?**

- Check if user shows green dot (online)
- Force Logout only works on online users
