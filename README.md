# AGRILINK — working prototype

**Farmer → Inventory Vendor → Delivery Partner → Customer**, with a **Government monitoring dashboard**
and a visible **AI / Algorithm Center**.

Everything runs in the browser on local mock data and local state. There is no backend, no login, no
network call. Every button works and data flows across all five interfaces: a crop photographed by a
farmer becomes a bid, a batch, a 30/70 inventory split, a customer order, an optimised delivery route,
a delivered parcel and a government trace record — all with the same tracking ID.

---

## Run it

```bash
cd agrilink
python3 -m http.server 8080 --bind 0.0.0.0
# open http://localhost:8080
```

(Or just open `index.html` — it works from the file system too.)

Top-right controls, always available:

| Control | What it does |
|---|---|
| **Role switcher** | Farmer · Vendor · Partner · Customer · Government · Algorithm Center. |
| **Health pill** | Live output of Algorithm 4 — `ALL SYSTEMS OPERATIONAL` / `DEGRADED` / `CRITICAL`. |

Reset the app data any time from **Farmer → Profile → Reset app data**; it rebuilds the whole
world (actors, crops, bids, batches, orders, routes, payments, alerts, audit trail) and returns
you to the first-run language screen.

---

## The five interfaces

### 1. Farmer — icon-first, low-literacy friendly
* First-launch **language selector: 13 Indian languages** (English, हिंदी, मराठी, ગુજરાતી, ਪੰਜਾਬੀ, বাংলা,
  தமிழ், తెలుగు, ಕನ್ನಡ, മലയാളം, ଓଡ଼ିଆ, अस्समी, **اردو → RTL**). Changeable any time in Profile → Language;
  the AI assistant speaks the selected language.
* Home grid: Add Crop · My Crops · Interested Vendors · Active Bids · Orders/Sales · Notifications ·
  Tips · AI Assistant · Profile/Settings, plus a live mandi price strip and an AI "do this next" tip.
* **Add Crop** → instruction screen → white camera UI with centre square frame → simulated capture →
  animated AI analysis of **18 attributes** (crop type, quality, freshness, ripeness, damage, disease,
  size, quantity, moisture, location, harvest condition, shelf life, spoilage risk, transport needs,
  transport cost, market demand, suggested price, min/max bid) as visual, **editable** cards.
* **Selling radius** slider + map (5/10/20/30/50/80/100 km) → matching → **maximum 3 vendors** connect.
* Bidding UI: vendor name, distance, pickup time, rating, AI price range, bid, accept/reject.
* Winner selected → **losing vendors are auto-redirected** to other suitable nearby farmers.
* Notifications + AI voice/text assistant.

### 2. Inventory Vendor
* Opportunity feed scored by Algorithm 2 on 8 factors (distance, quality, demand, price fit,
  shelf life vs transit, spoilage risk, transport cost, capacity) with the reasons shown.
* **AI min/max suggested bid**; the slider is constrained to the band and out-of-band bids are rejected.
* Win → **PICKUP** (schedule + simulate handover) → **INVENTORY** batch with farmer source, crop, qty,
  quality, date received, shelf life, reserved/available and full movement log.
* **Hard rule: 30% free / 70% reserved.** The percentage indicator is always visible, the free-sale
  control is capped, a "Try 60% (demo test)" button proves the block, and every attempt raises a
  high-severity government alert.
* Retail price control with a **2× farm-gate guardrail** (kala-bajari screening).
* Orders from reserved stock: confirm → pack → hand to partner.

### 3. Customer
* Grocery-style home: search, categories, radius chips, "available near me", cart bar, track cards.
* Products are **only the reserved 70%**, with price, quality grade, quantity, source traceability
  (farmer, village, vendor, tracking ID) and ETA.
* Cart with quantity steppers and the farmer's share shown.
* **Checkout requires a delivery time slot** (9–11, 11–1, 1–3, 3–5, 5–7) with live capacity, load %,
  free partners and an AI "recommended" flag; a full slot cannot be selected.
* Live tracking: status stepper, route map with every stop, partner details, event log.

