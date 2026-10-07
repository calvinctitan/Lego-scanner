# Legará

> An app that scan Lego mini figures and finds its value. In addition, users would be able to find figures they want to buy on the app. A fun project made by a student that uses Claude code

Point your iPhone at a LEGO minifigure and Legará tells you what it's worth. There's also a **Marketplace** tab where you can browse typical prices and jump to BrickLink or eBay to buy.

This guide assumes you've never built an app before. Follow the steps in order, and copy the commands exactly.

---

## How it works (the big picture)

```
 iPhone app  ──photo──▶  your backend (on Vercel)  ──photo + secret key──▶  Claude
 (Expo Go)   ◀──price──                             ◀──────── answer ───────
```

- **The app** (`mobile/` folder) runs on your iPhone inside **Expo Go**, a free app that runs projects like this one without going through the App Store.
- **The backend** (`backend/` folder) is one small function that runs online on **Vercel** (free). It holds your **Claude API key** (your secret password for Claude) and passes the photo to Claude.
- Why the extra step? Anything inside an app can be dug out by a determined person. Keeping the key on the backend means it never ships to anyone's phone.

---

## What you need first (one-time setup)

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
4. **A Claude API key**:
   1. Go to <https://platform.claude.com> and sign in (or create an account).
   2. Add some credit under **Billing** ($5 is plenty to start).
   3. Strongly recommended: set a **monthly spend limit** under **Limits** so you can never be surprised by a bill.
   4. Go to **API Keys** → **Create Key**. Copy the key (it starts with `sk-ant-`) and keep it somewhere private for a few minutes. Treat it like a password: never post it or put it in the app's code.
5. **A Vercel account**: sign up free at <https://vercel.com> (signing up with GitHub is easiest).

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

## Step 2: Put the backend online

These commands install the backend's building blocks, then upload it to Vercel.

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

## Step 3: Tell the app where your backend is

Open the file `mobile/src/config.ts` in any text editor (TextEdit or Notepad works; the free [VS Code](https://code.visualstudio.com) is nicer). Replace the placeholder with your address from Step 2:

```ts
export const BACKEND_URL = 'https://legara-backend.vercel.app';
```

Keep the `https://` at the start and don't add `/api/scan` at the end. Save the file. (This address isn't a secret. The secret key stays on Vercel.)

---

## Step 4: Run the app on your iPhone

In the terminal, go from the `backend` folder over to the `mobile` folder, install, and start:

```bash
cd ../mobile
npm install
npx expo start
```

A big QR code appears in the terminal.

1. Make sure your iPhone and computer are on the **same Wi-Fi**.
2. Open the iPhone's **Camera** app, point it at the QR code, and tap the **Open in Expo Go** banner.
3. Legará opens. The first load takes a little while.

While `npx expo start` is running, any change you save to the code shows up on your phone automatically. To stop it, click the terminal and press <kbd>Ctrl</kbd> + <kbd>C</kbd>.

**To run the app again later:** if that terminal is still open in the `mobile` folder, just run `npx expo start`. In a new terminal window, first go into the project folder the same way as in Step 1 (type `cd ` with a space, drag the project folder in, press Enter), then run `cd mobile` and `npx expo start`.

> **Want to see it on your computer too?** While `npx expo start` is running, press <kbd>w</kbd> in the terminal to open the app in your web browser.

> **QR code won't connect?** Stop it with <kbd>Ctrl</kbd> + <kbd>C</kbd> and run `npx expo start --tunnel` instead (say yes if it offers to install something). This works even across different networks.

---

## Using the app

- **Scan tab:** tap **Scan a minifigure** to take a photo (stand the figure on a plain background and fill most of the frame), or **Choose from photos**. After a few seconds you'll see the figure's name, theme, year, rarity, used and new price ranges, and a tip about what affects its value. **Recent sold prices on eBay** shows what that figure actually sold for, and **Find it for sale** opens an eBay search. Your past scans are saved under **My scans**; tap one to see it again, or swipe it to the left to delete it.
- **Marketplace tab:** search, filter by theme, sort, and tap a figure for details. **Buy on BrickLink** and **Buy on eBay** open those sites inside the app. Buying happens on their websites; Legará never handles payments.
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

Save the file and the app refreshes on its own. The prices included are rough starting estimates, so update them as you like.

---

## The hidden daily scan counter

The app quietly counts how many scans you do each day, saved only on your phone. Nothing is limited yet. When you're ready to add "3 free scans per day", the counter and a ready-made `FREE_SCANS_PER_DAY = 3` setting are in `mobile/src/lib/scanCounter.ts`, with a comment showing where the check would go.

---

## What does it cost?

- **Vercel:** free for this.
- **Expo Go:** free.
- **Claude:** you pay per scan. With Claude Opus 5.5 it's roughly **2–5 US cents per scan** (an estimate, since it depends on the photo and how long Claude thinks). The Marketplace tab costs nothing; it never calls Claude. Your spend limit in the Claude Console caps the total.

---

## Troubleshooting

| What you see | What to do |
|---|---|
| "The app doesn't know where your backend is yet" | Do Step 3, save, and the app reloads. |
| "Couldn't reach the Legará server" | Check the address in `mobile/src/config.ts`. Open `https://YOUR-ADDRESS/api/scan` in Safari on your phone; it should say `"ok": true`. |
| "The server isn't set up yet (missing Claude API key)" | Run the `npx vercel env add …` command from Step 2, then `npx vercel --prod` again (key changes only apply after redeploying). |
| "The server's Claude API key isn't working" | Make a new key in the Claude Console. Then, in the `backend` folder, run `npx vercel env rm ANTHROPIC_API_KEY production`, add the new key with `npx vercel env add ANTHROPIC_API_KEY production`, and run `npx vercel --prod`. |
| "Claude couldn't use that request" | Most often your Claude credit has run out. Check **Billing** in the Claude Console. For details, open your project on vercel.com → **Logs**. |
| Expo Go says the project is incompatible | Update Expo Go from the App Store. This project uses Expo SDK 57. |
| The camera won't open | iPhone **Settings** → **Expo Go** → turn on **Camera**. |
| Windows says "running scripts is disabled on this system" | You're in PowerShell. Close it and use **Command Prompt** instead (Start → type `cmd`). |

---

## Keeping things safe

- Your Claude API key lives only in Vercel. Never paste it into the app's code or share it.
- Your backend address is public, so someone who finds it could run scans on your Claude account. That's fine while you're testing, because your monthly spend limit caps the cost.
- Before sharing the app widely, add protection **on the backend**, such as sign-in or a per-person limit checked by the server. The daily scan counter in the app is only a friendly limit for normal users. It runs on the phone, so it can't stop someone who calls your backend directly.

---

## Project map (for when you're curious)

```
backend/
  api/scan.ts            The backend: checks the photo, asks Claude, returns the price JSON
mobile/
  src/config.ts          Your backend address (Step 3)
  src/app/               The screens (each file is a screen)
    (tabs)/index.tsx         Scan tab
    (tabs)/marketplace/      Marketplace list and detail screens
  src/components/        Reusable pieces: Brick, BrickButton, Logo, Baseplate, cards…
  src/data/figures.json  Marketplace figures (edit me!)
  src/lib/               Behind-the-scenes code: talking to the backend, saving scans, the counter
  src/theme/             Colors, fonts, light and dark mode
```

**Behind the scenes:** the backend uses Claude Opus 5.5 with *structured outputs*, which forces Claude's answer into the exact JSON shape the app expects. If one of Claude's safety checks ever wrongly declines a photo, the backend automatically retries on Anthropic's recommended fallback model.
