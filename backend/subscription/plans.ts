// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION PLAN SKELETON — Part I: the plans
//
// This folder is an outline, not a working subscription:
//   - api/scan.ts doesn't use any of it yet, so nothing is limited.
//   - Nothing here charges money, and prices are never written in code (they're set in
//     Apple's App Store Connect later, by a parent; see docs/subscription-plan.md, Part V).
//
// The outline, one file per part:
//   Part I    plans.ts        What each plan includes
//   Part II   usage.ts        Counting each person's scans on the server
//   Part III  entitlement.ts  Knowing which plan a person has
//   Part IV   gate.ts         The check before every scan
//   Part V    (not built)     Upgrading, through Apple, with a parent
//   Part VI   mobile/src/lib/plans.ts   The app's side
// ─────────────────────────────────────────────────────────────────────────────

export type PlanId = 'free' | 'plus';

export type Plan = {
  id: PlanId;
  name: string;
  /** Scans allowed per calendar month, counted by the server's clock (UTC). */
  scansPerMonth: number;
  /** A daily cap too, so one person can't use up a month (or run up a bill) in one sitting. */
  scansPerDay: number;
};

// Placeholder numbers. Change them after you've measured what a real scan costs
// (docs/subscription-plan.md, Part VII).
export const PLANS: Record<PlanId, Plan> = {
  free: { id: 'free', name: 'Free', scansPerMonth: 5, scansPerDay: 3 },
  plus: { id: 'plus', name: 'Legará Plus', scansPerMonth: 75, scansPerDay: 15 },
};