### 4. Delivery Partner
* Driver-style home: Available Jobs · Today's Earnings · Active Route · Completed · Notifications.
* Jobs are **grouped by slot, vendor, area, distance, traffic and vehicle capacity** into one
  nearest-neighbour route, shown on a map as Vendor → C1 → C2 → …
* Each job shows optimised km vs individual-trip km, km and % saved, drop count, ETA, load and a full
  earnings breakdown (drop fee + per-km + load bonus + peak-slot bonus).
* Status flow: **Assigned → Going to Vendor → Picked Up → Out for Delivery → Delivered**, with
  per-stop "Mark delivered" and earnings ticking up.

### 5. Government Control Dashboard (professional style)
* **KPIs**: farmers, vendors, partners, customers, total / reserved / in-transit / sold stock, wastage,
  active orders, active bids, completed transactions, revenue.
* **Live pipeline** FARMER → VENDOR → INVENTORY → DELIVERY → CUSTOMER with the quantity at each stage,
  regional movement map, stock distribution charts and a live activity feed.
* **Stock tracking**: trace any batch by unique ID (e.g. `CROP-IND-000124`) — chain of custody across
  six stages, complete movement history, batch ledger, customer orders and related alerts. Also traces
  farmers and vendors.
* **Kala-bajari / black-market watch**: allocation violations, stock mismatch, abnormal price, excess
  movement, duplicate transactions — each alert opens its transaction trail, can be marked reviewed,
  and can freeze the vendor. "Inject anomaly" buttons simulate new cases for demonstration.
* **Pipeline health** (Algorithm 4), **audit trail** with role filters and search, and a
  **registered users** directory with KYC / licence / verification status.

### AI / Algorithm Center
A visible section explaining and **running** all four simulated engines on the current data:
1. **Crop + Price Intelligence** — live 18-attribute analysis, price corridor, spoilage model, formulas.
2. **Matching + Route Optimisation** — live vendor scoring table with weights, route legs, km saved,
   slot capacity.
3. **Security + Compliance** — the 8 checks performed, current violations, engine event log, full sweep.
4. **Pipeline Health Monitor** — continuous checks and the single system-health score.

---

## The journey to walk through

There is no auto-play: you drive it yourself, exactly as a real user would.

Farmer: open the app → pick a language → splash → login → verification → home → tap the green **+** →
Take Photo → shutter → Media Saved → Continue to AI Analysis → 18 attributes → correct quantity /
crop type → Confirm → selling radius (5–50 km) → Find Vendors (max 3 connect) → the lot goes live
with a tracking ID.

Vendor: the lot appears in Opportunities with an AI bid band → bid inside the band (outside is
blocked and reported) → the farmer accepts a winner → losers are redirected to nearby farmers →
Schedule pickup → stock lands in inventory under the 30% free / 70% reserved rule → over-allocation
is blocked → set the retail price (guarded against kala-bajari).

Customer: grocery home → product with full traceability → cart → checkout requires a delivery slot
and a capacity check → track the order live.

Delivery partner: grouped jobs → optimised route on the map → Assigned → Going to Vendor → Picked Up
→ Out for Delivery → every stop Delivered.

Government: KPIs → trace any tracking ID → kala-bajari alerts with trails → pipeline health.
Algorithm Center explains all four engines.

---

## Project layout

```
index.html            app shell, topbar, role switch, boot
css/styles.css        full design system (mobile-first, white/green identity, gov dark chrome, tour UI)
js/i18n.js            13 languages incl. Urdu RTL + AI assistant intent/reply engine
js/seed.js            geography, crop catalogue with SVG art, actors, slots, seeded week of history
js/algo.js            the 4 simulated algorithms + metrics/trace/health
js/store.js           local persistent state and the whole pipeline (30/70 enforcement, alerts, audit)
js/ui.js              UI toolkit: icons, cards, charts, maps, stepper, modal, toast, voice, bind
js/app.js             shell/router: role switch, device frame, tab bar, health pill, reset
js/apps/farmer.js     farmer app
js/apps/vendor.js     inventory vendor app
js/apps/customer.js   customer app
js/apps/delivery.js   delivery partner app
js/apps/gov.js        government control dashboard
js/apps/center.js     AI / Algorithm Center
js/demo.js            the 34-step guided tour + demo controls
tests/smoke.js        headless pipeline test
tests/render.js       headless render sweep (every screen + tag balance + full journey)
tests/dom.js          real-DOM click test in jsdom (boots index.html, runs the tour, clicks everything)
```

