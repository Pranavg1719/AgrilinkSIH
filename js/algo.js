/* ============================================================
   AGRILINK — ALGORITHMS (all simulated for the prototype)
   ALGO 1 · Crop + Price Intelligence
   ALGO 2 · Matching + Route Optimisation
   ALGO 3 · Security + Compliance
   ALGO 4 · Pipeline Health Monitor
   ============================================================ */
(function (g) {
  'use strict';
  const AG = g.AG;
  const { clamp, round, roadKm, mulberry32, ri, pick } = AG.util;
  const { CROPS, CROP_BY_KEY, RESERVE_RATIO, FREE_RATIO, MAX_VENDORS_PER_CROP, DELIVERY_SLOTS } = AG.catalog;

  const DAY = 86400000;
  const riskNum = r => r === 'low' ? 90 : r === 'medium' ? 62 : 34;

  /* ==========================================================
     ALGORITHM 1 — CROP + PRICE INTELLIGENCE
     Simulated vision + agronomy + market model.
     ========================================================== */
  function analyzeCrop(input) {
    const { cropKey, qtyKg, seed, lat, lng, village, radiusKm } = input;
    const rng = mulberry32(seed || 1);
    const def = CROP_BY_KEY[cropKey] || CROPS[0];

    /* --- vision: identification with confidence --- */
    const alternatives = CROPS.filter(c => c.cat === def.cat).sort(() => rng() - .5).slice(0, 3);
    const confidence = round(90 + rng() * 9, 1);
    const detected = [{ crop: def.name, key: def.key, pct: confidence }]
      .concat(alternatives.map((a, i) => ({ crop: a.name, key: a.key, pct: round((100 - confidence) / 3 - i * 0.4, 1) })));

    /* --- quality model --- */
    const disease = round(rng() * 5.5, 1);
    const damage = round(rng() * 8 + disease * 0.4, 1);
    const freshness = round(clamp(97 - damage * 1.1 - rng() * 8, 45, 99), 0);
    const ripeness = round(clamp(58 + rng() * 38, 35, 99), 0);
    const qualityScore = round(clamp(
      freshness * 0.34 + ripeness * 0.18 + (100 - damage) * 0.28 + (100 - disease) * 0.20, 30, 99), 0);
    const grade = qualityScore >= 85 ? 'A' : qualityScore >= 72 ? 'B' : 'C';

    /* --- physical / agronomy --- */
    const moisture = round(def.moisture[0] + rng() * (def.moisture[1] - def.moisture[0]), 1);
    const shelfLife = Math.max(2, Math.round(def.shelf * (0.78 + (qualityScore / 100) * 0.34 + (rng() - .5) * 0.1)));
    const spoilageRisk = def.shelf <= 6 ? (qualityScore > 82 ? 'medium' : 'high')
      : def.shelf <= 15 ? (qualityScore > 80 ? 'low' : 'medium')
        : (qualityScore > 65 ? 'low' : 'medium');
    const sizeDist = ['Small', 'Medium', 'Large', 'Uniform'][Math.floor(rng() * 4)];
    const harvestCondition = pick(rng, ['Dry & clean', 'Field fresh', 'Sun-dried', 'Slightly damp', 'Cured well']);

    /* --- logistics --- */
    const estDist = Math.max(6, (radiusKm || 20) * 0.6);
    const perKgFreight = def.shelf <= 6 ? 1.35 : def.shelf <= 20 ? 0.95 : 0.6;
    const transportCost = Math.round(qtyKg * perKgFreight * (1 + estDist / 90) + 380 + rng() * 220);
    const transport = def.transport.slice();
    if (def.shelf <= 6 && spoilageRisk !== 'low') transport.push('Load within 4 hrs');
    if (qtyKg > 1500) transport.push('2 trips or tempo');

    /* --- market + price --- */
    const demand = clamp(Math.round(def.demand + (rng() * 22 - 11) + (qualityScore - 75) * 0.25), 18, 99);
    const base = def.farmMin + rng() * (def.farmMax - def.farmMin);
    const qAdj = (qualityScore - 74) / 100;                 /* ±26% */
    const dAdj = (demand - 70) / 220;                       /* ±14% */
    const fAdj = (freshness - 85) / 400;
    const spoilPenalty = spoilageRisk === 'high' ? -0.05 : spoilageRisk === 'medium' ? -0.02 : 0.02;
    const suggestedPrice = round(clamp(base * (1 + qAdj + dAdj + fAdj + spoilPenalty), def.farmMin * 0.75, def.farmMax * 1.45), 1);
    const minBid = round(suggestedPrice * 0.86, 1);
    const maxBid = round(suggestedPrice * (1.16 + demand / 600), 1);
    const retail = Math.round(suggestedPrice * def.retail);
    const needKg = Math.round(qtyKg * (0.6 + rng() * 1.2));

    return {
      /* 1 */ detectedCrop: def.name, cropKey: def.key, alternatives: detected, confidence,
      /* 2 */ qualityScore, grade,
      /* 3 */ freshness,
      /* 4 */ ripeness,
      /* 5 */ damage,
      /* 6 */ disease, defectNote: disease > 3.5 ? 'Minor surface spots on ~' + Math.round(disease) + '% of samples' : 'No visible disease or defect',
      /* 7 */ size: sizeDist, sizeNote: grade === 'A' ? 'Uniform grading, premium lot' : 'Mixed grading acceptable',
      /* 8 */ quantity: qtyKg,
      /* 9 */ moisture, moistureNote: moisture > 60 ? 'High moisture — ventilated crates needed' : 'Low moisture — safe for gunny bags',
      /* 10 */ location: { village: village || '—', lat: lat || 0, lng: lng || 0, gps: (lat || 0).toFixed(4) + '°N, ' + (lng || 0).toFixed(4) + '°E', taluka: 'Pune district, Maharashtra' },
      /* 11 */ harvestCondition,
      /* 12 */ shelfLife,
      /* 13 */ spoilageRisk,
      /* 14 */ transport,
      /* 15 */ transportCost, transportNote: 'Estimated for ~' + Math.round(estDist) + ' km to nearest mandi',
      /* 16 */ demand, needKg,
      /* 17 */ suggestedPrice, retailPrice: retail,
      /* 18 */ minBid, maxBid,
      /* guidance */ guidance: suggestedGuidance(grade, spoilageRisk, demand, suggestedPrice, shelfLife),
      engine: 'AGRILINK Vision-Agri v2.4 (simulated)', analysedAt: Date.now()
    };
  }

  function suggestedGuidance(grade, risk, demand, price, shelf) {
    const bits = [];
    bits.push(grade === 'A' ? 'Premium grade — ask for the upper half of the band.' : grade === 'B' ? 'Good grade — mid-band price is realistic.' : 'Lower grade — sell fast, price will be under the band.');
    bits.push(risk === 'high' ? 'High spoilage risk: sell within ' + Math.max(2, Math.round(shelf / 2)) + ' days.' : risk === 'medium' ? 'Medium risk: aim to sell within ' + Math.max(3, Math.round(shelf * 0.6)) + ' days.' : 'Low risk: you can hold for a better price.');
    bits.push(demand >= 80 ? 'Demand is strong — expect 3 quick bids.' : demand >= 60 ? 'Demand is normal.' : 'Demand is soft — widen your selling radius.');
    return bits.join(' ');
  }

  /** The bidding corridor every vendor must stay inside (Algorithm 1 output, enforced by Algorithm 3). */
  function bidBand(crop) {
    const a = crop.analysis;
    const urgency = a.spoilageRisk === 'high' ? 0.97 : 1;
    return {
      min: round(a.minBid * urgency, 1), max: round(a.maxBid, 1),
      suggested: round(a.suggestedPrice, 1), retail: a.retailPrice,
      reason: 'AI band from grade ' + a.grade + ', demand ' + a.demand + '%, shelf life ' + a.shelfLife + ' days and ' + a.spoilageRisk + ' spoilage risk.'
    };
  }

  /* ==========================================================
     ALGORITHM 2 — MATCHING + ROUTE OPTIMISATION
     Objective is NOT simply "nearest vendor":
     quality + demand + distance + shelf life + transport cost
     + vendor capacity + spoilage risk.
     ========================================================== */
  const WEIGHTS = [
    { k: 'distance', w: 0.18, label: 'Distance' },
    { k: 'quality', w: 0.16, label: 'Crop quality' },
    { k: 'demand', w: 0.12, label: 'Market demand' },
    { k: 'price', w: 0.10, label: 'Price fit' },
    { k: 'shelf', w: 0.14, label: 'Shelf life vs transit' },
    { k: 'spoil', w: 0.10, label: 'Spoilage risk' },
    { k: 'transport', w: 0.08, label: 'Transport cost' },
    { k: 'capacity', w: 0.12, label: 'Vendor capacity' }
  ];

  function scoreVendorForCrop(crop, vendor, state) {
    const farmer = state.farmers.find(f => f.id === crop.farmerId);
    const a = crop.analysis;
    const d = roadKm(farmer, vendor);
    const inside = d <= crop.radiusKm;
    const transitH = d / 26;

    const f = {
      distance: clamp(100 - (d / Math.max(crop.radiusKm, 1)) * 100, 0, 100),
      quality: clamp(a.qualityScore + (vendor.speciality.includes(crop.cropKey) ? 8 : 0), 0, 100),
      demand: clamp(a.demand + (vendor.rating - 4) * 12, 0, 100),
      price: clamp(100 - Math.abs(a.suggestedPrice - (a.minBid + a.maxBid) / 2) / a.suggestedPrice * 220 + vendor.rating * 4, 0, 100),
      shelf: clamp((a.shelfLife * 24) / Math.max(6, transitH * 8 + 20) * 22, 0, 100),
      spoil: riskNum(a.spoilageRisk),
      transport: clamp(100 - (a.transportCost / Math.max(1, crop.qtyKg * a.suggestedPrice)) * 340, 0, 100),
      capacity: clamp(((vendor.capacityKg - vendor.usedKg) / Math.max(crop.qtyKg, 1)) * 62, 0, 100)
    };
    let score = WEIGHTS.reduce((s, w) => s + f[w.k] * w.w, 0);
    score += (vendor.rating - 4) * 5;
    if (!inside) score -= 26;
    if (vendor.frozen) score -= 120;
    if (crop.bids.length >= MAX_VENDORS_PER_CROP && !crop.bids.some(b => b.vendorId === vendor.id)) score -= 200;
    score = round(clamp(score, 0, 99), 0);

    return {
      vendor, score, factors: f, distanceKm: round(d, 1), inside,
      etaHrs: round(transitH + 0.6, 1), transitH: round(transitH, 1),
      freeCapacity: Math.max(0, vendor.capacityKg - vendor.usedKg),
      why: score > 78 ? 'Excellent fit — quality, distance and capacity all align'
        : score > 60 ? 'Good fit — minor trade-off in ' + (f.capacity < 55 ? 'capacity' : f.distance < 55 ? 'distance' : 'transit time')
          : 'Possible fit — accept only with care'
    };
  }

  function matchVendorsForCrop(crop, state) {
    const scored = state.vendors.map(v => scoreVendorForCrop(crop, v, state)).sort((a, b) => b.score - a.score);
    const inside = scored.filter(m => m.inside);
    const outside = scored.filter(m => !m.inside).sort((a, b) => a.distanceKm - b.distanceKm);
    /* hard rule: maximum 3 vendors connect / bid for one farmer's crop */
    const picked = inside.slice(0, MAX_VENDORS_PER_CROP);
    let i = 0;
    while (picked.length < MAX_VENDORS_PER_CROP && i < outside.length) {
      const m = outside[i++];
      if (m.distanceKm <= Math.max(crop.radiusKm * 2.6, 60)) { m.justOutside = true; picked.push(m); }
    }
    picked.sort((a, b) => b.score - a.score);
    const rest = scored.filter(m => picked.indexOf(m) < 0).map(m => Object.assign({}, m, { notInvited: true }));
    return picked.concat(rest);
  }

  /** After a farmer picks a winner, losing vendors are pushed toward other suitable farmers. */
  function recommendForVendor(vendorId, state, excludeCropId) {
    const v = state.vendors.find(x => x.id === vendorId);
    if (!v) return [];
    const open = state.crops.filter(c =>
      c.id !== excludeCropId &&
      ['posted', 'matched', 'bidding'].includes(c.status) &&
      c.bids.length < MAX_VENDORS_PER_CROP &&
      !c.bids.some(b => b.vendorId === vendorId));
    return open.map(c => {
      const m = scoreVendorForCrop(c, v, state);
      return { crop: c, score: m.score, distanceKm: m.distanceKm, etaHrs: m.etaHrs, factors: m.factors, band: bidBand(c) };
    }).sort((a, b) => b.score - a.score);
  }

  /** Opportunities feed for a vendor (home screen). */
  function opportunitiesForVendor(vendorId, state) {
    const v = state.vendors.find(x => x.id === vendorId); if (!v) return [];
    const cands = state.crops.filter(c => ['posted', 'matched', 'bidding', 'awarded', 'pickup_scheduled'].includes(c.status));
    return cands.map(c => {
      const m = scoreVendorForCrop(c, v, state);
      const myBid = c.bids.find(b => b.vendorId === vendorId);
      return Object.assign(m, {
        crop: c, invited: c.notifiedVendors.includes(vendorId), bid: myBid, band: bidBand(c),
        canBid: !myBid && c.bids.length < MAX_VENDORS_PER_CROP && ['posted', 'matched', 'bidding'].includes(c.status) && !v.frozen,
        won: c.winnerBidId && myBid && myBid.id === c.winnerBidId
      });
    }).sort((a, b) => (b.canBid - a.canBid) || (b.invited - a.invited) || (b.score - a.score));
  }

  /* -------- delivery slots & route optimisation -------- */
  function slotCapacity(slotId, state) {
    const slot = DELIVERY_SLOTS.find(s => s.id === slotId);
    const used = state.orders.filter(o => o.slot === slotId && !['delivered', 'cancelled', 'completed'].includes(o.status)).length;
    const today = state.orders.filter(o => o.slot === slotId).length;
    const freePartners = state.partners.filter(p => p.status === 'idle' || !p.activeRoute);
    const capacity = Math.min(slot.capacity, freePartners.length * 7);
    return {
      slot, capacity, used, left: Math.max(0, capacity - used), totalToday: today,
      partnersAvailable: freePartners.length,
      load: Math.round((used / Math.max(1, capacity)) * 100),
      recommended: used < capacity * 0.6
    };
  }

  function pathDistance(points) {
    let d = 0;
    for (let i = 1; i < points.length; i++) d += roadKm(points[i - 1], points[i]);
    return round(d, 1);
  }
  /** nearest-neighbour 2-opt-lite ordering (mock traffic factor applied) */
  function optimiseOrder(start, nodes) {
    const remaining = nodes.slice();
    const path = [start];
    let cur = start;
    while (remaining.length) {
      let bi = 0, bd = Infinity;
      remaining.forEach((n, i) => { const d = roadKm(cur, n); if (d < bd) { bd = d; bi = i; } });
      cur = remaining.splice(bi, 1)[0]; path.push(cur);
    }
    /* single improvement pass: try swapping adjacent pairs */
    let best = pathDistance(path), improved = true, guard = 0;
    while (improved && guard++ < 12) {
      improved = false;
      for (let i = 1; i < path.length - 1; i++) {
        const cand = path.slice(); const t = cand[i]; cand[i] = cand[i + 1]; cand[i + 1] = t;
        const d = pathDistance(cand);
        if (d < best - 0.05) { best = d; path.splice(0, path.length, ...cand); improved = true; }
      }
    }
    return { path: path.slice(1), km: best };
  }

  function buildRoutes(state, slotId) {
    /* remove un-accepted offers for this slot, then rebuild (idempotent) */
    state.routes = state.routes.filter(r => !(r.slot === slotId && r.status === 'open'));
    const openOrders = state.orders.filter(o => o.slot === slotId && ['placed', 'confirmed', 'ready'].includes(o.status) && !o.routeId);
    if (!openOrders.length) return [];
    const slot = DELIVERY_SLOTS.find(s => s.id === slotId);
    const byVendor = {};
    openOrders.forEach(o => { (byVendor[o.vendorId] = byVendor[o.vendorId] || []).push(o); });
    const idle = state.partners.filter(p => !p.activeRoute);
    const created = [];

    Object.keys(byVendor).forEach(vid => {
      const v = state.vendors.find(x => x.id === vid);
      const orders = byVendor[vid];
      /* chunk by the biggest available vehicle capacity */
      const bestPartner = idle.slice().sort((a, b) => b.capKg - a.capKg)[0] || state.partners[0];
      const capKg = bestPartner.capKg;
      let chunk = [], chunkKg = 0;
      const flush = () => {
        if (!chunk.length) return;
        const nodes = chunk.map(o => {
          const c = state.customers.find(x => x.id === o.customerId);
          return { o, lat: c.lat, lng: c.lng, name: c.name, area: c.area };
        });
        const opt = optimiseOrder(v, nodes);
        const naiveKm = round(nodes.reduce((s, n) => s + roadKm(v, n) * 2, 0), 1);
        const stops = opt.path.map((n, i) => ({
          seq: i + 1, orderId: n.o.id, customerId: n.o.customerId, customerName: n.name, address: n.area,
          lat: n.lat, lng: n.lng, qtyKg: n.o.qtyKg, cropName: n.o.cropName, batchId: n.o.batchId,
          trackingId: n.o.trackingId, km: i === 0 ? round(roadKm(v, n), 1) : round(roadKm(opt.path[i - 1], n), 1), done: false
        }));
        const totalKg = round(chunk.reduce((s, o) => s + o.qtyKg, 0), 1);
        const p = pickPartner(idle.length ? idle : state.partners, v, totalKg, state);
        const traffic = 1.22 + (slot.start >= 17 ? 0.22 : slot.start >= 11 && slot.start <= 15 ? 0.12 : 0);
        const driveMin = Math.round(opt.km / p.speedKmph * 60 * traffic);
        const handleMin = stops.length * 6;
        const etaMin = driveMin + handleMin + 18;
        const peakBonus = slot.start === 13 || slot.start === 17 ? 60 : 0;
        const earnings = Math.round(stops.length * p.perDrop + opt.km * p.perKm + peakBonus + totalKg * 0.55);
        stops.forEach(s => { s.dropFee = p.perDrop; });
        const r = {
          id: AG.store.nid('route'), slot: slotId, slotLabel: slot.label, status: 'open',
          vendorId: v.id, vendorName: v.name, vendorLat: v.lat, vendorLng: v.lng,
          partnerId: p.id, partnerName: p.name, suggestedPartner: p.id, vehicle: p.vehicle,
          stopsList: stops, stops: stops.length, totalKg, distanceKm: opt.km, naiveKm,
          savedKm: round(naiveKm - opt.km, 1), savedPct: Math.round((naiveKm - opt.km) / naiveKm * 100),
          etaMin, driveMin, handleMin, earnings, perKm: p.perKm, perDrop: p.perDrop,
          orderIds: stops.map(s => s.orderId), createdAt: Date.now(), acceptedAt: null, completedAt: null,
          doneCount: 0, earnedSoFar: 0, trafficFactor: round(traffic, 2),
          grouping: 'Algorithm 2 grouped ' + stops.length + ' customer orders from ' + v.name + ' into one nearest-neighbour route.'
        };
        state.routes.unshift(r);
        created.push(r);
        chunk = []; chunkKg = 0;
      };
      orders.forEach(o => {
        if (chunkKg + o.qtyKg > capKg && chunk.length) flush();
        chunk.push(o); chunkKg += o.qtyKg;
      });
      flush();
    });

    created.forEach(r => {
      AG.store.notify({
        role: 'partner', roleId: '*', type: 'job', title: 'Optimised route available',
        body: r.slotLabel + ' · ' + r.stops + ' drops · ' + r.distanceKm + ' km · est. ₹' + r.earnings + ' · from ' + r.vendorName, routeId: r.id
      });
      AG.store.audit('SYSTEM', 'algorithm', 'algo2.route_built', r.id + ' · ' + r.stops + ' stops · ' + r.distanceKm + ' km optimised vs ' + r.naiveKm + ' km direct (saved ' + r.savedKm + ' km)');
      AG.store.ev('route_offered', r.totalKg, null);
    });
    return created;
  }

  function pickPartner(partners, vendor, kg, state) {
    const fits = partners.filter(p => p.capKg >= kg);
    const pool = fits.length ? fits : partners;
    return pool.slice().sort((a, b) => {
      const da = roadKm(vendor, a), db = roadKm(vendor, b);
      const sa = a.rating * 6 - da * 0.8 + (a.capKg >= kg ? 8 : -20);
      const sb = b.rating * 6 - db * 0.8 + (b.capKg >= kg ? 8 : -20);
      return sb - sa;
    })[0];
  }

  /** Re-price a route for the partner who actually accepts it. */
  function recalcRouteForPartner(r, partnerId, state) {
    const p = state.partners.find(x => x.id === partnerId); if (!p || !r) return r;
    r.partnerId = p.id; r.partnerName = p.name; r.vehicle = p.vehicle; r.perKm = p.perKm; r.perDrop = p.perDrop;
    const slot = DELIVERY_SLOTS.find(s => s.id === r.slot);
    const peakBonus = slot && (slot.start === 13 || slot.start === 17) ? 60 : 0;
    r.earnings = Math.round(r.stops * p.perDrop + r.distanceKm * p.perKm + peakBonus + r.totalKg * 0.55);
    r.stopsList.forEach(s => s.dropFee = p.perDrop);
    const traffic = r.trafficFactor || 1.25;
    r.driveMin = Math.round(r.distanceKm / p.speedKmph * 60 * traffic);
    r.etaMin = r.driveMin + r.stops * 6 + 18;
    return r;
  }

  /* ==========================================================
     ALGORITHM 3 — SECURITY + COMPLIANCE
     ========================================================== */
  function trailFor(batch, state) {
    const crop = state.crops.find(c => c.id === batch.cropId);
    const farmer = state.farmers.find(f => f.id === batch.farmerId);
    const vendor = state.vendors.find(v => v.id === batch.vendorId);
    const orders = state.orders.filter(o => o.batchId === batch.id);
    const t = [
      { ts: crop ? crop.createdAt : batch.receivedAt, who: farmer ? farmer.name : '—', what: batch.qtyKg + ' kg ' + batch.cropName + ' harvested, AI graded ' + batch.grade, where: farmer ? farmer.village : '—' },
      { ts: crop ? crop.awardedAt || crop.createdAt : batch.receivedAt, who: vendor ? vendor.name : '—', what: 'Won bid at ₹' + batch.pricePerKgFarm + '/kg', where: vendor ? vendor.area : '—' },
      { ts: batch.receivedAt, who: vendor ? vendor.name : '—', what: 'Batch received → ' + batch.freeKg + ' kg free (30%) / ' + batch.reservedKg + ' kg reserved (70%)', where: batch.id }
    ];
    batch.movements.slice(2).forEach(m => t.push({ ts: m.ts, who: m.actor, what: m.note + ' (' + m.qtyKg + ' kg)', where: m.stage }));
    orders.slice(0, 6).forEach(o => {
      const c = state.customers.find(x => x.id === o.customerId);
      const p = o.partnerId ? state.partners.find(x => x.id === o.partnerId) : null;
      t.push({ ts: o.placedAt, who: c ? c.name : 'Customer', what: 'Reserved stock allocated: ' + o.qtyKg + ' kg · order ' + o.id + ' · slot ' + o.slotLabel, where: c ? c.area : '—' });
      if (p && o.deliveredAt) t.push({ ts: o.deliveredAt, who: p.name, what: 'Delivered ' + o.qtyKg + ' kg to ' + (c ? c.name : 'customer') + ' (' + o.id + ')', where: c ? c.area : '—' });
    });
    return t.sort((a, b) => a.ts - b.ts);
  }

  function complianceScanBatch(b, state) {
    const problems = [];
    const sum = b.freeKg + b.reservedKg;
    if (Math.abs(sum - b.qtyKg) > 0.5) problems.push({ type: 'stock_mismatch', severity: 'high', msg: 'Ledger mismatch: 30/70 split (' + sum + ' kg) ≠ received quantity (' + b.qtyKg + ' kg).' });
    if (b.freeKg / b.qtyKg > FREE_RATIO + 0.001) problems.push({ type: 'allocation_violation', severity: 'high', msg: 'Free allocation is ' + Math.round(b.freeKg / b.qtyKg * 100) + '% — above the 30% cap.' });
    if (b.reservedKg / b.qtyKg < RESERVE_RATIO - 0.001) problems.push({ type: 'allocation_violation', severity: 'high', msg: 'Reserved stock is only ' + Math.round(b.reservedKg / b.qtyKg * 100) + '% — below the mandatory 70%.' });
    if ((b.freeUsedKg || 0) > b.freeKg + 0.001) problems.push({ type: 'allocation_violation', severity: 'high', msg: 'Private sale exceeded the 30% free allocation by ' + round(b.freeUsedKg - b.freeKg, 1) + ' kg.' });
    const ratio = b.retailPrice / Math.max(0.1, b.pricePerKgFarm);
    if (ratio > 2.0 && !b.frozen) problems.push({ type: 'price_anomaly', severity: 'medium', msg: 'Retail ₹' + b.retailPrice + '/kg is ' + round(ratio, 2) + '× the farm-gate price ₹' + b.pricePerKgFarm + '/kg (screening threshold 2.0×).' });
    const consumed = (b.freeUsedKg || 0) + (b.reservedSoldKg || 0) + (b.reservedAllocatedKg || 0) + (b.wastageKg || 0);
    if (consumed > b.qtyKg + 0.5) problems.push({ type: 'stock_mismatch', severity: 'high', msg: 'Consumption ' + round(consumed, 1) + ' kg exceeds batch total ' + b.qtyKg + ' kg.' });
    problems.forEach(p => {
      state.__lastScan = p;
      AG.store.raiseAlert(Object.assign({}, p, {
        title: p.type === 'price_anomaly' ? 'Abnormal retail price detected' : 'Potential stock allocation violation detected',
        entityId: b.id, vendorId: b.vendorId, farmerId: b.farmerId, trackingId: b.trackingId,
        trail: trailFor(b, state), metrics: { batch: b.id, total: b.qtyKg + ' kg', free: b.freeKg + ' kg', reserved: b.reservedKg + ' kg' }
      }));
    });
    if (!problems.length) AG.store.audit('SYSTEM', 'algorithm', 'algo3.pass', 'Compliance OK for ' + b.id + ' (30/70 intact, price corridor normal)');
    return problems;
  }

  function complianceScanOrder(o, state) {
    const b = state.batches.find(x => x.id === o.batchId); if (!b) return [];
    const problems = [];
    if (!o.trackingId) problems.push({ type: 'traceability_gap', severity: 'medium', msg: 'Order ' + o.id + ' has no tracking ID — chain of custody incomplete.' });
    if (o.qtyKg > b.reservedKg + 0.001) problems.push({ type: 'unauthorised_allocation', severity: 'high', msg: 'Order ' + o.id + ' draws more than the reserved allocation of ' + b.id + '.' });
    const dup = state.orders.filter(x => x.customerId === o.customerId && x.total === o.total && Math.abs(x.placedAt - o.placedAt) < 60000 && x.id !== o.id);
    if (dup.length) problems.push({ type: 'duplicate_txn', severity: 'medium', msg: 'Possible duplicate transaction: ' + dup.map(d => d.id).join(', ') + ' match ' + o.id + '.' });
    problems.forEach(p => AG.store.raiseAlert(Object.assign({}, p, {
      title: p.type === 'duplicate_txn' ? 'Duplicate / suspicious transaction' : 'Unauthorised allocation attempt',
      entityId: o.id, vendorId: o.vendorId, trackingId: o.trackingId, trail: trailFor(b, state)
    })));
    if (!problems.length) AG.store.audit('SYSTEM', 'algorithm', 'algo3.pass', 'Transaction validated: ' + o.id + ' (' + o.qtyKg + ' kg from reserved stock, chain of custody intact)');
    return problems;
  }

  function verifyActor(role, id, state) {
    const e = AG.store.entity(role, id);
    if (!e) return { ok: false, reason: 'unknown user' };
    const checks = [
      { k: 'identity', ok: !!e.name },
      { k: 'phone', ok: !!e.phone || role === 'vendor' },
      { k: 'govt_id', ok: !!(e.aadhaarMask || e.gst || e.dl || e.verified) },
      { k: 'geo', ok: !!(e.lat && e.lng) },
      { k: 'role_match', ok: (role === 'farmer' ? !!e.acres : role === 'vendor' ? !!e.licence : role === 'partner' ? !!e.dl : true) },
      { k: 'not_frozen', ok: !e.frozen }
    ];
    return { ok: checks.every(c => c.ok), checks, subject: e };
  }

  /** Full compliance sweep used by the government dashboard. */
  function complianceSweep(state) {
    const out = { scanned: 0, violations: 0, items: [] };
    state.batches.forEach(b => {
      out.scanned++;
      const st = AG.store.batchStock(b);
      const freePct = b.qtyKg ? (b.freeKg / b.qtyKg) : 0;
      const consumedPct = b.qtyKg ? st.consumed / b.qtyKg : 0;
      if (freePct > FREE_RATIO + 0.001 || consumedPct > 1.02) { out.violations++; out.items.push({ id: b.id, kind: 'allocation', vendorId: b.vendorId }); }
      if ((b.freeUsedKg || 0) / b.qtyKg > FREE_RATIO + 0.05) { out.violations++; out.items.push({ id: b.id, kind: 'over-use', vendorId: b.vendorId }); }
    });
    state.orders.forEach(o => { out.scanned++; if (!o.trackingId) { out.violations++; out.items.push({ id: o.id, kind: 'traceability' }); } });
    return out;
  }

  /* ==========================================================
     ALGORITHM 4 — PIPELINE HEALTH MONITOR
     ========================================================== */
  function pipelineHealth(state) {
    const now = Date.now();
    const checks = [];
    const openCrops = state.crops.filter(c => ['posted', 'matched', 'bidding'].includes(c.status));
    const staleCrops = openCrops.filter(c => now - c.createdAt > 3 * DAY && c.bids.length === 0);
    checks.push({ id: 'f2v', label: 'Farmer → Vendor', ok: staleCrops.length === 0, level: staleCrops.length ? 'warn' : 'ok', detail: staleCrops.length ? staleCrops.length + ' crop lot(s) waiting > 3 days with no bid' : openCrops.length + ' lot(s) live, all matched within radius', metric: openCrops.length + ' active' });

    const awaitingPickup = state.crops.filter(c => ['awarded', 'pickup_scheduled'].includes(c.status));
    const stuckPickup = awaitingPickup.filter(c => now - (c.awardedAt || now) > 2 * DAY);
    checks.push({ id: 'v2i', label: 'Vendor → Inventory', ok: stuckPickup.length === 0, level: stuckPickup.length ? 'warn' : 'ok', detail: stuckPickup.length ? stuckPickup.length + ' won lot(s) not collected yet' : awaitingPickup.length + ' lot(s) queued for handover, none overdue', metric: awaitingPickup.length + ' queued' });

    const activeBatches = state.batches.filter(b => !b.frozen && (AG.store.batchStock(b).reservedLeft > 0 || AG.store.batchStock(b).freeLeft > 0));
    const expiryRisk = activeBatches.filter(b => AG.store.batchStock(b).daysLeft <= 2);
    checks.push({ id: 'i2c', label: 'Inventory → Customer', ok: expiryRisk.length === 0, level: expiryRisk.length ? 'warn' : 'ok', detail: expiryRisk.length ? expiryRisk.length + ' batch(es) expiring within 2 days with stock left' : activeBatches.length + ' batch(es) flowing to customers on schedule', metric: activeBatches.length + ' batches' });

    const readyOrders = state.orders.filter(o => ['placed', 'confirmed', 'ready'].includes(o.status));
    const noRoute = readyOrders.filter(o => !state.routes.some(r => r.slot === o.slot && r.orderIds.includes(o.id)));
    checks.push({ id: 'v2p', label: 'Vendor → Delivery Partner', ok: noRoute.length === 0, level: noRoute.length > 1 ? 'warn' : 'ok', detail: noRoute.length ? noRoute.length + ' order(s) without a route offer yet' : readyOrders.length + ' order(s) grouped into routes', metric: readyOrders.length + ' orders' });

    const liveRoutes = state.routes.filter(r => ['assigned', 'to_vendor', 'picked_up', 'delivering'].includes(r.status));
    const stuckRoutes = liveRoutes.filter(r => now - (r.acceptedAt || now) > 6 * 3600000 && r.status === 'assigned');
    checks.push({ id: 'p2c', label: 'Delivery Partner → Customer', ok: stuckRoutes.length === 0, level: stuckRoutes.length ? 'warn' : 'ok', detail: stuckRoutes.length ? stuckRoutes.length + ' accepted route(s) idle for > 6 hrs' : liveRoutes.length + ' route(s) moving normally', metric: liveRoutes.length + ' on road' });

    const unpaid = state.orders.filter(o => ['delivered', 'completed'].includes(o.status) && o.payment !== 'paid');
    checks.push({ id: 'pay', label: 'Payments & Settlements', ok: unpaid.length === 0, level: unpaid.length ? 'warn' : 'ok', detail: unpaid.length ? unpaid.length + ' delivered order(s) unsettled' : state.payments.length + ' settlements recorded, all reconciled', metric: state.payments.length + ' txns' });

    const reserveBad = state.batches.filter(b => !b.frozen && (b.freeKg / b.qtyKg > FREE_RATIO + 0.001 || (b.freeUsedKg || 0) > b.freeKg + 0.001));
    checks.push({ id: 'reserve', label: 'Reserved 70% Stock Integrity', ok: reserveBad.length === 0, level: reserveBad.length ? 'fail' : 'ok', detail: reserveBad.length ? reserveBad.length + ' batch(es) breach the 70% reservation rule' : 'All ' + state.batches.length + ' batches hold the 30/70 split', metric: '30 / 70 rule' });

    const conservationBad = state.batches.filter(b => !b.frozen && Math.abs(b.freeKg + b.reservedKg - b.qtyKg) > 0.5);
    checks.push({ id: 'conservation', label: 'Stock Conservation & Ownership', ok: conservationBad.length === 0, level: conservationBad.length ? 'fail' : 'ok', detail: conservationBad.length ? conservationBad.length + ' batch(es) fail ledger conservation' : 'Chain of custody intact for every tracking ID', metric: state.batches.length + ' batches' });

    const unverified = state.farmers.filter(f => !f.verified).length + state.vendors.filter(v => !v.verified).length;
    checks.push({ id: 'verify', label: 'User & Role Verification', ok: unverified === 0, level: unverified ? 'warn' : 'ok', detail: unverified ? unverified + ' actor(s) pending KYC' : 'All ' + (state.farmers.length + state.vendors.length + state.partners.length + state.customers.length) + ' registered users verified', metric: 'KYC 100%' });

    const openAlerts = state.alerts.filter(a => a.status === 'open');
    checks.push({ id: 'alerts', label: 'Compliance Alerts Queue', ok: openAlerts.length <= 3, level: openAlerts.length > 5 ? 'fail' : openAlerts.length > 3 ? 'warn' : 'ok', detail: openAlerts.length + ' open alert(s) for review', metric: openAlerts.length + ' open' });

    const failN = checks.filter(c => c.level === 'fail').length;
    const warnN = checks.filter(c => c.level === 'warn').length;
    const score = clamp(Math.round(100 - failN * 14 - warnN * 5), 0, 100);
    const status = failN ? 'CRITICAL' : warnN ? 'DEGRADED' : 'OPERATIONAL';
    const result = {
      score, status, checks, failN, warnN,
      headline: status === 'OPERATIONAL' ? 'ALL SYSTEMS OPERATIONAL' : status === 'DEGRADED' ? 'PIPELINE DEGRADED — ACTION ADVISED' : 'PIPELINE CRITICAL — INTERVENTION REQUIRED',
      checkedAt: Date.now()
    };
    state.health = result;
    return result;
  }

  /* ==========================================================
     METRICS + TRACE for the government dashboard
     ========================================================== */
  function metrics(state) {
    const bStock = b => AG.store.batchStock(b);
    const atFarm = state.crops.filter(c => ['draft', 'posted', 'matched', 'bidding', 'awarded', 'pickup_scheduled'].includes(c.status));
    const inInventory = state.batches.filter(b => b.status === 'active');
    const transit = state.orders.filter(o => ['assigned', 'picked_up', 'out_for_delivery'].includes(o.status));
    const delivered = state.orders.filter(o => ['delivered', 'completed'].includes(o.status));
    const freeSold = state.batches.reduce((s, b) => s + (b.freeUsedKg || 0), 0);
    const wastage = state.batches.reduce((s, b) => s + (b.wastageKg || 0), 0);
    const reservedLeft = inInventory.reduce((s, b) => s + bStock(b).reservedLeft, 0);
    const freeLeft = inInventory.reduce((s, b) => s + bStock(b).freeLeft, 0);
    const harvested = state.crops.filter(c => c.pickedAt).reduce((s, c) => s + c.qtyKg, 0) + state.batches.reduce((s, b) => s + 0, 0);

    return {
      farmers: state.farmers.length, vendors: state.vendors.length,
      partners: state.partners.length, customers: state.customers.length,
      totalCropStock: Math.round(state.batches.reduce((s, b) => s + b.qtyKg, 0)),
      stockAtFarm: Math.round(atFarm.reduce((s, c) => s + c.qtyKg, 0)),
      reservedStock: Math.round(inInventory.reduce((s, b) => s + b.reservedKg, 0)),
      reservedAvailable: Math.round(reservedLeft),
      freeAvailable: Math.round(freeLeft),
      stockInTransit: Math.round(transit.reduce((s, o) => s + o.qtyKg, 0)),
      soldStock: Math.round(delivered.reduce((s, o) => s + o.qtyKg, 0) + freeSold),
      soldToCustomers: Math.round(delivered.reduce((s, o) => s + o.qtyKg, 0)),
      soldPrivate: Math.round(freeSold),
      wastage: Math.round(wastage),
      wastagePct: round(wastage / Math.max(1, state.batches.reduce((s, b) => s + b.qtyKg, 0)) * 100, 1),
      activeOrders: state.orders.filter(o => !['delivered', 'cancelled', 'completed'].includes(o.status)).length,
      activeBids: state.crops.reduce((s, c) => s + c.bids.filter(b => b.status === 'open').length, 0),
      completedTxn: state.payments.filter(p => p.status === 'settled').length,
      revenue: state.payments.filter(p => p.status === 'settled').reduce((s, p) => s + p.amount, 0),
      farmerIncome: state.farmers.reduce((s, f) => s + (f.earned || 0), 0),
      openAlerts: state.alerts.filter(a => a.status === 'open').length,
      highAlerts: state.alerts.filter(a => a.status === 'open' && a.severity === 'high').length,
      trackingIds: state.batches.length + state.crops.filter(c => !c.batchId).length,
      liveRoutes: state.routes.filter(r => ['assigned', 'to_vendor', 'picked_up', 'delivering'].includes(r.status)).length,
      routesCompleted: state.routes.filter(r => r.status === 'completed').length,
      kmSaved: Math.round(state.routes.reduce((s, r) => s + (r.savedKm || 0), 0)),
      harvested: Math.round(harvested),
      pipeline: [
        { stage: 'Farmer', key: 'farm', kg: Math.round(atFarm.reduce((s, c) => s + c.qtyKg, 0)), note: 'harvested / awaiting pickup' },
        { stage: 'Vendor', key: 'vendor', kg: Math.round(inInventory.reduce((s, b) => s + bStock(b).freeLeft + bStock(b).reservedLeft, 0)), note: 'in vendor godowns (30% free + 70% reserved)' },
        { stage: 'Delivery', key: 'delivery', kg: Math.round(transit.reduce((s, o) => s + o.qtyKg, 0)), note: 'in transit with partners' },
        { stage: 'Customer', key: 'customer', kg: Math.round(delivered.reduce((s, o) => s + o.qtyKg, 0)), note: 'delivered to households' }
      ],
      perFarmer: state.farmers.map(f => {
        const cs = state.crops.filter(c => c.farmerId === f.id);
        const batches = state.batches.filter(b => b.farmerId === f.id);
        return {
          id: f.id, name: f.name, village: f.village,
          originated: Math.round(cs.reduce((s, c) => s + c.qtyKg, 0)),
          sold: Math.round(batches.reduce((s, b) => s + (b.reservedSoldKg || 0) + (b.freeUsedKg || 0), 0)),
          remaining: Math.round(batches.reduce((s, b) => s + bStock(b).reservedLeft + bStock(b).freeLeft, 0)),
          reserved: Math.round(batches.reduce((s, b) => s + b.reservedKg, 0)),
          transit: Math.round(state.orders.filter(o => o.trackingId && batches.some(b => b.trackingId === o.trackingId) && ['assigned', 'picked_up', 'out_for_delivery'].includes(o.status)).reduce((s, o) => s + o.qtyKg, 0)),
          income: f.earned || 0, crops: cs.length
        };
      }).sort((a, b) => b.originated - a.originated)
    };
  }

  /** Trace any tracking ID / batch / order / actor through the whole chain. */
  function trace(q, state) {
    const s = String(q || '').trim();
    if (!s) return { found: false };
    const lc = s.toLowerCase();
    let batch = state.batches.find(b => b.trackingId.toLowerCase() === lc || b.id.toLowerCase() === lc);
    let crop = state.crops.find(c => c.trackingId.toLowerCase() === lc || c.id.toLowerCase() === lc);
    if (!batch && !crop) {
      const order = state.orders.find(o => o.id.toLowerCase() === lc);
      if (order) { batch = state.batches.find(b => b.id === order.batchId); crop = state.crops.find(c => c.id === batch.cropId); }
    }
    if (!batch && !crop) {
      const f = state.farmers.find(x => x.name.toLowerCase().includes(lc));
      if (f) {
        const cs = state.crops.filter(c => c.farmerId === f.id);
        return { found: true, kind: 'farmer', subject: f, crops: cs, batches: state.batches.filter(b => b.farmerId === f.id), orders: state.orders.filter(o => cs.some(c => c.trackingId === o.trackingId)) };
      }
      const v = state.vendors.find(x => x.name.toLowerCase().includes(lc));
      if (v) return { found: true, kind: 'vendor', subject: v, crops: state.crops.filter(c => c.vendorId === v.id), batches: state.batches.filter(b => b.vendorId === v.id), orders: state.orders.filter(o => o.vendorId === v.id) };
    }
    if (!batch && !crop) return { found: false };
    crop = crop || state.crops.find(c => c.id === batch.cropId);
    batch = batch || state.batches.find(b => b.id === crop.batchId);
    const farmer = state.farmers.find(f => f.id === crop.farmerId);
    const vendor = crop.vendorId ? state.vendors.find(v => v.id === crop.vendorId) : null;
    const orders = batch ? state.orders.filter(o => o.batchId === batch.id) : [];
    const partners = [...new Set(orders.map(o => o.partnerId).filter(Boolean))].map(id => state.partners.find(p => p.id === id));
    const customers = orders.map(o => state.customers.find(c => c.id === o.customerId));
    const stages = [
      { key: 'farmer', label: 'FARMER', name: farmer.name, place: farmer.village, qty: crop.qtyKg, at: crop.createdAt, done: true, id: farmer.id },
      { key: 'bid', label: 'BIDDING', name: crop.bids.length + ' vendor bid(s)', place: 'radius ' + crop.radiusKm + ' km', qty: crop.qtyKg, at: crop.matchedAt, done: !!crop.bids.length, id: null },
      { key: 'vendor', label: 'TRADER / VENDOR', name: vendor ? vendor.name : 'not awarded', place: vendor ? vendor.area : '—', qty: crop.qtyKg, at: crop.awardedAt, done: !!vendor, id: vendor ? vendor.id : null },
      { key: 'inventory', label: 'INVENTORY', name: batch ? batch.id : 'not received', place: batch ? (vendor ? vendor.area : '—') : '—', qty: batch ? batch.qtyKg : 0, at: batch ? batch.receivedAt : null, done: !!batch, split: batch ? { free: batch.freeKg, reserved: batch.reservedKg } : null, id: batch ? batch.id : null },
      { key: 'delivery', label: 'DELIVERY', name: partners.length ? partners.map(p => p.name).join(', ') : 'not dispatched', place: orders.length + ' order(s)', qty: orders.filter(o => ['delivered', 'completed'].includes(o.status)).reduce((s, o) => s + o.qtyKg, 0), at: orders.length ? orders[0].placedAt : null, done: orders.some(o => o.routeId), id: null },
      { key: 'customer', label: 'CUSTOMER', name: customers.length ? customers.map(c => c.name).join(', ') : '—', place: orders.length ? orders.map(o => o.address).join(', ') : '—', qty: orders.filter(o => ['delivered', 'completed'].includes(o.status)).reduce((s, o) => s + o.qtyKg, 0), at: orders.length ? (orders[0].deliveredAt || null) : null, done: orders.some(o => ['delivered', 'completed'].includes(o.status)), id: null }
    ];
    return {
      found: true, kind: 'batch', crop, batch, farmer, vendor, orders, partners, customers, stages,
      trail: batch ? trailFor(batch, state) : [],
      alerts: state.alerts.filter(a => a.trackingId === crop.trackingId || (batch && a.entityId === batch.id))
    };
  }

  /* -------- products visible to customers (from reserved stock only) -------- */
  function customerProducts(state, opts) {
    const o = opts || {};
    const cust = o.customerId ? state.customers.find(c => c.id === o.customerId) : null;
    const out = [];
    state.batches.forEach(b => {
      const st = AG.store.batchStock(b);
      if (st.reservedLeft <= 0.4 || b.frozen) return;
      const v = state.vendors.find(x => x.id === b.vendorId);
      const f = state.farmers.find(x => x.id === b.farmerId);
      if (!v || !f) return;
      const dist = cust ? roadKm(cust, v) : 8;
      if (o.maxKm && dist > o.maxKm) return;
      if (o.cat && b.cropName && o.cat !== 'All' && CROP_BY_KEY[b.cropKey] && CROP_BY_KEY[b.cropKey].cat !== o.cat) return;
      if (o.q && !(b.cropName.toLowerCase().includes(o.q.toLowerCase()) || f.name.toLowerCase().includes(o.q.toLowerCase()))) return;
      out.push({
        batchId: b.id, cropKey: b.cropKey, name: b.cropName, category: CROP_BY_KEY[b.cropKey] ? CROP_BY_KEY[b.cropKey].cat : 'Vegetable',
        price: b.retailPrice, farmPrice: b.pricePerKgFarm, available: round(st.reservedLeft, 1), grade: b.grade,
        quality: b.qualityScore, freshness: Math.max(20, Math.round(100 - (Date.now() - b.receivedAt) / DAY * (100 / Math.max(2, b.shelfLifeDays)))),
        daysLeft: st.daysLeft, shelfLife: b.shelfLifeDays, vendor: v.name, vendorArea: v.area, farmer: f.name, village: f.village,
        trackingId: b.trackingId, distanceKm: round(dist, 1), etaHrs: round(dist / 26 + 1.4, 1), spoilageRisk: b.spoilageRisk,
        unit: 'kg'
      });
    });
    return out.sort((a, b) => (a.distanceKm - b.distanceKm) || (b.quality - a.quality));
  }

  /* -------- farmer-facing market snapshot (mock) -------- */
  function marketSnapshot(state) {
    const rng = mulberry32(Math.floor(Date.now() / 3600000));
    return CROPS.slice(0, 8).map(c => ({
      key: c.key, name: c.name, mandi: pick(rng, ['Pune Market Yard', 'Baramati', 'Junnar', 'Hadapsar']),
      price: round(c.farmMin + rng() * (c.farmMax - c.farmMin), 1),
      change: round((rng() - .45) * 8, 1), demand: clamp(Math.round(c.demand + (rng() * 16 - 8)), 20, 99),
      arrivalsKg: ri(rng, 400, 9000)
    }));
  }

  function weatherMock(state) {
    const rng = mulberry32(Math.floor(Date.now() / 86400000));
    return {
      temp: ri(rng, 22, 36), condition: pick(rng, ['Sunny', 'Partly cloudy', 'Light rain', 'Humid', 'Windy']),
      rain: ri(rng, 0, 70), humidity: ri(rng, 40, 88), wind: ri(rng, 4, 22),
      advisory: pick(rng, [
        'Light rain expected in 2 days — harvest and hand over before Thursday for better price.',
        'High humidity this week. Grade-A lots will spoil faster; prefer same-day pickup.',
        'Clear weather for 4 days — good window to transport leafy and soft produce.',
        'Mandi arrivals are low this week; expect 4–8% better bids for onion and potato.'
      ])
    };
  }

  AG.algo = {
    WEIGHTS, analyzeCrop, bidBand, suggestedGuidance,
    scoreVendorForCrop, matchVendorsForCrop, recommendForVendor, opportunitiesForVendor,
    slotCapacity, buildRoutes, optimiseOrder, pathDistance, recalcRouteForPartner, pickPartner,
    trailFor, complianceScanBatch, complianceScanOrder, complianceSweep, verifyActor,
    pipelineHealth, metrics, trace, customerProducts, marketSnapshot, weatherMock
  };
})(typeof window !== 'undefined' ? window : globalThis);
