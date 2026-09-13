/* ============================================================
   AGRILINK — Store (single source of truth, DOM-free)
   Local state + localStorage persistence. No backend.
   ============================================================ */
(function (g) {
  'use strict';
  const AG = g.AG;
  const { clamp, round, DAY } = AG.util;
  const { RESERVE_RATIO, FREE_RATIO, MAX_VENDORS_PER_CROP } = AG.catalog;

  const KEY = 'agrilink.state.v6';
  const listeners = [];
  let store = null;

  /* storage shim so the same code runs in Node for smoke tests */
  const LS = (typeof localStorage !== 'undefined') ? localStorage : (function () {
    let m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
  })();

  function load() {
    try {
      const raw = LS.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.version === AG.seed.buildSeed().version && s.farmers && s.farmers.length) return s;
      }
    } catch (e) { /* corrupted → reseed */ }
    return AG.seed.buildSeed();
  }

  const S = {
    get state() { return store; },
    init() { store = load(); S.postSeed(); return store; },
    postSeed() {
      if (!store || !store.needsRouteBuild || !AG.algo) return;
      store.needsRouteBuild = false;
      AG.algo.buildRoutes(store, 'S3');
      AG.algo.pipelineHealth(store);
      S.save();
    },
    save() { try { LS.setItem(KEY, JSON.stringify(store)); } catch (e) { } },
    hardReset() { try { LS.removeItem(KEY); } catch (e) { } store = AG.seed.buildSeed(); S.postSeed(); S.save(); S.emit('reset'); return store; },
    subscribe(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    emit(evt, payload) { listeners.forEach(fn => { try { fn(evt, payload, store); } catch (e) { console.error(e); } }); },
    touch(evt, payload) { S.save(); S.emit(evt || 'change', payload); },

    /* ---------------- helpers ---------------- */
    nid(kind) {
      const map = { crop: 'CR-', track: 'CROP-IND-', batch: 'BATCH-', order: 'ORD-', route: 'RT-', bid: 'BID-', notif: 'N-', alert: 'AL-', audit: 'AUD-', txn: 'TXN-' };
      const key = kind;
      store.seq[key] = (store.seq[key] || 100) + 1;
      const pre = map[kind] || '';
      if (kind === 'track') return pre + String(store.seq.track).padStart(6, '0');
      return pre + store.seq[key];
    },
    farmer(id) { return store.farmers.find(f => f.id === (id || store.currentFarmer)); },
    vendor(id) { return store.vendors.find(v => v.id === id); },
    partner(id) { return store.partners.find(p => p.id === id); },
    customer(id) { return store.customers.find(c => c.id === id); },
    crop(id) { return store.crops.find(c => c.id === id); },
    batch(id) { return store.batches.find(b => b.id === id); },
    order(id) { return store.orders.find(o => o.id === id); },
    route(id) { return store.routes.find(r => r.id === id); },
    alert(id) { return store.alerts.find(a => a.id === id); },
    entity(role, id) { return role === 'farmer' ? S.farmer(id) : role === 'vendor' ? S.vendor(id) : role === 'partner' ? S.partner(id) : role === 'customer' ? S.customer(id) : null; },

    setLang(code) { store.lang = code; S.touch('lang'); },
    setRole(role) { store.role = role; S.touch('role'); },
    setCurrentFarmer(id) { store.currentFarmer = id; S.touch('actor'); },
    setCurrent(roleName, id) { store['current' + roleName] = id; S.touch('actor'); },
    currentId(role) { return store['current' + role[0].toUpperCase() + role.slice(1)] || null; },
    setSetting(k, v) { store.settings[k] = v; S.touch('settings'); },

    notify(n) {
      const rec = Object.assign({ id: S.nid('notif'), ts: Date.now(), read: false }, n);
      store.notifications.unshift(rec);
      if (store.notifications.length > 220) store.notifications.length = 220;
      return rec;
    },
    notifsFor(role, roleId) { return store.notifications.filter(n => n.role === role && (!roleId || n.roleId === roleId || n.roleId === '*')); },
    unreadCount(role, roleId) { return S.notifsFor(role, roleId).filter(n => !n.read).length; },
    markRead(role, roleId) {
      const un = S.notifsFor(role, roleId).filter(n => !n.read);
      if (!un.length) return;
      un.forEach(n => n.read = true);
      S.touch('notif');
    },

    audit(actorId, role, action, detail) {
      const rec = { id: S.nid('audit'), ts: Date.now(), actorId: actorId || 'SYSTEM', role: role || 'system', action, detail };
      store.audit.unshift(rec);
      if (store.audit.length > 500) store.audit.length = 500;
      return rec;
    },
    ev(stage, qtyKg, trackingId) { store.events.push({ ts: Date.now(), stage, qtyKg, trackingId }); },

    raiseAlert(a) {
      const rec = Object.assign({ id: S.nid('alert'), ts: Date.now(), status: 'open', severity: 'medium' }, a);
      store.alerts.unshift(rec);
      S.audit('SYSTEM', 'gov', 'alert.raised', rec.title);
      return rec;
    },
    resolveAlert(id, note) {
      const a = S.alert(id); if (!a) return;
      a.status = 'resolved'; a.resolvedAt = Date.now(); a.resolution = note || 'Reviewed by monitoring officer';
      S.audit('GOV-OFFICER', 'gov', 'alert.resolved', a.id + ' — ' + (note || ''));
      S.touch('alert');
    },
    freezeVendor(id, note) {
      const v = S.vendor(id); if (!v) return;
      v.frozen = true; v.frozenNote = note || 'Suspended pending enquiry';
      S.audit('GOV-OFFICER', 'gov', 'vendor.frozen', v.name + ' — ' + v.frozenNote);
      S.notify({ role: 'vendor', roleId: id, type: 'compliance', title: 'Account flagged', body: 'Government monitoring has flagged your account: ' + v.frozenNote });
      S.touch('vendor');
    },

    /* ================= FARMER FLOW ================= */
    createCrop(d) {
      const crop = {
        id: S.nid('crop'), trackingId: S.nid('track'), farmerId: d.farmerId, vendorId: null,
        cropKey: d.cropKey, cropName: d.cropName, category: d.category, qtyKg: d.qtyKg,
        radiusKm: d.radiusKm || 20, analysis: d.analysis, photoSeed: d.photoSeed || 1,
        status: 'draft', createdAt: Date.now(), postedAt: null, matchedAt: null, awardedAt: null,
        pickedAt: null, notifiedVendors: [], bids: [], matches: [], winnerBidId: null, batchId: null,
        retailPrice: d.retailPrice, pickupEtaHrs: d.pickupEtaHrs || 3, redirected: []
      };
      store.crops.unshift(crop);
      S.ev('harvest_posted', crop.qtyKg, crop.trackingId);
      S.audit(crop.farmerId, 'farmer', 'crop.created', crop.cropName + ' ' + crop.qtyKg + ' kg — AI analysis ' + crop.analysis.grade + ' grade, tracking ' + crop.trackingId);
      S.notify({ role: 'farmer', roleId: crop.farmerId, type: 'crop', title: AG.I18N.t(store.lang || 'en', 'analysisDone'), body: crop.cropName + ' · ' + crop.qtyKg + ' kg · ' + crop.trackingId });
      S.touch('crop:create');
      return crop;
    },
    updateCrop(id, patch) { Object.assign(S.crop(id), patch); S.touch('crop:update'); },

    postCrop(id, radiusKm) {
      const c = S.crop(id); if (!c) return;
      c.radiusKm = radiusKm || c.radiusKm; c.status = 'posted'; c.postedAt = Date.now();
      S.audit(c.farmerId, 'farmer', 'crop.posted', c.cropName + ' · radius ' + c.radiusKm + ' km');
      S.touch('crop:post');
      return c;
    },

    /** Algorithm 2 — matching. Returns top MAX_VENDORS_PER_CROP vendors. */
    matchVendors(id) {
      const c = S.crop(id); if (!c) return [];
      const matches = AG.algo.matchVendorsForCrop(c, store);
      c.matches = matches;
      c.notifiedVendors = matches.slice(0, MAX_VENDORS_PER_CROP).map(m => m.vendor.id);
      c.status = 'matched'; c.matchedAt = Date.now();
      S.audit('SYSTEM', 'algorithm', 'algo2.match', c.trackingId + ' → ' + c.notifiedVendors.length + ' vendors (max ' + MAX_VENDORS_PER_CROP + ')');
      c.notifiedVendors.forEach(vid => {
        const v = S.vendor(vid);
        const m = matches.find(x => x.vendor.id === vid);
        S.notify({
          role: 'vendor', roleId: vid, type: 'opportunity', title: 'New crop opportunity',
          body: c.qtyKg + ' kg ' + c.cropName + ' (Grade ' + c.analysis.grade + ') from ' + S.farmer(c.farmerId).name + ', ' + round(m.distanceKm, 0) + ' km away. Match ' + m.score + '%.',
          cropId: c.id
        });
      });
      S.notify({ role: 'farmer', roleId: c.farmerId, type: 'vendor', title: AG.I18N.t(store.lang || 'en', 'vendorsFound', { n: c.notifiedVendors.length }), body: c.notifiedVendors.map(v => S.vendor(v).name).join(', ') });
      S.ev('matched', c.qtyKg, c.trackingId);
      S.touch('crop:match');
      return matches;
    },

    placeBid(cropId, vendorId, price, message) {
      const c = S.crop(cropId); if (!c) return { ok: false, error: 'crop' };
      if (c.bids.length >= MAX_VENDORS_PER_CROP && !c.bids.some(b => b.vendorId === vendorId))
        return { ok: false, error: 'full', message: 'This crop already has the maximum of 3 bids.' };
      if (c.status === 'awarded' || c.status === 'pickup_scheduled' || c.status === 'in_inventory' || c.status === 'selling' || c.status === 'sold_out')
        return { ok: false, error: 'closed', message: 'Bidding is closed for this crop.' };
      if (!c.notifiedVendors.includes(vendorId)) return { ok: false, error: 'notInvited', message: 'You were not invited to bid on this crop.' };
      const band = AG.algo.bidBand(c);
      if (price < band.min || price > band.max) return { ok: false, error: 'range', message: 'Bid must be between ₹' + band.min + ' and ₹' + band.max + ' per kg.', band };
      const v = S.vendor(vendorId);
      if (v.frozen) return { ok: false, error: 'frozen', message: 'This vendor account is flagged by government monitoring.' };
      let bid = c.bids.find(b => b.vendorId === vendorId && b.status === 'open');
      if (bid) { bid.price = price; bid.updatedAt = Date.now(); bid.message = message || bid.message; }
      else {
        bid = { id: S.nid('bid'), cropId: c.id, vendorId, price: round(price, 1), qtyKg: c.qtyKg, createdAt: Date.now(), status: 'open', message: message || '' };
        c.bids.push(bid); store.bids.push(bid);
      }
      c.status = 'bidding';
      S.notify({
        role: 'farmer', roleId: c.farmerId, type: 'bid',
        title: (store.lang === 'mr' ? 'नवीन बोली आली' : 'New bid received'),
        body: v.name + ' · ₹' + bid.price + '/' + 'kg · ' + c.cropName + ' ' + c.qtyKg + ' kg', cropId: c.id
      });
      S.notify({ role: 'vendor', roleId: vendorId, type: 'bid', title: 'Bid submitted', body: '₹' + bid.price + '/kg for ' + c.qtyKg + ' kg ' + c.cropName + '. Waiting for farmer.' });
      S.audit(vendorId, 'vendor', 'bid.placed', '₹' + bid.price + '/kg on ' + c.trackingId + ' (allowed band ₹' + band.min + '–₹' + band.max + ')');
      S.ev('bid', c.qtyKg, c.trackingId);
      S.touch('bid');
      return { ok: true, bid, band };
    },

    acceptBid(cropId, bidId) {
      const c = S.crop(cropId); const bid = c.bids.find(b => b.id === bidId);
      if (!bid) return { ok: false };
      c.bids.forEach(b => { if (b.id !== bidId) b.status = 'lost'; });
      bid.status = 'won'; c.winnerBidId = bidId; c.vendorId = bid.vendorId;
      c.status = 'awarded'; c.awardedAt = Date.now();
      const v = S.vendor(bid.vendorId), f = S.farmer(c.farmerId);
      const distKm = AG.util.roadKm(f, v);
      c.pickupEtaHrs = round(distKm / 26 + 0.6, 1);
      S.notify({ role: 'vendor', roleId: bid.vendorId, type: 'won', title: 'BID WON 🎉', body: 'You won ' + c.qtyKg + ' kg ' + c.cropName + ' at ₹' + bid.price + '/kg from ' + f.name + '. Go to Won Bids to schedule pickup.', cropId: c.id });
      S.notify({ role: 'farmer', roleId: c.farmerId, type: 'won', title: (store.lang === 'mr' ? 'बोली पक्की झाली' : 'Bid accepted'), body: v.name + ' · ₹' + bid.price + '/kg · ' + c.qtyKg + ' kg', cropId: c.id });
      v.bidsWon++;
      S.audit(c.farmerId, 'farmer', 'bid.accepted', c.trackingId + ' → ' + v.name + ' @ ₹' + bid.price + '/kg');
      /* Algorithm 2 — losing vendors get redirected to other suitable farmers */
      const redirects = S.redirectLosers(c);
      S.ev('awarded', c.qtyKg, c.trackingId);
      S.touch('bid:accept', { cropId, redirects });
      return { ok: true, redirects };
    },

    rejectBid(cropId, bidId) {
      const c = S.crop(cropId); const bid = c.bids.find(b => b.id === bidId); if (!bid) return;
      bid.status = 'rejected';
      S.notify({ role: 'vendor', roleId: bid.vendorId, type: 'lost', title: 'Bid not selected', body: c.cropName + ' — the farmer chose another vendor. New opportunities are suggested for you.' });
      S.audit(c.farmerId, 'farmer', 'bid.rejected', c.trackingId + ' bid from ' + S.vendor(bid.vendorId).name);
      S.touch('bid:reject');
    },

    /** Losing vendors are auto-redirected to nearby farmers with suitable crops. */
    redirectLosers(crop) {
      const losers = crop.bids.filter(b => b.status === 'lost' || b.status === 'rejected').map(b => b.vendorId);
      const out = [];
      losers.forEach(vid => {
        const recs = AG.algo.recommendForVendor(vid, store, crop.id).slice(0, 2);
        out.push({ vendorId: vid, recs });
        crop.redirected.push({ vendorId: vid, at: Date.now(), recs: recs.map(r => ({ cropId: r.crop.id, farmer: S.farmer(r.crop.farmerId).name, score: r.score })) });
        S.notify({
          role: 'vendor', roleId: vid, type: 'redirect',
          title: recs.length ? 'New crops redirected to you' : 'Queued for the next nearby lot',
          body: recs.length
            ? 'The algorithm redirected you to ' + recs.length + ' other suitable crop(s) near you: ' + recs.map(r => r.crop.cropName + ' (' + r.crop.qtyKg + ' kg, ' + S.farmer(r.crop.farmerId).village + ', match ' + r.score + '%)').join('; ')
            : 'No open crop matched you right now. You are first in queue for the next suitable lot inside your range.',
          cropId: recs.length ? recs[0].crop.id : null
        });
        S.audit('SYSTEM', 'algorithm', 'algo2.redirect', 'Vendor ' + S.vendor(vid).name + ' redirected from ' + crop.trackingId + ' → ' + (recs.length ? recs.map(r => r.crop.trackingId).join(', ') : 'no open crop'));
      });
      return out;
    },

    schedulePickup(cropId, whenTs) {
      const c = S.crop(cropId); if (!c) return;
      c.status = 'pickup_scheduled'; c.pickupAt = whenTs || Date.now() + 3 * 3600000;
      const f = S.farmer(c.farmerId);
      S.notify({ role: 'farmer', roleId: c.farmerId, type: 'pickup', title: (store.lang === 'mr' ? 'माल उचलण्याची वेळ ठरली' : 'Pickup scheduled'), body: S.vendor(c.vendorId).name + ' will collect ' + c.qtyKg + ' kg ' + c.cropName + ' from ' + f.village + '.' });
      S.notify({ role: 'vendor', roleId: c.vendorId, type: 'pickup', title: 'Pickup scheduled', body: c.qtyKg + ' kg ' + c.cropName + ' at ' + f.name + ', ' + f.village + '. Simulate handover from Won Bids.' });
      S.audit(c.vendorId, 'vendor', 'pickup.scheduled', c.trackingId);
      S.touch('pickup:scheduled');
    },

    /** Simulated farmer→vendor handover. Creates the inventory batch with the 30/70 rule. */
    completePickup(cropId) {
      const c = S.crop(cropId); if (!c || c.batchId) return { ok: false };
      const v = S.vendor(c.vendorId), f = S.farmer(c.farmerId);
      const total = c.qtyKg;
      const free = Math.floor(total * FREE_RATIO);
      const reserved = total - free;
      const batch = {
        id: S.nid('batch'), cropId: c.id, trackingId: c.trackingId, vendorId: v.id, farmerId: f.id,
        cropKey: c.cropKey, cropName: c.cropName, qtyKg: total,
        qualityScore: c.analysis.qualityScore, grade: c.analysis.grade,
        receivedAt: Date.now(), shelfLifeDays: c.analysis.shelfLife, spoilageRisk: c.analysis.spoilageRisk,
        freeKg: free, reservedKg: reserved, freeUsedKg: 0, reservedSoldKg: 0, reservedAllocatedKg: 0,
        wastageKg: 0, pricePerKgFarm: c.bids.find(b => b.id === c.winnerBidId).price,
        retailPrice: c.retailPrice, status: 'active', movements: [
          { ts: Date.now(), stage: 'farm→vendor', qtyKg: total, actor: f.name, note: 'Weighed at farm gate — handover confirmed' },
          { ts: Date.now() + 1000, stage: 'vendor-inventory', qtyKg: total, actor: v.name, note: 'Stored. Split applied: 30% free (' + free + ' kg) / 70% reserved (' + reserved + ' kg)' }
        ]
      };
      store.batches.unshift(batch);
      c.batchId = batch.id; c.status = 'in_inventory'; c.pickedAt = Date.now();
      v.usedKg += total;
      f.cropsSold++; f.earned += Math.round(batch.pricePerKgFarm * total);
      /* simulated payment to farmer */
      const pay = { id: S.nid('txn'), cropId: c.id, batchId: batch.id, amount: Math.round(batch.pricePerKgFarm * total), method: 'UPI (simulated)', status: 'settled', ts: Date.now(), vendorId: v.id, farmerId: f.id, kind: 'farmer-payment' };
      store.payments.unshift(pay);
      S.notify({ role: 'farmer', roleId: f.id, type: 'payment', title: (store.lang === 'mr' ? 'पैसे आले' : 'Payment received'), body: '₹' + pay.amount.toLocaleString('en-IN') + ' from ' + v.name + ' for ' + total + ' kg ' + c.cropName + '.' });
      S.notify({ role: 'vendor', roleId: v.id, type: 'stock', title: 'Stock added to inventory', body: total + ' kg ' + c.cropName + ' → ' + free + ' kg free (30%) / ' + reserved + ' kg reserved for AGRILINK customers (70%). ' + batch.id });
      S.audit(v.id, 'vendor', 'inventory.received', batch.id + ' ← ' + c.trackingId + ' (' + total + ' kg, 30/70 split)');
      S.audit('SYSTEM', 'algorithm', 'algo3.check', 'Stock conservation OK for ' + batch.id + ': ' + free + '+' + reserved + '=' + total);
      S.ev('inventory', total, c.trackingId);
      /* compliance re-check on receipt */
      AG.algo.complianceScanBatch(batch, store);
      S.touch('pickup:done', { batchId: batch.id });
      return { ok: true, batch, pay };
    },

    /* ================= INVENTORY RULES (30 / 70) ================= */
    batchStock(b) {
      if (!b) return null;
      const freeLeft = Math.max(0, b.freeKg - b.freeUsedKg);
      const reservedLeft = Math.max(0, b.reservedKg - b.reservedSoldKg - (b.reservedAllocatedKg || 0));
      return {
        total: b.qtyKg, free: b.freeKg, reserved: b.reservedKg,
        freeLeft, reservedLeft, freeUsed: b.freeUsedKg || 0, reservedSold: b.reservedSoldKg || 0,
        reservedAllocated: b.reservedAllocatedKg || 0, wastage: b.wastageKg || 0,
        freePct: Math.round(b.freeKg / b.qtyKg * 100), reservedPct: Math.round(b.reservedKg / b.qtyKg * 100),
        consumed: (b.freeUsedKg || 0) + (b.reservedSoldKg || 0) + (b.reservedAllocatedKg || 0) + (b.wastageKg || 0),
        daysLeft: Math.max(0, b.shelfLifeDays - Math.floor((Date.now() - b.receivedAt) / DAY))
      };
    },

    /** Vendor tries to use/sell/give away free stock. Hard-capped at 30% of received stock. */
    useFreeStock(batchId, qtyKg, note, opts) {
      const b = S.batch(batchId); if (!b) return { ok: false, error: 'nobatch' };
      const stock = S.batchStock(b);
      const cap = b.freeKg;                       /* 30% ceiling — absolute */
      const asked = Number(qtyKg) || 0;
      if (asked <= 0) return { ok: false, error: 'qty' };
      if ((b.freeUsedKg || 0) + asked > cap) {
        const attemptedTotal = (b.freeUsedKg || 0) + asked;
        const pct = Math.round(attemptedTotal / b.qtyKg * 100);
        b.violationAttempts = (b.violationAttempts || 0) + 1;
        S.vendor(b.vendorId).violations = (S.vendor(b.vendorId).violations || 0) + 1;
        const al = S.raiseAlert({
          type: 'allocation_violation', severity: 'high',
          title: 'Potential stock allocation violation detected',
          message: S.vendor(b.vendorId).name + ' attempted to move ' + attemptedTotal + ' kg (' + pct + '%) of ' + b.id + ' through open/private sale. The AGRILINK rule caps free allocation at 30% (' + cap + ' kg). The transaction was BLOCKED.',
          entityId: b.id, vendorId: b.vendorId, farmerId: b.farmerId, trackingId: b.trackingId,
          trail: AG.algo.trailFor(b, store),
          metrics: { allowed: cap + ' kg', attempted: attemptedTotal + ' kg', excess: round(attemptedTotal - cap, 1) + ' kg', rule: '30% free / 70% reserved' }
        });
        S.notify({ role: 'vendor', roleId: b.vendorId, type: 'compliance', title: 'Not allowed — 70% is reserved', body: 'You can only use ' + stock.freeLeft + ' kg more from your 30% free allocation. The rest belongs to AGRILINK customers. This attempt was reported to government monitoring.' });
        S.notify({ role: 'gov', roleId: '*', type: 'compliance', title: 'Allocation violation blocked', body: b.id + ' · ' + S.vendor(b.vendorId).name + ' · attempted ' + pct + '% free allocation', alertId: al.id });
        S.audit(b.vendorId, 'vendor', 'inventory.over_allocate.blocked', b.id + ' attempted ' + attemptedTotal + '/' + b.qtyKg + ' kg free — blocked at 30% cap (' + al.id + ')');
        S.touch('violation', { alertId: al.id, batchId: b.id });
        return { ok: false, error: 'cap', allowed: stock.freeLeft, cap, alert: al.id };
      }
      b.freeUsedKg = round((b.freeUsedKg || 0) + asked, 1);
      b.movements.push({ ts: Date.now(), stage: 'free-sale', qtyKg: asked, actor: S.vendor(b.vendorId).name, note: note || 'Open-market / private sale (within 30% allocation)' });
      S.vendor(b.vendorId).freeSoldKg += asked;
      S.audit(b.vendorId, 'vendor', 'inventory.free_used', b.id + ' −' + asked + ' kg (30% allocation, remaining ' + (cap - b.freeUsedKg) + ' kg)');
      S.ev('free_sale', asked, b.trackingId);
      if (b.freeUsedKg >= cap - 0.001) S.audit('SYSTEM', 'algorithm', 'algo3.check', b.id + ' reached its 30% free allocation ceiling — further private sale is blocked');
      if (!opts || opts.notify !== false) S.notify({ role: 'vendor', roleId: b.vendorId, type: 'stock', title: 'Free stock used', body: asked + ' kg ' + b.cropName + ' sold privately. Free balance ' + (cap - b.freeUsedKg) + ' kg of ' + cap + ' kg.' });
      S.touch('inventory:free');
      return { ok: true, left: cap - b.freeUsedKg };
    },

    setRetailPrice(batchId, price) {
      const b = S.batch(batchId); if (!b) return { ok: false };
      const farm = b.pricePerKgFarm;
      b.retailPrice = round(price, 1);
      const ratio = price / Math.max(0.1, farm);
      if (ratio > 2.0) {
        const al = S.raiseAlert({
          type: 'price_anomaly', severity: 'medium', title: 'Abnormal retail price detected',
          message: S.vendor(b.vendorId).name + ' listed ' + b.cropName + ' at ₹' + price + '/kg against a farm-gate price of ₹' + farm + '/kg (ratio ' + round(ratio, 2) + '×). Screening threshold is 2.0×.',
          entityId: b.id, vendorId: b.vendorId, farmerId: b.farmerId, trackingId: b.trackingId,
          trail: AG.algo.trailFor(b, store), metrics: { farmPrice: '₹' + farm, retailPrice: '₹' + price, ratio: round(ratio, 2) + '×', threshold: '2.0×' }
        });
        S.notify({ role: 'vendor', roleId: b.vendorId, type: 'compliance', title: 'Price flagged', body: 'Your price is ' + round(ratio, 2) + '× the farm price. Government monitoring was informed (' + al.id + '). Lower it to avoid action.' });
        S.touch('price:flagged'); return { ok: true, flagged: true, alertId: al.id };
      }
      S.audit(b.vendorId, 'vendor', 'inventory.price_set', b.id + ' retail ₹' + price + '/kg (ratio ' + round(ratio, 2) + '×)');
      S.touch('price'); return { ok: true, flagged: false };
    },

    /* ================= CUSTOMER FLOW ================= */
    cartAdd(item) {
      const b = S.batch(item.batchId); if (!b) return { ok: false };
      const st = S.batchStock(b);
      const existing = store.cart.find(c => c.batchId === item.batchId);
      const want = (existing ? existing.qtyKg : 0) + (item.qtyKg || 1);
      if (want > st.reservedLeft) return { ok: false, error: 'stock', max: st.reservedLeft };
      if (existing) existing.qtyKg = round(want, 1);
      else store.cart.push({ batchId: item.batchId, vendorId: b.vendorId, cropKey: b.cropKey, cropName: b.cropName, qtyKg: item.qtyKg || 1, pricePerKg: b.retailPrice, trackingId: b.trackingId });
      S.touch('cart'); return { ok: true };
    },
    cartSetQty(batchId, qty) {
      const it = store.cart.find(c => c.batchId === batchId); if (!it) return;
      const st = S.batchStock(S.batch(batchId));
      it.qtyKg = clamp(round(qty, 1), 0.5, st.reservedLeft || 0.5);
      if (it.qtyKg <= 0) S.cartRemove(batchId); else S.touch('cart');
    },
    cartRemove(batchId) { store.cart = store.cart.filter(c => c.batchId !== batchId); S.touch('cart'); },
    cartClear() { store.cart = []; S.touch('cart'); },
    cartTotal() { return store.cart.reduce((s, i) => s + i.qtyKg * i.pricePerKg, 0); },

    placeOrder(d) {
      if (!store.cart.length) return { ok: false, error: 'empty' };
      const cap = AG.algo.slotCapacity(d.slot, store);
      if (cap.left <= 0) return { ok: false, error: 'slot_full' };
      const cust = S.customer(d.customerId);
      /* group cart by vendor → one order per vendor */
      const groups = {};
      store.cart.forEach(it => { (groups[it.vendorId] = groups[it.vendorId] || []).push(it); });
      const created = [];
      Object.keys(groups).forEach(vid => {
        groups[vid].forEach(it => {
          const b = S.batch(it.batchId); const st = S.batchStock(b);
          const qty = Math.min(it.qtyKg, st.reservedLeft);
          if (qty <= 0) return;
          const slot = AG.catalog.DELIVERY_SLOTS.find(s => s.id === d.slot);
          const o = {
            id: S.nid('order'), customerId: cust.id, vendorId: vid, batchId: b.id, trackingId: b.trackingId,
            cropKey: b.cropKey, cropName: b.cropName, qtyKg: round(qty, 1), pricePerKg: b.retailPrice,
            total: Math.round(qty * b.retailPrice), slot: slot.id, slotLabel: slot.label, status: 'placed',
            payment: 'pending', method: d.method || 'UPI', placedAt: Date.now(), deliveredAt: null,
            routeId: null, partnerId: null, address: cust.area,
            events: [{ ts: Date.now(), status: 'placed', note: 'Order placed by ' + cust.name + ' · slot ' + slot.label }]
          };
          b.reservedAllocatedKg = round((b.reservedAllocatedKg || 0) + qty, 1);
          b.movements.push({ ts: Date.now(), stage: 'reserved-allocated', qtyKg: qty, actor: cust.name, note: 'Reserved stock allocated to order ' + o.id + ' (' + slot.label + ')' });
          store.orders.unshift(o); created.push(o);
          cust.orders++;
          S.notify({ role: 'vendor', roleId: vid, type: 'order', title: 'New AGRILINK order', body: qty + ' kg ' + b.cropName + ' → ' + cust.name + ' (' + cust.area + '), slot ' + slot.label + '. Confirm from reserved stock.', orderId: o.id });
          S.notify({ role: 'customer', roleId: cust.id, type: 'order', title: 'Order placed', body: o.id + ' · ' + qty + ' kg ' + b.cropName + ' · ' + slot.label + ' · ₹' + o.total, orderId: o.id });
          S.audit(cust.id, 'customer', 'order.placed', o.id + ' ' + qty + ' kg ' + b.cropName + ' from ' + b.id + ' (reserved stock), slot ' + slot.label);
          S.ev('reserved_allocated', qty, b.trackingId);
        });
      });
      S.cartClear();
      /* Algorithm 2 immediately offers optimised routes to delivery partners */
      const routes = AG.algo.buildRoutes(store, d.slot);
      S.audit('SYSTEM', 'algorithm', 'algo2.route', 'Slot ' + d.slot + ' grouped into ' + routes.length + ' route offer(s)');
      S.touch('order:placed', { orders: created.map(o => o.id), routes: routes.map(r => r.id) });
      return { ok: true, orders: created, routes };
    },

    orderStatus(orderId, status, note) {
      const o = S.order(orderId); if (!o) return;
      o.status = status; o.events.push({ ts: Date.now(), status, note: note || '' });
      if (status === 'delivered' || status === 'completed') {
        o.deliveredAt = Date.now(); o.payment = 'paid';
        const b = S.batch(o.batchId);
        if (b) {
          b.reservedSoldKg = round((b.reservedSoldKg || 0) + o.qtyKg, 1);
          b.reservedAllocatedKg = round(Math.max(0, (b.reservedAllocatedKg || 0) - o.qtyKg), 1);
          b.movements.push({ ts: Date.now(), stage: 'customer-delivered', qtyKg: o.qtyKg, actor: S.customer(o.customerId).name, note: 'Delivered under order ' + o.id });
          if (S.batchStock(b).reservedLeft <= 0 && S.batchStock(b).freeLeft <= 0) b.status = 'empty';
        }
        S.vendor(o.vendorId).reservedSoldKg += o.qtyKg;
        store.payments.unshift({ id: S.nid('txn'), orderId: o.id, amount: o.total, method: o.method, status: 'settled', ts: Date.now(), vendorId: o.vendorId, farmerShare: Math.round(o.qtyKg * (b ? b.pricePerKgFarm : 0)), kind: 'customer-payment' });
        S.notify({ role: 'customer', roleId: o.customerId, type: 'order', title: 'Order delivered ✅', body: o.id + ' · ' + o.cropName + ' ' + o.qtyKg + ' kg · ₹' + o.total + ' paid. Source: ' + b.trackingId });
        S.notify({ role: 'vendor', roleId: o.vendorId, type: 'order', title: 'Delivery completed', body: o.id + ' delivered. Reserved stock reduced by ' + o.qtyKg + ' kg.' });
        S.audit(o.partnerId || 'SYSTEM', 'partner', 'order.delivered', o.id + ' ' + o.qtyKg + ' kg ' + o.cropName + ' → ' + S.customer(o.customerId).name);
        S.ev('customer', o.qtyKg, o.trackingId);
        AG.algo.complianceScanOrder(o, store);
      }
      S.touch('order:' + status, { orderId });
      return o;
    },

    /* ================= DELIVERY PARTNER FLOW ================= */
    acceptRoute(routeId, partnerId) {
      const r = S.route(routeId); if (!r) return { ok: false };
      if (r.status !== 'open') return { ok: false, error: 'taken' };
      const p = partnerId ? S.partner(partnerId) : null;
      r.status = 'assigned'; r.partnerId = p ? p.id : r.partnerId; r.acceptedAt = Date.now();
      r.stopsList.forEach(s => {
        const o = S.order(s.orderId);
        if (o) { o.routeId = r.id; o.partnerId = r.partnerId; S.orderStatus(o.id, 'assigned', 'Grouped into route ' + r.id + ' (' + r.slotLabel + ')'); }
      });
      if (p) { p.status = 'on_route'; p.activeRoute = r.id; }
      S.notify({ role: 'partner', roleId: r.partnerId, type: 'route', title: 'Route accepted', body: r.stopsList.length + ' deliveries · ' + r.distanceKm + ' km · est. ₹' + r.earnings });
      r.stopsList.forEach(s => S.notify({ role: 'customer', roleId: s.customerId, type: 'delivery', title: 'Your order is on the way', body: s.orderId + ' will arrive in the ' + r.slotLabel + ' slot. Track it live.', orderId: s.orderId }));
      S.audit(r.partnerId, 'partner', 'route.accepted', r.id + ' · ' + r.stopsList.length + ' stops · ' + r.distanceKm + ' km · ₹' + r.earnings);
      S.ev('route_assigned', r.totalKg, null);
      S.touch('route:accept'); return { ok: true, route: r };
    },

    advanceRoute(routeId) {
      const r = S.route(routeId); if (!r) return { ok: false };
      const seq = ['assigned', 'to_vendor', 'picked_up', 'delivering', 'completed'];
      const i = seq.indexOf(r.status); if (i < 0 || i === seq.length - 1) return { ok: false };
      r.status = seq[i + 1];
      const now = Date.now();
      if (r.status === 'to_vendor') { r.departedAt = now; S.audit(r.partnerId, 'partner', 'route.departed', r.id + ' heading to ' + r.vendorName); }
      if (r.status === 'picked_up') {
        r.pickedAt = now; r.totalKg += 0;
        r.stopsList.forEach(s => { const o = S.order(s.orderId); if (o) S.orderStatus(o.id, 'picked_up', 'Collected from ' + r.vendorName); });
        const b = S.batch(r.stopsList[0] && S.order(r.stopsList[0].orderId) ? S.order(r.stopsList[0].orderId).batchId : null);
        S.audit(r.partnerId, 'partner', 'route.picked_up', r.id + ' collected ' + r.totalKg + ' kg from ' + r.vendorName);
        S.ev('in_transit', r.totalKg, b ? b.trackingId : null);
      }
      if (r.status === 'delivering') r.stopsList.forEach(s => { const o = S.order(s.orderId); if (o && o.status !== 'delivered') S.orderStatus(o.id, 'out_for_delivery', 'Out for delivery — stop ' + (r.stopsList.indexOf(s) + 1) + ' of ' + r.stopsList.length); });
      if (r.status === 'completed') S.completeRoute(r.id);
      S.notify({ role: 'partner', roleId: r.partnerId, type: 'route', title: 'Route update', body: 'Status → ' + r.status.replace('_', ' ') });
      S.touch('route:advance', { routeId }); return { ok: true, status: r.status };
    },

    deliverStop(routeId, idx) {
      const r = S.route(routeId); if (!r) return { ok: false };
      const s = r.stopsList[idx]; if (!s || s.done) return { ok: false };
      s.done = true; s.doneAt = Date.now();
      const o = S.order(s.orderId);
      if (o) S.orderStatus(o.id, 'delivered', 'Handed over at ' + s.address);
      r.doneCount = r.stopsList.filter(x => x.done).length;
      const p = S.partner(r.partnerId);
      const leg = Math.round(s.dropFee + s.km * p.perKm);
      p.todayEarnings += leg; p.todayDeliveries += 1; p.totalEarnings += leg;
      r.earnedSoFar = (r.earnedSoFar || 0) + leg;
      if (r.doneCount >= r.stopsList.length) { r.status = 'completed'; S.completeRoute(r.id); }
      else r.status = 'delivering';
      S.touch('route:stop', { routeId, idx });
      return { ok: true, earned: leg };
    },

    completeRoute(routeId) {
      const r = S.route(routeId); if (!r || r.completedAt) return;
      r.completedAt = Date.now(); r.status = 'completed';
      const p = S.partner(r.partnerId);
      if (p) { p.status = 'idle'; p.activeRoute = null; }
      r.stopsList.forEach((s, i) => { if (!s.done) { s.done = true; s.doneAt = Date.now(); const o = S.order(s.orderId); if (o && o.status !== 'delivered') S.orderStatus(o.id, 'delivered', 'Auto-completed at end of route'); } });
      r.doneCount = r.stopsList.length;
      S.notify({ role: 'partner', roleId: r.partnerId, type: 'earnings', title: 'Route completed 💰', body: r.stopsList.length + ' deliveries · ₹' + r.earnings + ' earned in the ' + r.slotLabel + ' slot.' });
      S.audit(r.partnerId, 'partner', 'route.completed', r.id + ' · ' + r.stopsList.length + ' drops · ' + r.distanceKm + ' km · ₹' + r.earnings + ' · saved ' + r.savedKm + ' km vs direct trips');
      S.ev('route_completed', r.totalKg, null);
      AG.algo.pipelineHealth(store);
      S.touch('route:complete', { routeId });
    },

    /* vendor confirms / marks ready */
    confirmOrder(orderId) {
      const o = S.order(orderId); if (!o) return;
      S.orderStatus(orderId, 'confirmed', 'Vendor confirmed stock from 70% reserved allocation');
      S.notify({ role: 'customer', roleId: o.customerId, type: 'order', title: 'Order confirmed', body: o.id + ' confirmed by ' + S.vendor(o.vendorId).name + '. Slot ' + o.slotLabel + '.' });
    },
    markOrderReady(orderId) {
      const o = S.order(orderId); if (!o) return;
      S.orderStatus(orderId, 'ready', 'Packed and ready for delivery partner pickup');
      const routes = AG.algo.buildRoutes(store, o.slot);
      S.notify({ role: 'partner', roleId: '*', type: 'job', title: 'New delivery job', body: routes.length + ' optimised route(s) offered for the ' + o.slotLabel + ' slot.' });
      S.touch('order:ready', { routes: routes.map(r => r.id) });
      return routes;
    },

    /* ================= GOVERNMENT ================= */
    metrics() { return AG.algo.metrics(store); },
    trace(q) { return AG.algo.trace(q, store); },

    /** Demo helper: inject a simulated anomaly so monitoring has something to show. */
    injectAnomaly(kind) {
      const k = kind || 'mismatch';
      if (k === 'mismatch') {
        const b = store.batches.find(x => S.batchStock(x).reservedLeft > 20) || store.batches[0];
        if (!b) return null;
        const lost = Math.round(b.qtyKg * 0.08);
        b.wastageKg = round((b.wastageKg || 0) + lost, 1);
        b.movements.push({ ts: Date.now(), stage: 'anomaly', qtyKg: -lost, actor: 'Unknown', note: 'Unexplained stock reduction detected during audit' });
        store.counters.wastageKg += lost;
        return S.raiseAlert({
          type: 'stock_mismatch', severity: 'high', title: 'Stock mismatch detected',
          message: b.id + ' (' + b.trackingId + ') shows ' + lost + ' kg unaccounted for. Physical stock does not match the recorded ledger.',
          entityId: b.id, vendorId: b.vendorId, farmerId: b.farmerId, trackingId: b.trackingId,
          trail: AG.algo.trailFor(b, store), metrics: { expected: b.qtyKg + ' kg', missing: lost + ' kg', variance: round(lost / b.qtyKg * 100, 1) + '%' }
        });
      }
      if (k === 'movement') {
        const v = store.vendors.find(x => !x.frozen);
        return S.raiseAlert({
          type: 'excessive_movement', severity: 'medium', title: 'Excessive stock movement flagged',
          message: v.name + ' moved 4 batches out of its godown within 2 hours — 3.1× the normal rate for this vendor.',
          entityId: v.id, vendorId: v.id, trail: [{ ts: Date.now(), who: v.name, what: '4 outbound movements in 2h', where: v.area }],
          metrics: { normal: '1.3 moves/h', observed: '4 moves/2h', factor: '3.1×' }
        });
      }
      if (k === 'duplicate') {
        const o = store.orders[0];
        return S.raiseAlert({
          type: 'duplicate_txn', severity: 'medium', title: 'Duplicate / suspicious transaction',
          message: 'Two identical settlements (' + (o ? o.id : 'ORD-100') + ') of the same amount from the same customer within 40 seconds.',
          entityId: o ? o.id : null, vendorId: o ? o.vendorId : null,
          trail: o ? [{ ts: o.placedAt, who: S.customer(o.customerId).name, what: 'Order ' + o.id + ' ₹' + o.total, where: o.address }, { ts: o.placedAt + 40000, who: S.customer(o.customerId).name, what: 'Duplicate settlement ₹' + o.total, where: o.address }] : [],
          metrics: { count: 2, window: '40 s', amount: o ? '₹' + o.total : '—' }
        });
      }
      return null;
    }
  };

  AG.store = S;
})(typeof window !== 'undefined' ? window : globalThis);
