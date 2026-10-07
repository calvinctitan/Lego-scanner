// ─────────────────────────────────────────────────────────────────────────────
// Where the app finds your Legará server (the "backend").
//
// For the free test, leave everything as it is: with no server set, scanning is switched off and
// the app never sends a photo anywhere, so it can't cost anything.
//
// When you set up a server (README, Steps 2 and 3), DON'T type its address in this file. This
// project is on GitHub, and anyone who sees the address could run scans on your Claude account.
// Instead, create a file named .env.local in the mobile folder with this one line:
//
//   EXPO_PUBLIC_BACKEND_URL=https://your-server.vercel.app
//
// .env.local is never uploaded to GitHub. Restart `npx expo start` after creating or changing it.
// (Your Claude API key itself lives only on the server, never in the app.)
// ─────────────────────────────────────────────────────────────────────────────
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://YOUR-BACKEND.vercel.app';
