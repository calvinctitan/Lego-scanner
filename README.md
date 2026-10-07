# Legará

> An app that scan Lego mini figures and finds its value. In addition, users would be able to find figures they want to buy on the app. A fun project made by a student that uses Claude code

Point your iPhone at a LEGO® minifigure and Legará estimates what it's worth. There's also a **Marketplace** tab: tap a figure and it sends you to BrickLink or eBay to buy it. The buying happens on their websites. Legará doesn't sell anything or take payments.

**This is a private test version.** It isn't on the App Store, and out of the box it costs nothing: scanning stays switched off until you deliberately set up your own server (which costs a few cents per scan).

This guide assumes you've never built an app before. Follow the steps in order, and copy the commands exactly.

---

## Try it on your iPhone today (free)

There are two free ways. Neither one publishes anything.

### Way 1: the Legará preview (no computer needed, scanning works)

Claude made a private web version of Legará for you on claude.ai. Only you can open it.

1. On your iPhone, open the Legará preview link from our chat. You can also find it in the **Claude** app under **Artifacts** → **Legará**, or in Safari while you're signed in to claude.ai.
2. Scanning works here **without any extra cost**: it uses your own Claude plan's normal usage, not an API bill. The first time you scan, Claude asks for your OK.
3. Optional: in Safari, tap **Share** → **Add to Home Screen** to get an icon. You may need to sign in to Claude once more inside it.

Keep it private: don't turn on public sharing for the preview. It's the web version of the app, so your scans are saved in that browser only.

### Way 2: the real app in Expo Go (free, uses your computer)

