# How to put AGRILINK on Vercel — full basic steps

The site is 100% static (HTML/CSS/JS). No build, no database, no server code.
`vercel.json` in the folder already configures headers + clean URLs.

---

## Method 1 — Vercel CLI (easiest, no GitHub)

### One-time preparation
1. Install Node.js: https://nodejs.org → **LTS** button → install with all defaults.
2. Check: open Terminal (Mac) / Command Prompt (Windows) → type `node -v` → Enter.
   You should see something like `v20.11.0`.
3. Unzip `agrilink-vercel.zip` (e.g. to your Desktop). You get a folder `agrilink`
   containing `index.html`, `css/`, `js/`, `assets/`, `vercel.json`, …

### Deploy
4. Open a terminal **inside** that folder:
   - Windows: open the folder in File Explorer → click the address bar → type `cmd` → Enter.
   - Mac: Terminal → type `cd ` (with a space) → drag the folder into the window → Enter.
5. Log in (first time only):
   ```
   npx vercel login
   ```
   Follow the browser link / enter the code; sign up or log in (email, GitHub or Google).
6. First (preview) deploy:
   ```
   npx vercel
   ```
   Questions → answers:
   - Set up and deploy?            → Y
   - Which scope?                 → (press Enter)
   - Link to existing project?    → N
   - Project name?                → (press Enter)
   - Directory of code?           → (press Enter)
   - Modify settings?             → N

   You get a preview URL like `https://agrilink-abc123.vercel.app` — open it to test.
7. Publish the public production version:
   ```
   npx vercel --prod
   ```
   Your shareable link: `https://agrilink.vercel.app` (or the name you chose).

### Updating later
Replace/add files in the folder, then run `npx vercel --prod` again.

---

## Method 2 — Through the GitHub website (nothing to install)

1. Sign up at https://github.com (free).
2. **+ → New repository** → name `agrilink` → Public → **Create repository**.
3. On the empty repository page click **“uploading an existing file”**.
4. Drag **all contents of the `agrilink` folder** (index.html, css, js, assets,
   vercel.json, netlify.toml, README…) into the upload box → **Commit changes**.
5. Go to https://vercel.com → **Sign Up → Continue with GitHub**.
6. **Add New… → Project** → next to your `agrilink` repository click **Import**.
7. On the settings screen: Framework Preset **Other**; leave *Build Command* and
   *Output Directory* **empty** → **Deploy**.
8. After ~30 s your live URL is shown.

### Updating later
Upload/replace the changed files on GitHub — Vercel redeploys automatically.

---

## After you are live

- Open the URL on a phone → browser menu → **Add to Home screen**:
  it then opens full-screen like a native app (icon, no browser bars).
- Handy links for judges:
  - `/?role=farmer` · `/?role=vendor` · `/?role=customer`
  - `/?role=partner` · `/?role=gov` · `/?role=center`
- Vercel injects **no badge or branding** on your site.
- All data lives in each visitor's browser (localStorage). Nothing is shared
  between visitors; **Farmer → Profile → Reset app data** starts fresh.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `npx: command not found` | Node.js not installed — install from nodejs.org, reopen terminal |
| Login link expired | Run `npx vercel login` again |
| Site shows a file listing | `index.html` is not at the project root — you uploaded the zip or an extra outer folder; upload the folder *contents* |
| Old version showing | Browsers cache: hard-refresh (Ctrl/Cmd+Shift+R); HTML is served with no-cache so a redeploy is instant |
