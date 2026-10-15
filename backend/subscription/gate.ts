// SUBSCRIPTION PLAN SKELETON — Part IV: the check before every scan
//
// How this plugs into api/scan.ts later (not done yet, so nothing is limited today):
//   1. The app sends an anonymous user ID with each scan (Part VI).
//   2. Before asking Claude:   const decision = await checkBeforeScan(userId, deps);
//                              if (!decision.allowed) return a 429 error with decision.message.
//   3. Right after asking Claude, even if the answer was unusable (Claude still charged for it):
//                              await countScan(userId, deps);
//   4. Turn it on by setting SCAN_LIMITS=on in Vercel's Environment Variables.

import type { PlanLookup } from './entitlement.js';
import { PLANS, type Plan, type PlanId } from './plans.js';
import type { Usage, UsageStore } from './usage.js';

export type ScanDecision =
  | { allowed: true; plan: PlanId; scansLeftThisMonth: number }
  | { allowed: false; plan: PlanId; reason: 'daily-limit' | 'monthly-limit'; message: string };

export type GateDeps = {
  plans: PlanLookup;
  usage: UsageStore;
  /** Only for tests; the real check always uses the server's clock. */
  now?: Date;
};

/** The main switch. Limits stay off until SCAN_LIMITS=on is set on the server. */
export function limitsAreOn(env: Record<string, string | undefined> = process.env): boolean {
  return env.SCAN_LIMITS === 'on';
}

/** The rule itself: given a plan and how much someone has scanned, may they scan once more? */
export function decide(plan: Plan, usage: Usage): ScanDecision {
  if (usage.scansThisMonth >= plan.scansPerMonth) {
    return {
      allowed: false,
      plan: plan.id,
      reason: 'monthly-limit',
      message: `You've used this month's ${plan.scansPerMonth} scans. More next month!`,
    };
  }
  if (usage.scansToday >= plan.scansPerDay) {
    return {
      allowed: false,
      plan: plan.id,
      reason: 'daily-limit',
      message: `You've used today's ${plan.scansPerDay} scans. More tomorrow!`,
    };
  }
  return { allowed: true, plan: plan.id, scansLeftThisMonth: plan.scansPerMonth - usage.scansThisMonth };
}

/** Looks up the person's plan and scans so far, then applies the rule. */
export async function checkBeforeScan(userId: string, deps: GateDeps): Promise<ScanDecision> {
  const now = deps.now ?? new Date();
  const plan = PLANS[await deps.plans.planFor(userId)];
  return decide(plan, await deps.usage.get(userId, now));
}

/** Counts one scan. Call it for every scan Claude was asked to do, not only the successful ones. */
export async function countScan(userId: string, deps: GateDeps): Promise<void> {
  await deps.usage.add(userId, deps.now ?? new Date());
}
