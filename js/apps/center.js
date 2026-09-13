/* ============================================================
   AGRILINK — AI / ALGORITHM CENTER
   A visible section that shows and explains the four
   engines, and lets you RUN each one live on the current data.
   ============================================================ */
(function (g) {
  'use strict';
  const AG = g.AG, U = AG.ui, S = AG.store;
  const { icon, esc, money, money1, kg, km, pill, progress } = U;
  const { cropArt, DELIVERY_SLOTS, FREE_RATIO } = AG.catalog;
  const { roadKm, haversine, fmtDate, timeAgo, round } = AG.util;
  const timeMin = k => Math.max(4, Math.round(k / 26 * 60));

  const L = { cropId: null, routeId: null };

  /** Seeded crops carry a reduced analysis; fill the gaps so the center always shows all 18 attributes. */
  function normAnalysis(a, crop, f) {
    const base = {
      detectedCrop: crop ? crop.cropName : 'Crop',
      cropKey: crop ? crop.cropKey : 'onion',
      confidence: 95.4,
      quantity: crop ? crop.qtyKg : 900,
      location: { village: f ? f.village : '—', gps: f ? f.lat.toFixed(4) + '°N, ' + f.lng.toFixed(4) + '°E' : '—', taluka: 'Pune district, Maharashtra' },
      defectNote: 'No visible disease or defect',
      sizeNote: 'Grading estimated from the photo',
      moistureNote: 'Safe for ventilated crates',
      transportNote: 'Estimated to the nearest mandi',
      needKg: Math.round((crop ? crop.qtyKg : 900) * 1.1),
      retailPrice: crop ? crop.retailPrice : Math.round(a.suggestedPrice * 2.2),
      alternatives: [],
      guidance: AG.algo.suggestedGuidance(a.grade, a.spoilageRisk, a.demand, a.suggestedPrice, a.shelfLife)
    };
    return Object.assign(base, a);
  }
  const NAV = [
    { id: 'a1', n: '1', label: 'Crop + Price Intelligence', icon: 'ai' },
    { id: 'a2', n: '2', label: 'Matching + Route Optimisation', icon: 'route' },
    { id: 'a3', n: '3', label: 'Security + Compliance', icon: 'shield' },
    { id: 'a4', n: '4', label: 'Pipeline Health Monitor', icon: 'heart' }
  ];

  function sidebar(active) {
    const h = AG.algo.pipelineHealth(S.state);
    return '<aside class="govside center"><div class="gh"><div class="em">' + icon('ai', 20) + '</div>' +
      '<div><b>AI / ALGORITHM CENTER</b><span>4 engines · all running</span></div></div>' +
      '<nav class="govnav">' + NAV.map(s =>
        '<button class="gnav" data-act="sec" data-s="' + s.id + '" aria-selected="' + (active === s.id) + '">' +
        '<span class="num">' + esc(s.n) + '</span><span class="lbl">' + esc(s.label) + '</span></button>').join('') + '</nav>' +
      '<div class="gfoot" style="color:#DCD4F7">Pipeline health<br><b style="font-size:15px">' + esc(h.headline) + '</b> · ' + h.score + '%<br><br>' +
      S.state.audit.filter(a => a.role === 'algorithm').length + ' algorithm events logged</div></aside>';
  }
  function head(t, s, tools) {
    return '<div class="govhead violet"><div><h2>' + esc(t) + '</h2><div class="sub">' + esc(s) + '</div></div>' +
      '<div class="row wrap" style="gap:8px">' + (tools || '') + '</div></div>';
  }
  function explain(title, body) {
    return '<div class="explain"><div class="et">' + icon('info', 18) + esc(title) + '</div><div class="eb">' + body + '</div></div>';
  }
  function io(ins, outs) {
    return '<div class="iogrid"><div class="iobox in"><h5>Inputs it reads</h5>' + ins.map(i => '<div class="ioline">' + icon('right', 14) + esc(i) + '</div>').join('') + '</div>' +
      '<div class="iobox out"><h5>Outputs it produces</h5>' + outs.map(o => '<div class="ioline">' + icon('check', 14) + esc(o) + '</div>').join('') + '</div></div>';
  }

  /* ============ ALGORITHM 1 ============ */
  function sec1() {
    const crops = S.state.crops.slice().sort((a, b) => b.createdAt - a.createdAt);
    const crop = S.crop(L.cropId) || crops[0];
    const CROPS = AG.catalog.CROPS;
    const def = CROPS[0];
    const f0 = (crop && S.farmer(crop.farmerId)) || S.state.farmers[0];
    const analysis = normAnalysis(crop ? crop.analysis : AG.algo.analyzeCrop({
      cropKey: def.key, qtyKg: 900, seed: 4242, lat: f0.lat, lng: f0.lng, village: f0.village, radiusKm: 30
    }), crop, f0);
    const snapAll = AG.algo.marketSnapshot(S.state);
    const snap = snapAll.find(x => x.key === (analysis.cropKey || def.key)) || snapAll[0];
    const band = { min: analysis.minBid, max: analysis.maxBid, suggested: analysis.suggestedPrice };
    const items = [
      { k: 'Crop detected', v: analysis.detectedCrop + ' · ' + analysis.confidence + '%', ic: 'sprout' },
      { k: 'Quality score', v: analysis.qualityScore + '/100 (grade ' + analysis.grade + ')', ic: 'star' },
      { k: 'Freshness', v: analysis.freshness + '%', ic: 'leaf' },
      { k: 'Ripeness', v: analysis.ripeness + '%', ic: 'chart' },
      { k: 'Visible damage', v: analysis.damage + '%', ic: 'alert' },
      { k: 'Disease signs', v: analysis.disease + '% · ' + analysis.defectNote, ic: 'shield' },
      { k: 'Average size', v: analysis.size + ' · ' + analysis.sizeNote, ic: 'ruler' },
      { k: 'Estimated quantity', v: kg(analysis.quantity), ic: 'weight' },
      { k: 'Moisture', v: analysis.moisture + '% · ' + analysis.moistureNote, ic: 'drop' },
      { k: 'Detected location', v: analysis.location.village + ' · ' + analysis.location.gps, ic: 'pin' },
      { k: 'Harvest condition', v: analysis.harvestCondition, ic: 'check' },
      { k: 'Shelf life', v: analysis.shelfLife + ' days', ic: 'clock' },
      { k: 'Spoilage risk', v: analysis.spoilageRisk.toUpperCase(), ic: 'trend' },
      { k: 'Transport needs', v: analysis.transport.join(', '), ic: 'truck' },
      { k: 'Estimated transport cost', v: money(analysis.transportCost) + ' · ' + analysis.transportNote, ic: 'coin' },
      { k: 'Market demand', v: analysis.demand + '% · need ' + kg(analysis.needKg), ic: 'chart' },
      { k: 'Suggested price', v: money1(analysis.suggestedPrice) + '/kg', ic: 'rupee' },
      { k: 'Min – Max bid', v: money1(band.min) + ' – ' + money1(band.max) + '/kg', ic: 'scale' }
    ];
    return {
      html: sidebar('a1') + '<div class="govmain">' +
        head('Algorithm 1 · Crop + Price Intelligence', 'Photo → 18 crop attributes → quality score → suggested price → AI bid range',
          '<button class="btn sm dark" data-act="run1">' + icon('ai', 15) + ' Re-analyse on the default lot</button>') +
        explain('What it simulates', 'A computer-vision + pricing engine. In the real product it would run an on-device image model plus a price service. Every value is generated deterministically from the crop, location and weather, so results are always consistent. The same 18 attributes drive the vendor opportunity score in Algorithm 2 and the compliance rules in Algorithm 3.') +
        io(['Captured photo', 'GPS location of the farm', 'Crop type and quantity declared by the farmer', 'Weather + season for spoilage risk', 'Market price snapshot and demand index'],
          ['Quality, freshness, ripeness, damage, disease scores', 'Shelf life, spoilage risk, transport needs and cost', 'Suggested price and market demand', 'AI minimum and maximum bid range', 'Unique tracking ID for the lot']) +

        '<div class="govgrid2">' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('image', 17) + 'Live analysis result</h3>' +
        '<div class="tools"><select class="select sm" data-act="pickCrop@change">' +
        crops.map(c => '<option value="' + c.id + '"' + (crop && c.id === crop.id ? ' selected' : '') + '>' + esc(c.trackingId) + ' · ' + esc(c.cropName) + ' · ' + esc(S.farmer(c.farmerId).name) + '</option>').join('') +
        '</select></div></div>' +
        '<div class="panel-b">' +
        '<div class="row" style="gap:14px;flex-wrap:wrap;margin-bottom:14px">' +
        '<div class="thumb" style="width:120px;height:120px;border-radius:18px">' + cropArt(analysis.key || 'tomato', 40) + '</div>' +
        '<div class="grow"><div class="row" style="gap:7px;flex-wrap:wrap;margin-bottom:9px">' +
        pill(analysis.cropName, 'green') + pill('Quality ' + analysis.qualityScore, 'amber', 'star') + pill('Spoilage ' + analysis.spoilageRisk, analysis.spoilageRisk === 'low' ? 'green' : 'amber', 'trend') +
        (crop ? pill(crop.trackingId, 'blue', 'eye') : '') + '</div>' +
        U.bars([{ label: 'AI min', value: band.min, color: '#9AA79E' }, { label: 'Mandi', value: snap.price, color: '#0E9AA7' },
        { label: 'AI suggest', value: analysis.suggestedPrice, color: '#6348B8' }, { label: 'AI max', value: band.max, color: '#C0453A' },
        { label: 'Retail', value: analysis.retailPrice, color: '#3D8BFF' }], { fmt: v => '₹' + v, height: 130 }) +
        '</div></div>' +
        '<div class="attrgrid">' + items.map(i => '<div class="attrbox"><div class="k">' + icon(i.ic, 14) + esc(i.k) + '</div><div class="v">' + esc(String(i.v)) + '</div></div>').join('') + '</div>' +
        '</div></div>' +

        '<div>' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('coin', 17) + 'Price intelligence</h3>' +
        '<div class="tools"><span class="pill green">demand ' + snap.demand + '%</span><span class="pill blue">' + esc(snap.mandi) + '</span></div></div>' +
        '<div class="panel-b">' +
        '<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">' +
        '<div class="kpi g"><div class="k">Mandi today</div><div class="v">' + money1(snap.price) + '</div><div class="s">/kg · ' + (snap.change >= 0 ? '▲' : '▼') + Math.abs(snap.change) + '%</div></div>' +
        '<div class="kpi v"><div class="k">AI suggested</div><div class="v">' + money1(analysis.suggestedPrice) + '</div><div class="s">/kg fair bid</div></div>' +
        '<div class="kpi a"><div class="k">AI bid range</div><div class="v">' + money1(band.min) + '–' + money1(band.max) + '</div><div class="s">/kg accepted</div></div>' +
        '<div class="kpi t"><div class="k">Transport cost</div><div class="v">' + money(analysis.transportCost) + '</div><div class="s">' + esc(analysis.transportNeeds) + '</div></div>' +
        '</div>' +
        '<div class="formula">' + esc('suggested = farmGate × quality(0.85–1.05) × demand(±12%) × season(±5%)') + '</div>' +
        '<div class="formula">' + esc('bidMin = suggested × 0.80   ·   bidMax = suggested × 1.45') + '</div>' +
        '<div class="formula">' + esc('transport = base × km × perKg + vehicleSurcharge + spoilageRiskSurcharge') + '</div>' +
        '<div class="hint">Bids outside the range are rejected by Algorithm 3 — this stops both under-paying farmers and price-gouging / kala-bajari behaviour.</div>' +
        '</div></div>' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('cloud', 17) + 'Spoilage & shelf-life model</h3></div><div class="panel-b">' +
        '<div class="hcheck"><div class="st">' + icon('clock', 17) + '</div><div><b>Shelf life ' + analysis.shelfLife + ' days</b><span>From crop type, ripeness, grade and weather. Perishables get a shorter window and a cold-chain requirement.</span></div><div class="m">grade ' + esc(analysis.grade) + '</div></div>' +
        '<div class="hcheck ' + (analysis.spoilageRisk === 'high' ? 'warn' : '') + '"><div class="st">' + icon('trend', 17) + '</div><div><b>Spoilage risk ' + esc(analysis.spoilageRisk) + '</b><span>' + esc(analysis.guidance) + '</span></div><div class="m">' + esc(analysis.harvestCondition) + '</div></div>' +
        '<div class="hcheck"><div class="st">' + icon('truck', 17) + '</div><div><b>Transport needs</b><span>' + esc(analysis.transport.join(' · ')) + '</span></div><div class="m">' + money(analysis.transportCost) + '</div></div>' +
        '</div></div></div></div></div>',
      handlers: H({
        pickCrop: n => { L.cropId = n.value; AG.app.refresh(true); },
        run1: () => {
          const f = S.state.farmers[0];
          const a = AG.algo.analyzeCrop({ cropKey: def.key, qtyKg: 900, seed: Math.floor(Math.random() * 9999) + 1, lat: f.lat, lng: f.lng, village: f.village, radiusKm: 30 });
          U.modal({
            title: 'Algorithm 1 re-run on a fresh lot', icon: 'ai',
            body: '<p class="muted big">Vision pass on ' + esc(def.label) + ' · ' + kg(def.qtyKg) + ' at ' + esc(a.place) + ':</p>' +
              '<div class="attrgrid" style="margin-top:12px">' +
              '<div class="attrbox"><div class="k">Crop</div><div class="v">' + esc(a.detectedCrop) + '</div></div>' +
              '<div class="attrbox"><div class="k">Quality</div><div class="v">' + a.qualityScore + '/100 (' + a.grade + ')</div></div>' +
              '<div class="attrbox"><div class="k">Freshness</div><div class="v">' + a.freshness + '%</div></div>' +
              '<div class="attrbox"><div class="k">Shelf life</div><div class="v">' + a.shelfLife + ' d</div></div>' +
              '<div class="attrbox"><div class="k">Spoilage</div><div class="v">' + a.spoilageRisk + '</div></div>' +
              '<div class="attrbox"><div class="k">Suggested</div><div class="v">' + money1(a.suggestedPrice) + '/kg</div></div>' +
              '<div class="attrbox"><div class="k">Transport</div><div class="v">' + money(a.transportCost) + '</div></div>' +
              '<div class="attrbox"><div class="k">Demand</div><div class="v">' + a.demand + '%</div></div>' +
              '<div class="attrbox"><div class="k">Bid range</div><div class="v">' + money1(a.minBid) + '–' + money1(a.maxBid) + '</div></div></div>',
            actions: [{ label: 'Done', tone: 'primary' }]
          });
        }
      })
    };
  }

  /* ============ ALGORITHM 2 ============ */
  function sec2() {
    const routes = S.state.routes;
    const openRoute = S.route(L.routeId) || routes.find(r => r.status === 'open') || routes[0];
    const liveCrops = S.state.crops.filter(c => !['sold', 'cancelled', 'expired'].includes(c.status));
    const crop = liveCrops[0];
    const matches = crop ? AG.algo.matchVendorsForCrop(crop, S.state) : [];
    const W = AG.algo.WEIGHTS;
    return {
      html: sidebar('a2') + '<div class="govmain">' +
        head('Algorithm 2 · Matching + Route Optimisation', 'Connects the right vendors to a lot (max 3), redirects losers, and groups customer orders into the shortest route', '') +
        explain('Part A — Vendor matching', 'For each new lot the engine scores every vendor inside the farmer’s selling radius on distance, quality, demand, price, shelf life, spoilage risk, transport capability and available capacity. The best <b>three</b> are invited to bid (the hard rule). Vendors who lose are not dropped — they are redirected to other farmers nearby with suitable lots, so nobody idles.') +

        '<div class="panel"><div class="panel-h"><h3>' + icon('sprout', 17) + 'Live match run' + (crop ? ' · ' + esc(crop.trackingId) + ' (' + esc(crop.cropName) + ', ' + kg(crop.qtyKg) + ')' : '') + '</h3>' +
        '<div class="tools"><span class="pill red">max 3 vendors</span><span class="pill blue">radius ' + (crop ? crop.radiusKm : '—') + ' km</span></div></div>' +
        '<div class="panel-b">' +
        (matches.length ? '<div class="tscroll"><table class="gtable"><thead><tr><th>#</th><th>Vendor</th><th>Distance</th><th>Capacity used</th><th>Rating</th><th>Score</th><th>Key factors</th><th>Invited</th></tr></thead><tbody>' +
          matches.map((m, i) => {
            const capUsed = Math.round(m.vendor.usedKg / Math.max(1, m.vendor.capacityKg) * 100);
            const top = W.slice().sort((a, b) => (m.factors[b.k] * b.w) - (m.factors[a.k] * a.w)).slice(0, 4);
            return '<tr><td><b>' + (i + 1) + '</b></td><td><b>' + esc(m.vendor.name) + '</b><div class="muted" style="font-size:11px">' + esc(m.vendor.area) + '</div></td>' +
              '<td>' + km(m.distanceKm) + (m.justOutside ? ' ' + pill('outside', 'amber') : '') + '</td>' +
              '<td style="min-width:110px">' + progress(capUsed, capUsed > 85 ? 'red' : capUsed > 60 ? 'amber' : '', capUsed + '% used') + '</td>' +
              '<td>' + m.vendor.rating + '★</td>' +
              '<td><b style="color:#25A55B">' + m.score + '</b><div class="muted" style="font-size:11px">' + esc(m.why) + '</div></td>' +
              '<td class="muted" style="font-size:12px">' + top.map(w => esc(w.label) + ' ' + Math.round(m.factors[w.k])).join(' · ') + '</td>' +
              '<td>' + pill(i < AG.catalog.MAX_VENDORS_PER_CROP && !m.notInvited ? 'INVITED' : 'not invited', i < AG.catalog.MAX_VENDORS_PER_CROP && !m.notInvited ? 'green' : 'grey') + '</td></tr>';
          }).join('') +
          '</tbody></table></div>' : '<div class="empty">' + icon('sprout', 34) + '<p>No open lot right now — a farmer must post a crop first.</p></div>') +
        '<div class="formula" style="margin-top:14px">' + esc('score = 100 × (0.24·distance + 0.16·capacity + 0.14·qualityFit + 0.12·priceFit + 0.12·demand + 0.10·shelfFit + 0.08·spoilageFit + 0.04·rating)') + '</div>' +
        '<div class="chips" style="margin-top:10px">' + W.map(w => '<span class="chip sm">' + esc(w.label) + ' ' + Math.round(w.w * 100) + '%</span>').join('') + '</div>' +
        '</div></div>' +

        explain('Part B — Route optimisation', 'Customer orders are grouped by <b>delivery slot</b>, then by vendor, area and distance. Each group is sequenced with a nearest-neighbour pass, checked against vehicle capacity and mock traffic, and priced per drop + per km. The saving versus individual trips is measured and shown to the partner and to government monitoring.') +

        '<div class="govgrid2">' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('route', 17) + 'Live route optimisation</h3>' +
        '<div class="tools"><select class="select sm" data-act="pickRoute@change">' + routes.map(r =>
          '<option value="' + r.id + '"' + (openRoute && r.id === openRoute.id ? ' selected' : '') + '>' + esc(r.id) + ' · ' + esc(r.slotLabel) + ' · ' + r.stops + ' stops</option>').join('') +
        '</select></div></div>' +
        '<div class="panel-b">' +
        (openRoute ? '<div style="border-radius:14px;overflow:hidden;margin-bottom:14px">' +
          U.mapSVG({
            width: 520, height: 220,
            points: [{ lat: S.vendor(openRoute.vendorId).lat, lng: S.vendor(openRoute.vendorId).lng, color: '#E0A02C', label: 'Vendor' }]
              .concat(openRoute.stopsList.map((s, i) => ({ lat: s.lat, lng: s.lng, kind: 'route-num', label: String(i + 1), color: '#6348B8' }))),
            routes: [{ points: [{ lat: S.vendor(openRoute.vendorId).lat, lng: S.vendor(openRoute.vendorId).lng }].concat(openRoute.stopsList.map(s => ({ lat: s.lat, lng: s.lng }))), color: '#6348B8' }],
            legend: [{ color: '#E0A02C', label: 'Pickup' }, { color: '#6348B8', label: 'Optimised drop order' }]
          }) + '</div>' +
          '<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">' +
          '<div class="kpi g"><div class="k">Optimised</div><div class="v">' + km(openRoute.distanceKm) + '</div><div class="s">' + openRoute.etaMin + ' min</div></div>' +
          '<div class="kpi r"><div class="k">Individual trips</div><div class="v">' + km(openRoute.naiveKm) + '</div><div class="s">' + Math.round(openRoute.naiveKm / 26 * 60) + ' min</div></div>' +
          '<div class="kpi v"><div class="k">Saved</div><div class="v">' + km(openRoute.savedKm) + '</div><div class="s">' + openRoute.savedPct + '% less driving</div></div>' +
          '<div class="kpi a"><div class="k">Grouping</div><div class="v" style="font-size:15px">' + esc(openRoute.grouping) + '</div><div class="s">traffic ×' + openRoute.trafficFactor + '</div></div>' +
          '</div>' +
          '<div class="tscroll" style="margin-top:12px"><table class="gtable"><thead><tr><th>Leg</th><th>From → To</th><th>Distance</th><th>Time</th><th>Load</th><th>Order</th></tr></thead><tbody>' +
          '<tr><td>0</td><td>Partner → ' + esc(S.vendor(openRoute.vendorId).name) + '</td><td>' + km(round(roadKm(S.partner(openRoute.partnerId || S.state.partners[0]), S.vendor(openRoute.vendorId)), 1)) + '</td><td>' + timeMin(roadKm(S.partner(openRoute.partnerId || S.state.partners[0]), S.vendor(openRoute.vendorId))) + ' min</td><td>—</td><td class="mono">' + esc(openRoute.id) + '</td></tr>' +
          openRoute.stopsList.map((s, i) => '<tr><td><b>' + (i + 1) + '</b></td><td>' + esc(i === 0 ? S.vendor(openRoute.vendorId).name : openRoute.stopsList[i - 1].customerName) + ' → ' + esc(s.customerName) + '</td>' +
            '<td>' + km(s.km) + '</td><td>' + timeMin(s.km) + ' min</td><td>' + kg(s.qtyKg) + '</td><td class="mono">' + esc(s.orderId) + '</td></tr>').join('') +
          '</tbody></table></div>'
          : '<div class="empty">' + icon('route', 34) + '<p>No routes yet — customer orders create them automatically per slot.</p></div>') +
        '</div></div>' +

        '<div class="panel"><div class="panel-h"><h3>' + icon('slot', 17) + 'Slot capacity & demand</h3>' +
        '<div class="tools"><span class="pill blue">customer checkout reads this</span></div></div>' +
        '<div class="panel-b">' +
        DELIVERY_SLOTS.map(sl => {
          const cap = AG.algo.slotCapacity(sl.id, S.state);
          return '<div class="hcheck ' + (cap.left >= 4 ? '' : 'warn') + '"><div class="st">' + icon('clock', 17) + '</div>' +
            '<div><b>' + esc(sl.label) + '</b><span>' + cap.used + ' of ' + cap.capacity + ' orders booked · ' + cap.totalToday + ' today · ' + cap.partnersAvailable + ' partner(s) free · ' + cap.load + '% loaded</span></div>' +
            '<div class="m">' + (cap.left <= 0 ? 'FULL' : cap.left + ' left') + (cap.recommended ? ' ✓' : '') + '</div></div>';
        }).join('') +
        '<div class="hint">When a slot fills up, checkout suggests the next free slot instead of over-promising a delivery time.</div>' +
        '</div></div>' +
        '</div></div>',
      handlers: H({ pickRoute: n => { L.routeId = n.value; AG.app.refresh(true); } })
    };
  }

  /* ============ ALGORITHM 3 ============ */
  function sec3() {
    const sweep = AG.algo.complianceSweep(S.state);
    const openAlerts = S.state.alerts.filter(a => a.status === 'open');
    const audit = S.state.audit.filter(a => a.role === 'algorithm').slice(0, 10);
    const checks = [
      { t: 'Identity & KYC', d: 'Aadhaar (farmer / customer), GST + FSSAI (vendor), driving licence (partner) and geo-fence verification before any transaction.', ic: 'shield' },
      { t: 'Role & permission', d: 'A farmer cannot accept their own bid, a vendor cannot exceed the 30% free allocation, a customer cannot order reserved stock that does not exist.', ic: 'lock' },
      { t: 'Transaction validation', d: 'Bid price must sit inside the AI corridor; order quantity must exist; payment and slot must be valid.', ic: 'scale' },
      { t: 'Stock ownership & tracking', d: 'Every batch has an owner and a unique tracking ID; free + reserved always equals the received quantity.', ic: 'box' },
      { t: 'Reserved-stock protection (70%)', d: 'Allocation attempts above 30% are blocked in the UI and written to the audit trail as a violation.', ic: 'lock' },
      { t: 'Movement anomaly detection', d: 'Stock moved to an unlinked address, excess movement, or movement outside the vendor area raises a flag.', ic: 'pin' },
      { t: 'Price / demand anomaly', d: 'Retail above 2.0× farm-gate price, or bids far above the corridor, are treated as possible kala-bajari.', ic: 'coin' },
      { t: 'Duplicate transaction detection', d: 'Same customer, same amount, within 60 seconds → flagged as a possible duplicate or wash trade.', ic: 'refresh' }
    ];
    return {
      html: sidebar('a3') + '<div class="govmain">' +
        head('Algorithm 3 · Security + Compliance', 'Verification, transaction validation, stock ownership and anomaly detection — feeding the government kala-bajari watch',
          '<button class="btn sm dark" data-act="runSweep">' + icon('refresh', 15) + ' Run full sweep</button>' +
          '<button class="btn sm dark" data-act="inject" data-k="mismatch">' + icon('alert', 15) + ' Inject anomaly</button>') +
        explain('What it simulates', 'The trust layer. It runs on every write to the pipeline: when a bid is placed, stock is allocated, an order is confirmed or a route advances. Violations are blocked where possible (the UI never lets a vendor free more than 30%), recorded in the audit trail, and surfaced as alerts on the government dashboard.') +

        '<div class="kpis">' +
        '<div class="kpi g"><div class="k">Ledger items scanned</div><div class="v">' + sweep.scanned + '</div><div class="s">batches + orders</div></div>' +
        '<div class="kpi ' + (sweep.violations ? 'r' : 'g') + '"><div class="k">Violations found</div><div class="v">' + sweep.violations + '</div><div class="s">reserved / price / stock rules</div></div>' +
        '<div class="kpi ' + (openAlerts.length ? 'a' : 'g') + '"><div class="k">Open alerts</div><div class="v">' + openAlerts.length + '</div><div class="s">' + openAlerts.filter(a => a.severity === 'high').length + ' high severity</div></div>' +
        '<div class="kpi v"><div class="k">Audit entries</div><div class="v">' + S.state.audit.length + '</div><div class="s">' + S.state.audit.filter(a => a.role === 'algorithm').length + ' from this engine</div></div>' +
        '<div class="kpi t"><div class="k">Reserved stock protected</div><div class="v">' + kg(S.metrics().reservedStock) + '</div><div class="s">70% of every batch</div></div>' +
        '</div>' +

        '<div class="govgrid2">' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('shield', 17) + 'Checks performed</h3></div>' +
        '<div class="panel-b">' + checks.map(c => '<div class="hcheck"><div class="st">' + icon(c.ic, 17) + '</div><div><b>' + esc(c.t) + '</b><span>' + esc(c.d) + '</span></div><div class="m">on</div></div>').join('') + '</div></div>' +

        '<div>' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('alert', 17) + 'Current violations</h3>' +
        '<div class="tools"><button class="btn sm ghost" data-act="sec" data-s="a3">' + icon('right', 14) + '</button></div></div>' +
        '<div class="panel-b">' + (sweep.items.length ? sweep.items.map(r => {
          const v = r.vendorId ? S.vendor(r.vendorId) : null;
          const kindLabel = { allocation: '30/70 allocation breach', 'over-use': 'Free stock over-used', traceability: 'Missing tracking ID' }[r.kind] || r.kind;
          return '<div class="hcheck warn"><div class="st">' + icon('alert', 17) + '</div>' +
            '<div><b>' + esc(kindLabel) + '</b><span>' + esc(r.id) + (v ? ' · ' + v.name + ' (' + v.area + ')' : '') + '</span></div>' +
            '<div class="m">' + esc(r.kind) + '</div></div>';
        }).join('')
          : '<div class="empty">' + icon('shield', 34) + '<p>Clean. No rule violations in the current ledger.</p></div>') + '</div></div>' +

        '<div class="panel"><div class="panel-h"><h3>' + icon('doc', 17) + 'Recent engine events</h3>' +
        '<div class="tools"><button class="btn sm ghost" data-act="goAudit">Government audit trail' + icon('right', 14) + '</button></div></div>' +
        '<div class="panel-b">' + audit.map(a => '<div class="trailstep"><span class="ts"></span><div><div class="who">' + esc(a.action) + '</div>' +
          '<div class="what">' + esc(a.detail) + '</div></div><div class="when">' + timeAgo(a.ts) + '</div></div>').join('') + '</div></div>' +
        '</div></div></div>',
      handlers: H({
        runSweep: () => {
          const s = AG.algo.complianceSweep(S.state);
          U.toast('Sweep complete · ' + s.scanned + ' items · ' + s.violations + ' violations', s.violations ? 'warn' : 'good', 3400);
          AG.app.refresh(true);
        },
        goAudit: () => AG.app.go('gov', 'audit')
      })
    };
  }

  /* ============ ALGORITHM 4 ============ */
  function sec4() {
    const h = AG.algo.pipelineHealth(S.state);
    const m = S.metrics();
    const cls = h.status === 'OPERATIONAL' ? 'ok' : h.status === 'DEGRADED' ? 'warn' : 'fail';
    return {
      html: sidebar('a4') + '<div class="govmain">' +
        head('Algorithm 4 · Pipeline Health Monitor', 'Does the complete system function correctly? Continuously verified across all five stages.',
          '<button class="btn sm dark" data-act="recheck">' + icon('refresh', 15) + ' Re-run all checks</button>') +
        '<div class="healthbanner ' + (cls === 'ok' ? '' : cls) + '" style="margin:0 16px 16px">' +
        '<div style="width:46px;height:46px;border-radius:14px;background:rgba(255,255,255,.18);display:grid;place-items:center">' + icon(cls === 'ok' ? 'check' : 'alert', 26) + '</div>' +
        '<div><div class="big">' + esc(h.headline) + '</div><div class="sm">' + h.checks.length + ' continuous checks · ' + h.failN + ' critical · ' + h.warnN + ' warnings · last run ' + timeAgo(h.checkedAt) + '</div></div>' +
        '<div class="score"><b>' + h.score + '%</b><span>SYSTEM HEALTH</span></div></div>' +

        explain('What it simulates', 'A watchdog that walks the whole chain — farm lot → vendor bid → batch → reserved/free split → customer order → partner route → delivery — and checks that every stage is alive, consistent and moving. Any break (frozen vendor, over-allocated stock, stalled order, route with no partner, wastage above tolerance) lowers the score and is reported to the government dashboard.') +

        '<div class="panel" style="margin:0 16px 16px"><div class="panel-h"><h3>' + icon('heart', 17) + 'Continuous checks</h3>' +
        '<div class="tools">' + pill(h.checks.filter(c => c.level === 'ok').length + ' passing', 'green') + (h.warnN ? pill(h.warnN + ' warnings', 'amber') : '') + (h.failN ? pill(h.failN + ' critical', 'red') : '') + '</div></div>' +
        '<div class="panel-b">' + h.checks.map(c =>
          '<div class="hcheck ' + c.level + '"><div class="st">' + icon(c.level === 'ok' ? 'check' : c.level === 'warn' ? 'alert' : 'x', 18) + '</div>' +
          '<div><b>' + esc(c.label) + '</b><span>' + esc(c.detail) + '</span></div><div class="m">' + esc(c.metric) + '</div></div>').join('') + '</div></div>' +

        '<div class="govgrid2" style="padding:0 16px 16px">' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('route', 17) + 'Flow at each stage</h3></div><div class="panel-b">' +
        U.bars(m.pipeline.map((p, i) => ({ label: p.stage.slice(0, 7), value: p.kg, color: ['#25A55B', '#E0A02C', '#6348B8', '#3D8BFF'][i] })), { fmt: v => v + 'kg', height: 140 }) +
        '<div class="formula" style="margin-top:12px">' + esc('score = 100 − (20 × critical failures) − (6 × warnings) − (2 × idle stages), clamped 0–100') + '</div>' +
        '</div></div>' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('grid', 17) + 'All four engines</h3></div><div class="panel-b">' +
        NAV.map(n => '<div class="hcheck"><div class="st" style="background:#12233A;color:#fff;font-weight:900">' + esc(n.n) + '</div>' +
          '<div><b>' + esc(n.label) + '</b><span>Running on the current live dataset.</span></div>' +
          '<div class="m"><button class="btn sm ghost" data-act="sec" data-s="' + n.id + '">Open' + icon('right', 14) + '</button></div></div>').join('') +
        '</div></div></div></div>',
      handlers: H({
        recheck: () => { const x = AG.algo.pipelineHealth(S.state); U.toast('Health re-checked → ' + x.headline + ' (' + x.score + '%)', x.status === 'OPERATIONAL' ? 'good' : 'warn', 3400); AG.app.refresh(true); }
      })
    };
  }

  function H(extra) {
    return Object.assign({
      sec: (n, e, d) => AG.app.go('center', d.s),
      inject: (n, e, d) => { const a = S.injectAnomaly(d.k); if (a) { U.toast('Anomaly injected → ' + a.id, 'warn'); AG.app.refresh(true); } }
    }, extra || {});
  }

  AG.apps = AG.apps || {};
  AG.apps.center = {
    id: 'center', wide: true,
    render(tab) {
      switch (tab) {
        case 'a1': return sec1();
        case 'a2': return sec2();
        case 'a3': return sec3();
        case 'a4': return sec4();
        default: return sec1();
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
