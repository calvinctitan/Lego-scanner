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
//   Part II   usage.ts        Counting scans on the server
//   Part III  entitlement.ts  Knowing which plan a person has
//   Part IV   gate.ts         The check before every scan
//   Part V    (not built)     Upgrading, through Apple, with a parent
//   Part VI   mobile/src/lib/plans.ts   The app's side
// ─────────────────────────────────────────────────────────────────────────────

export type PlanId = 'free' | 'plus';

export type Plan = {
  id: PlanId;
  /** "Legará Plus" is a placeholder; a paid plan needs the app's new name (README, "Before you promote…"). */
  name: string;
  /** Scans allowed per calendar month. */
  scansPerMonth: number;
  /** A daily cap too, so one person can't use up a month in one sitting. */
  scansPerDay: number;
};

// Placeholder numbers. Change them after you've measured what a real scan costs
// (docs/subscription-plan.md, Part VII).
export const PLANS: Record<PlanId, Plan> = {
  free: { id: 'free', name: 'Free', scansPerMonth: 5, scansPerDay: 3 },
  plus: { id: 'plus', name: 'Legará Plus', scansPerMonth: 75, scansPerDay: 15 },
};

/**
 * The most scans the server will do in one day for everyone together. This is the real guard on
 * cost: someone determined can get past a per-person limit (Part VI), but not past this.
 * Placeholder; set it from your AI service's limit (Cloudflare's free daily allowance, or your Claude spending limit).
 */
export const EVERYONE_SCANS_PER_DAY = 50;