This runs the actual iPhone app from this project inside **Expo Go**, a free app for testing projects like this one without going through the App Store. Scanning shows as **"scanning is off"** here (that's what keeps it free). Everything else works, including the Marketplace.

**What you need (one time):**

1. **Node.js**: the engine that runs the tools. Download the **LTS** version from <https://nodejs.org> and install it like any other program.
2. **A terminal**: the text window where you type commands.
   - Mac: press <kbd>⌘ Space</kbd>, type **Terminal**, press Enter.
   - Windows: press Start, type **cmd**, and open **Command Prompt**. (Use Command Prompt rather than PowerShell: PowerShell often blocks the `npm` and `npx` commands this guide uses.)

   Check Node worked by typing this and pressing Enter:
   ```bash
   node --version
   ```
   You should see something like `v24.x.x`. Version 24 or newer is ideal (22.13 or newer also works).
3. **Expo Go** on your iPhone: install it from the App Store (search "Expo Go").
4. **A free Expo account**: sign up at <https://expo.dev/signup>. Since Expo SDK 57, Expo Go on a real iPhone only opens your project when your computer and Expo Go are signed in to the **same** Expo account.

**Then:**

1. Get the code onto your computer ([Step 1](#step-1-get-the-code-onto-your-computer) below), so your terminal is inside the project folder. Then come back here.
2. Install and sign in:
   ```bash
   cd mobile
   npm install
   npx expo login
   ```
3. On your iPhone, open **Expo Go**, tap the account icon in the top-right corner, and sign in with the same Expo account.
4. Start it:
   ```bash
   npx expo start
   ```
5. A big QR code appears. With your iPhone on the **same Wi-Fi** as the computer, open the iPhone's **Camera** app, point it at the QR code, and tap **Open in Expo Go**. If your iPhone asks to let Expo Go find devices on your local network, tap **Allow**.

The app stays open in Expo Go while `npx expo start` is running. To stop, click the terminal and press <kbd>Ctrl</kbd> + <kbd>C</kbd>. To run it again later, open a terminal in the project folder and run `cd mobile` then `npx expo start`.

> **QR code won't connect?** On Windows, when the firewall asks about Node.js, allow it on **Private** networks (and make sure your Wi-Fi is set as a private network). Or stop with <kbd>Ctrl</kbd> + <kbd>C</kbd> and run `npm run tunnel` instead (say yes if it offers to install something). That works even across different networks.

> **Want to see it on your computer too?** While `npx expo start` is running, press <kbd>w</kbd> in the terminal to open the app in your web browser.

---

## Step 1: Get the code onto your computer

**Option A (easiest):** On GitHub, open this repository, switch the branch dropdown to **`claude/legara-expo-app`**, click the green **Code** button → **Download ZIP**, and unzip it. Then in your terminal, move into that folder. On a Mac you can type `cd ` (with a space), drag the unzipped folder into the Terminal window, and press Enter.

**Option B (with git):**
```bash
git clone -b claude/legara-expo-app https://github.com/calvinctitan/lego-scanner.git legara
cd legara
```

Either way, your terminal should now be "inside" the project folder, which contains `backend`, `mobile`, and this `README.md`.

---

## Optional: turn on scanning in the real app (costs money)

Skip this whole part if you want the test to stay free. Scanning in the real app needs your own small server, because the secret Claude API key must never be inside the app:

```
 iPhone app  ──photo──▶  your server (on Vercel)  ──photo + secret key──▶  Claude
 (Expo Go)   ◀──price──                            ◀──────── answer ───────
```

- **The server** (`backend/` folder) is one small function that runs online on **Vercel** (free plan, for non-commercial use). It holds your **Claude API key** (your secret password for Claude) and passes the photo to Claude.
- Why the extra step? Anything inside an app can be dug out by a determined person. Keeping the key on the server means it never ships to anyone's phone.

**What it costs:** the Claude API has no free tier. You buy prepaid credit first, and each scan usually uses about **2–5 US cents** of it (a rare, unusually long answer can cost up to about 35 cents). The Marketplace never calls Claude, so it's always free.

**Before you start:**

1. **Age:** the Claude API account (and, later, an Apple developer account) must belong to an adult. If you're under 18, ask a parent or guardian to create it and keep the billing in their name.
2. **A Claude API key**:
   1. Go to <https://platform.claude.com> and sign in (or create an account).
   2. Add a small amount of credit under **Settings → Billing** ($5 is plenty to start).
   3. On the same **Billing** page, under **Spend limits**, click **Set limit** and enter a small number (for example 5). Make sure **Auto-reload** is **off**, so it can never buy more credit by itself.
   4. Go to **API Keys** → **Create Key**. Copy the key (it starts with `sk-ant-`) and keep it somewhere private for a few minutes. Treat it like a password: never post it or put it in the app's code.
3. **A Vercel account**: sign up free at <https://vercel.com> (signing up with GitHub is easiest).

---

## Step 2: Put the server online (optional, for scanning)

These commands install the server's building blocks, then upload it to Vercel.

```bash
cd backend
npm install
npx vercel login
```
`vercel login` opens your browser so you can sign in. Then:

```bash
npx vercel
```
It asks a few questions. Answer like this:
- **Set up and deploy?** → `Y`
- **Which scope?** → pick your account (press Enter)
- **Link to existing project?** → `N`
- **Project name?** → `legara-backend` (or anything you like)
- **In which directory is your code located?** → just press Enter (`./`)
- **Want to modify these settings?** → `N`

Now give the backend your Claude API key. It's stored safely on Vercel, not in your code:
```bash
npx vercel env add ANTHROPIC_API_KEY production
```
Paste your key when asked and press Enter (if it asks whether to mark it as **sensitive**, choose yes).

Finally, publish the real ("production") version, which picks up the key:
```bash
npx vercel --prod
```

**Find your backend's address:** open <https://vercel.com/dashboard>, click your project, and look under **Domains**. It looks like `https://legara-backend.vercel.app` (sometimes with a few extra letters, if that name was taken).

**Test it:** open this in any browser, using your own address:
```
https://legara-backend.vercel.app/api/scan
```
You should see `"ok": true` and `"apiKeyConfigured": true`. 🎉

> If the page asks you to log in to Vercel, you used one of the long addresses with random letters in it. Those are private preview links. Use the short address from **Domains** instead.

---

## Step 3: Tell the app where your server is

Don't type the address into the code: this project is on GitHub, and anyone who sees the address could run scans on your Claude account. Instead:

1. In the `mobile` folder, create a new text file named exactly `.env.local` (with the dot at the start).
2. Put this one line in it, using your address from Step 2:
   ```
   EXPO_PUBLIC_BACKEND_URL=https://legara-backend.vercel.app
   ```
   Keep the `https://` at the start and don't add `/api/scan` at the end.
3. Save it, then restart the app: stop `npx expo start` with <kbd>Ctrl</kbd> + <kbd>C</kbd> and run it again (from the `mobile` folder).

`.env.local` is never uploaded to GitHub. The **"scanning is off"** notice disappears and the scan buttons work.

**Protect your credit:** in your Vercel project, open **Firewall** and add a rate-limit rule for the path `/api/scan` (for example, 5 requests per minute per IP address); the free plan includes one rule. When you're not testing, you can delete the API key in the Claude Console and make a new one later.

---

## Using the app

- **Scan tab** (when scanning is on): tap **Scan a minifigure** to take a photo (stand the figure on a plain background and fill most of the frame), or **Choose from photos**. After a few seconds you'll see the figure's name, theme, year, rarity, used and new price ranges, and a tip about what affects its value. **Recent sold prices on eBay** shows what that figure actually sold for, and **Find it for sale** opens an eBay search. Your past scans are saved under **My scans**; tap one to see it again, or swipe it to the left to delete it.
- **Marketplace tab:** search, filter by theme and sort. **Tap a figure** to choose where to buy it: **Buy on BrickLink** or **Buy on eBay** opens that website's search for the figure in a browser sheet inside the app. You buy there, from that site's sellers; Legará isn't part of the purchase and never handles payments. **More about this figure** shows its price note and a link to recent sold prices.
- **About Legará and legal notices:** at the bottom of both tabs. It has the trademark notice, privacy summary and credits.
- **Dark mode:** follows your iPhone's setting automatically.

---

## Editing the Marketplace figures

All the Marketplace figures live in one file: `mobile/src/data/figures.json`. Each figure looks like this:

```json
{
  "name": "Mr. Gold",
  "theme": "Collectibles",
  "year": 2013,
  "priceUsed": 900,
  "rarity": "Very rare",
  "note": "Only 5,000 were hidden in Series 10 blind bags."
}
```

- `priceUsed` is in US dollars, with no `$` sign or quote marks.
- `rarity` must be exactly one of: `Common`, `Uncommon`, `Rare`, `Very rare`.
- `theme` should be one of: `Star Wars`, `Harry Potter`, `Marvel`, `DC`, `Ninjago`, `City`, `Collectibles`, `Lord of the Rings`, `Classic Space` (so the theme filter and brick color work).
- Keep each name unique. Separate figures with a comma, and don't put a comma after the last one.

Save the file and the app refreshes on its own. The prices included are rough starting estimates, so update them as you like. When you do, also change `PRICES_CHECKED` near the top of `mobile/src/data/figures.ts` (for example to `'March 2027'`), because the app shows that date next to the prices.

---

## The hidden daily scan counter

The app quietly counts how many scans you do each day, saved only on your phone. Nothing is limited yet. When you're ready to add "3 free scans per day", the counter and a ready-made `FREE_SCANS_PER_DAY = 3` setting are in `mobile/src/lib/scanCounter.ts`, with a comment showing where the check would go.

---

## What does it cost?

- **The free test (Way 1 or Way 2):** $0. Expo Go, an Expo account, Node.js and GitHub are free. The Legará preview's scans use your existing Claude plan.
- **Only if you turn on scanning in the real app:** the Claude API is prepaid credit, roughly **2–5 US cents per scan** (rarely up to about 35 cents). Your spend limit and the credit you bought cap the total. Vercel's free plan is fine for this test, but it's for non-commercial use only, so a paid plan would be needed once the app makes money.
- **Not needed for testing:** the Apple Developer Program ($99/year). It's only needed later, to publish on the App Store or to sell subscriptions.

---

## Troubleshooting

| What you see | What to do |
|---|---|
| "Test version: scanning is off" | That's normal for the free test. To scan for free, use the Legará preview (Way 1). To scan in the real app, do the optional Steps 2 and 3. |
| "You need to be signed in to Expo Go and Expo CLI to open your project" (or "…these accounts need to match") | Run `npx expo login` on the computer, sign in to Expo Go on the iPhone (account icon, top-right) with the **same** account, tap **Try Again**, and restart `npx expo start` if needed. |
| Expo Go says the project is incompatible | Update Expo Go from the App Store. This project uses Expo SDK 57. If Expo Go is up to date and still says this, Expo has moved on to a newer SDK and the project needs upgrading: ask Claude to upgrade it. |
| Scanning stays off after adding `.env.local` | Check the file is in the `mobile` folder, is named exactly `.env.local`, and the line starts with `EXPO_PUBLIC_BACKEND_URL=`. Then stop and restart `npx expo start`. |
| "Couldn't reach the Legará server" | Check the address in `mobile/.env.local`. Open `https://YOUR-ADDRESS/api/scan` in Safari on your phone; it should say `"ok": true`. |
| "The server isn't set up yet (missing Claude API key)" | Run the `npx vercel env add …` command from Step 2, then `npx vercel --prod` again (key changes only apply after redeploying). |
| "The server's Claude API key isn't working" | Make a new key in the Claude Console. Then, in the `backend` folder, run `npx vercel env rm ANTHROPIC_API_KEY production`, add the new key with `npx vercel env add ANTHROPIC_API_KEY production`, and run `npx vercel --prod`. |
| "Claude couldn't use that request" | Most often your Claude credit has run out. Check **Billing** in the Claude Console. For details, open your project on vercel.com → **Logs**. |
| The camera won't open | iPhone **Settings** → **Expo Go** → turn on **Camera**. |
| Windows says "running scripts is disabled on this system" | You're in PowerShell. Close it and use **Command Prompt** instead (Start → type `cmd`). |

---

## Keeping it private, safe and legal

- **This GitHub repository is public**, so anyone can read the code. To keep the project unpublished, make it private: on GitHub open the repository → **Settings** → **General** → **Danger Zone** → **Change visibility** → **Private** (free).
- **Never put your Claude API key or your server address in the code.** The key lives only in Vercel, and the address goes in `mobile/.env.local`, which is never uploaded.
- **Inside the app**, *About Legará and legal notices* (at the bottom of both tabs) says that Legará isn't made or endorsed by the LEGO Group, BrickLink or eBay, that buying happens on their websites, that prices are estimates, what happens to your photos, and who made the fonts and icons. The app icon and brick artwork are original (drawn by `mobile/scripts/make-icons.py`), and the Marketplace uses no photos or logos from other websites.
- **The daily scan counter** in the app is only a friendly limit for normal users. It runs on the phone, so it can't stop someone who calls your server directly. That's why the address stays private and the rate limit and spend limit are there.

**Before you ever publish it on the App Store** (not needed for testing), these must change:

1. **The name and look.** "Legará" is very close to LEGO, and the icon and buttons use LEGO-style studded bricks in LEGO's colors. A public app needs its own name and a design without studs, so nobody thinks the LEGO Group made it.
2. **A privacy policy** (a web page) and a clear "your photo will be sent to Anthropic's Claude" question before the first scan. Also rules for children under 13 and teens.
3. **Server protection**: sign-in or a per-person scan limit checked by the server, so strangers can't use up your credit.
4. **Accounts held by an adult**: the Apple Developer Program ($99/year) and the Claude API account.
5. **For the subscription plan:** Apple's In-App Purchase (required for paid features in iPhone apps) and a paid Vercel plan.
6. **Full open-source license notices** in the app.

---

## Project map (for when you're curious)

```
backend/
  api/scan.ts            The backend: checks the photo, asks Claude, returns the price JSON
mobile/
  src/config.ts          Where the app finds your server (reads mobile/.env.local, Step 3)
  src/app/               The screens (each file is a screen)
    (tabs)/index.tsx         Scan tab
    (tabs)/marketplace/      Marketplace list and figure pages
    figure/[id].tsx          A figure's page opened from a scan result
    about.tsx                About Legará and legal notices
  src/components/        Reusable pieces: Brick, BrickButton, Logo, Baseplate, cards, the Buy sheet…
  src/data/figures.json  Marketplace figures (edit me!)
  src/lib/               Behind-the-scenes code: talking to the backend, saving scans, the counter
  src/theme/             Colors, fonts, light and dark mode
  assets/                App icon and splash image (original artwork)
  scripts/make-icons.py  Draws the app icon and splash image
```

**Behind the scenes:** the server uses Claude Opus 5.5 with *structured outputs*, which forces Claude's answer into the exact JSON shape the app expects. If one of Claude's safety checks ever wrongly declines a photo, the backend automatically retries on Anthropic's recommended fallback model.
