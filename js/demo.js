/* ============================================================
   AGRILINK — DEMO MODE
   • The complete 34-step guided journey (auto-play, captioned)
   • Reset / replay controls
   Drives the REAL UI: it taps the same buttons a user would tap,
   so every screen and every rule is exercised live.
   ============================================================ */
(function (g) {
  'use strict';
  const AG = g.AG, U = AG.ui, S = AG.store;
  const { icon, esc, money, money1, kg, km, pill } = U;

  /* ---------- tiny helpers ---------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const wait = ms => sleep(AG.app.speed(ms));
  /* real-time pause so a screen painted via requestAnimationFrame is actually in the DOM
     before the next simulated tap (matters when app.speed is overridden in tests) */
  const settle = (ms) => sleep(ms || 40);
  const q = s => document.querySelector(s);
  const qa = s => Array.prototype.slice.call(document.querySelectorAll(s));
  const go = (role, tab, params) => AG.app.go(role, tab, params || {});

  /** Tap a real [data-act] element inside the app screen. */
  function tap(act, match, nth) {
    const nodes = qa('#screen [data-act]').filter(n => n.dataset.act === act || n.dataset.act.split('@')[0] === act);
    let list = nodes;
    if (match) list = nodes.filter(n => Object.keys(match).every(k => String(n.dataset[k]) === String(match[k])));
    const t = list[nth || 0] || nodes[nth || 0];
    if (!t) return false;
    try { t.scrollIntoView({ block: 'center' }); } catch (e) { }
    t.click();
    return true;
  }
  function modalBtn(i) { const b = qa('.modal-f .btn'); if (b[i == null ? b.length - 1 : i]) { b[i == null ? b.length - 1 : i].click(); return true; } return false; }
  function setPersona(role, id) {
    if (role === 'farmer') { S.setCurrentFarmer(id); S.state.role = 'farmer'; }
    else { S.state['current' + role[0].toUpperCase() + role.slice(1)] = id; S.state.role = role; }
    S.state.welcomed = true; S.save();
  }
  const newCrop = () => S.state.crops[0];
  const ctx = {};

  /* ============================================================
     THE 34-STEP JOURNEY
     Each chapter = one step of the journey. Chapters contain
     "beats": a caption + the action that makes it real.
     ============================================================ */
  const CHAPTERS = [
    /* 1 */ {
      role: 'farmer', title: 'Farmer opens AGRILINK', steps: [
        {
          t: 'First launch: choose your language', n: 'Vijay Pawar, a farmer in Saswad, Pune district, opens the app. One question first — your language. 13 Indian languages; Urdu flips the layout to right-to-left. Everything is local mock data.',
          run: async () => { setPersona('farmer', 'F-6'); go('farmer', 'language'); }, sel: '.langgrid'
        },
        {
          t: 'English selected', n: 'Applied instantly to every screen — and to the AI voice assistant. Language can be changed any time from Profile.',
          run: async () => { if (!tap('pickLang', { code: 'en' })) S.setLang('en'); await wait(700); go('farmer', 'home'); }
        },
        {
          t: 'Splash → Login (simulated)', n: 'A simple welcome, then a familiar mobile-number + password login. In this prototype nothing is sent anywhere.',
          run: async () => { S.state.onboard = { splash: false, loggedIn: false, verified: false }; S.save(); go('farmer', 'home'); await wait(500); await settle(); tap('splashGo'); await wait(800); await settle(); tap('login'); await wait(800); await settle(); }, sel: '.vf2'
        },
        {
          t: 'Verification', n: 'Three checks a farmer sees before entering: mobile number · Aadhaar / Farmer ID · GPS location. All simulated here.',
          run: async () => { await settle(); tap('verifyGo'); await wait(900); }, sel: '.f2-head'
        }
      ]
    },
    /* 2 */ {
      role: 'farmer', title: 'A home screen anyone can read', steps: [
        { t: 'Greeting + weather', n: 'Good morning, Vijay. Today\u2019s temperature, rain and a one-line advisory — no numbers to interpret.', sel: '.w2card' },
        { t: 'Four big Quick Actions', n: 'Add New Crop · My Crops · Market Prices · Weather. Large icons, minimal text, designed for first-time smartphone users.', sel: '.qa2' },
        { t: 'Today, in five rows', n: 'Active bids · interested vendors · orders & sales · AI assistant · tips. One tap each.', sel: '.l2card' },
        { t: 'Live simulated world', n: '12 farmers · 7 vendors · 5 delivery partners · 10 customers, with a week of seeded history so every dashboard is never empty.' }
      ]
    },
    /* 3 */ {
      role: 'farmer', title: 'Tap the green “+” button', steps: [
        {
          t: 'Add New sheet', n: 'No forms anywhere. A bottom sheet with three big choices: Take Photo · Record Video · Choose from Gallery.',
          run: async () => { tap('startAdd') || go('farmer', 'add'); }, sel: '.sh2'
        },
        {
          t: 'Take Photo', n: 'One photo is enough — the AI does the rest.',
          run: async () => { tap('openCamera') || go('farmer', 'add_camera'); }, sel: '.cm2'
        }
      ]
    },
    /* 4 */ {
      role: 'farmer', title: 'Camera → Media Saved', steps: [
        { t: 'Centre square frame', n: 'Frame the crop inside the white square. Big shutter, Photo/Video switch, flash and flip — a camera layout everyone already knows.', sel: '.cm2-frame' },
        {
          t: 'Shutter', n: 'Photo Captured! Simulated here — in production this is the device camera feeding the vision model.',
          run: async () => { tap('shoot'); await wait(700); }, sel: '.cm2-done'
        },
        {
          t: 'Media Saved!', n: 'The photo is stored on the farm record. Continue to AI analysis, add another, or go home.',
          run: async () => { await wait(1200); if (AG.app.currentNav().tab !== 'add_saved') go('farmer', 'add_saved'); }, sel: '.sv2'
        },
        {
          t: 'Continue to AI Analysis', n: 'One big green button — the only decision on this screen.',
          run: async () => { tap('goAnalyse'); await wait(500); }
        }
      ]
    },
    /* 5 */ {
      role: 'farmer', title: 'AI analyses the crop', steps: [
        { t: 'AGRILINK Vision-Agri (simulated)', n: 'The engine extracts 18 attributes from the photo and the farm location, one by one.', sel: '.an2-list' },
        {
          t: '18 attributes', n: 'Crop type · quality · freshness · ripeness · damage · disease · size · quantity · moisture · location · harvest condition · shelf life · spoilage risk · transport needs · transport cost · market demand · suggested price · min\u2013max bid.',
          run: async () => { await wait(3000); if (AG.app.currentNav().tab === 'add_analyzing') go('farmer', 'add_result'); }
        }
      ]
    },
    /* 6 */ {
      role: 'farmer', title: 'Review — every value is editable', steps: [
        { t: 'AI result card', n: 'Detected crop, grade, quality score and AI confidence — with the alternatives the AI also considered.', sel: '.r2card' },
        { t: 'Set quantity to 900 kg', n: 'Big +/\u2212 stepper and quick chips — no typing.', run: async () => { tap('qtySet', { q: 900 }); await wait(600); }, sel: '.q2row' },
        { t: 'Confirm', n: 'A unique tracking ID (CROP-IND-######) is created for this lot.', run: async () => { tap('confirmResult'); await wait(900); ctx.cropId = newCrop() && newCrop().id; } }
      ]
    },
    /* 7 */ {
      role: 'farmer', title: 'Choose selling radius', steps: [
        { t: 'Radius slider + live map', n: '5 / 10 / 20 / 30 / 50 km. Vendors inside the radius light up on the map immediately.', sel: '.slider' },
        { t: '30 km selected', n: 'Wider radius = more vendors, but longer transit and higher spoilage risk. Algorithm 2 balances this.', run: async () => { tap('radSet', { r: 30 }); await wait(700); } }
      ]
    },
    /* 8 */ {
      role: 'farmer', title: 'Algorithm 2 finds vendors — MAX 3', steps: [
        { t: 'Scanning registered vendors', n: 'Scored on distance, quality, demand, price fit, shelf life vs transit, spoilage risk, transport cost and available capacity.', run: async () => { tap('findVendors') || go('farmer', 'add_matching'); } },
        { t: 'Only 3 vendors connect', n: 'Hard rule: a maximum of 3 vendors may connect and bid on one farmer\u2019s crop — this prevents cartel behaviour and keeps bidding fair.', sel: '#matchBody' },
        { t: 'Send the lot', n: 'The 3 vendors get a simulated notification with the AI price band.', run: async () => { await wait(1200); tap('sendVendors'); await wait(900); } }
      ]
    },
    /* 9 */ {
      role: 'farmer', title: 'Lot is live with a tracking ID', steps: [
        {
          t: 'Open lot', n: 'Status: bidding. Everything from here is traceable by this ID — farmer, vendor, inventory, delivery and customer.',
          run: async () => { const c = S.crop(ctx.cropId) || newCrop(); ctx.cropId = c.id; ctx.track = c.trackingId; go('farmer', 'crop', { id: c.id }); }
        },
        { t: 'AI price band shown to everyone', n: 'Vendors must bid inside it. Algorithm 3 rejects anything outside — protecting farmers from under-payment and customers from price gouging.', sel: '.priceband' }
      ]
    },
    /* 10 */ {
      role: 'farmer', title: 'Notifications + AI assistant in your language', steps: [
        {
          t: 'Farmer notifications', n: 'Every bid, win, pickup and payment lands here in plain language.',
          run: async () => { go('farmer', 'notifications'); }, sel: '.l2card'
        },
        {
          t: 'Ask the AI assistant', n: 'Voice or text, in the chosen language — price, bids, quality or market. Answers come from the live simulated data, not canned text.',
          run: async () => { go('farmer', 'assistant'); await wait(500); tap('quick', { i: 0 }); await wait(1200); }, sel: '.chat2'
        }
      ]
    },
    /* 11 */ {
      role: 'vendor', title: 'Vendor receives the opportunity', steps: [
        {
          t: 'Switch to the vendor app', n: 'Same pipeline, different interface. The vendor sees the new lot as a scored opportunity.',
          run: async () => { const c = S.crop(ctx.cropId); const vid = c && c.notifiedVendors[0]; ctx.vendorId = vid; setPersona('vendor', vid); go('vendor', 'home'); }
        },
        { t: 'Opportunity feed', n: 'Matched by distance, quality, demand, price, shelf life, spoilage risk, transport need and remaining capacity.', run: async () => { go('vendor', 'opportunities'); }, sel: '.oppcard' },
        {
          t: 'Open the lot', n: 'Match score with the exact factors behind it.',
          run: async () => { tap('openOpp', { id: ctx.cropId }) || go('vendor', 'opportunity', { id: ctx.cropId }); }
        }
      ]
    },
    /* 12 */ {
      role: 'vendor', title: 'AI min / max suggested bid', steps: [
        { t: 'Bid corridor', n: 'Algorithm 1 suggests a fair band from grade, demand, shelf life and spoilage risk. The slider is constrained to that band.', sel: '.priceband' },
        {
          t: 'Try to bid outside the band', n: 'Algorithm 3 blocks it and logs the attempt.',
          run: async () => {
            const c = S.crop(ctx.cropId), band = AG.algo.bidBand(c);
            const bad = S.placeBid(c.id, ctx.vendorId, Math.round(band.max * 1.8 * 10) / 10, 'tour test');
            U.toast(bad.ok ? 'Bid placed' : 'BLOCKED · ' + bad.message, bad.ok ? 'good' : 'warn', 3600);
            await wait(1500);
          }
        },
        {
          t: 'Bid inside the band', n: 'Vendor offers a competitive price; the farmer is notified instantly.',
          run: async () => {
            const c = S.crop(ctx.cropId), band = AG.algo.bidBand(c);
            const price = Math.round((band.suggested * 1.02) * 10) / 10;
            const r = S.placeBid(c.id, ctx.vendorId, price, 'Same-day pickup from my tempo');
            ctx.bid1 = r.bid && r.bid.id;
            U.toast('Bid placed · ' + money1(price) + '/kg', 'good'); await wait(700); AG.app.refresh(true);
          }
        }
      ]
    },
    /* 13 */ {
      role: 'vendor', title: 'A second vendor competes', steps: [
        {
          t: 'Switch persona', n: 'The second invited vendor raises the bid — real competition, no back-room dealing.',
          run: async () => { const c = S.crop(ctx.cropId); ctx.vendor2 = c.notifiedVendors[1] || c.notifiedVendors[0]; setPersona('vendor', ctx.vendor2); go('vendor', 'opportunity', { id: c.id }); }
        },
        {
          t: 'Higher bid placed', n: 'Both bids now sit on the farmer’s screen with distance, pickup time and rating.',
          run: async () => {
            const c = S.crop(ctx.cropId), band = AG.algo.bidBand(c);
            const price = Math.round(band.suggested * 1.09 * 10) / 10;
            const r = S.placeBid(c.id, ctx.vendor2, price, 'Cold-storage available, pickup in 2 hrs');
            ctx.bid2 = r.bid && r.bid.id;
            U.toast(S.vendor(ctx.vendor2).name + ' bids ' + money1(price) + '/kg', 'good'); await wait(600); AG.app.refresh(true);
          }
        }
      ]
    },
    /* 14 */ {
      role: 'farmer', title: 'Farmer reviews active bids', steps: [
        { t: 'Back to the farmer', n: 'Two live bids. Each card shows vendor name, distance, pickup time, rating, AI price range and the bid itself.', run: async () => { setPersona('farmer', 'F-6'); go('farmer', 'bids'); }, sel: '.bidcard' },
        { t: 'Open the lot', n: 'The AI marks the strongest bid so a first-time user cannot go wrong.', run: async () => { go('farmer', 'crop', { id: ctx.cropId }); }, sel: '.bidcard.best' }
      ]
    },
    /* 15 */ {
      role: 'farmer', title: 'Farmer selects the winning vendor', steps: [
        {
          t: 'Accept the best bid', n: 'One tap. Payment is simulated and settled to the farmer; the vendor is told to pick up.',
          run: async () => {
            const c = S.crop(ctx.cropId);
            const best = c.bids.filter(b => b.status === 'open').sort((a, b) => b.price - a.price)[0];
            const res = S.acceptBid(c.id, best.id);
            ctx.winBid = best.id; ctx.winner = best.vendorId; ctx.redirects = res.redirects || [];
            U.toast('Winner: ' + S.vendor(best.vendorId).name + ' @ ' + money1(best.price) + '/kg', 'good', 3200);
            await wait(900); AG.app.refresh(true);
          }
        }
      ]
    },
    /* 16 */ {
      role: 'vendor', title: 'Losing vendors are redirected, not dropped', steps: [
        {
          t: 'Auto-redirect', n: 'Algorithm 2 immediately pushes each losing vendor to other nearby farmers with suitable lots — nobody idles, no stock rots.',
          run: async () => {
            const r = ctx.redirects[0];
            if (r) { setPersona('vendor', r.vendorId || r.vendor && r.vendor.id); go('vendor', 'opportunities'); }
            else { setPersona('vendor', ctx.vendorId); go('vendor', 'opportunities'); }
          }
        },
        { t: 'Fresh opportunities', n: 'These lots come from other farmers inside the vendor’s reach, re-scored for quality and capacity.', sel: '.oppcard' }
      ]
    },
    /* 17 */ {
      role: 'farmer', title: 'Sale recorded for the farmer', steps: [
        {
          t: 'Orders / Sales', n: 'Income, buyer, pickup ETA and the tracking ID are all on one card. Payment settled by UPI (simulated).',
          run: async () => { setPersona('farmer', 'F-6'); go('farmer', 'orders'); }
        },
        {
          t: 'Farmer earnings', n: 'Every rupee is traceable back to this lot in the government dashboard.',
          run: async () => { go('farmer', 'crop', { id: ctx.cropId }); }
        }
      ]
    },
    /* 18 */ {
      role: 'vendor', title: 'Winning vendor goes to PICKUP', steps: [
        { t: 'Won bids', n: 'The vendor sees the lot they won and schedules pickup.', run: async () => { setPersona('vendor', ctx.winner); go('vendor', 'won'); } },
        { t: 'Schedule pickup', n: 'Farmer is notified with a pickup window.', run: async () => { tap('schedulePickup', { id: ctx.cropId }) || S.schedulePickup(ctx.cropId, Date.now() + 2 * 3600000); await wait(700); AG.app.refresh(true); } }
      ]
    },
    /* 19 */ {
      role: 'vendor', title: 'Simulated handover → INVENTORY', steps: [
        {
          t: 'Confirm pickup', n: 'Stock is weighed at the farm gate and transferred. A batch is created with the 30 / 70 rule applied automatically.',
          run: async () => {
            const r = S.completePickup(ctx.cropId);
            if (r && r.ok) { ctx.batchId = r.batch.id; ctx.track = r.batch.trackingId; U.toast('Batch ' + r.batch.id + ' created · ' + kg(r.batch.qtyKg), 'good', 3200); }
            await wait(900); AG.app.refresh(true);
          }
        },
        { t: 'Inventory list', n: 'Farmer source, crop, quantity, quality, date received, shelf life, reserved vs available, and full movement history.', run: async () => { go('vendor', 'inventory'); }, sel: '.batchcard' }
      ]
    },
    /* 20 */ {
      role: 'vendor', title: 'The 30% / 70% rule', steps: [
        {
          t: 'Open the batch', n: 'A percentage indicator shows the split at a glance.',
          run: async () => { tap('openBatch', { id: ctx.batchId }) || go('vendor', 'batch', { id: ctx.batchId }); }, sel: '.split'
        },
        { t: '30% free · 70% reserved', n: 'Only 30% of received stock may be sold, used or given away privately. The other 70% is RESERVED for AGRILINK customers.', sel: '.split-bar' }
      ]
    },
    /* 21 */ {
      role: 'vendor', title: 'UI blocks over-allocation', steps: [
        {
          t: 'Try to free 60% (demo test)', n: 'The transaction is refused, the vendor is warned, and Algorithm 3 raises a high-severity alert for government monitoring.',
          run: async () => {
            tap('tryOver');
            await wait(1200);
            const res = S.useFreeStock(ctx.batchId, Math.round(S.batch(ctx.batchId).qtyKg * 0.6), 'tour over-allocation test');
            if (!res.ok) U.toast('BLOCKED · only ' + kg(res.cap) + ' may be freed (30%) · alert ' + res.alert, 'bad', 4000);
            modalBtn(); await wait(900); AG.app.refresh(true);
          }
        },
        { t: 'Violation logged', n: 'Vendor flag count increases and the attempt appears in the audit trail with actor, time and tracking ID.' }
      ]
    },
    /* 22 */ {
      role: 'vendor', title: 'Retail price with a guardrail', steps: [
        {
          t: 'Set the customer price', n: 'Retail above 2.0× the farm-gate price is flagged as possible kala-bajari and reported.',
          run: async () => {
            const b = S.batch(ctx.batchId);
            const r = S.setRetailPrice(b.id, Math.round(b.pricePerKgFarm * 1.55));
            U.toast(r && r.flagged ? 'Price flagged by Algorithm 3' : 'Retail price saved · ' + money(b.retailPrice) + '/kg', r && r.flagged ? 'warn' : 'good');
            await wait(700); AG.app.refresh(true);
          }
        },
        { t: 'Reserved stock is now sellable', n: 'It appears in the customer app within seconds.' }
      ]
    },
    /* 23 */ {
      role: 'customer', title: 'Customer opens AGRILINK', steps: [
        {
          t: 'Grocery-style home', n: 'Vegetables / Crops · Search · Categories · Available Near Me · Cart · Orders · Track Delivery · Profile.',
          run: async () => { setPersona('customer', 'C-1'); go('customer', 'home'); }, sel: '.pgrid'
        },
        {
          t: 'Reserved stock = the products', n: 'Only the 70% reserved portion is listed. Source, quality grade, distance and ETA are shown on every card.',
          run: async () => { ctx.product = AG.algo.customerProducts(S.state).find(p => p.batchId === ctx.batchId) || AG.algo.customerProducts(S.state)[0]; if (ctx.product) ctx.batchId = ctx.product.batchId; }
        }
      ]
    },
    /* 24 */ {
      role: 'customer', title: 'Product detail + traceability', steps: [
        {
          t: 'Open the product', n: 'Quality gauges, freshness, shelf life left, vendor and the farmer who grew it.',
          run: async () => { tap('openProduct', { id: ctx.product && ctx.product.batchId }) || go('customer', 'product', { id: ctx.product && ctx.product.batchId }); }
        },
        { t: 'Full traceability chain', n: 'Farm → lot ID → vendor batch → reserved stock. One tap jumps to the government trace view.', sel: '.trace' },
        { t: 'Add to cart', n: 'Quantity stepper, farmer share shown, reserved stock decremented instantly.', run: async () => { tap('addCart'); await wait(800); } }
      ]
    },
    /* 25 */ {
      role: 'customer', title: 'Cart → Checkout', steps: [
        { t: 'Review cart', n: 'Price, quantity, source and the share that goes back to the farmer.', run: async () => { go('customer', 'cart'); } },
        { t: 'Checkout', n: 'Address, delivery slot and payment method.', run: async () => { tap('goCheckout') || go('customer', 'checkout'); } }
      ]
    },
    /* 26 */ {
      role: 'customer', title: 'A delivery slot MUST be chosen', steps: [
        { t: 'Five slots', n: '9–11 · 11–1 · 1–3 · 3–5 · 5–7. Each shows remaining capacity, current load and the AI recommendation.', sel: '.slotgrid' },
        {
          t: 'Capacity is checked', n: 'Algorithm 2 verifies partners, vehicles and drop counts for that slot before allowing the order.',
          run: async () => { const free = AG.catalog.DELIVERY_SLOTS.map(s => ({ s: s.id, cap: AG.algo.slotCapacity(s.id, S.state) })).sort((a, b) => b.cap.left - a.cap.left)[0]; ctx.slot = free.s.id; tap('slot', { s: ctx.slot }); await wait(700); }
        },
        {
          t: 'Place order', n: 'Reserved stock is allocated, the vendor is notified, and optimised routes are offered to delivery partners immediately.',
          run: async () => {
            tap('place');
            await wait(1400);
            const o = S.state.orders.find(x => x.customerId === S.state.currentCustomer && x.batchId === ctx.batchId) || S.state.orders[0];
            if (o) { ctx.orderId = o.id; ctx.routeId = S.state.routes.find(r => r.slot === o.slot && r.status === 'open' && r.orderIds.includes(o.id)) ? S.state.routes.find(r => r.slot === o.slot && r.status === 'open' && r.orderIds.includes(o.id)).id : null; }
            modalBtn(); await wait(700);
          }
        }
      ]
    },
    /* 27 */ {
      role: 'vendor', title: 'Vendor confirms from reserved stock', steps: [
        {
          t: 'New AGRILINK order', n: 'The vendor confirms and packs it — only from the reserved 70%, never from the free allocation.',
          run: async () => { setPersona('vendor', S.order(ctx.orderId) ? S.order(ctx.orderId).vendorId : ctx.winner); go('vendor', 'orders'); }
        },
        {
          t: 'Confirm + pack', n: 'Order status moves to confirmed → ready for pickup by the delivery partner.',
          run: async () => { tap('openOrder', { id: ctx.orderId }) || go('vendor', 'order', { id: ctx.orderId }); await wait(700); tap('confirm'); await wait(600); tap('ready'); await wait(600); }
        }
      ]
    },
    /* 28 */ {
      role: 'partner', title: 'Delivery partner gets an optimised route', steps: [
        {
          t: 'Driver-style home', n: 'Available Jobs · Today’s Earnings · Active Route · Completed · Notifications.',
          run: async () => { const r = S.route(ctx.routeId) || S.state.routes.find(x => x.status === 'open'); ctx.routeId = r && r.id; setPersona('partner', r ? r.partnerId || r.suggestedPartner : 'P-2'); go('partner', 'home'); }
        },
        { t: 'Grouped jobs', n: 'Orders are grouped by slot, vendor, area and distance, then sequenced nearest-neighbour with mock traffic and vehicle capacity.', run: async () => { go('partner', 'jobs'); }, sel: '.jobcard' },
        {
          t: 'Route preview', n: 'Optimised km versus individual trips, savings percentage, drop order and the earnings breakdown.',
          run: async () => { tap('openJob', { id: ctx.routeId }) || go('partner', 'job', { id: ctx.routeId }); }
        }
      ]
    },
    /* 29 */ {
      role: 'partner', title: 'Accept the job and drive', steps: [
        { t: 'Accept', n: 'Route re-priced for this partner’s vehicle and rates.', run: async () => { tap('accept', { id: ctx.routeId }); await wait(1000); } },
        { t: 'Assigned → Going to vendor', n: 'Status flow: Assigned → Going to Vendor → Picked Up → Out for Delivery → Delivered.', run: async () => { go('partner', 'route', { id: ctx.routeId }); await wait(700); tap('advance', { id: ctx.routeId }); await wait(900); } },
        { t: 'Picked up from the vendor', n: 'Stock leaves the vendor godown — movement written to the batch ledger.', run: async () => { tap('advance', { id: ctx.routeId }); await wait(900); } }
      ]
    },
    /* 30 */ {
      role: 'partner', title: 'Out for delivery — stop by stop', steps: [
        { t: 'Live route map', n: 'Vendor → C1 → C2 → … with the next stop highlighted.', run: async () => { tap('advance', { id: ctx.routeId }); await wait(900); }, sel: '.map' },
        {
          t: 'Mark every drop delivered', n: 'Earnings tick up per drop and per km; each customer order updates instantly.',
          run: async () => {
            const r = S.route(ctx.routeId);
            for (let i = 0; i < (r ? r.stops : 0); i++) { tap('deliverStop', { id: ctx.routeId, idx: i }); await wait(700); }
            await wait(500);
          }
        },
        { t: 'Route completed', n: 'Stock has now moved from the vendor to the customers.', run: async () => { if (S.route(ctx.routeId) && S.route(ctx.routeId).status !== 'completed') { tap('advance', { id: ctx.routeId }); await wait(800); } } }
      ]
    },
    /* 31 */ {
      role: 'customer', title: 'Customer tracks the delivery live', steps: [
        {
          t: 'Track Delivery', n: 'Stepper, route map with all stops, partner details and a live event log.',
          run: async () => { setPersona('customer', 'C-1'); go('customer', 'track', { id: ctx.orderId }); }, sel: '.stepper'
        },
        { t: 'Delivered', n: 'Order closed, reserved stock decremented, wastage avoided.', run: async () => { go('customer', 'orders'); } }
      ]
    },
    /* 32 */ {
      role: 'gov', title: 'Government control room', steps: [
        {
          t: 'KPI dashboard', n: 'Farmers, vendors, partners, customers, total / reserved / in-transit / sold stock, wastage, active orders and bids, completed transactions.',
          run: async () => { S.state.role = 'gov'; S.state.welcomed = true; S.save(); go('gov', 'overview'); }, sel: '.kpis'
        },
        { t: 'Live pipeline', n: 'FARMER → VENDOR → INVENTORY → DELIVERY → CUSTOMER with the quantity sitting at each stage right now.', sel: '.pipe' }
      ]
    },
    /* 33 */ {
      role: 'gov', title: 'Trace + kala-bajari monitoring', steps: [
        {
          t: 'Trace the batch', n: 'Search ' + 'by tracking ID to see the complete chain of custody: who owned it, when it moved, and how much.',
          run: async () => { go('gov', 'trace'); await wait(700); const i = q('#traceInput'); if (i) { i.value = ctx.track || (S.state.batches[0] || {}).trackingId || ''; } tap('doTrace'); await wait(900); }, sel: '.pipe'
        },
        {
          t: 'Kala-bajari watch', n: 'Stock mismatch, unauthorised allocation, abnormal price, reserved-70% violation, excess movement and duplicate transactions — each opens its transaction trail.',
          run: async () => { go('gov', 'compliance'); }, sel: '.alertcard'
        },
        { t: 'The blocked attempt is here', n: 'The vendor’s 60% over-allocation attempt appears as a high-severity alert with metrics and the full trail.' }
      ]
    },
    /* 34 */ {
      role: 'center', title: 'Pipeline health + AI / Algorithm Center', steps: [
        { t: 'Algorithm 4 — health monitor', n: 'Continuous checks across every stage of the chain, with one system-health score.', run: async () => { go('gov', 'health'); }, sel: '.healthbanner' },
        { t: 'AI / Algorithm Center', n: '1 Crop + Price Intelligence · 2 Matching + Route Optimisation · 3 Security + Compliance · 4 Pipeline Health Monitor.', run: async () => { go('center', 'a1'); } },
        { t: 'Matching + routing engine', n: 'Live scores, weights and route savings on the current data.', run: async () => { go('center', 'a2'); } },
        { t: 'Security + compliance engine', n: 'Runs a full sweep of the ledger on demand.', run: async () => { go('center', 'a3'); } },
        {
          t: 'Journey complete', n: 'Farmer → Vendor → Inventory (30/70) → Delivery → Customer → Government. Every screen you saw writes to the same local state.',
          run: async () => { go('center', 'a4'); }
        }
      ]
    }
  ];

  /* ---------- flatten into a queue ---------- */
  const QUEUE = [];
  CHAPTERS.forEach((ch, ci) => ch.steps.forEach((s, si) => QUEUE.push(Object.assign({}, s, {
    ch: ci + 1, chTitle: ch.title, role: ch.role, si, slen: ch.steps.length
  }))));

  /* ---------- state ---------- */
  let qi = 0, running = false, paused = false, root = null;

  function ensureRoot() {
    if (root && root.parentNode) return root;
    root = document.createElement('div');
    root.id = 'tourRoot';
    root.innerHTML = '<div class="tourcap" id="tourCap"></div>';
    document.body.appendChild(root);
    root.onclick = e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      const a = b.dataset.t;
      if (a === 'pause') { paused = !paused; paint(); }
      else if (a === 'next') { skipWait = true; }
      else if (a === 'prev') { if (qi > 0) { qi -= 2; skipWait = true; } }
      else if (a === 'stop') stop();
    };
    return root;
  }
  let skipWait = false;

  function paint() {
    const r = ensureRoot(); if (!r) return;
    const it = QUEUE[qi]; if (!it) return;
    const roleLabel = { farmer: 'FARMER', vendor: 'VENDOR', partner: 'DELIVERY PARTNER', customer: 'CUSTOMER', gov: 'GOVERNMENT', center: 'ALGORITHM CENTER' }[it.role] || '';
    r.className = 'tour-on role-' + it.role;
    q('#tourCap').innerHTML =
      '<div class="tourtop">' +
      '<span class="tourstep">JOURNEY STEP ' + it.ch + ' / ' + CHAPTERS.length + '</span>' +
      '<span class="tourrole ' + it.role + '">' + icon(it.role === 'gov' ? 'gov' : it.role === 'center' ? 'ai' : it.role === 'partner' ? 'truck' : it.role === 'customer' ? 'cart' : it.role === 'vendor' ? 'store' : 'sprout', 13) + esc(roleLabel) + '</span>' +
      '<button class="tourx" data-t="stop" title="End tour">' + icon('x', 16) + '</button></div>' +
      '<div class="tourprog"><i style="width:' + Math.round(it.ch / CHAPTERS.length * 100) + '%"></i></div>' +
      '<h4>' + esc(it.t) + '</h4>' +
      '<p>' + esc(it.n || '') + '</p>' +
      '<div class="tourchapter">Chapter ' + it.ch + ': ' + esc(it.chTitle) + ' · beat ' + (it.si + 1) + '/' + it.slen + '</div>' +
      '<div class="tourbtns">' +
      '<button data-t="prev">' + icon('left', 15) + ' Back</button>' +
      '<button data-t="pause">' + icon(paused ? 'play' : 'pause', 15) + (paused ? ' Resume' : ' Pause') + '</button>' +
      '<button data-t="next" class="hot">Next ' + icon('right', 15) + '</button>' +
      '</div>';
    if (it.sel) {
      qa('.tour-hl').forEach(n => n.classList.remove('tour-hl'));
      const target = q('#screen ' + it.sel);
      if (target) { target.classList.add('tour-hl'); try { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { } }
    }
  }

  async function hold(ms) {
    const end = Date.now() + AG.app.speed(ms);
    while (Date.now() < end) {
      if (!running) return;
      if (skipWait) { skipWait = false; return; }
      if (paused) { await sleep(120); continue; }
      await sleep(Math.min(120, Math.max(20, end - Date.now())));
    }
  }

  async function play() {
    running = true; paused = false;
    while (running && qi < QUEUE.length) {
      const it = QUEUE[qi];
      paint();
      if (it.run) { try { await it.run(); } catch (e) { console.error('[demo] step ' + it.ch + ' failed:', e); } }
      if (!running) break;
      await hold(it.ms || 3400);
      qa('.tour-hl').forEach(n => n.classList.remove('tour-hl'));
      qi++;
    }
    if (running) finish();
  }

  function finish() {
    running = false;
    const m = S.metrics();
    qa('.tour-hl').forEach(n => n.classList.remove('tour-hl'));
    if (root) { root.className = ''; const c = q('#tourCap'); if (c) c.innerHTML = ''; }
    U.modal({
      wide: true, title: 'Journey complete — 34 steps', icon: 'check',
      body: '<p class="big muted">Farmer → Vendor → Inventory (30 / 70) → Delivery Partner → Customer → Government monitoring. All of it ran on the same local simulated state.</p>' +
        '<div class="kpis" style="margin-top:14px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">' +
        '<div class="kpi g"><div class="k">Stock harvested</div><div class="v">' + kg(m.harvested + m.stockAtFarm) + '</div></div>' +
        '<div class="kpi t"><div class="k">Reserved (70%)</div><div class="v">' + kg(m.reservedStock) + '</div></div>' +
        '<div class="kpi v"><div class="k">Delivered</div><div class="v">' + kg(m.soldToCustomers) + '</div></div>' +
        '<div class="kpi a"><div class="k">Wastage</div><div class="v">' + m.wastagePct + '%</div></div>' +
        '<div class="kpi g"><div class="k">Farmer income</div><div class="v">' + money(m.farmerIncome) + '</div></div>' +
        '<div class="kpi r"><div class="k">Open alerts</div><div class="v">' + m.openAlerts + '</div></div>' +
        '</div>' +
        '<div class="hint" style="margin-top:12px">Tracking ID followed in this tour: <b>' + esc(ctx.track || '—') + '</b>. Use “Reset demo” in the topbar to rebuild the world and replay from step 1.</div>',
      actions: [
        { label: 'Close', tone: 'ghost' },
        { label: 'Government dashboard', tone: 'dark', icon: 'gov', onClick: () => go('gov', 'overview') },
        { label: 'Replay tour', tone: 'primary', icon: 'refresh', onClick: () => start({ silent: true }) }
      ]
    });
  }

  function start(opts) {
    const o = opts || {};
    const begin = () => {
      S.setSetting('demoMode', true);
      qi = o.from || 0; Object.keys(ctx).forEach(k => delete ctx[k]);
      ensureRoot();
      U.closeModal();
      play();
    };
    if (o.silent) { begin(); return; }
    U.modal({
      title: 'Run the complete demo?', icon: 'play',
      body: '<p class="big muted">The guided tour plays all <b>34 steps</b> of the journey and taps the real buttons for you: photo → AI analysis → radius → 3 vendors → bidding → winner → redirect → pickup → 30/70 inventory → blocked over-allocation → customer order → slot → optimised route → delivery → government trace → algorithm health.</p>' +
        '<div class="lockrow" style="margin-top:12px">' + icon('info', 18) + '<span>You can pause, step back/forward, or end the tour at any time using the caption bar.</span></div>',
      actions: [
        { label: 'Cancel', tone: 'ghost' },
        { label: 'Play from here', tone: 'dark', icon: 'play', onClick: begin },
        {
          label: 'Reset & play', tone: 'primary', icon: 'refresh', onClick: () => {
            S.hardReset(); S.state.welcomed = true; S.state.role = 'farmer'; S.save();
            AG.app.applyLang && AG.app.applyLang(); AG.app.refresh(true); begin();
          }
        }
      ]
    });
  }

  function stop() {
    running = false; paused = false; skipWait = true;
    qa('.tour-hl').forEach(n => n.classList.remove('tour-hl'));
    if (root) { root.className = ''; const c = q('#tourCap'); if (c) c.innerHTML = ''; }
    U.closeModal();
  }

  AG.demo = {
    CHAPTERS, get queue() { return QUEUE; },
    start, stop,
    pause: () => { paused = true; paint(); },
    resume: () => { paused = false; paint(); },
    next: () => { skipWait = true; },
    prev: () => { if (qi > 0) { qi -= 2; skipWait = true; } },
    goto: ch => { const i = QUEUE.findIndex(x => x.ch === ch); if (i >= 0) { qi = i; skipWait = true; if (!running) play(); else paint(); } },
    get running() { return running; },
    get index() { return qi; },
    get chapter() { return QUEUE[qi] ? QUEUE[qi].ch : CHAPTERS.length; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
