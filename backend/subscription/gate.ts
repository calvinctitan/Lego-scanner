// SUBSCRIPTION PLAN SKELETON — Part IV: the check before every scan
//
// How this plugs into api/scan.ts later (not done yet, so nothing is limited today):
//   1. Replace MemoryUsageStore with a real database (usage.ts). Memory doesn't work on Vercel.
//   2. The app sends its anonymous user ID with each scan (Part VI).
//   3. Before asking the AI:  const decision = await reserveScan(userId, deps);
//      if (!decision.allowed) return a 429 error with { error: decision.message, limit: decision.reason }.
//      The "limit" field lets the app tell this apart from the existing "Lots of scans right now" 429.
//   4. Then ask the AI. The scan stays counted even if the answer fails, because the AI service still counts it.
//   5. Turn it on: set SCAN_LIMITS=on in Vercel's Environment Variables, then redeploy.

import type { PlanLookup } from './entitlement.js';
import { EVERYONE_SCANS_PER_DAY, PLANS, type Plan, type PlanId } from './plans.js';
import type { Usage, UsageStore } from './usage.js';

export type ScanDecision =
  | {
      allowed: true;
      plan: PlanId;
      /** Scans left after this one (null while limits are off). Show the smaller of the two. */
      scansLeftToday: number | null;
      scansLeftThisMonth: number | null;
    }
  | { allowed: false; plan: PlanId; reason: 'daily-limit' | 'monthly-limit' | 'busy'; message: string };

export type GateDeps = {
  plans: PlanLookup;
  usage: UsageStore;
  /** Only for tests; the real check always uses the server's clock. */
  now?: Date;
  /** Only for tests; normally EVERYONE_SCANS_PER_DAY. */
  everyonePerDay?: number;
};

/** The count for all scans together is kept under this name. */
const EVERYONE = 'everyone';

/** The main switch. Limits stay off unless SCAN_LIMITS is "on" on the server. */
export function limitsAreOn(env: Record<string, string | undefined> = process.env): boolean {
  return ['on', 'true', '1', 'yes'].includes((env.SCAN_LIMITS ?? '').trim().toLowerCase());
}

/** The rule itself: given a plan and someone's counts before this scan, may they scan once more? */
export function decide(plan: Plan, before: Usage): ScanDecision {
  if (before.scansThisMonth >= plan.scansPerMonth) {
    return {
      allowed: false,
      plan: plan.id,
      reason: 'monthly-limit',
      message: `You've used this month's ${plan.scansPerMonth} scans. More next month!`,
    };
  }
  if (before.scansToday >= plan.scansPerDay) {
    return {
      allowed: false,
      plan: plan.id,
      reason: 'daily-limit',
      message: `You've used today's ${plan.scansPerDay} scans. Try again later!`,
    };
  }
  return {
    allowed: true,
    plan: plan.id,
    scansLeftToday: plan.scansPerDay - before.scansToday - 1,
    scansLeftThisMonth: plan.scansPerMonth - before.scansThisMonth - 1,
  };
}

/**
 * Call this BEFORE asking the AI. It counts the scan first and then decides, so scans sent at the
 * same moment can't all slip through. If the scan is refused, the count is taken back off.
 * While limits are off it lets every scan through and counts nothing.
 */
export async function reserveScan(userId: string, deps: GateDeps): Promise<ScanDecision> {
  const planId = await deps.plans.planFor(userId);
  if (!limitsAreOn()) return { allowed: true, plan: planId, scansLeftToday: null, scansLeftThisMonth: null };

  const now = deps.now ?? new Date();
  const mine = await deps.usage.add(userId, now);
  const everyone = await deps.usage.add(EVERYONE, now);
  const before = (u: Usage): Usage => ({ scansToday: u.scansToday - 1, scansThisMonth: u.scansThisMonth - 1 });

  let decision = decide(PLANS[planId], before(mine));
  if (decision.allowed && everyone.scansToday > (deps.everyonePerDay ?? EVERYONE_SCANS_PER_DAY)) {
    decision = { allowed: false, plan: planId, reason: 'busy', message: 'Lots of people are scanning today. Please try again tomorrow!' };
  }
  if (!decision.allowed) {
    await deps.usage.undo(userId, now);
    await deps.usage.undo(EVERYONE, now);
  }
  return decision;
}
