// SUBSCRIPTION PLAN SKELETON — Part III: knowing which plan a person has

import type { PlanId } from './plans.js';

export interface PlanLookup {
  planFor(userId: string): Promise<PlanId>;
}

/** Today everyone is on Free, because there's no way to buy Legará Plus yet. */
export const everyoneIsFree: PlanLookup = {
  async planFor() {
    return 'free';
  },
};

// TODO (later, Part V, with a parent): a PlanLookup that asks Apple, usually through a service like
// RevenueCat, whether this person has an active Legará Plus subscription.
// Never believe the app if it says "I paid": only the server's own check counts.
