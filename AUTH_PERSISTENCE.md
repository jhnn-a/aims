# Authentication Persistence

## Overview

The application now preserves the logged-in session across full page refreshes. Previously, refreshing the browser reset the in‑memory `isAuthenticated` flag in `App.js`, forcing the user back to the login screen. We already stored the `currentUser` object in `localStorage` via `CurrentUserContext`, but `App.js` did not derive authentication from it on initial load.

## Implementation Details

1. `App.js` initializes `isAuthenticated` using a lazy `useState` initializer that checks for the presence of `localStorage.currentUser`.
2. Inside `AppContent`, a `useEffect` reasserts authentication (`setIsAuthenticated(true)`) if a `currentUser` exists but `isAuthenticated` is still `false` (covers edge cases where context rehydrates slightly later).
3. A route guard effect redirects an already authenticated user away from `/login` to `/dashboard` if they manually navigate back.
4. Logout now explicitly removes `currentUser` from `localStorage` (defensive cleanup) in addition to clearing React state.

## Files Modified

- `src/App.js`: Added persistence logic, refresh restoration, and improved logout cleanup.
- `AUTH_PERSISTENCE.md`: (this file) Documentation of the behavior.

## Future Hardening (Optional)

- Replace manual Firestore password check with Firebase Auth (`signInWithEmailAndPassword`) for built-in secure session handling.
- Add token expiration / claims validation if using custom auth.
- Integrate `SessionManager` from `utils/security.js` to automatically sign out on inactivity and surface warning modals.
- Encrypt or minimize stored user fields (e.g., omit sensitive fields) in `localStorage`.

## Security Notes

- LocalStorage is readable by any script running in the origin. Do not store raw passwords (currently passwords are compared directly—consider migrating away from storing plaintext).
- Always sanitize and constrain what goes into `currentUser`.

## How It Works at Runtime

1. User logs in successfully -> `handleLogin` sets `currentUser` and `isAuthenticated = true`.
2. `CurrentUserContext` effect persists `currentUser` to `localStorage`.
3. User refreshes page -> `App.js` lazy initializer sees `currentUser` key and sets `isAuthenticated = true` immediately, preventing a flash of the login screen.
4. If user clicks Logout -> state cleared and key removed.

## Testing Steps

1. Log in with valid credentials.
2. Navigate to `/dashboard`.
3. Press browser refresh (F5). Expected: You remain on `/dashboard` with no login prompt.
4. Click Logout in header. Expected: Redirect to login page and subsequent refresh stays on login.
5. Manually navigate to `/login` while authenticated. Expected: Automatic redirect to `/dashboard`.

## Migration Path to Firebase Auth

When ready:

- Replace Firestore query in `LoginPage.js` with Firebase Auth `signInWithEmailAndPassword`.
- Use `onAuthStateChanged(auth, callback)` in a top-level `AuthProvider` to derive `currentUser`.
- Remove manual password storage and validation from Firestore `users` collection.

---

Last updated: (auto-generated)
