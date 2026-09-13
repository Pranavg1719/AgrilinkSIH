/* ============================================================
   AGRILINK — GOVERNMENT CONTROL / MONITORING DASHBOARD
   Professional dashboard style. Monitors the whole pipeline:
   stock, actors, movement, transactions, distribution,
   kala-bajari (black market) screening and system health.
   ============================================================ */
(function (g) {
  'use strict';
  const AG = g.AG, U = AG.ui, S = AG.store;
  const { icon, esc, money, money1, kg, km, pill, progress } = U;
  const { cropArt, DELIVERY_SLOTS, FREE_RATIO, RESERVE_RATIO } = AG.catalog;
  const { fmtDate, fmtDay, timeAgo, round } = AG.util;

  const L = { q: '', traceQ: '', auditRole: 'all', auditAction: '' };
  const SECTIONS = [
    { id: 'overview', label: 'Overview', icon: 'grid' },
    { id: 'chain', label: 'Supply Chain', icon: 'route' },
    { id: 'trace', label: 'Stock Tracking', icon: 'search' },
    { id: 'compliance', label: 'Kala-Bajari Watch', icon: 'shield' },
    { id: 'health', label: 'Pipeline Health', icon: 'heart' },
    { id: 'audit', label: 'Audit Trail', icon: 'doc' },
    { id: 'actors', label: 'Registered Users', icon: 'users' }
  ];

  function sidebar(active) {
    const openAlerts = S.state.alerts.filter(a => a.status === 'open').length;
    return '<aside class="govside"><div class="gh"><div class="em">' + icon('gov', 20) + '</div>' +
      '<div><b>GOVT CONTROL</b><span>Dept. of Agriculture · MH</span></div></div>' +
      '<nav class="govnav">' + SECTIONS.map(s =>
        '<button class="gnav" data-act="sec" data-s="' + s.id + '" aria-selected="' + (active === s.id) + '">' + icon(s.icon, 18) +
        '<span class="lbl">' + esc(s.label) + '</span>' +
        (s.id === 'compliance' && openAlerts ? '<span class="cnt red">' + openAlerts + '</span>' : '') +
        '</button>').join('') + '</nav>' +
      '<div class="gfoot">AGRILINK monitoring node<br>Live feed · Algorithm 3 + 4<br>' + new Date().toLocaleDateString('en-IN') + '</div></aside>';
  }

  function govHead(title, sub, tools) {
    const now = new Date();
    return '<div class="govhead"><div><h2>' + esc(title) + '</h2><div class="sub">' + esc(sub) + '</div></div>' +
      '<div class="row wrap" style="gap:8px">' +
      '<div class="gov-live"><span class="dot"></span>LIVE · ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '</div>' +
      (tools || '') + '</div></div>';
  }

  function healthBanner() {
    const h = AG.algo.pipelineHealth(S.state);
    const cls = h.status === 'OPERATIONAL' ? '' : h.status === 'DEGRADED' ? 'warn' : 'bad';
    return '<div class="healthbanner ' + cls + '">' +
      '<div style="width:46px;height:46px;border-radius:14px;background:rgba(255,255,255,.18);display:grid;place-items:center">' + icon(h.status === 'OPERATIONAL' ? 'check' : 'alert', 26) + '</div>' +
      '<div><div class="big">' + esc(h.headline) + '</div>' +
      '<div class="sm">Algorithm 4 · ' + h.checks.length + ' continuous checks · ' + h.checks.filter(c => c.level === 'ok').length + ' passing · ' + h.failN + ' critical · ' + h.warnN + ' warnings · last run ' + timeAgo(h.checkedAt) + '</div></div>' +
      '<div class="score"><b>' + h.score + '%</b><span>SYSTEM HEALTH</span></div></div>';
  }

  function kpis(m) {
    const k = [
      { l: 'Total Farmers', v: m.farmers, s: m.stockAtFarm + ' kg at farm gate', i: 'sprout', c: 'g' },
      { l: 'Total Vendors', v: m.vendors, s: m.vendors - S.state.vendors.filter(v => !v.frozen).length + ' flagged', i: 'store', c: 'a' },
      { l: 'Delivery Partners', v: m.partners, s: m.liveRoutes + ' on road now', i: 'truck', c: 'v' },
      { l: 'Customers', v: m.customers, s: m.activeOrders + ' active orders', i: 'users', c: 't' },
      { l: 'Total Crop Stock', v: kg(m.totalCropStock), s: 'across ' + S.state.batches.length + ' batches', i: 'box', c: 'g' },
      { l: 'Reserved Stock (70%)', v: kg(m.reservedStock), s: kg(m.reservedAvailable) + ' available now', i: 'lock', c: 't' },
      { l: 'Stock in Transit', v: kg(m.stockInTransit), s: m.liveRoutes + ' route(s) moving', i: 'route', c: 'v' },
      { l: 'Sold Stock', v: kg(m.soldStock), s: kg(m.soldToCustomers) + ' to customers · ' + kg(m.soldPrivate) + ' private (30%)', i: 'cart', c: 'g' },
      { l: 'Wastage', v: kg(m.wastage), s: m.wastagePct + '% of harvested stock', i: 'trash', c: m.wastagePct > 8 ? 'r' : 'a' },
      { l: 'Active Orders', v: m.activeOrders, s: 'in ' + DELIVERY_SLOTS.length + ' delivery slots', i: 'doc', c: 't' },
      { l: 'Active Bids', v: m.activeBids, s: 'max 3 vendors per lot', i: 'coin', c: 'a' },
      { l: 'Completed Transactions', v: m.completedTxn, s: money(m.revenue) + ' settled', i: 'bank', c: 'g' }
    ];
    return '<div class="kpis">' + k.map(x =>
      '<div class="kpi ' + x.c + '"><div class="k">' + icon(x.i, 14) + esc(x.l) + '</div>' +
      '<div class="v">' + esc(String(x.v)) + '</div><div class="s">' + esc(x.s) + '</div></div>').join('') + '</div>';
  }

  function pipeVisual(m, detailed) {
    const p = m.pipeline;
    const nodes = [
      { l: 'FARMER', i: 'sprout', kg: p[0].kg, n: m.farmers + ' farmers · ' + S.state.crops.filter(c => !c.pickedAt).length + ' lots awaiting pickup', c: '#25A55B' },
      { l: 'TRADER / VENDOR', i: 'store', kg: p[1].kg, n: m.vendors + ' vendors · ' + kg(m.freeAvailable) + ' free (30%) + ' + kg(m.reservedAvailable) + ' reserved (70%)', c: '#E0A02C' },
      { l: 'INVENTORY', i: 'box', kg: p[1].kg, n: S.state.batches.filter(b => b.status === 'active').length + ' active batches · ' + kg(m.reservedStock) + ' reserved total', c: '#0E9AA7' },
      { l: 'DELIVERY', i: 'truck', kg: p[2].kg, n: m.liveRoutes + ' routes · ' + m.partners + ' partners · ' + km(m.kmSaved) + ' saved', c: '#6348B8' },
      { l: 'CUSTOMER', i: 'users', kg: p[3].kg, n: m.customers + ' customers · ' + m.completedTxn + ' settled orders', c: '#3D8BFF' }
    ];
    return '<div class="pipe">' + nodes.map((n, i) =>
      '<div class="pipe-node"><div class="ic" style="color:' + n.c + '">' + icon(n.i, 20) + '</div>' +
      '<b>' + esc(n.l) + '</b><div class="q">' + kg(n.kg) + '</div><div class="n">' + esc(n.n) + '</div></div>' +
      (i < nodes.length - 1 ? '<div class="pipe-arrow">' + icon('right', 22) +
        '<div class="kg">' + kg(Math.max(0, nodes[i + 1].kg)) + '</div></div>' : '')).join('') + '</div>';
  }

  function regionMap() {
    const pts = []
      .concat(S.state.farmers.map(f => ({ lat: f.lat, lng: f.lng, color: '#25A55B', label: '' })))
      .concat(S.state.vendors.map(v => ({ lat: v.lat, lng: v.lng, color: v.frozen ? '#C0453A' : '#E0A02C', label: v.name.split(' ')[0] })))
      .concat(S.state.partners.filter(p => p.activeRoute).map(p => ({ lat: p.lat, lng: p.lng, color: '#6348B8', pulse: true, label: p.name.split(' ')[0] })))
      .concat(S.state.customers.slice(0, 8).map(c => ({ lat: c.lat, lng: c.lng, color: '#3D8BFF', label: '' })));
    const routes = S.state.routes.filter(r => ['to_vendor', 'picked_up', 'delivering'].includes(r.status)).map(r => {
      const v = S.vendor(r.vendorId);
      return { points: [{ lat: v.lat, lng: v.lng }].concat(r.stopsList.map(s => ({ lat: s.lat, lng: s.lng }))), color: '#6348B8', width: 5 };
    });
    return U.mapSVG({
      width: 640, height: 330, padding: 0.14, points: pts, routes,
      legend: [{ color: '#25A55B', label: 'Farmers (' + S.state.farmers.length + ')' }, { color: '#E0A02C', label: 'Vendors (' + S.state.vendors.length + ')' },
      { color: '#3D8BFF', label: 'Customers' }, { color: '#6348B8', label: 'Live routes' }, { color: '#C0453A', label: 'Flagged' }]
    });
  }

  /* ================= OVERVIEW ================= */
  function secOverview() {
    const m = S.metrics();
    const h = AG.algo.pipelineHealth(S.state);
    const feed = S.state.audit.slice(0, 12);
    const byVendor = S.state.vendors.map(v => {
      const bs = S.state.batches.filter(b => b.vendorId === v.id);
      return { name: v.name.split(' ')[0], value: Math.round(bs.reduce((s, b) => s + b.qtyKg, 0)), color: v.frozen ? '#C0453A' : '#3D8BFF' };
    }).sort((a, b) => b.value - a.value);
    return {
      html: sidebar('overview') + '<div class="govmain">' +
        govHead('Supply Chain Control Room', 'Live-style monitoring of the AGRILINK pipeline: Farmer → Vendor → Inventory → Delivery → Customer',
          '<button class="btn sm dark" data-act="inject" data-k="mismatch">' + icon('alert', 15) + ' Inject anomaly</button>' +
          '<button class="btn sm ghost" data-act="sec" data-s="health">' + icon('heart', 15) + ' Health</button>') +
        healthBanner() +
        kpis(m) +
        '<div class="panel"><div class="panel-h"><h3>' + icon('route', 17) + 'Live pipeline — quantity at each stage</h3>' +
        '<div class="tools"><span class="pill green">stock conservation verified</span><span class="pill blue">30/70 rule enforced</span></div></div>' +
        '<div class="panel-b">' + pipeVisual(m) + '</div></div>' +

        '<div class="gov2">' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('map', 17) + 'Regional movement map · Pune district</h3>' +
        '<div class="tools"><span class="pill">' + m.kmSaved + ' km saved by route optimisation</span></div></div>' +
        '<div class="panel-b" style="padding:0">' + regionMap() + '</div></div>' +

        '<div class="panel"><div class="panel-h"><h3>' + icon('chart', 17) + 'Stock distribution</h3></div>' +
        '<div class="panel-b">' +
        U.bars(m.pipeline.map((p, i) => ({ label: p.stage.slice(0, 7), value: p.kg, color: ['#25A55B', '#E0A02C', '#6348B8', '#3D8BFF'][i] })), { fmt: v => v + 'kg', height: 130 }) +
        '<div class="row" style="gap:14px;margin-top:14px;align-items:center">' +
        U.donut([{ value: m.soldToCustomers, color: '#25A55B' }, { value: m.soldPrivate, color: '#E0A02C' }, { value: m.reservedAvailable + m.freeAvailable, color: '#0E9AA7' }, { value: m.wastage, color: '#C0453A' }], 120, kg(m.totalCropStock), 'harvested') +
        '<div class="grow"><div class="split-legend" style="flex-direction:column;gap:7px;margin:0">' +
        '<span class="lg"><i style="background:#25A55B"></i>Delivered to customers · <b>' + kg(m.soldToCustomers) + '</b></span>' +
        '<span class="lg"><i style="background:#E0A02C"></i>Vendor private sale (30%) · <b>' + kg(m.soldPrivate) + '</b></span>' +
        '<span class="lg"><i style="background:#0E9AA7"></i>Still in stock · <b>' + kg(m.reservedAvailable + m.freeAvailable) + '</b></span>' +
        '<span class="lg"><i style="background:#C0453A"></i>Wastage · <b>' + kg(m.wastage) + ' (' + m.wastagePct + '%)</b></span>' +
        '</div></div></div></div></div>' +
        '</div>' +

        '<div class="govgrid2">' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('store', 17) + 'Stock held per vendor</h3>' +
        '<div class="tools"><span class="pill red">' + S.state.vendors.filter(v => v.frozen).length + ' frozen</span></div></div>' +
        '<div class="panel-b">' + U.bars(byVendor, { fmt: v => v + 'kg', height: 130 }) + '</div></div>' +

        '<div class="panel"><div class="panel-h"><h3>' + icon('doc', 17) + 'Live activity feed</h3>' +
        '<div class="tools"><button class="btn sm ghost" data-act="sec" data-s="audit">Full audit trail' + icon('right', 14) + '</button></div></div>' +
        '<div class="panel-b" style="max-height:270px;overflow-y:auto">' +
        feed.map(a => '<div class="trailstep"><span class="ts" style="background:' + roleColor(a.role) + '"></span>' +
          '<div><div class="who">' + esc(a.actorId) + ' <span class="pill ' + rolePill(a.role) + '" style="font-size:10px;padding:1px 7px">' + esc(a.role) + '</span></div>' +
          '<div class="what">' + esc(a.action) + ' — ' + esc(a.detail) + '</div></div>' +
          '<div class="when">' + timeAgo(a.ts) + '</div></div>').join('') +
        '</div></div>' +
        '</div>' +
        '</div>',
      handlers: H()
    };
  }
  function roleColor(r) { return { farmer: '#25A55B', vendor: '#E0A02C', partner: '#6348B8', customer: '#3D8BFF', gov: '#C0453A', algorithm: '#0E9AA7', system: '#8FA6BF' }[r] || '#8FA6BF'; }
  function rolePill(r) { return { farmer: 'green', vendor: 'amber', partner: 'violet', customer: 'blue', gov: 'red', algorithm: 'teal' }[r] || 'grey'; }

  /* ================= SUPPLY CHAIN ================= */
  function secChain() {
    const m = S.metrics();
    return {
      html: sidebar('chain') + '<div class="govmain">' +
        govHead('Supply Chain Tracking', 'Who owns the stock, where it is right now, and how much each farmer contributed', '') +
        '<div class="panel"><div class="panel-h"><h3>' + icon('route', 17) + 'Pipeline flow with quantities</h3>' +
        '<div class="tools"><span class="pill green">FARMER → VENDOR → INVENTORY → DELIVERY → CUSTOMER</span></div></div>' +
        '<div class="panel-b">' + pipeVisual(m, true) +
        '<div class="govgrid2" style="margin-top:14px">' +
        '<div class="kpi g"><div class="k">' + icon('sprout', 14) + 'Originated from farms</div><div class="v">' + kg(m.harvested) + '</div><div class="s">' + S.state.crops.length + ' lots tracked with unique IDs</div></div>' +
        '<div class="kpi t"><div class="k">' + icon('lock', 14) + 'Reserved for citizens</div><div class="v">' + kg(m.reservedStock) + '</div><div class="s">70% of every batch · ' + kg(m.reservedAvailable) + ' still available</div></div>' +
        '</div></div></div>' +

        '<div class="panel"><div class="panel-h"><h3>' + icon('users', 17) + 'Stock originated per farmer</h3>' +
        '<div class="tools"><input class="input" id="chainQ" placeholder="Filter farmer…" style="min-height:38px;font-size:13px;width:190px" value="' + esc(L.q) + '" data-act="chainQ@input"></div></div>' +
        '<div class="panel-b tscroll"><table class="gtable"><thead><tr>' +
        '<th>Farmer</th><th>Village</th><th>Originated</th><th>Sold</th><th>Remaining</th><th>Reserved</th><th>In transit</th><th>Income</th><th>Lots</th></tr></thead><tbody>' +
        m.perFarmer.filter(f => !L.q || f.name.toLowerCase().includes(L.q.toLowerCase()) || f.village.toLowerCase().includes(L.q.toLowerCase())).map(f =>
          '<tr><td><b>' + esc(f.name) + '</b></td><td class="muted">' + esc(f.village) + '</td>' +
          '<td>' + kg(f.originated) + '</td><td>' + kg(f.sold) + '</td><td>' + kg(f.remaining) + '</td>' +
          '<td>' + kg(f.reserved) + '</td><td>' + kg(f.transit) + '</td>' +
          '<td><b style="color:#1B7A45">' + money(f.income) + '</b></td><td>' + f.crops + '</td></tr>').join('') +
        '</tbody></table></div></div>' +

        '<div class="panel"><div class="panel-h"><h3>' + icon('box', 17) + 'Where is the stock right now · who owns it</h3>' +
        '<div class="tools"><span class="pill blue">' + S.state.batches.length + ' batches</span></div></div>' +
        '<div class="panel-b tscroll"><table class="gtable"><thead><tr>' +
        '<th>Tracking ID</th><th>Crop</th><th>Farmer</th><th>Owner (vendor)</th><th>Total</th><th>Free 30%</th><th>Reserved 70%</th><th>With customers</th><th>Stage</th><th></th></tr></thead><tbody>' +
        S.state.batches.map(b => {
          const st = S.batchStock(b);
          const inTransit = S.state.orders.filter(o => o.batchId === b.id && ['assigned', 'picked_up', 'out_for_delivery'].includes(o.status)).reduce((s, o) => s + o.qtyKg, 0);
          const stage = b.frozen ? 'FROZEN' : st.reservedLeft + st.freeLeft <= 0 ? 'Empty' : inTransit ? 'In transit' : 'In vendor godown';
          return '<tr class="clickable" data-act="trace" data-q="' + esc(b.trackingId) + '">' +
            '<td class="mono">' + esc(b.trackingId) + '</td>' +
            '<td>' + esc(b.cropName) + '</td><td class="muted">' + esc(S.farmer(b.farmerId).name) + '</td>' +
            '<td>' + esc(S.vendor(b.vendorId).name) + (b.frozen ? ' ' + pill('frozen', 'red') : '') + '</td>' +
            '<td><b>' + kg(b.qtyKg) + '</b></td><td>' + kg(st.freeLeft) + ' left</td><td>' + kg(st.reservedLeft) + ' left</td>' +
            '<td>' + kg(inTransit) + '</td>' +
            '<td>' + pill(stage, b.frozen ? 'red' : stage === 'In transit' ? 'violet' : stage === 'Empty' ? 'grey' : 'teal') + '</td>' +
            '<td><button class="btn sm ghost" data-act="trace" data-q="' + esc(b.trackingId) + '">Trace</button></td></tr>';
        }).join('') + '</tbody></table></div></div>' +
        '</div>',
      handlers: H({
        'chainQ@input': n => { L.q = n.value; AG.app.freeze(true); clearTimeout(L._t); L._t = setTimeout(() => { AG.app.freeze(false); AG.app.refresh(true); }, 400); }
      })
    };
  }

  /* ================= STOCK TRACKING ================= */
  function secTrace() {
    const q = L.traceQ;
    const res = q ? AG.algo.trace(q, S.state) : null;
    const recent = S.state.batches.slice(0, 8);
    return {
      html: sidebar('trace') + '<div class="govmain">' +
        govHead('Stock Tracking & Traceability', 'Every batch carries a unique tracking ID — click it to see the complete journey', '') +
        '<div class="panel"><div class="panel-h"><h3>' + icon('search', 17) + 'Trace a lot</h3>' +
        '<div class="tools"><span class="pill">CROP-IND-###### · BATCH-### · ORD-### · farmer / vendor name</span></div></div>' +
        '<div class="panel-b">' +
        '<div class="row" style="gap:9px;flex-wrap:wrap"><input class="input" id="traceInput" style="flex:1;min-width:240px" placeholder="e.g. ' + esc(recent[0] ? recent[0].trackingId : 'CROP-IND-000124') + '" value="' + esc(q) + '" data-act="traceInput@input">' +
        '<button class="btn" data-act="doTrace">' + icon('search', 18) + ' Trace</button>' +
        (q ? '<button class="btn ghost" data-act="clearTrace">' + icon('x', 18) + ' Clear</button>' : '') + '</div>' +
        '<div class="chips" style="margin-top:11px">' + recent.map(b =>
          '<button class="chip sm" data-act="trace" data-q="' + esc(b.trackingId) + '">' + esc(b.trackingId) + ' · ' + esc(b.cropName) + '</button>').join('') + '</div>' +
        '</div></div>' +

        (res && res.found && res.kind === 'batch' ? traceResult(res) :
          res && res.found && res.kind === 'farmer' ? farmerTrace(res) :
            res && res.found && res.kind === 'vendor' ? vendorTrace(res) :
              res ? '<div class="panel"><div class="panel-b">' + '<div class="empty">' + icon('search', 34) + '<p>No record matches “' + esc(q) + '”. Try a tracking ID, batch, order, farmer or vendor name.</p></div></div></div>'
                : '<div class="panel"><div class="panel-h"><h3>' + icon('list', 17) + 'All tracked batches</h3></div><div class="panel-b tscroll">' +
                '<table class="gtable"><thead><tr><th>Tracking ID</th><th>Batch</th><th>Crop</th><th>Farmer</th><th>Vendor</th><th>Qty</th><th>Orders</th><th></th></tr></thead><tbody>' +
                S.state.batches.map(b => '<tr><td class="mono">' + esc(b.trackingId) + '</td><td class="mono">' + esc(b.id) + '</td><td>' + esc(b.cropName) + '</td>' +
                  '<td class="muted">' + esc(S.farmer(b.farmerId).name) + '</td><td class="muted">' + esc(S.vendor(b.vendorId).name) + '</td>' +
                  '<td><b>' + kg(b.qtyKg) + '</b></td><td>' + S.state.orders.filter(o => o.batchId === b.id).length + '</td>' +
                  '<td><button class="btn sm ghost" data-act="trace" data-q="' + esc(b.trackingId) + '">Open</button></td></tr>').join('') +
                '</tbody></table></div></div>') +
        '</div>',
      handlers: H({
        'traceInput@input': n => { L.traceQ = n.value; },
        doTrace: () => { const i = document.getElementById('traceInput'); L.traceQ = i ? i.value : L.traceQ; AG.app.refresh(true); },
        clearTrace: () => { L.traceQ = ''; AG.app.refresh(true); }
      })
    };
  }

  function traceResult(r) {
    const c = r.crop, b = r.batch, st = b ? S.batchStock(b) : null;
    return '<div class="panel"><div class="panel-h"><h3>' + icon('eye', 17) + 'Chain of custody · ' + esc(c.trackingId) + '</h3>' +
      '<div class="tools">' + pill(c.cropName + ' · ' + kg(c.qtyKg), 'green') + (b ? pill(b.id, 'blue') : '') +
      (r.alerts.length ? pill(r.alerts.length + ' alert(s)', 'red', 'alert') : pill('No alerts', 'green', 'shield')) + '</div></div>' +
      '<div class="panel-b">' +
      '<div class="pipe">' + r.stages.map((s, i) =>
        '<div class="pipe-node" style="' + (s.done ? '' : 'opacity:.55') + '"><div class="ic" style="color:' + (s.done ? '#25A55B' : '#8FA6BF') + '">' + icon(['sprout', 'coin', 'store', 'box', 'truck', 'users'][i], 20) + '</div>' +
        '<b>' + esc(s.label) + '</b><div class="q">' + (s.qty ? kg(s.qty) : '—') + '</div>' +
        '<div class="n">' + esc(s.name) + '<br>' + esc(s.place) + (s.at ? '<br>' + fmtDate(s.at) : '') + '</div>' +
        (s.split ? '<div class="n" style="margin-top:6px"><b style="color:#E0A02C">free ' + kg(s.split.free) + '</b> · <b style="color:#25A55B">reserved ' + kg(s.split.reserved) + '</b></div>' : '') +
        '</div>' + (i < r.stages.length - 1 ? '<div class="pipe-arrow">' + icon('right', 22) + '</div>' : '')).join('') + '</div>' +
      '</div></div>' +

      '<div class="govgrid2">' +
      '<div class="panel"><div class="panel-h"><h3>' + icon('doc', 17) + 'Complete movement history</h3></div>' +
      '<div class="panel-b">' + r.trail.map(t => '<div class="trailstep"><span class="ts"></span><div>' +
        '<div class="who">' + esc(t.who) + '</div><div class="what">' + esc(t.what) + '</div>' +
        '<div class="what muted" style="font-size:11.5px">' + esc(t.where) + '</div></div>' +
        '<div class="when">' + fmtDate(t.ts) + '</div></div>').join('') + '</div></div>' +

      '<div>' +
      (b ? '<div class="panel"><div class="panel-h"><h3>' + icon('box', 17) + 'Batch ledger</h3></div><div class="panel-b">' +
        U.stockSplit(b.freeKg, b.reservedKg) +
        '<div class="kpis" style="margin-top:14px;grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">' +
        kpi('Received', kg(b.qtyKg), 'g') + kpi('Free left (30%)', kg(st.freeLeft), 'a') +
        kpi('Reserved left (70%)', kg(st.reservedLeft), 't') + kpi('Delivered', kg(st.reservedSold), 'v') +
        kpi('Wastage', kg(st.wastage), 'r') + kpi('Shelf left', st.daysLeft + ' d', 'g') +
        '</div></div></div>' : '') +
      (r.orders.length ? '<div class="panel"><div class="panel-h"><h3>' + icon('cart', 17) + 'Customer orders from this lot</h3></div>' +
        '<div class="panel-b tscroll"><table class="gtable"><thead><tr><th>Order</th><th>Customer</th><th>Qty</th><th>Slot</th><th>Partner</th><th>Status</th><th>Amount</th></tr></thead><tbody>' +
        r.orders.map(o => '<tr><td class="mono">' + esc(o.id) + '</td><td>' + esc(S.customer(o.customerId).name) + '</td><td>' + kg(o.qtyKg) + '</td>' +
          '<td class="muted">' + esc(o.slotLabel) + '</td><td class="muted">' + esc(o.partnerId ? S.partner(o.partnerId).name : '—') + '</td>' +
          '<td>' + pill((U.ORDER_STATUS[o.status] || {}).label || o.status, (U.ORDER_STATUS[o.status] || {}).tone) + '</td>' +
          '<td><b>' + money(o.total) + '</b></td></tr>').join('') + '</tbody></table></div></div>' : '') +
      (r.alerts.length ? '<div class="panel"><div class="panel-h"><h3>' + icon('alert', 17) + 'Compliance alerts on this lot</h3></div>' +
        '<div class="panel-b">' + r.alerts.map(a => alertCard(a, true)).join('') + '</div></div>' : '') +
      '</div></div>';
  }
  function kpi(l, v, c) { return '<div class="kpi ' + (c || '') + '"><div class="k">' + esc(l) + '</div><div class="v" style="font-size:19px">' + esc(v) + '</div></div>'; }

  function farmerTrace(r) {
    const f = r.subject;
    return '<div class="panel"><div class="panel-h"><h3>' + icon('sprout', 17) + 'Farmer record · ' + esc(f.name) + '</h3>' +
      '<div class="tools">' + pill(f.village + ' · ' + f.acres + ' acre', 'green') + pill(f.verified ? 'KYC verified' : 'Unverified', f.verified ? 'green' : 'red', 'shield') + '</div></div>' +
      '<div class="panel-b">' +
      '<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">' +
      kpi('Lots posted', r.crops.length, 'g') + kpi('Originated', kg(r.crops.reduce((s, c) => s + c.qtyKg, 0)), 't') +
      kpi('Batches', r.batches.length, 'a') + kpi('Income', money(f.earned || 0), 'v') +
      kpi('Rating', f.rating + '★', 'g') + kpi('Orders from lots', r.orders.length, 'v') + '</div>' +
      '<div class="tscroll" style="margin-top:14px"><table class="gtable"><thead><tr><th>Tracking ID</th><th>Crop</th><th>Qty</th><th>Vendor</th><th>Status</th><th>Price</th><th></th></tr></thead><tbody>' +
      r.crops.map(c => '<tr><td class="mono">' + esc(c.trackingId) + '</td><td>' + esc(c.cropName) + '</td><td>' + kg(c.qtyKg) + '</td>' +
        '<td class="muted">' + esc(c.vendorId ? S.vendor(c.vendorId).name : '—') + '</td>' +
        '<td>' + pill((U.CROP_STATUS[c.status] || {}).label || c.status, (U.CROP_STATUS[c.status] || {}).tone) + '</td>' +
        '<td>' + (c.bids.find(b => b.id === c.winnerBidId) ? money1(c.bids.find(b => b.id === c.winnerBidId).price) + '/kg' : '—') + '</td>' +
        '<td><button class="btn sm ghost" data-act="trace" data-q="' + esc(c.trackingId) + '">Trace</button></td></tr>').join('') +
      '</tbody></table></div></div></div>';
  }
  function vendorTrace(r) {
    const v = r.subject;
    const bs = r.batches;
    return '<div class="panel"><div class="panel-h"><h3>' + icon('store', 17) + 'Vendor record · ' + esc(v.name) + '</h3>' +
      '<div class="tools">' + pill(v.licence, 'blue') + pill(v.frozen ? 'FLAGGED / frozen' : 'Verified', v.frozen ? 'red' : 'green', 'shield') + '</div></div>' +
      '<div class="panel-b">' +
      '<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">' +
      kpi('Batches held', bs.length, 't') + kpi('Stock received', kg(bs.reduce((s, b) => s + b.qtyKg, 0)), 'g') +
      kpi('Reserved (70%)', kg(bs.reduce((s, b) => s + b.reservedKg, 0)), 'v') + kpi('Private sale (30%)', kg(v.freeSoldKg || 0), 'a') +
      kpi('Sold to customers', kg(v.reservedSoldKg || 0), 'g') + kpi('Compliance flags', (v.violations || 0) + '', 'r') + '</div>' +
      '<div class="tscroll" style="margin-top:14px"><table class="gtable"><thead><tr><th>Batch</th><th>Tracking ID</th><th>Crop</th><th>Farmer</th><th>Free / Reserved</th><th>Available</th><th></th></tr></thead><tbody>' +
      bs.map(b => { const st = S.batchStock(b); return '<tr><td class="mono">' + esc(b.id) + '</td><td class="mono">' + esc(b.trackingId) + '</td><td>' + esc(b.cropName) + '</td>' +
        '<td class="muted">' + esc(S.farmer(b.farmerId).name) + '</td><td>' + kg(b.freeKg) + ' / ' + kg(b.reservedKg) + '</td>' +
        '<td>' + kg(st.reservedLeft + st.freeLeft) + '</td><td><button class="btn sm ghost" data-act="trace" data-q="' + esc(b.trackingId) + '">Trace</button></td></tr>'; }).join('') +
      '</tbody></table></div></div></div>';
  }

  /* ================= COMPLIANCE / KALA-BAJARI ================= */
  function alertCard(a, compact) {
    return '<div class="alertcard ' + a.severity + ' ' + (a.status === 'resolved' ? 'resolved' : '') + '">' +
      '<div class="at">' + icon(a.severity === 'high' ? 'alert' : 'shield', 17) + esc(a.title) +
      '<span style="margin-left:auto;display:flex;gap:6px">' + pill(a.severity.toUpperCase(), a.severity === 'high' ? 'red' : a.severity === 'medium' ? 'amber' : 'blue') +
      pill(a.status === 'open' ? 'OPEN' : 'RESOLVED', a.status === 'open' ? 'red' : 'grey') + '</span></div>' +
      '<div class="am">' + esc(a.message) + '</div>' +
      (a.metrics ? '<div class="ametrics">' + Object.keys(a.metrics).map(k =>
        '<span class="ametric"><span>' + esc(k.replace(/_/g, ' ')) + '</span> ' + esc(String(a.metrics[k])) + '</span>').join('') + '</div>' : '') +
      '<div class="row wrap" style="gap:7px;margin-top:10px">' +
      '<span class="pill">' + icon('clock', 12) + esc(fmtDate(a.ts)) + '</span>' +
      (a.vendorId ? '<span class="pill amber">' + icon('store', 12) + esc(S.vendor(a.vendorId).name) + '</span>' : '') +
      (a.farmerId ? '<span class="pill green">' + icon('sprout', 12) + esc(S.farmer(a.farmerId).name) + '</span>' : '') +
      (a.trackingId ? '<span class="pill blue">' + icon('eye', 12) + esc(a.trackingId) + '</span>' : '') +
      '<span class="pill grey">' + esc(a.id) + '</span></div>' +
      (compact ? '' : '<div class="row" style="gap:8px;margin-top:11px">' +
        '<button class="btn sm dark" data-act="openAlert" data-id="' + a.id + '">' + icon('search', 15) + ' Open transaction trail</button>' +
        (a.status === 'open' ? '<button class="btn sm ghost" data-act="resolve" data-id="' + a.id + '">' + icon('check', 15) + ' Mark reviewed</button>' +
          (a.vendorId ? '<button class="btn sm red" data-act="freeze" data-id="' + a.vendorId + '">' + icon('lock', 15) + ' Freeze vendor</button>' : '') : '') +
        '</div>') +
      '</div>';
  }

  function secCompliance() {
    const alerts = S.state.alerts;
    const open = alerts.filter(a => a.status === 'open');
    const sweep = AG.algo.complianceSweep(S.state);
    const flaggedVendors = S.state.vendors.filter(v => v.frozen || (v.violations || 0) > 0);
    const blocked = S.state.audit.filter(a => a.action.indexOf('blocked') >= 0 || a.action.indexOf('over_allocate') >= 0);
    return {
      html: sidebar('compliance') + '<div class="govmain">' +
        govHead('Black-Market / Kala-Bajari Monitoring', 'Algorithm 3 — security & compliance: stock tracking, ownership, reserved-stock protection, price and transaction anomalies',
          '<button class="btn sm dark" data-act="inject" data-k="mismatch">' + icon('alert', 15) + ' Stock mismatch</button>' +
          '<button class="btn sm dark" data-act="inject" data-k="movement">' + icon('trend', 15) + ' Excess movement</button>' +
          '<button class="btn sm dark" data-act="inject" data-k="duplicate">' + icon('copy', 15) + ' Duplicate txn</button>') +
        '<div class="kpis">' +
        kpi2('Open alerts', open.length, 'high: ' + open.filter(a => a.severity === 'high').length, 'r') +
        kpi2('Ledger items scanned', sweep.scanned, 'batches + orders', 't') +
        kpi2('Rule violations found', sweep.violations, 'by the compliance sweep', 'a') +
        kpi2('Blocked transactions', blocked.length, 'over-allocation attempts stopped', 'v') +
        kpi2('Flagged vendors', flaggedVendors.length, 'frozen or with violations', 'r') +
        kpi2('Reserved stock intact', Math.round((1 - S.state.batches.filter(b => !b.frozen && b.freeKg / b.qtyKg > FREE_RATIO + 0.001).length / Math.max(1, S.state.batches.filter(b => !b.frozen).length)) * 100) + '%', '70% rule compliance', 'g') +
        '</div>' +

        '<div class="govgrid2">' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('alert', 17) + 'Alert queue</h3>' +
        '<div class="tools">' + pill(open.length + ' open', 'red') + pill(alerts.filter(a => a.status === 'resolved').length + ' resolved', 'grey') + '</div></div>' +
        '<div class="panel-b">' + (alerts.length ? alerts.map(a => alertCard(a)).join('') : '<div class="empty">' + icon('shield', 34) + '<p>No alerts. The pipeline is clean.</p></div>') + '</div></div>' +

        '<div>' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('scale', 17) + 'Rules being enforced</h3></div><div class="panel-b">' +
        rule('30 / 70 allocation', 'A vendor may sell, use or give away only 30% of each received batch. The other 70% is reserved for AGRILINK customers. Over-allocation is blocked in the UI and reported here.', 'lock') +
        rule('Price corridor', 'Retail above 2.0× the farm-gate price raises an abnormal-price alert (kala-bajari screening).', 'coin') +
        rule('Stock conservation', 'free + reserved must equal the received quantity; consumption can never exceed it.', 'box') +
        rule('Chain of custody', 'Every movement is written to an audit trail with actor, timestamp and tracking ID.', 'doc') +
        rule('Maximum 3 vendors per lot', 'Prevents cartel bidding; losing vendors are redirected to other farmers instead of idling.', 'users') +
        rule('KYC & role verification', 'Aadhaar / GST / DL, geo-fence and role match are verified before any transaction.', 'shield') +
        rule('Duplicate transaction detection', 'Same customer + amount within 60 seconds is flagged.', 'refresh') +
        '</div></div>' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('store', 17) + 'Vendor risk register</h3></div>' +
        '<div class="panel-b tscroll"><table class="gtable"><thead><tr><th>Vendor</th><th>Licence</th><th>Stock</th><th>Flags</th><th>Open alerts</th><th>Status</th></tr></thead><tbody>' +
        S.state.vendors.map(v => {
          const bs = S.state.batches.filter(b => b.vendorId === v.id);
          const oa = alerts.filter(a => a.vendorId === v.id && a.status === 'open').length;
          return '<tr><td><b>' + esc(v.name) + '</b><div class="muted" style="font-size:11px">' + esc(v.area) + '</div></td>' +
            '<td class="mono">' + esc(v.licence) + '</td><td>' + kg(bs.reduce((s, b) => s + b.qtyKg, 0)) + '</td>' +
            '<td>' + (v.violations || 0) + '</td><td>' + (oa ? pill(oa + ' open', 'red') : pill('none', 'green')) + '</td>' +
            '<td>' + pill(v.frozen ? 'FROZEN' : 'Active', v.frozen ? 'red' : 'green') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' +
        '</div></div></div>',
      handlers: H({
        openAlert: (n, e, d) => openAlertModal(d.id),
        resolve: (n, e, d) => { S.resolveAlert(d.id, 'Reviewed by monitoring officer'); U.toast('Alert marked reviewed', 'good'); AG.app.refresh(true); },
        freeze: (n, e, d) => {
          U.modal({
            title: 'Freeze vendor account?', icon: 'lock', tone: 'red',
            body: '<p class="big muted">This suspends the vendor in the system: they cannot bid, and government monitoring keeps the case open. Use it for repeated allocation violations or price manipulation.</p>',
            actions: [{ label: 'Cancel', tone: 'ghost' }, { label: 'Freeze account', tone: 'red', icon: 'lock', onClick: () => { S.freezeVendor(d.id, 'Frozen under kala-bajari screening'); U.toast('Vendor frozen', 'warn'); AG.app.refresh(true); } }]
          });
        }
      })
    };
  }
  function kpi2(l, v, s, c) { return '<div class="kpi ' + (c || '') + '"><div class="k">' + esc(l) + '</div><div class="v">' + esc(String(v)) + '</div><div class="s">' + esc(s) + '</div></div>'; }
  function rule(t, d, ic) {
    return '<div class="hcheck"><div class="st">' + icon(ic, 17) + '</div><div><b>' + esc(t) + '</b><span>' + esc(d) + '</span></div></div>';
  }
  function openAlertModal(id) {
    const a = S.alert(id); if (!a) return;
    U.modal({
      wide: true, title: a.title, icon: 'alert',
      body: '<div class="row wrap" style="gap:7px;margin-bottom:12px">' +
        pill(a.id, 'grey') + pill(a.severity.toUpperCase(), a.severity === 'high' ? 'red' : 'amber') + pill(a.status, a.status === 'open' ? 'red' : 'green') +
        pill(fmtDate(a.ts), 'blue', 'clock') + (a.trackingId ? pill(a.trackingId, 'teal', 'eye') : '') + '</div>' +
        '<p class="big" style="color:#33475B">' + esc(a.message) + '</p>' +
        (a.metrics ? '<div class="ametrics" style="margin-top:12px">' + Object.keys(a.metrics).map(k =>
          '<span class="ametric"><span>' + esc(k.replace(/_/g, ' ')) + '</span> ' + esc(String(a.metrics[k])) + '</span>').join('') + '</div>' : '') +
        '<h4 style="margin:18px 0 8px;color:#12233A">Relevant stock / vendor / farmer transaction trail</h4>' +
        (a.trail && a.trail.length ? a.trail.map(t => '<div class="trailstep"><span class="ts"></span><div><div class="who">' + esc(t.who) + '</div>' +
          '<div class="what">' + esc(t.what) + '</div><div class="what muted" style="font-size:11.5px">' + esc(t.where || '') + '</div></div>' +
          '<div class="when">' + fmtDate(t.ts) + '</div></div>').join('') : '<p class="muted">No trail recorded.</p>') +
        (a.vendorId ? '<div style="margin-top:16px">' + U.btn('Open vendor record', null, { tone: 'ghost', icon: 'store', data: 'data-vendor="' + a.vendorId + '"' }) + '</div>' : ''),
      actions: [
        { label: 'Close', tone: 'ghost' },
        a.status === 'open' ? { label: 'Mark reviewed', tone: 'dark', icon: 'check', onClick: () => { S.resolveAlert(a.id); AG.app.refresh(true); } } : null,
        a.trackingId ? { label: 'Trace stock', tone: 'primary', icon: 'eye', onClick: () => { L.traceQ = a.trackingId; AG.app.go('gov', 'trace'); } } : null
      ].filter(Boolean),
      onClose: () => AG.app.refresh(true)
    });
    const mb = document.querySelector('.modal-b');
    if (mb) mb.onclick = e => {
      const b = e.target.closest('[data-vendor]');
      if (b) { U.closeModal(); L.traceQ = S.vendor(b.dataset.vendor).name; AG.app.go('gov', 'trace'); }
    };
  }

  /* ================= PIPELINE HEALTH ================= */
  function secHealth() {
    const h = AG.algo.pipelineHealth(S.state);
    const m = S.metrics();
    const algos = [
      { n: '1', t: 'Crop + Price Intelligence', s: 'ok', d: 'Vision grading, shelf life, spoilage, transport cost, demand and the bid corridor.', runs: S.state.crops.length + ' lots analysed' },
      { n: '2', t: 'Matching + Route Optimisation', s: 'ok', d: 'Vendor matching (max 3), redirection of losing vendors, slot grouping and nearest-neighbour routes.', runs: S.state.routes.length + ' routes built · ' + m.kmSaved + ' km saved' },
      { n: '3', t: 'Security + Compliance', s: h.failN ? 'fail' : 'ok', d: 'KYC, role checks, transaction validation, stock ownership, reserved-stock protection, anomaly detection.', runs: S.state.audit.filter(a => a.role === 'algorithm').length + ' checks logged' },
      { n: '4', t: 'Pipeline Health Monitor', s: h.status === 'OPERATIONAL' ? 'ok' : h.warnN ? 'warn' : 'fail', d: 'Continuously verifies every stage of the chain and reports a single system-health score.', runs: h.checks.length + ' live checks' }
    ];
    return {
      html: sidebar('health') + '<div class="govmain">' +
        govHead('Pipeline Health Monitor', 'Algorithm 4 — is the complete system functioning correctly?',
          '<button class="btn sm ghost" data-act="recheck">' + icon('refresh', 15) + ' Re-run checks</button>') +
        healthBanner() +
        '<div class="govgrid2">' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('heart', 17) + 'Continuous checks</h3>' +
        '<div class="tools">' + pill(h.checks.filter(c => c.level === 'ok').length + ' passing', 'green') +
        (h.warnN ? pill(h.warnN + ' warnings', 'amber') : '') + (h.failN ? pill(h.failN + ' critical', 'red') : '') + '</div></div>' +
        '<div class="panel-b">' + h.checks.map(c =>
          '<div class="hcheck ' + c.level + '"><div class="st">' + icon(c.level === 'ok' ? 'check' : c.level === 'warn' ? 'alert' : 'x', 18) + '</div>' +
          '<div><b>' + esc(c.label) + '</b><span>' + esc(c.detail) + '</span></div>' +
          '<div class="m">' + esc(c.metric) + '</div></div>').join('') + '</div></div>' +

        '<div>' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('ai', 17) + 'Algorithm status</h3>' +
        '<div class="tools"><span class="sim-note">' + icon('info', 14) + ' AI engines active</span></div></div>' +
        '<div class="panel-b">' + algos.map(a =>
          '<div class="hcheck ' + (a.s === 'ok' ? '' : a.s) + '"><div class="st" style="background:#12233A;color:#fff;font-weight:900">' + esc(a.n) + '</div>' +
          '<div><b>' + esc(a.t) + '</b><span>' + esc(a.d) + '</span>' +
          '<div style="margin-top:5px"><span class="pill ' + (a.s === 'ok' ? 'green' : a.s === 'warn' ? 'amber' : 'red') + '">' + (a.s === 'ok' ? 'RUNNING' : a.s.toUpperCase()) + '</span> ' +
          '<span class="pill grey">' + esc(a.runs) + '</span></div></div></div>').join('') +
        '<div style="margin-top:12px">' + U.btn('Open AI / Algorithm Center', null, { tone: 'dark', size: 'sm', icon: 'ai', data: 'data-act="gotoCenter"' }) + '</div>' +
        '</div></div>' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('chart', 17) + 'Flow balance check</h3></div><div class="panel-b">' +
        U.bars(m.pipeline.map((p, i) => ({ label: p.stage.slice(0, 7), value: p.kg, color: ['#25A55B', '#E0A02C', '#6348B8', '#3D8BFF'][i] })), { fmt: v => v + 'kg', height: 120 }) +
        '<div class="hcheck" style="margin-top:12px"><div class="st">' + icon('scale', 17) + '</div><div><b>Harvested ' + kg(m.harvested + m.stockAtFarm) + '</b>' +
        '<span>= in stock ' + kg(m.totalCropStock) + ' + at farm ' + kg(m.stockAtFarm) + ' + sold ' + kg(m.soldStock) + ' + wastage ' + kg(m.wastage) + '</span></div>' +
        '<div class="m">conservation</div></div></div></div>' +
        '</div></div></div>',
      handlers: H({
        recheck: () => { AG.algo.pipelineHealth(S.state); U.toast('All checks re-run · ' + AG.algo.pipelineHealth(S.state).status, 'good'); AG.app.refresh(true); },
        gotoCenter: () => AG.app.go('center', 'a4')
      })
    };
  }

  /* ================= AUDIT TRAIL ================= */
  function secAudit() {
    const roles = ['all', 'farmer', 'vendor', 'partner', 'customer', 'algorithm', 'gov', 'system'];
    const list = S.state.audit.filter(a => (L.auditRole === 'all' || a.role === L.auditRole) && (!L.auditAction || a.action.indexOf(L.auditAction) >= 0 || a.detail.toLowerCase().indexOf(L.auditAction.toLowerCase()) >= 0));
    return {
      html: sidebar('audit') + '<div class="govmain">' +
        govHead('Audit Trail', 'Immutable-style log of every action in the pipeline (Algorithm 3)', '') +
        '<div class="panel"><div class="panel-h"><h3>' + icon('doc', 17) + list.length + ' entries</h3>' +
        '<div class="tools"><input class="input" id="auditQ" style="min-height:38px;font-size:13px;width:210px" placeholder="Search action / detail / ID…" value="' + esc(L.auditAction) + '" data-act="auditQ@input">' +
        '</div></div>' +
        '<div class="panel-b">' +
        '<div class="chips" style="margin-bottom:12px">' + roles.map(r => '<button class="chip sm" data-act="arole" data-r="' + r + '" aria-pressed="' + (L.auditRole === r) + '">' + esc(r) + '</button>').join('') + '</div>' +
        '<div class="tscroll"><table class="gtable"><thead><tr><th>When</th><th>Actor</th><th>Role</th><th>Action</th><th>Detail</th></tr></thead><tbody>' +
        list.slice(0, 140).map(a => '<tr><td class="muted" style="white-space:nowrap">' + fmtDate(a.ts) + '<div style="font-size:11px">' + timeAgo(a.ts) + '</div></td>' +
          '<td class="mono">' + esc(a.actorId) + '</td><td>' + pill(a.role, rolePill(a.role)) + '</td>' +
          '<td><b>' + esc(a.action) + '</b></td><td class="muted">' + esc(a.detail) + '</td></tr>').join('') +
        '</tbody></table></div></div></div></div>',
      handlers: H({
        arole: (n, e, d) => { L.auditRole = d.r; AG.app.refresh(true); },
        'auditQ@input': n => { L.auditAction = n.value; AG.app.freeze(true); clearTimeout(L._t2); L._t2 = setTimeout(() => { AG.app.freeze(false); AG.app.refresh(true); }, 400); }
      })
    };
  }

  /* ================= ACTORS ================= */
  function secActors() {
    const m = S.metrics();
    return {
      html: sidebar('actors') + '<div class="govmain">' +
        govHead('Registered Users & Verification', 'Algorithm 3 verifies identity, role and geo-location for every participant', '') +
        '<div class="kpis">' + kpi2('Farmers', m.farmers, 'all KYC verified', 'g') + kpi2('Vendors', m.vendors, m.vendors - S.state.vendors.filter(v => !v.frozen).length + ' frozen', 'a') +
        kpi2('Delivery partners', m.partners, m.liveRoutes + ' on road', 'v') + kpi2('Customers', m.customers, m.activeOrders + ' active orders', 't') + '</div>' +
        '<div class="govgrid2">' +
        '<div class="panel"><div class="panel-h"><h3>' + icon('sprout', 17) + 'Farmers</h3></div><div class="panel-b tscroll"><table class="gtable">' +
        '<thead><tr><th>Name</th><th>Village</th><th>Land</th><th>Lots</th><th>Income</th><th>KYC</th></tr></thead><tbody>' +
        S.state.farmers.map(f => '<tr class="clickable" data-act="trace" data-q="' + esc(f.name) + '"><td><b>' + esc(f.name) + '</b></td><td class="muted">' + esc(f.village) + '</td>' +
          '<td>' + f.acres + ' ac</td><td>' + S.state.crops.filter(c => c.farmerId === f.id).length + '</td><td>' + money(f.earned || 0) + '</td>' +
          '<td>' + pill(f.verified ? 'Verified' : 'Pending', f.verified ? 'green' : 'red', 'shield') + '</td></tr>').join('') + '</tbody></table></div></div>' +

        '<div class="panel"><div class="panel-h"><h3>' + icon('store', 17) + 'Vendors</h3></div><div class="panel-b tscroll"><table class="gtable">' +
        '<thead><tr><th>Name</th><th>Area</th><th>Licence</th><th>Capacity</th><th>Rating</th><th>Status</th></tr></thead><tbody>' +
        S.state.vendors.map(v => '<tr class="clickable" data-act="trace" data-q="' + esc(v.name) + '"><td><b>' + esc(v.name) + '</b></td><td class="muted">' + esc(v.area) + '</td>' +
          '<td class="mono">' + esc(v.licence) + '</td><td>' + kg(v.capacityKg) + '</td><td>' + v.rating + '★</td>' +
          '<td>' + pill(v.frozen ? 'Frozen' : 'Active', v.frozen ? 'red' : 'green') + '</td></tr>').join('') + '</tbody></table></div></div>' +

        '<div class="panel"><div class="panel-h"><h3>' + icon('truck', 17) + 'Delivery partners</h3></div><div class="panel-b tscroll"><table class="gtable">' +
        '<thead><tr><th>Name</th><th>Vehicle</th><th>Capacity</th><th>Routes</th><th>Earnings</th><th>Status</th></tr></thead><tbody>' +
        S.state.partners.map(p => '<tr><td><b>' + esc(p.name) + '</b></td><td class="muted">' + esc(p.vehicle) + '</td><td>' + kg(p.capKg) + '</td>' +
          '<td>' + S.state.routes.filter(r => r.partnerId === p.id).length + '</td><td>' + money(p.totalEarnings) + '</td>' +
          '<td>' + pill(p.activeRoute ? 'On route' : 'Available', p.activeRoute ? 'amber' : 'green') + '</td></tr>').join('') + '</tbody></table></div></div>' +

        '<div class="panel"><div class="panel-h"><h3>' + icon('users', 17) + 'Customers</h3></div><div class="panel-b tscroll"><table class="gtable">' +
        '<thead><tr><th>Name</th><th>Area</th><th>Orders</th><th>Delivered</th><th>Spent</th><th>KYC</th></tr></thead><tbody>' +
        S.state.customers.map(c => {
          const os = S.state.orders.filter(o => o.customerId === c.id);
          return '<tr><td><b>' + esc(c.name) + '</b></td><td class="muted">' + esc(c.area) + '</td><td>' + os.length + '</td>' +
            '<td>' + os.filter(o => ['delivered', 'completed'].includes(o.status)).length + '</td>' +
            '<td>' + money(os.reduce((s, o) => s + o.total, 0)) + '</td><td>' + pill('Verified', 'green', 'shield') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' +
        '</div></div>',
      handlers: H()
    };
  }

  function H(extra) {
    return Object.assign({
      sec: (n, e, d) => AG.app.go('gov', d.s),
      trace: (n, e, d) => { L.traceQ = d.q; AG.app.go('gov', 'trace'); },
      inject: (n, e, d) => {
        const a = S.injectAnomaly(d.k);
        if (a) { U.toast('Anomaly injected → ' + a.id, 'warn', 3400); AG.app.go('gov', 'compliance'); }
      }
    }, extra || {});
  }

  AG.apps = AG.apps || {};
  AG.apps.gov = {
    id: 'gov', wide: true,
    render(tab) {
      switch (tab) {
        case 'overview': return secOverview();
        case 'chain': return secChain();
        case 'trace': return secTrace();
        case 'compliance': return secCompliance();
        case 'health': return secHealth();
        case 'audit': return secAudit();
        case 'actors': return secActors();
        default: return secOverview();
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
