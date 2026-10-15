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

- These numbers are placeholders. Set the real ones after Part VII, step 1.
- There's also a cap for **everyone together** (50 scans a day). It's the real guard on cost.
- Prices are never written in the code. They're set later in Apple's App Store Connect.
- "Legará Plus" is a placeholder name. A paid plan needs the app's new name (Part VII).

## II. Counting scans
*Code: `backend/subscription/usage.ts`*

- The **server** counts scans, for each person and for everyone together, by day and by month.
- It uses its own clock (a new day starts at midnight UTC), so changing the phone's date doesn't help.
- The counter inside the app (`mobile/src/lib/scanCounter.ts`) is only for show. Reinstalling the app resets it.
- To-do: keep the counts in a real database (for example Upstash Redis, which has a free plan). The memory version in the code is only for testing.

## III. Knowing who has which plan
*Code: `backend/subscription/entitlement.ts`*

- Today everyone is on Free.
- Later, the server asks Apple whether a person has paid for Plus.
- The server never just believes the app.

## IV. The check before every scan
*Code: `backend/subscription/gate.ts`*

1. A scan arrives. The server looks up the person's plan (Part III).
2. It adds the scan to their count, and to everyone's count, **first**. Then it checks the new numbers. (Checking first and counting after would let many scans sent at the same moment all get through.)
3. If they're over a limit, it takes the scan back off and answers kindly ("Try again later!"). Claude isn't asked, so it costs nothing.
4. If not, it asks Claude. The scan stays counted even if Claude's answer fails, because Claude still charged for it.

None of this runs yet: `api/scan.ts` doesn't call the check. Part VII says what to do before it does.

## V. Upgrading to Plus (not built on purpose)

- Only through **Apple's own payment screen** (In-App Purchase). Apple requires this for features you unlock inside an iPhone app.
- Apple handles the card, the receipt and refunds. Legará never sees card details.
- This needs a **parent or guardian** to own the Apple Developer account, because Apple requires adults for that.
- Expo Go can't do purchases, so this also needs a real app build.

## VI. The app's side
*Code: `mobile/src/lib/plans.ts`*

1. The app makes a random, anonymous ID once and sends it with each scan. No name or email is needed.
   It's kept in the iPhone's Keychain, which usually survives reinstalling the app.
   Be honest about its limits: someone determined can still make up new IDs. That's why the everyone-together cap (Part I) and the Claude spending limit (Part VII) are the real safety net.
2. After each scan, it shows how many scans are left.
3. When the server says a limit is reached, it shows the server's friendly message instead of an error.
4. Later: a Plans screen with Apple's Subscribe button (Part V).

## VII. Before switching anything on

1. Measure what a real scan costs (20–50 test scans), then set the numbers in Part I.
2. Set a monthly spending limit in the Claude Console, as a safety net.
3. Replace the memory counter with a real database (Part II).
4. Connect the check to `api/scan.ts` (the steps are at the top of `backend/subscription/gate.ts`).
5. Protect the server so only the real app can use it (for example Apple's App Attest).
6. Set `SCAN_LIMITS=on` in Vercel's Environment Variables, then redeploy. (Before steps 3 and 4, setting it does nothing.)
7. Before any paid plan: do everything in the README list "Before you promote the website widely, add anything paid, or publish on the App Store". That includes giving the app and its plans a new name, and removing the figure pictures unless the LEGO Group gives written permission.
8. Do Parts V and VI with a parent.