Namespace: everything hangs off `window.AG` (`AG.store`, `AG.algo`, `AG.ui`, `AG.app`, `AG.apps`,
`AG.demo`, `AG.I18N`, `AG.catalog`, `AG.util`, `AG.seed`).

---

## Tests

```bash
node tests/smoke.js    # 94 assertions  — pipeline, 30/70 rule, max-3 vendors, redirects, alerts
node tests/render.js   # 278 assertions — every screen renders, no undefined/NaN, tags balanced
node tests/dom.js      # 130 assertions — jsdom: boots the real app, runs the guided tour, clicks
                       #                  every tab, wizard, bid, block, slot, route, trace, language
```

`tests/dom.js` needs jsdom: `npm install jsdom --prefix ~/domtest` (only for testing, not for the app).

---

## Deploying (Vercel)

The site is **100% static** — no build step, no functions, no environment variables, no backend.
`vercel.json` is included and configures everything (clean URLs + security/cache headers).

### Option A — Vercel CLI (fastest)
```bash
cd agrilink
npx vercel            # first run: login, accept defaults (Framework: Other)
npx vercel --prod     # publish to the production URL  →  https://<your-app>.vercel.app
```
No build command, no output directory — Vercel serves the folder as-is.

### Option B — Git integration
1. Push this folder to GitHub/GitLab.
2. vercel.com → **Add New… → Project** → import the repo.
3. Framework Preset: **Other** · Build Command: *leave empty* · Output Directory: *leave empty* → Deploy.
   Every `git push` redeploys automatically.

### Still works on Netlify
`netlify.toml` is kept: Drop the folder/zip on <https://app.netlify.com/drop>, or
`npx netlify-cli deploy --prod --dir .`. (Free-plan projects there show a "Powered by Netlify"
badge — turn it off under Project configuration → General, or rely on the kill-switch in
`index.html`. Vercel injects nothing.)

### What ships with the deploy
| File | Purpose |
|---|---|
| `vercel.json` | clean URLs, security headers, cache policy (HTML/JS/CSS always revalidate so a redeploy is instant; `/assets/*` cached 7 days) |
| `netlify.toml` | same, for Netlify deploys |
| `404.html` | Branded not-found page |
| `site.webmanifest` + `assets/` icons | Installable to the phone home screen (Android + iOS), theme colour, maskable icon, app shortcuts |
| OG / Twitter meta in `index.html` | Link previews when you share the URL; `og:image`/canonical are rewritten to the absolute deploy domain at boot |
| Deep links | `/?role=gov` (or `farmer`, `vendor`, `partner`, `customer`, `center`) opens a role · `/?tab=compliance` opens a section · `/?reset=1` rebuilds the app data |

### Notes
* All state lives in each visitor's browser `localStorage` — every visitor gets their own simulated
  world, and **Profile → Reset app data** rebuilds it. Nothing is shared between visitors and nothing leaves the browser.
* `agrilink-vercel.zip` excludes `tests/` (dev-only). If you deploy from Git, `tests/` is published too;
  they are inert static files.
* Because there is no build, what you see locally is exactly what Vercel serves.
* Phone sizing: the shell is measured against the **visible** viewport (`dvh` + the real topbar height + safe-area insets), so nothing is cut off behind the Chrome/Safari URL or gesture bars.

---

## Simulation notes

* All AI results come from deterministic mock functions seeded by crop, location, quality and weather —
  the app behaves the same every time.
* Maps are generated SVG (no tiles, no network). GPS, payments, notifications and voice are simulated.
* State persists in `localStorage` under one key; **Reset app data** clears and rebuilds it.
* Nothing is production-grade by design: this is a functional prototype for demonstration.
