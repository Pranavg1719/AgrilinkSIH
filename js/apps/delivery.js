/* ============================================================
   AGRILINK — DELIVERY PARTNER APP
   Driver-style interface: grouped slot jobs, optimised routes,
   live status flow and earnings.
   ============================================================ */
(function (g) {
  'use strict';
  const AG = g.AG, U = AG.ui, S = AG.store;
  const { icon, esc, money, money1, kg, km, pill, progress } = U;
  const { cropArt, DELIVERY_SLOTS } = AG.catalog;
  const { roadKm, fmtDate, timeAgo, round } = AG.util;

  const partner = () => S.partner(S.state.currentPartner) || S.state.partners[0];
  const L = { slot: 'all' };

  function head(title, sub, opts) {
    const o = opts || {};
    const p = partner();
    const unread = S.unreadCount('partner', p.id) + S.unreadCount('partner', '*');
    return '<div class="apphead"><div class="head-row">' +
      (o.back ? '<button class="iconbtn" data-act="back">' + icon('left', 22) + '</button>' : '') +
      '<div class="avatar" style="background:var(--violet-bg);color:var(--violet)">' + icon('truck', 22) + '</div>' +
      '<div class="grow"><h2 style="font-size:20px">' + esc(title) + '</h2><div class="sub muted" style="font-size:13px">' + esc(sub) + '</div></div>' +
      '<button class="iconbtn" data-act="go" data-tab="notifications">' + icon('bell', 21) + (unread ? '<span class="nb">' + unread + '</span>' : '') + '</button>' +
      '</div></div>';
  }
  const myActive = () => S.state.routes.find(r => r.partnerId === partner().id && ['assigned', 'to_vendor', 'picked_up', 'delivering'].includes(r.status));
  const openJobs = () => S.state.routes.filter(r => r.status === 'open');

  /* ---------------- HOME ---------------- */
  function screenHome() {
    const p = partner();
    const act = myActive();
    const jobs = openJobs();
    const doneToday = S.state.routes.filter(r => r.partnerId === p.id && r.status === 'completed');
    return {
      html: head(p.name, p.vehicle + ' · ' + p.area + ' · ' + p.rating + '★', {}) +
        '<div class="sec">' +
        '<div class="earn-card"><div class="row" style="align-items:flex-start">' +
        '<div class="grow"><div class="k">Today’s earnings</div><div class="v">' + money(p.todayEarnings) + '</div>' +
        '<div class="k" style="margin-top:8px">' + p.todayDeliveries + ' deliveries · ' + doneToday.length + ' route(s) completed</div></div>' +
        '<div style="text-align:right"><div class="k">Lifetime</div><div style="font-size:19px;font-weight:900">' + money(p.totalEarnings) + '</div>' +
        '<div class="k" style="margin-top:6px">' + pill(p.status === 'idle' ? 'Available' : 'On route', p.status === 'idle' ? 'green' : 'amber') + '</div></div></div></div>' +
        '</div>' +

        (act ? '<div class="sec" style="padding-top:0">' + U.section('Active route', pill((U.ROUTE_STATUS[act.status] || {}).label || act.status, 'amber'), activeCard(act, true)) + '</div>' : '') +

        '<div style="height:2px"></div>' +
        '<div class="grid-actions">' +
        '<button class="bigact hero" data-act="go" data-tab="jobs"><span class="bigact-ic">' + icon('route', 30) + '</span>' +
        '<span class="grow"><span class="bigact-t">Available delivery jobs</span><span class="bigact-s">' + jobs.length + ' optimised route(s) offered near you</span></span>' + icon('right', 24) + '</button>' +
        tile('Today’s Earnings', 'coin', money(p.todayEarnings), 'earnings', 'amber') +
        tile('Active Route', 'map', act ? act.stops + ' stops' : 'none', 'route', 'teal') +
        tile('Completed', 'check', doneToday.length + ' routes', 'completed', 'green') +
        tile('Notifications', 'bell', S.unreadCount('partner', p.id) + ' new', 'notifications', 'violet') +
        '</div>' +

        (jobs.length ? '<div class="sec">' + U.section('Best job for you right now', pill('Algorithm 2', 'blue', 'ai'),
          jobCard(jobs.slice().sort((a, b) => b.earnings / Math.max(1, b.etaMin) - a.earnings / Math.max(1, a.etaMin))[0])) + '</div>' : '') +

        '<div class="sec"><div class="card"><div class="card-h"><div class="card-ic violet">' + icon('ai', 20) + '</div><div class="grow">' +
        '<div class="card-t" style="font-size:15px">How you earn more in the same slot</div>' +
        '<div class="card-s">Algorithm 2 groups customer orders by location, slot and vendor, then builds one nearest-neighbour route. More drops per trip = more drop fees + per-km pay, with less fuel and less driving than individual trips.</div>' +
        '</div></div></div></div>',
      handlers: H({ openJob: (n, e, d) => AG.app.go('partner', 'job', { id: d.id }) })
    };
  }
  function tile(title, ic, sub, tab, tone) {
    return '<button class="bigact ' + (tone || '') + '" data-act="go" data-tab="' + tab + '"><span class="bigact-ic">' + icon(ic, 24) + '</span>' +
      '<span class="bigact-t">' + esc(title) + '</span><span class="bigact-s">' + esc(sub) + '</span></button>';
  }

  /* ---------------- JOBS ---------------- */
  function screenJobs() {
    const jobs = openJobs();
    const slots = ['all'].concat(DELIVERY_SLOTS.map(s => s.id));
    const list = jobs.filter(r => L.slot === 'all' || r.slot === L.slot);
    return {
      html: head('Available delivery jobs', jobs.length + ' optimised routes offered', { back: true }) +
        '<div class="qchips">' + slots.map(s => {
          const sl = DELIVERY_SLOTS.find(x => x.id === s);
          const n = s === 'all' ? jobs.length : jobs.filter(r => r.slot === s).length;
          return '<button class="qchip" data-act="fslot" data-s="' + s + '" style="' + (L.slot === s ? 'background:var(--violet);color:#fff;border-color:var(--violet)' : '') + '">' +
            esc(s === 'all' ? 'All slots' : sl.label) + (n ? ' · ' + n : '') + '</button>';
        }).join('') + '</div>' +
        '<div class="sec" style="padding-top:2px">' +
        (list.length ? list.map(jobCard).join('') : U.empty('No route offer in this slot yet. Customer orders are grouped automatically when they pick a slot.', 'route')) +
        '</div>',
      handlers: H({
        fslot: (n, e, d) => { L.slot = d.s; AG.app.refresh(true); },
        openJob: (n, e, d) => AG.app.go('partner', 'job', { id: d.id }),
        accept: (n, e, d) => acceptRoute(d.id)
      })
    };
  }

  function jobCard(r) {
    const perHour = Math.round(r.earnings / Math.max(0.4, r.etaMin / 60));
    return '<div class="jobcard"><div class="job-h">' +
      '<div class="row" style="gap:9px"><span class="pill violet">' + icon('clock', 13) + '<span>' + esc(r.slotLabel) + '</span></span>' +
      '<span class="pill blue">' + icon('store', 13) + '<span class="trunc" style="max-width:110px">' + esc(r.vendorName) + '</span></span></div>' +
      '<span class="pill green">' + money(r.earnings) + '</span></div>' +
      '<div class="job-b">' +
      '<div class="job-stats">' +
      jstat(r.stops, 'Drops') + jstat(r.distanceKm + ' km', 'Distance') + jstat(r.etaMin + ' min', 'Est. time') + jstat('₹' + perHour, 'Per hour') +
      '</div>' +
      '<div style="border-radius:14px;overflow:hidden;margin-bottom:11px">' + routeMap(r, 150) + '</div>' +
      '<div class="lockrow" style="background:var(--violet-bg);border-color:#D8CCF3;color:var(--violet)">' + icon('ai', 17) +
      '<span>Saved <b>' + km(r.savedKm) + '</b> (' + r.savedPct + '%) versus ' + r.stops + ' individual trips · mock traffic ×' + r.trafficFactor + '</span></div>' +
      '<div class="row wrap" style="gap:6px;margin-top:10px">' +
      pill(r.totalKg + ' kg load', 'teal', 'weight') + pill(r.vehicle, 'grey', 'truck') +
      pill('Suggested: ' + r.partnerName, 'blue', 'user') + '</div>' +
      '<div class="btn-row" style="margin-top:11px">' +
      U.btn('View route', null, { tone: 'ghost', icon: 'map', data: 'data-act="openJob" data-id="' + r.id + '"' }) +
      U.btn('Accept job', null, { tone: 'primary', icon: 'check', data: 'data-act="accept" data-id="' + r.id + '"' }) +
      '</div></div></div>';
  }
  function jstat(v, k) { return '<div class="jstat"><div class="v">' + esc(String(v)) + '</div><div class="k">' + esc(k) + '</div></div>'; }

  function routeMap(r, h) {
    const v = S.vendor(r.vendorId);
    return U.mapSVG({
      width: 380, height: h || 210,
      points: [{ lat: v.lat, lng: v.lng, color: '#D98A16', label: 'Vendor', kind: 'route-num' }]
        .concat(r.stopsList.map((s, i) => ({
          lat: s.lat, lng: s.lng, kind: 'route-num', label: String(i + 1),
          color: s.done ? '#2E9E5B' : i === (r.doneCount || 0) ? '#B3352A' : '#6348B8'
        }))),
      routes: [{ points: [{ lat: v.lat, lng: v.lng }].concat(r.stopsList.map(s => ({ lat: s.lat, lng: s.lng }))), color: '#6348B8' }],
      legend: [{ color: '#D98A16', label: 'Pickup vendor' }, { color: '#B3352A', label: 'Next stop' }, { color: '#6348B8', label: 'Route' }, { color: '#2E9E5B', label: 'Delivered' }]
    });
  }

  function screenJob() {
    const r = S.route(AG.app.currentNav().params.id);
    if (!r) return screenJobs();
    const v = S.vendor(r.vendorId);
    const p = partner();
    const rePriced = AG.algo.recalcRouteForPartner(Object.assign({}, r, { stopsList: r.stopsList }), p.id, S.state);
    return {
      html: head(r.slotLabel + ' route', r.stops + ' drops · ' + km(r.distanceKm) + ' · ' + money(r.earnings), { back: true }) +
        '<div class="sec">' +
        '<div class="card" style="padding:0;overflow:hidden">' + routeMap(r, 230) + '</div>' +
        '<div class="card"><div class="sec-h" style="margin:0 0 9px"><h3 style="font-size:16px">Route order</h3>' +
        pill('Vendor → ' + r.stops + ' customers', 'violet', 'route') + '</div>' +
        '<div class="lockrow" style="margin-bottom:10px;background:var(--amber-bg);border-color:var(--amber-line);color:#7A4A05">' + icon('store', 17) +
        '<span><b>Start:</b> ' + esc(v.name) + ', ' + esc(v.area) + ' — collect ' + kg(r.totalKg) + ' of reserved stock.</span></div>' +
        '<div class="stoplist">' + r.stopsList.map((s, i) =>
          '<div class="stop"><div class="stop-n">' + (i + 1) + '</div><div class="grow">' +
          '<div class="stop-t">' + esc(s.customerName) + '</div>' +
          '<div class="stop-s">' + esc(s.address) + ' · ' + kg(s.qtyKg) + ' ' + esc(s.cropName) + ' · leg ' + km(s.km) + '</div>' +
          '<div class="trace" style="margin-top:5px;display:inline-flex">' + icon('eye', 11) + '<span>' + esc(s.orderId) + ' · ' + esc(s.trackingId) + '</span></div>' +
          '</div></div>').join('') + '</div></div>' +

        '<div class="card"><div class="sec-h" style="margin:0 0 9px"><h3 style="font-size:16px">Earnings breakdown</h3>' +
        pill('If you accept', 'green') + '</div>' +
        '<div class="meta">' +
        '<div><div class="k">Drop fees</div><div class="v">' + money(r.stops * rePriced.perDrop) + '</div></div>' +
        '<div><div class="k">Distance pay</div><div class="v">' + money(Math.round(r.distanceKm * rePriced.perKm)) + '</div></div>' +
        '<div><div class="k">Load bonus</div><div class="v">' + money(Math.round(r.totalKg * 0.55)) + '</div></div>' +
        '<div><div class="k">Peak slot bonus</div><div class="v">' + money(rePriced.earnings - r.stops * rePriced.perDrop - Math.round(r.distanceKm * rePriced.perKm) - Math.round(r.totalKg * 0.55)) + '</div></div>' +
        '</div>' +
        '<div class="between" style="margin-top:11px;padding-top:11px;border-top:1px dashed var(--line)">' +
        '<b style="font-size:16px">Your total (' + esc(p.name) + ')</b><b style="font-size:24px;color:var(--g800)">' + money(rePriced.earnings) + '</b></div>' +
        '<div class="hint">Rates: ' + money(rePriced.perDrop) + ' per drop + ' + money(rePriced.perKm) + '/km · ' + esc(p.vehicle) + ' · capacity ' + kg(p.capKg) + '</div></div>' +

        '<div class="card"><div class="sec-h" style="margin:0 0 9px"><h3 style="font-size:16px">Why this route is efficient</h3></div>' +
        '<div class="stats3">' +
        U.stat({ icon: 'route', label: 'Optimised', value: km(r.distanceKm), tone: 'green' }) +
        U.stat({ icon: 'truck', label: 'Individual trips', value: km(r.naiveKm), tone: 'red' }) +
        U.stat({ icon: 'trend', label: 'Saved', value: km(r.savedKm), sub: r.savedPct + '% less driving', tone: 'blue' }) +
        '</div>' +
        '<div class="hint" style="margin-top:9px">' + esc(r.grouping) + ' Travel time uses a mock traffic factor of ×' + r.trafficFactor + ' for this slot.</div></div>' +

        (r.status === 'open' ? U.btn('Accept this job', 'accept', { tone: 'primary', size: 'xl', icon: 'check', cls: 'block', data: 'data-id="' + r.id + '"' })
          : pill('Already taken / started', 'grey')) +
        '<div style="height:14px"></div></div>',
      handlers: H({ accept: (n, e, d) => acceptRoute(d.id) })
    };
  }

  function acceptRoute(id) {
    const p = partner();
    const r = S.route(id);
    if (!r) return;
    if (r.status !== 'open') { U.toast('This job was just taken', 'warn'); AG.app.refresh(true); return; }
    AG.algo.recalcRouteForPartner(r, p.id, S.state);
    const res = S.acceptRoute(id, p.id);
    if (res.ok) {
      U.toast('Job accepted · ' + r.stops + ' drops · ' + money(r.earnings), 'good');
      AG.app.go('partner', 'route', { id: r.id });
    }
  }

  /* ---------------- ACTIVE ROUTE ---------------- */
  function screenRoute() {
    const p = partner();
    let r = AG.app.currentNav().params.id ? S.route(AG.app.currentNav().params.id) : myActive();
    if (!r || (r.partnerId !== p.id)) r = myActive() || r;
    if (!r) {
      return {
        html: head('Active route', 'Nothing running', { back: true }) + '<div class="sec">' +
          U.empty('No active route. Accept a job to start driving.', 'route') +
          '<div style="margin-top:12px">' + U.btn('See available jobs', null, { tone: 'primary', size: 'lg', icon: 'list', cls: 'block', data: 'data-act="go" data-tab="jobs"' }) + '</div></div>',
        handlers: H({})
      };
    }
    const v = S.vendor(r.vendorId);
    const st = U.ROUTE_STATUS[r.status] || { label: r.status, tone: 'grey' };
    const steps = ['Assigned', 'Going to vendor', 'Picked up', 'Out for delivery', 'Delivered'];
    const idx = { assigned: 0, to_vendor: 1, picked_up: 2, delivering: 3, completed: 4 }[r.status] ?? 0;
    const nextIdx = r.stopsList.findIndex(s => !s.done);
    const nextStop = nextIdx >= 0 ? r.stopsList[nextIdx] : null;
    const nextOrder = nextStop ? S.order(nextStop.orderId) : null;
    return {
      html: head(r.slotLabel, r.stops + ' drops · ' + km(r.distanceKm) + ' · ' + r.etaMin + ' min', { back: true }) +
        '<div class="sec">' +
        '<div class="card"><div class="between" style="margin-bottom:10px">' + pill(st.label, st.tone, 'truck') +
        '<span class="muted" style="font-size:12.5px;font-weight:800">' + esc(r.id) + ' · earned ' + money(r.earnedSoFar || 0) + ' / ' + money(r.earnings) + '</span></div>' +
        U.stepper(steps, idx) + '</div>' +

        '<div class="card" style="padding:0;overflow:hidden">' + routeMap(r, 250) + '</div>' +

        (r.status === 'to_vendor' || r.status === 'assigned' ?
          '<div class="card amber"><div class="card-h"><div class="card-ic amber">' + icon('store', 22) + '</div><div class="grow">' +
          '<div class="card-t" style="font-size:16px">Collect from ' + esc(v.name) + '</div>' +
          '<div class="card-s">' + esc(v.area) + ' · ' + km(roadKm(p, v)) + ' from you · ' + kg(r.totalKg) + ' of reserved stock</div></div></div>' +
          '<div style="margin-top:11px">' + U.btn(r.status === 'assigned' ? 'Start driving to vendor' : 'Confirm pickup', 'advance', { tone: 'amber', size: 'xl', icon: r.status === 'assigned' ? 'truck' : 'box', cls: 'block', data: 'data-id="' + r.id + '"' }) + '</div></div>'
          : '') +

        (r.status === 'picked_up' || r.status === 'delivering' ?
          (nextStop ? '<div class="card green"><div class="card-h"><div class="card-ic">' + icon('pin', 22) + '</div><div class="grow">' +
            '<div class="card-t" style="font-size:17px">Next: ' + esc(nextStop.customerName) + '</div>' +
            '<div class="card-s">' + esc(nextStop.address) + ' · ' + kg(nextStop.qtyKg) + ' ' + esc(nextStop.cropName) + ' · leg ' + km(nextStop.km) + '</div>' +
            '<div class="pill-row" style="margin-top:6px">' + pill(nextStop.orderId, 'blue') + pill(nextStop.trackingId, 'grey', 'eye') +
            (nextOrder ? pill(nextOrder.method, 'amber', 'coin') : '') + '</div></div></div>' +
            '<div style="margin-top:11px" class="btn-row">' +
            U.btn('Mark delivered', 'deliverStop', { tone: 'primary', size: 'lg', icon: 'check', data: 'data-id="' + r.id + '" data-idx="' + nextIdx + '"' }) +
            (nextOrder && nextOrder.method === 'Cash on delivery' ? U.btn('Collect ' + money(nextOrder.total), 'collectCash', { tone: 'amber', size: 'lg', icon: 'coin' }) : '') +
            '</div></div>'
            : '<div class="card green center"><div style="font-size:44px">🎉</div><div class="card-t" style="font-size:19px">All drops complete</div></div>')
          : '') +

        '<div class="card"><div class="sec-h" style="margin:0 0 9px"><h3 style="font-size:16px">Delivery stops</h3>' +
        pill((r.doneCount || 0) + ' / ' + r.stops + ' done', (r.doneCount || 0) === r.stops ? 'green' : 'amber') + '</div>' +
        '<div class="stoplist">' + r.stopsList.map((s, i) => {
          const o = S.order(s.orderId);
          return '<div class="stop ' + (s.done ? 'done' : i === nextIdx ? 'now' : '') + '"><div class="stop-n">' + (s.done ? icon('check', 15) : i + 1) + '</div>' +
            '<div class="grow"><div class="stop-t">' + esc(s.customerName) + ' · ' + esc(s.address) + '</div>' +
            '<div class="stop-s">' + kg(s.qtyKg) + ' ' + esc(s.cropName) + ' · ' + esc(o ? (U.ORDER_STATUS[o.status] || {}).label : '') + ' · leg ' + km(s.km) + '</div></div>' +
            (!s.done && r.status !== 'assigned' && r.status !== 'to_vendor' ? '<button class="btn sm" data-act="deliverStop" data-id="' + r.id + '" data-idx="' + i + '">Deliver</button>'
              : s.done ? pill('Done', 'green') : '') +
            '</div>';
        }).join('') + '</div></div>' +

        (r.status === 'delivering' ? U.btn('Advance status', 'advance', { tone: 'blue', size: 'lg', icon: 'right', cls: 'block', data: 'data-id="' + r.id + '"' }) : '') +
        (r.status === 'completed' ? '<div class="card green"><div class="card-h"><div class="card-ic">' + icon('check', 22) + '</div><div class="grow">' +
          '<div class="card-t">Route completed</div><div class="card-s">' + r.stops + ' deliveries · ' + km(r.distanceKm) + ' · ' + money(r.earnedSoFar || r.earnings) + ' earned · ' + km(r.savedKm) + ' saved vs individual trips</div></div></div></div>' : '') +
        '<div style="height:14px"></div></div>',
      handlers: H({
        advance: (n, e, d) => {
          const res = S.advanceRoute(d.id);
          if (res.ok) {
            U.toast('Status → ' + (U.ROUTE_STATUS[res.status] || {}).label, 'good');
            if (res.status === 'completed') U.toast('Route completed · ' + money(S.route(d.id).earnedSoFar || 0) + ' earned', 'good', 3600);
          }
          AG.app.refresh(true);
        },
        deliverStop: (n, e, d) => {
          const res = S.deliverStop(d.id, Number(d.idx));
          if (res.ok) { U.toast('Delivered · +' + money(res.earned) + ' added to today', 'good'); }
          AG.app.refresh(true);
        },
        collectCash: () => U.toast('Cash collected ✓', 'good')
      })
    };
  }

  /* ---------------- COMPLETED / EARNINGS ---------------- */
  function screenCompleted() {
    const p = partner();
    const done = S.state.routes.filter(r => r.partnerId === p.id && r.status === 'completed');
    return {
      html: head('Completed deliveries', done.length + ' routes', { back: true }) +
        '<div class="sec">' + (done.length ? done.map(r =>
          '<div class="card"><div class="card-h"><div class="card-ic">' + icon('check', 20) + '</div><div class="grow">' +
          '<div class="card-t" style="font-size:15.5px">' + esc(r.slotLabel) + ' · ' + r.stops + ' drops</div>' +
          '<div class="card-s">' + esc(r.id) + ' · ' + km(r.distanceKm) + ' · ' + (r.completedAt ? timeAgo(r.completedAt) : '') + '</div></div>' +
          '<div style="text-align:right"><div style="font-size:18px;font-weight:900;color:var(--g800)">' + money(r.earnedSoFar || r.earnings) + '</div>' +
          '<div class="card-s">saved ' + km(r.savedKm) + '</div></div></div></div>').join('')
          : U.empty('No completed routes yet.', 'check')) + '</div>',
      handlers: H({})
    };
  }

  function screenEarnings() {
    const p = partner();
    const done = S.state.routes.filter(r => r.partnerId === p.id);
    const week = [0, 0, 0, 0, 0, 0, 0];
    done.forEach(r => {
      if (!r.completedAt) return;
      const d = new Date(r.completedAt).getDay();
      week[(d + 6) % 7] += (r.earnedSoFar || r.earnings);
    });
    week[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] += p.todayEarnings - (week[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] ? 0 : 0);
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const totalKm = done.reduce((s, r) => s + r.distanceKm, 0);
    const savedKm = done.reduce((s, r) => s + (r.savedKm || 0), 0);
    return {
      html: head('Earnings', 'Today ' + money(p.todayEarnings) + ' · lifetime ' + money(p.totalEarnings), { back: true }) +
        '<div class="sec">' +
        '<div class="earn-card"><div class="k">Today</div><div class="v">' + money(p.todayEarnings) + '</div>' +
        '<div class="row" style="gap:14px;margin-top:12px"><div><div class="k">Deliveries</div><div style="font-size:18px;font-weight:900">' + p.todayDeliveries + '</div></div>' +
        '<div><div class="k">Routes</div><div style="font-size:18px;font-weight:900">' + done.filter(r => r.status === 'completed').length + '</div></div>' +
        '<div><div class="k">Rating</div><div style="font-size:18px;font-weight:900">' + p.rating + '★</div></div></div></div>' +
        '<div class="card"><div class="sec-h" style="margin:0 0 6px"><h3 style="font-size:15.5px">This week</h3>' +
        '<span class="pill green">' + money(week.reduce((a, b) => a + b, 0)) + '</span></div>' +
        U.bars(labels.map((l, i) => ({ label: l, value: Math.round(week[i]), color: i === week.length - 1 ? '#D98A16' : '#2E9E5B' })), { fmt: v => v ? '₹' + v : '' }) + '</div>' +
        '<div class="stats3">' +
        U.stat({ icon: 'route', label: 'Km driven', value: round(totalKm, 0) + '', tone: 'blue' }) +
        U.stat({ icon: 'trend', label: 'Km saved by grouping', value: round(savedKm, 0) + '', tone: 'green' }) +
        U.stat({ icon: 'coin', label: 'Per delivery avg', value: money(p.todayDeliveries ? p.todayEarnings / p.todayDeliveries : 0), tone: 'amber' }) +
        '</div>' +
        '<div class="card"><div class="sec-h" style="margin:0 0 9px"><h3 style="font-size:15.5px">Earning tips</h3>' + icon('lightbulb', 18) + '</div>' +
        '<p class="muted" style="font-size:13.5px;font-weight:600;line-height:1.55">Accept grouped routes in peak slots (1–3 PM and 5–7 PM) — they carry a ' + money(60) + ' bonus plus more drop fees per km. Grouped routes cut driving by ' + (done.length ? Math.round(savedKm / Math.max(1, totalKm) * 100) : 24) + '% on average, so you finish the slot early and can take another job.</p></div>' +
        '</div>',
      handlers: H({})
    };
  }

  function screenNotifications() {
    const p = partner();
    const list = S.notifsFor('partner', p.id).concat(S.notifsFor('partner', '*')).sort((a, b) => b.ts - a.ts);
    S.markRead('partner', p.id); S.markRead('partner', '*');
    return {
      html: head('Notifications', list.length + ' total', { back: true }) +
        '<div class="sec">' + (list.length ? list.map(n =>
          '<div class="notif ' + (n.read ? '' : 'unread') + ' ' + (n.type || '') + '"><div class="notif-ic">' + icon(n.type === 'job' ? 'route' : n.type === 'earnings' ? 'coin' : 'bell', 20) + '</div>' +
          '<div class="grow"><div class="notif-t">' + esc(n.title) + '</div><div class="notif-b">' + esc(n.body) + '</div>' +
          '<div class="notif-ts">' + timeAgo(n.ts) + '</div></div>' +
          (n.routeId ? '<button class="btn sm ghost" data-act="openJob" data-id="' + n.routeId + '">' + icon('right', 16) + '</button>' : '') + '</div>').join('')
          : U.empty('Nothing yet', 'bell')) + '</div>',
      handlers: H({ openJob: (n, e, d) => AG.app.go('partner', 'job', { id: d.id }) })
    };
  }

  function screenProfile() {
    const p = partner();
    return {
      html: head('Profile', p.vehicle + ' · ' + p.dl, { back: true }) +
        '<div class="sec">' +
        '<div class="card"><div class="card-h"><div class="avatar" style="width:56px;height:56px;background:var(--violet-bg);color:var(--violet)">' + icon('truck', 26) + '</div>' +
        '<div class="grow"><div class="card-t" style="font-size:18px">' + esc(p.name) + '</div><div class="card-s">' + esc(p.area) + ', Pune</div>' +
        '<div class="pill-row" style="margin-top:6px">' + pill('Verified', 'green', 'shield') + pill(p.rating + ' ★', 'amber', 'star') + pill(p.status === 'idle' ? 'Available' : 'On route', p.status === 'idle' ? 'blue' : 'amber') + '</div></div></div>' +
        '<div class="meta" style="margin-top:11px">' +
        '<div><div class="k">Vehicle</div><div class="v" style="font-size:14px">' + esc(p.vehicle) + '</div></div>' +
        '<div><div class="k">Capacity</div><div class="v">' + kg(p.capKg) + '</div></div>' +
        '<div><div class="k">Rate</div><div class="v" style="font-size:14px">' + money(p.perDrop) + '/drop</div></div>' +
        '<div><div class="k">Lifetime</div><div class="v">' + money(p.totalEarnings) + '</div></div></div></div>' +
        '<div class="card"><div class="sec-h" style="margin:0 0 9px"><h3 style="font-size:15px">Demo persona — switch partner</h3></div>' +
        '<div class="chips">' + S.state.partners.map(x => '<button class="chip sm" data-act="setPartner" data-id="' + x.id + '" aria-pressed="' + (x.id === p.id) + '">' + esc(x.name) + '</button>').join('') + '</div></div>' +
        '<div class="card"><div class="li static" style="border:0;box-shadow:none;padding:0;background:none"><span class="li-ic">' + icon('logout', 22) + '</span>' +
        '<span class="grow"><span class="li-t">Switch interface</span><span class="li-s">Farmer · Vendor · Customer · Government</span></span>' +
        '<button class="btn sm ghost" data-act="welcome">Roles</button></div></div>' +
        '</div>',
      handlers: H({
        setPartner: (n, e, d) => { S.state.currentPartner = d.id; S.save(); U.toast('Now driving as ' + S.partner(d.id).name, 'good'); AG.app.go('partner', 'home'); },
        welcome: () => { S.state.welcomed = false; S.save(); AG.app.refresh(true); }
      })
    };
  }

  function H(extra) {
    return Object.assign({
      go: (n, e, d) => AG.app.go('partner', d.tab, d.id ? { id: d.id } : {}),
      back: () => AG.app.go('partner', 'home')
    }, extra || {});
  }

  AG.apps = AG.apps || {};
  AG.apps.partner = {
    id: 'partner', wide: false,
    tabs: [
      { id: 'home', label: 'Home', icon: 'home' },
      { id: 'jobs', label: 'Jobs', icon: 'list', badge: () => openJobs().length || '' },
      { id: 'route', label: 'Route', icon: 'map' },
      { id: 'earnings', label: 'Earnings', icon: 'coin' },
      { id: 'profile', label: 'Profile', icon: 'user' }
    ],
    render(tab) {
      switch (tab) {
        case 'home': return screenHome();
        case 'jobs': return screenJobs();
        case 'job': return screenJob();
        case 'route': return screenRoute();
        case 'completed': return screenCompleted();
        case 'earnings': return screenEarnings();
        case 'notifications': return screenNotifications();
        case 'profile': return screenProfile();
        default: return screenHome();
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
