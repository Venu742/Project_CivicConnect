# CivicConnect — corrected React frontend

## Files
- `App.jsx` — React application component.
- `App.css` — responsive styles used by the component.

## Setup
1. Create or open a React project (Vite is recommended).
2. Put `App.jsx` and `App.css` in the same `src` directory.
3. Make sure `src/main.jsx` imports `App` and renders it.
4. Run `npm install` and then `npm run dev` in your project.

## Demo admin login
- Email: `admin@civicconnect.com`
- Password: `admin123`

These credentials are included only to demonstrate the UI. The login is client-side and is NOT secure. For a real deployment, implement authentication and authorization on a backend.

## Important demo limitations
- Reports are stored in the current browser's `localStorage`; they are not shared between devices or users.
- Uploaded images are stored as data URLs in `localStorage` and limited to 2 MB each. Browser storage has a finite quota.
- Geolocation requires browser permission and usually a secure context (HTTPS or localhost).
- The complaint ID is generated in the browser. A production application should generate IDs and store reports on a server/database.
