// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION PLAN SKELETON — Part VI: the app's side
//
// An outline only: nothing in the app uses this file yet, nothing is limited, and nothing costs
// money. The server makes the real decisions (backend/subscription/); the app just shows them.
// The whole plan, in plain English: docs/subscription-plan.md
// ─────────────────────────────────────────────────────────────────────────────

export type PlanId = 'free' | 'plus';

/** Keep these names the same as in backend/subscription/plans.ts. */
export const PLAN_NAMES: Record<PlanId, string> = {
  free: 'Free',
  plus: 'Legará Plus',
};

/** Today everyone is on Free, because there's no way to buy Legará Plus yet. */
export function getMyPlan(): PlanId {
  return 'free';
}

// TODO (later) — the rest of the app's side, in order:
//   1. An anonymous ID: a random code made once and sent with each scan, so the server can count
//      scans per person. No name, email or account needed. Save it in the iPhone's Keychain
//      (the expo-secure-store package), not AsyncStorage, because the Keychain usually keeps it
//      when the app is reinstalled. It still isn't proof: someone determined can make up new IDs,
//      which is why the server also has a cap for everyone together (EVERYONE_SCANS_PER_DAY).
//   2. After each scan, show the smaller of the server's "scansLeftToday" and "scansLeftThisMonth".
//   3. When the server refuses with a 429 that has a "limit" field, show its message instead of an
//      error screen (and no "Try again" button, since trying again won't help).
//   4. A Plans screen with Apple's own "Subscribe" button (Part V). That needs a parent's Apple
//      Developer account and a real app build, because Expo Go can't do purchases.
