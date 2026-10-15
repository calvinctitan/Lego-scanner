# Legará subscription plan: the outline

This is a skeleton, like the outline of an essay. It shows how a subscription *would* work.
**Nothing is switched on:** nobody is limited, nothing can be bought, and no money is involved.
Each part points to the matching code skeleton.

---

## I. The plans
*Code: `backend/subscription/plans.ts`*

| Plan | Scans per month | Scans per day |
|---|---|---|
| Free | 5 | 3 |
| Legará Plus | 75 | 15 |

- These numbers are placeholders. Set the real ones after Part VII.
- Prices are never written in the code. They're set later in Apple's App Store Connect.

## II. Counting scans
*Code: `backend/subscription/usage.ts`*

- The **server** counts each person's scans, by day and by month.
- It uses its own clock, never the phone's, so changing the phone's date doesn't help.
- The counter inside the app (`mobile/src/lib/scanCounter.ts`) is only for show. Reinstalling the app resets it.
- To-do: keep the counts in a real database (for example Upstash Redis, which has a free plan).

## III. Knowing who has which plan
*Code: `backend/subscription/entitlement.ts`*

- Today everyone is on Free.
- Later, the server asks Apple whether a person has paid for Plus.
- The server never just believes the app.

## IV. The check before every scan
*Code: `backend/subscription/gate.ts`*

1. A scan arrives. The server looks up the person's plan (Part III) and their count (Part II).
2. If they still have scans left, it asks Claude and adds one to their count.
3. If they don't, it answers kindly ("More tomorrow!") and doesn't ask Claude, so it costs nothing.
4. The whole check stays off until `SCAN_LIMITS=on` is set on the server.

## V. Upgrading to Plus (not built on purpose)

- Only through **Apple's own payment screen** (In-App Purchase). Apple requires this for iPhone apps.
- Apple handles the card, the receipt and refunds. Legará never sees card details.
- This needs a **parent or guardian** to own the Apple Developer account, because Apple requires adults for that.
- Expo Go can't do purchases, so this also needs a real app build.

## VI. The app's side
*Code: `mobile/src/lib/plans.ts`*

1. The app makes a random, anonymous ID once and sends it with each scan. No name or email is needed.
2. It shows "scans left this month".
3. When the limit is reached, it shows the server's friendly message.
4. Later: a Plans screen with Apple's Subscribe button (Part V).

## VII. Before switching anything on

1. Measure what a real scan costs (20–50 test scans), then set the numbers in Part I.
2. Set a monthly spending limit in the Claude Console, as a safety net.
3. Protect the server so only the real app can use it.
4. Do Parts V and VI with a parent.
