/* ============================================================
   AGRILINK — INVENTORY VENDOR APP
   Opportunities scored by Algorithm 2 · AI bid band ·
   30% free / 70% reserved inventory rule (hard enforced).
   ============================================================ */
(function (g) {
  'use strict';
  const AG = g.AG, U = AG.ui, S = AG.store;
  const { icon, esc, money, money1, kg, km, pill, progress } = U;
  const { cropArt, CROP_BY_KEY, FREE_RATIO, RESERVE_RATIO } = AG.catalog;
  const { roadKm, round, fmtDate, fmtDay, timeAgo } = AG.util;

  const vendor = () => S.vendor(S.state.currentVendor) || S.state.vendors[0];
  const L = { oppFilter: 'all', bidPrice: {}, tab: 'home' };

  function head(title, sub, opts) {
    const o = opts || {};
    const v = vendor();
    const unread = S.unreadCount('vendor', v.id);
    return '<div class="apphead"><div class="head-row">' +
      (o.back ? '<button class="iconbtn" data-act="back">' + icon('left', 22) + '</button>' : '') +
      '<div class="avatar" style="background:var(--amber-bg);color:#8A5A0B">' + icon('store', 22) + '</div>' +
      '<div class="grow"><h2 style="font-size:20px">' + esc(title) + '</h2><div class="sub muted" style="font-size:13px">' + esc(sub) + '</div></div>' +
      '<button class="iconbtn" data-act="go" data-tab="notifications">' + icon('bell', 21) + (unread ? '<span class="nb">' + unread + '</span>' : '') + '</button>' +
      '</div>' + (o.extra || '') + '</div>';
  }

  /* ---------------- HOME ---------------- */
  function screenHome() {
    const v = vendor();
    const opps = AG.algo.opportunitiesForVendor(v.id, S.state);
    const invited = opps.filter(o => o.invited && o.canBid);
    const myBids = opps.filter(o => o.bid);
    const won = S.state.crops.filter(c => c.vendorId === v.id && c.winnerBidId);
    const batches = S.state.batches.filter(b => b.vendorId === v.id);
    const active = batches.filter(b => !b.frozen && S.batchStock(b).reservedLeft + S.batchStock(b).freeLeft > 0);
    const orders = S.state.orders.filter(o => o.vendorId === v.id);
    const openOrders = orders.filter(o => !['delivered', 'completed', 'cancelled'].includes(o.status));
    const reservedKg = batches.reduce((s, b) => s + S.batchStock(b).reservedLeft, 0);
    const freeKg = batches.reduce((s, b) => s + S.batchStock(b).freeLeft, 0);
    const capUsed = Math.round(v.usedKg / v.capacityKg * 100);

    return {
      html: head(v.name, v.area + ' · ' + v.licence, {}) +
        '<div class="sec" style="padding-bottom:0">' +
        (v.frozen ? '<div class="card red"><div class="card-h"><div class="card-ic red">' + icon('alert', 20) + '</div><div><div class="card-t">Account flagged by government monitoring</div><div class="card-s">' + esc(v.frozenNote || '') + '</div></div></div></div>' : '') +
        '<div class="stats2">' +
        U.stat({ icon: 'sprout', label: 'Open opportunities', value: invited.length, sub: opps.length + ' scored', tone: 'amber' }) +
        U.stat({ icon: 'coin', label: 'My bids', value: myBids.length, sub: won.length + ' won', tone: 'blue' }) +
        U.stat({ icon: 'box', label: 'Stock in godown', value: kg(reservedKg + freeKg), sub: capUsed + '% of capacity' }) +
        U.stat({ icon: 'lock', label: 'Reserved (70%)', value: kg(reservedKg), sub: freeKg + ' kg free (30%)', tone: 'teal' }) +
        '</div></div>' +

        '<div style="height:12px"></div>' +
        '<div class="grid-actions">' +
        (invited.length ? '<button class="bigact hero" data-act="go" data-tab="opportunities"><span class="bigact-ic">' + icon('sprout', 30) + '</span>' +
          '<span class="grow"><span class="bigact-t">Available Farmer Crops</span><span class="bigact-s">' + invited.length + ' lot(s) waiting for your bid</span></span>' + icon('right', 24) + '</button>' : '') +
        tile('Nearby Opportunities', 'map', opps.length + ' scored by AI', 'opportunities', 'teal') +
        tile('Available Farmer Crops', 'sprout', invited.length + ' invited', 'opportunities', '') +
        tile('My Bids', 'coin', myBids.length + ' active', 'mybids', 'amber') +
        tile('Won Bids', 'check', won.filter(c => !c.batchId).length + ' to collect', 'won', 'green') +
        tile('My Inventory', 'box', batches.length + ' batches', 'inventory', '') +
        tile('Reserved Stock', 'lock', kg(reservedKg) + ' locked', 'reserved', 'teal') +
        tile('Orders', 'cart', openOrders.length + ' open', 'orders', 'blue') +
        tile('Notifications', 'bell', S.unreadCount('vendor', v.id) + ' new', 'notifications', 'violet') +
        tile('Profile', 'user', 'Capacity ' + capUsed + '%', 'profile', '') +
        '</div>' +

        (won.filter(c => !c.batchId).length ?
          '<div class="sec">' + U.section('Collect your won lots', pill(won.filter(c => !c.batchId).length + ' pending', 'amber'),
            won.filter(c => !c.batchId).map(c => wonCard(c)).join('')) + '</div>' : '') +

        (openOrders.length ?
          '<div class="sec">' + U.section('Orders from AGRILINK customers', '<button class="link" data-act="go" data-tab="orders">All ' + icon('right', 13) + '</button>',
            openOrders.slice(0, 3).map(o => orderRow(o)).join('')) + '</div>' : '') +

        '<div class="sec">' + U.section('Inventory rule', pill('30 / 70', 'green'),
          '<div class="card green"><div class="card-h"><div class="card-ic">' + icon('lock', 20) + '</div><div class="grow">' +
          '<div class="card-t" style="font-size:15.5px">You may use only 30% of every batch freely</div>' +
          '<div class="card-s">The remaining 70% is reserved for AGRILINK customers. Algorithm 3 blocks and reports any attempt to move more.</div></div></div>' +
          U.stockSplit(batches.reduce((s, b) => s + b.freeKg, 0), batches.reduce((s, b) => s + b.reservedKg, 0)) + '</div>') + '</div>',
      handlers: H({})
    };
  }
  function tile(title, ic, sub, tab, tone) {
    return '<button class="bigact ' + (tone || '') + '" data-act="go" data-tab="' + tab + '">' +
      '<span class="bigact-ic">' + icon(ic, 24) + '</span><span class="bigact-t">' + esc(title) + '</span>' +
      '<span class="bigact-s">' + esc(sub) + '</span></button>';
  }

  /* ---------------- OPPORTUNITIES ---------------- */
  function screenOpportunities() {
    const v = vendor();
    const opps = AG.algo.opportunitiesForVendor(v.id, S.state);
    const f = L.oppFilter;
    const list = opps.filter(o =>
      f === 'all' ? true :
        f === 'invited' ? o.invited :
          f === 'canbid' ? o.canBid :
            f === 'mybid' ? !!o.bid :
              f === 'won' ? o.won : true);
    const chips = [['all', 'All ' + opps.length], ['invited', 'Invited'], ['canbid', 'Can bid'], ['mybid', 'My bids'], ['won', 'Won']];
    return {
      html: head('Farmer crop opportunities', 'Scored by Algorithm 2 · distance + quality + demand + price + shelf life + spoilage + transport + capacity', { back: true }) +
        '<div class="qchips">' + chips.map(c => '<button class="qchip" data-act="filter" data-f="' + c[0] + '" style="' + (f === c[0] ? 'background:var(--g600);color:#fff;border-color:var(--g600)' : '') + '">' + esc(c[1]) + '</button>').join('') + '</div>' +
        '<div class="sec" style="padding-top:2px">' +
        (list.length ? list.map(o => oppCard(o)).join('') : U.empty('No crop matches this filter right now. The algorithm keeps scanning new lots.', 'sprout')) +
        '</div>',
      handlers: H({
        filter: (n, e, d) => { L.oppFilter = d.f; AG.app.refresh(true); },
        openOpp: (n, e, d) => AG.app.go('vendor', 'opportunity', { id: d.id })
      })
    };
  }
  function oppCard(o) {
    const c = o.crop, f = S.farmer(c.farmerId);
    return '<div class="oppcard ' + (o.invited ? 'invited' : '') + '">' +
      '<div class="card-h"><div class="batch-thumb">' + cropArt(c.cropKey, 50) + '</div>' +
      '<div class="grow"><div class="card-t">' + esc(c.cropName) + ' · ' + kg(c.qtyKg) + '</div>' +
      '<div class="card-s">' + esc(f.name) + ' · ' + esc(f.village) + ' · ' + km(o.distanceKm) + '</div>' +
      '<div class="pill-row" style="margin-top:6px">' +
      pill('Grade ' + c.analysis.grade, c.analysis.grade === 'A' ? 'green' : 'amber', 'star') +
      pill('Shelf ' + c.analysis.shelfLife + 'd', 'blue') +
      pill(c.analysis.spoilageRisk + ' risk', U2.riskTone(c.analysis.spoilageRisk)) +
      (o.invited ? pill('Invited', 'green', 'bell') : pill('Nearby', 'grey')) +
      (o.won ? pill('YOU WON', 'green', 'check') : '') +
      '</div></div>' +
      '<div style="text-align:right"><div style="font-size:19px;font-weight:900;color:var(--g800)">' + money1(o.band.suggested) + '</div>' +
      '<div class="card-s">' + esc(c.trackingId.slice(-6)) + '</div></div></div>' +
      '<div class="scorebar" style="margin-top:11px"><span class="muted" style="font-size:12px;font-weight:800">Match</span>' +
      progress(o.score, o.score > 75 ? '' : 'amber') + '<span class="score-v">' + o.score + '%</span></div>' +
      '<div class="between" style="margin-top:11px;gap:8px">' +
      '<div class="muted" style="font-size:12px;font-weight:700">' + esc(o.why) + '</div>' +
      (o.bid ? pill('Your bid ' + money1(o.bid.price), o.won ? 'green' : 'amber', 'coin') :
        o.canBid ? '<button class="btn sm" data-act="openOpp" data-id="' + c.id + '">Bid now' + icon('right', 15) + '</button>'
          : pill('Bid closed', 'grey')) +
      '</div></div>';
  }

  function screenOpportunity() {
    const p = AG.app.currentNav().params;
    const c = S.crop(p.id); if (!c) return screenOpportunities();
    const v = vendor(), f = S.farmer(c.farmerId), a = c.analysis;
    const band = AG.algo.bidBand(c);
    const m = AG.algo.scoreVendorForCrop(c, v, S.state);
    const myBid = c.bids.find(b => b.vendorId === v.id);
    const price = L.bidPrice[c.id] != null ? L.bidPrice[c.id] : band.suggested;
    const total = price * c.qtyKg;
    const margin = (c.retailPrice - price) * c.qtyKg;

    return {
      html: head(c.cropName + ' · ' + kg(c.qtyKg), f.name + ' · ' + f.village + ' · ' + c.trackingId, { back: true }) +
        '<div class="sec">' +
        '<div class="card"><div class="card-h"><div class="batch-thumb" style="width:64px;height:64px">' + cropArt(c.cropKey, 64) + '</div>' +
        '<div class="grow"><div class="card-t" style="font-size:18px">' + esc(c.cropName) + '</div>' +
        '<div class="card-s">Harvested ' + timeAgo(c.createdAt) + ' · ' + esc(a.harvestCondition) + '</div>' +
        '<div class="pill-row" style="margin-top:6px">' + pill('Grade ' + a.grade, 'green', 'star') + pill(a.qualityScore + '/100', 'blue') +
        pill('Fresh ' + a.freshness + '%', 'green') + pill('Damage ' + a.damage + '%', a.damage > 5 ? 'amber' : 'grey') + '</div></div></div>' +
        '<div class="meta" style="margin-top:12px">' +
        '<div><div class="k">Distance</div><div class="v">' + km(m.distanceKm) + '</div></div>' +
        '<div><div class="k">Pickup ETA</div><div class="v">' + m.etaHrs + ' h</div></div>' +
        '<div><div class="k">Shelf life</div><div class="v">' + a.shelfLife + ' days</div></div>' +
        '<div><div class="k">Spoilage</div><div class="v">' + esc(a.spoilageRisk) + '</div></div>' +
        '<div><div class="k">Transport cost</div><div class="v">' + money(a.transportCost) + '</div></div>' +
        '<div><div class="k">Demand</div><div class="v">' + a.demand + '%</div></div>' +
        '</div>' +
        '<div class="pill-row" style="margin-top:4px">' + a.transport.map(t => pill(t, 'blue', 'truck')).join('') + '</div>' +
        '</div>' +

        '<div class="card"><div class="sec-h" style="margin:0 0 8px"><h3 style="font-size:15.5px">Why this lot suits you</h3>' +
        '<span class="pill ' + (m.score > 75 ? 'green' : 'amber') + '">Match ' + m.score + '%</span></div>' +
        '<div class="factors" style="grid-template-columns:1fr">' + AG.algo.WEIGHTS.map(w =>
          '<div class="factor"><span style="width:130px">' + esc(w.label) + '</span>' +
          '<span class="prog"><span class="prog-bar ' + (m.factors[w.k] > 65 ? '' : 'amber') + '" style="width:' + Math.round(m.factors[w.k]) + '%;display:block;height:100%"></span></span>' +
          '<span class="fv">' + Math.round(m.factors[w.k]) + '</span></div>').join('') + '</div>' +
        '<div class="lockrow" style="margin-top:11px">' + icon('ai', 17) + '<span>' + esc(m.why) + '. Your free capacity: ' + kg(Math.max(0, v.capacityKg - v.usedKg)) + '.</span></div></div>' +

        /* ---- AI bid band + bid form ---- */

        '<div class="card ' + (myBid ? 'green' : '') + '"><div class="sec-h" style="margin:0 0 6px"><h3 style="font-size:16px">' + icon('ai', 16) + ' AI bid guidance</h3>' +
        '<span class="pill blue">Algorithm 1</span></div>' +
        '<div class="stats3">' +
        U.stat({ icon: 'down', label: 'Minimum suggested bid', value: money1(band.min), tone: 'red' }) +
        U.stat({ icon: 'star', label: 'Fair value', value: money1(band.suggested), tone: 'amber' }) +
        U.stat({ icon: 'up', label: 'Maximum suggested bid', value: money1(band.max), tone: 'green' }) +
        '</div>' +
        '<div style="margin-top:12px">' + U2.priceBand(a, c.bids.filter(b => b.vendorId !== v.id)) + '</div>' +
        '<p class="muted" style="font-size:12.5px;margin-top:14px;font-weight:600">' + esc(band.reason) + '</p>' +

        (myBid ?
          '<div class="lockrow" style="margin-top:12px;background:#EAF6EC">' + icon('check', 18) +
          '<span>Your bid: <b>' + money1(myBid.price) + '/kg</b> · ' + esc(myBid.status === 'won' ? 'WON — go to Won Bids to collect' : myBid.status === 'open' ? 'waiting for the farmer' : 'not selected') + '</span></div>' +
          (myBid.status === 'open' ? '<div style="margin-top:10px">' + U.btn('Update bid', null, { tone: 'ghost', size: 'lg', icon: 'edit', cls: 'block', data: 'data-act="editBid"' }) + '</div>' : '')
          :
          (!c.notifiedVendors.includes(v.id) ?
            '<div class="card amber" style="margin-top:12px;margin-bottom:0"><div class="card-h"><div class="card-ic amber">' + icon('lock', 20) + '</div><div><div class="card-t" style="font-size:15px">You are not invited to this lot</div><div class="card-s">Maximum 3 vendors may connect to one farmer crop. The algorithm invites the best 3 matches only.</div></div></div></div>'
            : c.bids.length >= 3 ?
              '<div class="card amber" style="margin-top:12px;margin-bottom:0"><div class="card-h"><div class="card-ic amber">' + icon('alert', 20) + '</div><div><div class="card-t" style="font-size:15px">Bidding full</div><div class="card-s">3 vendors already bid. You have been redirected to other suitable lots — see Nearby Opportunities.</div></div></div></div>'
              :
              '<div id="bidForm" style="margin-top:14px">' +
              '<div class="between"><label style="font-size:14px;font-weight:900;color:var(--g900)">Your bid (₹/kg)</label>' +
              '<b style="font-size:24px;color:var(--g800)" id="bidVal">' + money1(price) + '</b></div>' +
              '<input class="slider" id="bidSlider" type="range" min="' + band.min + '" max="' + band.max + '" step="0.5" value="' + price + '" ' +
              'style="--p:' + ((price - band.min) / (band.max - band.min) * 100) + '%" data-act="slideBid@input">' +
              '<div class="between muted" style="font-size:12px;font-weight:800;margin-top:4px"><span>min ' + money1(band.min) + '</span><span>max ' + money1(band.max) + '</span></div>' +
              '<div class="chips" style="margin-top:9px">' +
              [[band.min, 'Minimum'], [band.suggested, 'Fair'], [band.max, 'Maximum']].map(x =>
                '<button class="chip sm" data-act="setBid" data-p="' + x[0] + '" style="flex:1;text-align:center">' + esc(x[1]) + ' · ' + money1(x[0]) + '</button>').join('') + '</div>' +
              '<div class="stats2" style="margin-top:12px">' +
              U.stat({ icon: 'coin', label: 'Lot value', value: money(total), sub: kg(c.qtyKg) + ' × ' + money1(price) }) +
              U.stat({ icon: 'trend', label: 'Your gross margin', value: money(margin), sub: 'retail ' + money1(c.retailPrice) + '/kg', tone: 'blue' }) +
              '</div>' +
              '<div class="field" style="margin-top:12px"><label>Note for the farmer (optional)</label>' +
              '<input class="input" id="bidMsg" placeholder="e.g. Own tempo, pickup within 4 hours, crates provided" value="Own tempo, pickup within ' + Math.ceil(m.etaHrs) + ' hours."></div>' +
              '<div class="card amber tight" style="margin-bottom:11px"><div class="row" style="gap:9px">' + icon('lock', 18) +
              '<span style="font-size:12.5px;font-weight:700">Bids outside ₹' + money1(band.min) + '–' + money1(band.max) + ' are rejected by Algorithm 3 (price-anomaly protection for the farmer).</span></div></div>' +
              U.btn('Submit bid', 'submitBid', { tone: 'primary', size: 'xl', icon: 'check', cls: 'block' }) +
              '</div>')
        ) + '</div></div>' +

        '<div class="sec" style="padding-top:0">' +
        '<div class="card tight"><div class="between"><span class="muted" style="font-size:12px;font-weight:800">Competing bids visible to you</span>' +
        '<span class="pill grey">' + c.bids.filter(b => b.vendorId !== v.id).length + ' other(s)</span></div>' +
        (c.bids.filter(b => b.vendorId !== v.id).length ? c.bids.filter(b => b.vendorId !== v.id).map(b =>
          '<div class="mv"><span class="dot" style="background:var(--amber)"></span><div class="grow"><div class="k">' + esc(S.vendor(b.vendorId).name) + '</div>' +
          '<div class="s">' + esc(b.status) + ' · ' + timeAgo(b.createdAt) + '</div></div><div class="li-r">' + money1(b.price) + '</div></div>').join('')
          : '<p class="muted" style="font-size:13px;margin-top:6px">No other bids yet — first mover often wins.</p>') +
        '</div></div>',
      handlers: H({
        slideBid: n => {
          L.bidPrice[c.id] = Number(n.value);
          n.style.setProperty('--p', ((n.value - band.min) / (band.max - band.min) * 100) + '%');
          const v2 = document.getElementById('bidVal'); if (v2) v2.textContent = money1(n.value);
        },
        setBid: (n, e, d) => { L.bidPrice[c.id] = Number(d.p); AG.app.refresh(true); },
        editBid: () => { L.bidPrice[c.id] = null; AG.app.refresh(true); },
        submitBid: () => {
          const msg = document.getElementById('bidMsg');
          const price = L.bidPrice[c.id] != null ? L.bidPrice[c.id] : band.suggested;
          const r = S.placeBid(c.id, v.id, price, msg ? msg.value : '');
          if (r.ok) { U.toast('Bid submitted · ' + money1(price) + '/kg · farmer notified', 'good'); AG.app.go('vendor', 'mybids'); }
          else {
            U.modal({
              title: 'Bid rejected by Algorithm 3', icon: 'shield', tone: 'red',
              body: '<p class="big muted">' + esc(r.message || 'Not allowed.') + '</p>' +
                '<div class="ametrics" style="margin-top:12px">' +
                '<span class="ametric"><span>Min</span> ' + money1(band.min) + '</span>' +
                '<span class="ametric"><span>Max</span> ' + money1(band.max) + '</span>' +
                '<span class="ametric"><span>Your bid</span> ' + money1(price) + '</span></div>',
              actions: [{ label: 'OK', tone: 'primary' }]
            });
          }
        }
      })
    };
  }

  /* ---------------- MY BIDS / WON ---------------- */
  function screenMyBids() {
    const v = vendor();
    const bids = S.state.crops.filter(c => c.bids.some(b => b.vendorId === v.id));
    return {
      html: head('My bids', bids.length + ' lots · ' + bids.filter(c => c.bids.some(b => b.vendorId === v.id && b.status === 'won')).length + ' won', { back: true }) +
        '<div class="sec">' + (bids.length ? bids.map(c => {
          const b = c.bids.find(x => x.vendorId === v.id);
          const band = AG.algo.bidBand(c);
          const f = S.farmer(c.farmerId);
          return '<div class="bidcard ' + (b.status === 'won' ? 'won' : b.status === 'lost' || b.status === 'rejected' ? 'lost' : '') + '">' +
            '<div class="bid-top"><div class="batch-thumb">' + cropArt(c.cropKey, 46) + '</div>' +
            '<div class="grow"><div class="card-t" style="font-size:15.5px">' + esc(c.cropName) + ' · ' + kg(c.qtyKg) + '</div>' +
            '<div class="card-s">' + esc(f.name) + ' · ' + esc(f.village) + ' · ' + timeAgo(b.createdAt) + '</div></div>' +
            '<div style="text-align:right"><div class="bid-price" style="font-size:21px">' + money1(b.price) + '</div><div class="card-s">per kg</div></div></div>' +
            '<div class="pill-row" style="margin-top:9px">' +
            pill(b.status === 'won' ? 'WON' : b.status === 'open' ? 'Waiting for farmer' : b.status === 'rejected' ? 'Rejected' : 'Not selected', b.status === 'won' ? 'green' : b.status === 'open' ? 'amber' : 'grey', b.status === 'won' ? 'check' : 'clock') +
            pill('Band ' + money1(band.min) + '–' + money1(band.max), 'blue') +
            pill('Value ' + money(b.price * c.qtyKg), 'grey') + '</div>' +
            '<div style="margin-top:10px" class="btn-row">' +
            U.btn('Open lot', null, { tone: 'ghost', size: 'sm', icon: 'right', data: 'data-act="openOpp" data-id="' + c.id + '"' }) +
            (b.status === 'won' && !c.batchId ? U.btn('Collect stock', null, { tone: 'primary', size: 'sm', icon: 'truck', data: 'data-act="go" data-tab="won"' }) : '') +
            (b.status === 'lost' || b.status === 'rejected' ? U.btn('See redirected lots', null, { tone: 'soft', size: 'sm', icon: 'route', data: 'data-act="go" data-tab="opportunities"' }) : '') +
            '</div></div>';
        }).join('') : U.empty('No bids yet. Open an opportunity and place a bid inside the AI band.', 'coin')) + '</div>',
      handlers: H({ openOpp: (n, e, d) => AG.app.go('vendor', 'opportunity', { id: d.id }) })
    };
  }

  function screenWon() {
    const v = vendor();
    const won = S.state.crops.filter(c => c.vendorId === v.id && c.winnerBidId);
    const pending = won.filter(c => !c.batchId);
    return {
      html: head('Won bids → Pickup → Inventory', pending.length + ' awaiting collection · ' + (won.length - pending.length) + ' in inventory', { back: true }) +
        '<div class="sec">' +
        '<div class="card dark"><div class="card-h"><div class="card-ic" style="background:rgba(255,255,255,.16);color:#CFEFD8">' + icon('route', 20) + '</div>' +
        '<div><div class="card-t" style="color:#fff">BID WON → PICKUP → INVENTORY</div>' +
        '<div class="card-s">Collect from the farm, then the batch is auto-split 30% free / 70% reserved for AGRILINK customers.</div></div></div></div>' +
        (pending.length ? pending.map(c => wonCard(c, true)).join('') : U.empty('Nothing to collect right now.', 'check')) +
        (won.length - pending.length ? '<div class="sec-h" style="margin-top:14px"><h3>Already in your inventory</h3></div>' +
          won.filter(c => c.batchId).map(c => {
            const b = S.batch(c.batchId), st = S.batchStock(b);
            return '<button class="li" data-act="openBatch" data-id="' + b.id + '">' +
              '<span class="li-ic" style="padding:0;border:0;background:none">' + cropArt(c.cropKey, 44) + '</span>' +
              '<span class="grow"><span class="li-t">' + esc(c.cropName) + ' · ' + kg(b.qtyKg) + '</span>' +
              '<span class="li-s">' + esc(b.id) + ' · ' + kg(st.freeLeft) + ' free left · ' + kg(st.reservedLeft) + ' reserved</span></span>' +
              icon('right', 20) + '</button>';
          }).join('') : '') +
        '</div>',
      handlers: H({
        schedulePickup: (n, e, d) => { S.schedulePickup(d.id, Date.now() + 2 * 3600000); U.toast('Pickup scheduled · farmer notified', 'good'); AG.app.refresh(true); },
        doPickup: (n, e, d) => {
          const c = S.crop(d.id);
          const r = S.completePickup(c.id);
          if (r.ok) {
            U.modal({
              title: 'Stock received into inventory', icon: 'box',
              body: '<div class="card green" style="margin-bottom:12px"><div class="card-h"><div class="batch-thumb">' + cropArt(c.cropKey, 50) + '</div>' +
                '<div><div class="card-t">' + esc(c.cropName) + ' · ' + kg(r.batch.qtyKg) + '</div>' +
                '<div class="card-s">' + esc(r.batch.id) + ' · ' + esc(r.batch.trackingId) + '</div></div></div></div>' +
                '<div class="between" style="margin-bottom:6px"><b>Automatic 30 / 70 split</b>' + pill('Algorithm 3 verified', 'green', 'shield') + '</div>' +
                U.stockSplit(r.batch.freeKg, r.batch.reservedKg) +
                '<div class="meta" style="margin-top:12px">' +
                '<div><div class="k">Paid to farmer</div><div class="v">' + money(r.pay.amount) + '</div></div>' +
                '<div><div class="k">Shelf life</div><div class="v">' + r.batch.shelfLifeDays + ' days</div></div>' +
                '<div><div class="k">Free (30%)</div><div class="v">' + kg(r.batch.freeKg) + '</div></div>' +
                '<div><div class="k">Reserved (70%)</div><div class="v">' + kg(r.batch.reservedKg) + '</div></div></div>',
              actions: [{ label: 'View inventory', tone: 'primary', icon: 'box', onClick: () => AG.app.go('vendor', 'batch', { id: r.batch.id }) },
              { label: 'Close', tone: 'ghost' }]
            });
            AG.app.refresh(true);
          }
        },
        openBatch: (n, e, d) => AG.app.go('vendor', 'batch', { id: d.id })
      })
    };
  }
  function wonCard(c, full) {
    const f = S.farmer(c.farmerId), v = vendor();
    const d = roadKm(f, v);
    const bid = c.bids.find(b => b.id === c.winnerBidId);
    return '<div class="card green">' +
      '<div class="card-h"><div class="batch-thumb">' + cropArt(c.cropKey, 50) + '</div>' +
      '<div class="grow"><div class="card-t">' + esc(c.cropName) + ' · ' + kg(c.qtyKg) + '</div>' +
      '<div class="card-s">' + esc(f.name) + ' · ' + esc(f.village) + ' · ' + km(d) + '</div>' +
      '<div class="pill-row" style="margin-top:6px">' + pill(money1(bid.price) + '/kg', 'green', 'coin') +
      pill('Total ' + money(bid.price * c.qtyKg), 'blue') + pill(U.CROP_STATUS[c.status].label, 'amber') + '</div></div></div>' +
      '<div style="margin:11px 0;border-radius:14px;overflow:hidden">' +
      U.mapSVG({
        width: 360, height: 150,
        points: [{ lat: v.lat, lng: v.lng, color: '#D98A16', label: 'You' }, { lat: f.lat, lng: f.lng, color: '#14713C', label: f.village, pulse: true }],
        routes: [{ points: [{ lat: v.lat, lng: v.lng }, { lat: f.lat, lng: f.lng }], color: '#D98A16' }]
      }) + '</div>' +
      (c.status === 'awarded' ? U.btn('Schedule pickup', 'schedulePickup', { tone: 'primary', size: 'lg', icon: 'calendar', cls: 'block', data: 'data-id="' + c.id + '"' }) : '') +
      (c.status === 'pickup_scheduled' ?
        '<div class="lockrow" style="margin-bottom:10px">' + icon('hand', 17) + '<span>Simulate the farmer handover — weighed at the farm gate, then stock enters your inventory with the 30/70 split.</span></div>' +
        U.btn('Collect stock (simulate handover)', 'doPickup', { tone: 'amber', size: 'lg', icon: 'truck', cls: 'block', data: 'data-id="' + c.id + '"' }) : '') +
      '</div>';
  }

  /* ---------------- INVENTORY ---------------- */
  function screenInventory() {
    const v = vendor();
    const batches = S.state.batches.filter(b => b.vendorId === v.id);
    const active = batches.filter(b => S.batchStock(b).reservedLeft + S.batchStock(b).freeLeft > 0 || b.frozen);
    const totFree = batches.reduce((s, b) => s + b.freeKg, 0), totRes = batches.reduce((s, b) => s + b.reservedKg, 0);
    return {
      html: head('My inventory', batches.length + ' batches · ' + kg(batches.reduce((s, b) => s + b.qtyKg, 0)) + ' received', { back: true }) +
        '<div class="sec">' +
        '<div class="card"><div class="between" style="margin-bottom:9px"><b style="font-size:15px">All stock · 30 / 70 rule</b>' + pill('Government visible', 'blue', 'eye') + '</div>' +
        '<div class="row" style="gap:14px;align-items:center">' +
        U.donut([{ value: totFree, color: '#EBB95F' }, { value: totRes, color: '#2E9E5B' }], 104, kg(totFree + totRes), 'total') +
        '<div class="grow"><div class="muted" style="font-size:12.5px;font-weight:800;margin-bottom:5px">ALLOCATION</div>' +
        '<div class="split-legend" style="margin:0;flex-direction:column;gap:7px">' +
        '<span class="lg free"><i></i>Free / private (30%) · <b>' + kg(totFree) + '</b></span>' +
        '<span class="lg res"><i></i>Reserved for customers (70%) · <b>' + kg(totRes) + '</b></span>' +
        '</div>' + U.progress(Math.round(v.usedKg / v.capacityKg * 100), v.usedKg / v.capacityKg > 0.85 ? 'amber' : '') +
        '<div class="prog-label">Godown capacity ' + kg(v.usedKg) + ' / ' + kg(v.capacityKg) + '</div></div></div></div>' +
        (active.length ? active.map(b => batchCard(b)).join('') : U.empty('No stock yet. Win a bid and collect it from the farm.', 'box')) +
        '</div>',
      handlers: H({ openBatch: (n, e, d) => AG.app.go('vendor', 'batch', { id: d.id }) })
    };
  }
  function batchCard(b) {
    const st = S.batchStock(b), f = S.farmer(b.farmerId);
    return '<button class="batchcard" data-act="openBatch" data-id="' + b.id + '" style="width:100%;text-align:left;cursor:pointer;display:block">' +
      '<div class="batch-h"><div class="batch-thumb">' + cropArt(b.cropKey, 50) + '</div>' +
      '<div class="grow"><div class="card-t" style="font-size:16px">' + esc(b.cropName) + ' · ' + kg(b.qtyKg) + '</div>' +
      '<div class="card-s">' + esc(b.id) + ' · from ' + esc(f.name) + ' (' + esc(f.village) + ')</div>' +
      '<div class="pill-row" style="margin-top:5px">' + pill('Grade ' + b.grade, b.grade === 'A' ? 'green' : 'amber') +
      pill(fmtDay(b.receivedAt), 'blue', 'calendar') + pill(st.daysLeft + 'd shelf left', st.daysLeft <= 2 ? 'red' : 'grey', 'clock') +
      (b.frozen ? pill('FROZEN by Govt', 'red', 'lock') : '') + '</div></div></div>' +
      '<div class="batch-b">' + U.stockSplit(b.freeKg, b.reservedKg) +
      '<div class="meta" style="margin-top:10px">' +
      '<div><div class="k">Available (reserved)</div><div class="v">' + kg(st.reservedLeft) + '</div></div>' +
      '<div><div class="k">Free left (30%)</div><div class="v">' + kg(st.freeLeft) + '</div></div>' +
      '<div><div class="k">Sold to customers</div><div class="v">' + kg(st.reservedSold) + '</div></div>' +
      '<div><div class="k">Movements</div><div class="v">' + b.movements.length + '</div></div>' +
      '</div></div></button>';
  }

  function screenBatch() {
    const p = AG.app.currentNav().params;
    const b = S.batch(p.id); if (!b) return screenInventory();
    const st = S.batchStock(b), f = S.farmer(b.farmerId), v = vendor();
    const orders = S.state.orders.filter(o => o.batchId === b.id);
    const maxFree = st.freeLeft;
    return {
      html: head(b.cropName + ' · ' + kg(b.qtyKg), b.id + ' · ' + b.trackingId, { back: true }) +
        '<div class="sec">' +
        (b.frozen ? '<div class="card red"><div class="card-h"><div class="card-ic red">' + icon('lock', 20) + '</div><div><div class="card-t">Batch frozen by government monitoring</div><div class="card-s">' + esc(b.reviewNote || '') + '</div></div></div></div>' : '') +
        '<div class="card"><div class="card-h"><div class="batch-thumb" style="width:62px;height:62px">' + cropArt(b.cropKey, 62) + '</div>' +
        '<div class="grow"><div class="card-t" style="font-size:18px">' + esc(b.cropName) + '</div>' +
        '<div class="card-s">Source: ' + esc(f.name) + ' · ' + esc(f.village) + '</div>' +
        '<div class="pill-row" style="margin-top:6px">' + pill('Grade ' + b.grade, 'green') + pill('Quality ' + b.qualityScore, 'blue') +
        pill('Received ' + fmtDay(b.receivedAt), 'grey') + pill(st.daysLeft + ' days shelf left', st.daysLeft <= 2 ? 'red' : 'teal') + '</div></div></div>' +
        '<div class="meta" style="margin-top:12px">' +
        '<div><div class="k">Total stock</div><div class="v">' + kg(b.qtyKg) + '</div></div>' +
        '<div><div class="k">Farm price paid</div><div class="v">' + money1(b.pricePerKgFarm) + '</div></div>' +
        '<div><div class="k">Retail price</div><div class="v">' + money1(b.retailPrice) + '</div></div>' +
        '<div><div class="k">Spoilage risk</div><div class="v">' + esc(b.spoilageRisk) + '</div></div>' +
        '</div></div>' +

        '<div class="card green"><div class="sec-h" style="margin:0 0 8px"><h3 style="font-size:16px">Stock percentage indicator</h3>' + pill('30 / 70 rule', 'green', 'shield') + '</div>' +
        U.stockSplit(b.freeKg, b.reservedKg) +
        '<div class="stats2" style="margin-top:12px">' +
        U.stat({ icon: 'hand', label: 'Free / private allocation', value: kg(b.freeKg), sub: kg(st.freeLeft) + ' still available', tone: 'amber' }) +
        U.stat({ icon: 'lock', label: 'Reserved for customers', value: kg(b.reservedKg), sub: kg(st.reservedLeft) + ' still available', tone: 'teal' }) +
        '</div>' +
        '<div class="meta" style="margin-top:11px">' +
        '<div><div class="k">Sold to AGRILINK customers</div><div class="v">' + kg(st.reservedSold) + '</div></div>' +
        '<div><div class="k">Allocated to open orders</div><div class="v">' + kg(st.reservedAllocated) + '</div></div>' +
        '<div><div class="k">Used from free 30%</div><div class="v">' + kg(st.freeUsed) + '</div></div>' +
        '<div><div class="k">Wastage</div><div class="v">' + kg(st.wastage) + '</div></div>' +
        '</div></div>' +

        /* free-sale control with hard cap */
        '<div class="card"><div class="sec-h" style="margin:0 0 8px"><h3 style="font-size:16px">Use / sell free stock (30%)</h3>' +
        '<span class="pill amber">' + kg(st.freeLeft) + ' left</span></div>' +
        '<div class="stepper-input"><button data-act="freeMinus">−</button>' +
        '<div class="val" id="freeVal">' + Math.min(50, Math.max(1, Math.floor(maxFree / 2))) + '</div>' +
        '<button data-act="freePlus">+</button></div>' +
        '<div class="chips" style="margin-top:9px">' + [10, 50, 100, Math.round(maxFree), Math.round(b.qtyKg * 0.5)].filter((x, i, a) => x > 0 && a.indexOf(x) === i).map(q =>
          '<button class="chip sm" data-act="freeSet" data-q="' + q + '">' + q + ' kg</button>').join('') + '</div>' +
        '<div class="hint">Cap: ' + kg(b.freeKg) + ' total (' + Math.round(FREE_RATIO * 100) + '% of ' + kg(b.qtyKg) + '). Anything above is blocked and reported.</div>' +
        '<div style="margin-top:11px" class="btn-row">' +
        U.btn('Sell / use free stock', 'sellFree', { tone: 'amber', icon: 'hand', disabled: b.frozen }) +
        U.btn('Try 60%', 'tryOver', { tone: 'ghost', icon: 'alert' }) +
        '</div></div>' +

        /* reserved stock is locked */
        '<div class="card"><div class="sec-h" style="margin:0 0 8px"><h3 style="font-size:16px">Reserved stock (70%)</h3>' + pill('LOCKED', 'teal', 'lock') + '</div>' +
        '<div class="lockrow">' + icon('lock', 18) + '<span>' + kg(b.reservedKg) + ' can only move to AGRILINK customer orders. You cannot sell, give away or re-route it privately.</span></div>' +
        '<div style="margin-top:11px" class="field"><label>Retail price for AGRILINK customers (₹/kg)</label>' +
        '<div class="row"><input class="input" id="retailPrice" type="number" step="0.5" min="1" value="' + b.retailPrice + '" style="flex:1">' +
        U.btn('Save', 'savePrice', { tone: 'primary', icon: 'check' }) + '</div>' +
        '<div class="hint">Farm price ' + money1(b.pricePerKgFarm) + '/kg · screening corridor up to ' + money1(b.pricePerKgFarm * 2) + '/kg. Above that, Algorithm 3 raises a price-anomaly alert.</div></div></div>' +

        /* movement log */
        '<div class="card"><div class="sec-h" style="margin:0 0 8px"><h3 style="font-size:16px">Stock movement</h3>' +
        '<span class="pill blue">' + b.movements.length + ' entries</span></div>' +
        b.movements.slice().reverse().map(m => '<div class="mv"><span class="dot" style="background:' + (m.stage.indexOf('free') >= 0 ? 'var(--amber)' : m.stage.indexOf('anomaly') >= 0 ? 'var(--red)' : 'var(--g500)') + '"></span>' +
          '<div class="grow"><div class="k">' + esc(m.stage) + ' · ' + (m.qtyKg > 0 ? '+' : '') + kg(m.qtyKg) + '</div>' +
          '<div class="s">' + esc(m.note) + ' — ' + esc(m.actor) + '</div></div>' +
          '<div class="li-r" style="font-size:11.5px;color:var(--ink3)">' + timeAgo(m.ts) + '</div></div>').join('') + '</div>' +

        (orders.length ? '<div class="card"><div class="sec-h" style="margin:0 0 8px"><h3 style="font-size:16px">Customer orders from this batch</h3></div>' +
          orders.map(o => orderRow(o)).join('') + '</div>' : '') +

        '<div class="card tight"><div class="row" style="gap:9px">' + icon('eye', 18) +
        '<span style="font-size:12.5px;font-weight:700" class="grow">Government can trace this batch end to end: ' + esc(b.trackingId) + '</span>' +
        '<button class="btn sm ghost" data-act="traceGov">Trace</button></div></div>' +
        '</div>',
      handlers: H({
        freeMinus: () => bumpFree(-10), freePlus: () => bumpFree(10),
        freeSet: (n, e, d) => setFree(Number(d.q)),
        sellFree: () => doSellFree(Math.min(maxFree, getFree())),
        tryOver: () => doSellFree(Math.round(b.qtyKg * 0.6)),
        savePrice: () => {
          const inp = document.getElementById('retailPrice');
          const val = Number(inp ? inp.value : b.retailPrice);
          const r = S.setRetailPrice(b.id, val);
          if (r.flagged) { U.toast('Price flagged by Algorithm 3 — alert ' + r.alertId, 'warn', 3600); }
          else U.toast('Retail price saved · ' + money1(val) + '/kg', 'good');
          AG.app.refresh(true);
        },
        traceGov: () => { S.state.role = 'gov'; S.state.welcomed = true; S.save(); AG.app.go('gov', 'trace', { q: b.trackingId }); },
        openOrder: (n, e, d) => AG.app.go('vendor', 'order', { id: d.id })
      })
    };
    function getFree() { const n = document.getElementById('freeVal'); return n ? Number(n.textContent) : 0; }
    function setFree(v2) { const n = document.getElementById('freeVal'); if (n) n.textContent = Math.max(0, Math.round(v2)); }
    function bumpFree(d) { setFree(getFree() + d); }
    function doSellFree(qty) {
      if (qty <= 0) { U.toast('Enter a quantity', 'warn'); return; }
      const r = S.useFreeStock(b.id, qty, null);
      if (r.ok) { U.toast(qty + ' kg used from your 30% free allocation · ' + kg(r.left) + ' left', 'good'); AG.app.refresh(true); }
      else if (r.error === 'cap') {
        U.modal({
          title: 'Blocked — 70% is reserved for AGRILINK customers', icon: 'lock', tone: 'red',
          body: '<p class="big">You tried to move <b>' + kg(qty) + '</b> (' + Math.round((qty + st.freeUsed) / b.qtyKg * 100) + '% of the batch) through private/open sale.</p>' +
            '<div class="ametrics" style="margin:12px 0">' +
            '<span class="ametric"><span>Allowed total</span> ' + kg(r.cap) + '</span>' +
            '<span class="ametric"><span>Already used</span> ' + kg(st.freeUsed) + '</span>' +
            '<span class="ametric"><span>Still allowed</span> ' + kg(r.allowed) + '</span></div>' +
            '<div class="lockrow" style="border-color:#F3C9C4;background:var(--red-bg);color:var(--red)">' + icon('shield', 18) +
            '<span>Algorithm 3 blocked the transaction and reported it to government monitoring as alert <b>' + esc(r.alert) + '</b>.</span></div>',
          actions: [{ label: 'Understood', tone: 'primary' }, { label: 'Sell allowed amount', tone: 'amber', onClick: () => { setFree(r.allowed); doSellFree(r.allowed); } }]
        });
        AG.app.refresh(true);
      } else U.toast('Not allowed', 'bad');
    }
  }

  function screenReserved() {
    const v = vendor();
    const batches = S.state.batches.filter(b => b.vendorId === v.id);
    const res = batches.reduce((s, b) => s + S.batchStock(b).reservedLeft, 0);
    const sold = batches.reduce((s, b) => s + S.batchStock(b).reservedSold, 0);
    const alloc = batches.reduce((s, b) => s + S.batchStock(b).reservedAllocated, 0);
    const totalRes = batches.reduce((s, b) => s + b.reservedKg, 0);
    return {
      html: head('Reserved stock (70%)', kg(res) + ' available to AGRILINK customers', { back: true }) +
        '<div class="sec">' +
        '<div class="card teal" style="background:linear-gradient(150deg,#E4F5F6,#F4FCFC);border-color:#BFE6E9">' +
        '<div class="row" style="gap:14px;align-items:center">' +
        U.donut([{ value: sold, color: '#2E9E5B' }, { value: alloc, color: '#D98A16' }, { value: Math.max(0, res), color: '#0E7C86' }], 116, kg(totalRes), 'reserved') +
        '<div class="grow"><div class="split-legend" style="flex-direction:column;gap:8px;margin:0">' +
        '<span class="lg"><i style="background:#0E7C86"></i>Available now · <b>' + kg(res) + '</b></span>' +
        '<span class="lg"><i style="background:#D98A16"></i>Allocated to open orders · <b>' + kg(alloc) + '</b></span>' +
        '<span class="lg"><i style="background:#2E9E5B"></i>Delivered to customers · <b>' + kg(sold) + '</b></span></div></div></div>' +
        '<div class="lockrow" style="margin-top:12px">' + icon('shield', 18) + '<span>Reserved stock cannot be sold privately. Every movement is written to the audit trail and watched by government monitoring.</span></div></div>' +
        batches.filter(b => S.batchStock(b).reservedLeft > 0).map(b => {
          const st = S.batchStock(b);
          return '<button class="li" data-act="openBatch" data-id="' + b.id + '">' +
            '<span class="li-ic" style="padding:0;border:0;background:none">' + cropArt(b.cropKey, 44) + '</span>' +
            '<span class="grow"><span class="li-t">' + esc(b.cropName) + ' · ' + kg(st.reservedLeft) + ' available</span>' +
            '<span class="li-s">' + esc(b.id) + ' · retail ' + money1(b.retailPrice) + '/kg · ' + st.daysLeft + 'd shelf left</span>' +
            '<span class="prog" style="margin-top:5px"><span class="prog-bar" style="width:' + Math.round(st.reservedSold / Math.max(1, b.reservedKg) * 100) + '%;display:block;height:100%"></span></span></span>' +
            '<span class="li-r">' + kg(b.reservedKg) + '</span></button>';
        }).join('') +
        '</div>',
      handlers: H({ openBatch: (n, e, d) => AG.app.go('vendor', 'batch', { id: d.id }) })
    };
  }

  /* ---------------- ORDERS ---------------- */
  function orderRow(o) {
    const c = S.customer(o.customerId), st = U.ORDER_STATUS[o.status];
    return '<button class="li" data-act="openOrder" data-id="' + o.id + '">' +
      '<span class="li-ic" style="padding:0;border:0;background:none">' + cropArt(o.cropKey, 44) + '</span>' +
      '<span class="grow"><span class="li-t">' + esc(o.cropName) + ' · ' + kg(o.qtyKg) + '</span>' +
      '<span class="li-s">' + esc(o.id) + ' · ' + esc(c.name) + ' (' + esc(c.area) + ') · ' + esc(o.slotLabel) + '</span>' +
      '<span class="pill-row" style="margin-top:5px">' + pill(st.label, st.tone) + pill(o.method, 'grey') + '</span></span>' +
      '<span class="li-r">' + money(o.total) + '</span></button>';
  }

  function screenOrders() {
    const v = vendor();
    const orders = S.state.orders.filter(o => o.vendorId === v.id);
    const open = orders.filter(o => !['delivered', 'completed', 'cancelled'].includes(o.status));
    const done = orders.filter(o => ['delivered', 'completed'].includes(o.status));
    return {
      html: head('Orders', open.length + ' open · ' + done.length + ' delivered', { back: true }) +
        '<div class="sec">' +
        (open.length ? '<div class="sec-h"><h3>Needs your action</h3>' + pill(open.length + '', 'amber') + '</div>' + open.map(orderRow).join('')
          : '<div class="card green"><div class="card-h"><div class="card-ic">' + icon('check', 20) + '</div><div><div class="card-t">No pending orders</div><div class="card-s">New customer orders appear here instantly from the reserved 70% stock.</div></div></div></div>') +
        (done.length ? '<div class="sec-h" style="margin-top:14px"><h3>Completed</h3><span class="pill green">' + done.length + '</span></div>' + done.slice(0, 10).map(orderRow).join('') : '') +
        '</div>',
      handlers: H({ openOrder: (n, e, d) => AG.app.go('vendor', 'order', { id: d.id }) })
    };
  }

  function screenOrder() {
    const p = AG.app.currentNav().params;
    const o = S.order(p.id); if (!o) return screenOrders();
    const c = S.customer(o.customerId), b = S.batch(o.batchId), v = vendor();
    const st = U.ORDER_STATUS[o.status];
    const steps = ['Placed', 'Confirmed', 'Packed', 'Partner', 'Picked up', 'Delivered'];
    const idx = Math.max(0, Math.min(5, (st.step || 1) - 2));
    return {
      html: head(o.id + ' · ' + o.cropName, c.name + ' · ' + c.area + ' · ' + o.slotLabel, { back: true }) +
        '<div class="sec">' +
        '<div class="card"><div class="between" style="margin-bottom:10px">' + U.pill(st.label, st.tone, 'clock') +
        '<span class="muted" style="font-size:12.5px;font-weight:700">' + fmtDate(o.placedAt) + '</span></div>' +
        U.stepper(steps, idx) + '</div>' +
        '<div class="card"><div class="card-h"><div class="batch-thumb">' + cropArt(o.cropKey, 50) + '</div>' +
        '<div class="grow"><div class="card-t">' + esc(o.cropName) + ' · ' + kg(o.qtyKg) + '</div>' +
        '<div class="card-s">From ' + esc(b.id) + ' · reserved 70% stock · ' + esc(b.trackingId) + '</div></div>' +
        '<div style="text-align:right"><div style="font-size:20px;font-weight:900;color:var(--g800)">' + money(o.total) + '</div>' +
        '<div class="card-s">' + money1(o.pricePerKg) + '/kg</div></div></div>' +
        '<div class="meta" style="margin-top:11px">' +
        '<div><div class="k">Customer</div><div class="v" style="font-size:14px">' + esc(c.name) + '</div></div>' +
        '<div><div class="k">Area</div><div class="v" style="font-size:14px">' + esc(c.area) + '</div></div>' +
        '<div><div class="k">Slot</div><div class="v" style="font-size:14px">' + esc(o.slotLabel) + '</div></div>' +
        '<div><div class="k">Payment</div><div class="v" style="font-size:14px">' + esc(o.method) + ' · ' + esc(o.payment) + '</div></div>' +
        '</div>' +
        '<div style="margin-top:6px;border-radius:14px;overflow:hidden">' +
        U.mapSVG({
          width: 360, height: 150,
          points: [{ lat: v.lat, lng: v.lng, color: '#D98A16', label: 'Your godown' }, { lat: c.lat, lng: c.lng, color: '#20609F', label: c.area }],
          routes: o.routeId ? [{ points: [{ lat: v.lat, lng: v.lng }, { lat: c.lat, lng: c.lng }], color: '#0E7C86' }] : []
        }) + '</div></div>' +
        '<div class="card"><div class="sec-h" style="margin:0 0 8px"><h3 style="font-size:15.5px">Order timeline</h3></div>' +
        o.events.slice().reverse().map(e => '<div class="mv"><span class="dot"></span><div class="grow"><div class="k">' + esc((U.ORDER_STATUS[e.status] || {}).label || e.status) + '</div>' +
          '<div class="s">' + esc(e.note) + '</div></div><div class="li-r" style="font-size:11.5px;color:var(--ink3)">' + timeAgo(e.ts) + '</div></div>').join('') + '</div>' +
        (o.status === 'placed' ? U.btn('Confirm from reserved stock', 'confirm', { tone: 'primary', size: 'xl', icon: 'check', cls: 'block' }) : '') +
        (o.status === 'confirmed' ? U.btn('Packed — offer to delivery partners', 'ready', { tone: 'amber', size: 'xl', icon: 'truck', cls: 'block' }) : '') +
        (o.status === 'ready' ? '<div class="card blue"><div class="card-h"><div class="card-ic blue">' + icon('route', 20) + '</div><div><div class="card-t" style="font-size:15px">Waiting for a delivery partner</div><div class="card-s">Algorithm 2 has grouped this order into a route offer for the ' + esc(o.slotLabel) + ' slot.</div></div></div></div>' : '') +
        '</div>',
      handlers: H({
        confirm: () => { S.confirmOrder(o.id); U.toast('Order confirmed from reserved stock', 'good'); AG.app.refresh(true); },
        ready: () => {
          const routes = S.markOrderReady(o.id);
          U.toast('Packed · ' + routes.length + ' route offer(s) sent to delivery partners', 'good');
          AG.app.refresh(true);
        }
      })
    };
  }

  /* ---------------- NOTIFICATIONS / PROFILE ---------------- */
  function screenNotifications() {
    const v = vendor();
    const list = S.notifsFor('vendor', v.id);
    S.markRead('vendor', v.id);
    const ic = t => ({ opportunity: 'sprout', bid: 'coin', won: 'check', redirect: 'route', stock: 'box', order: 'cart', compliance: 'shield', pickup: 'truck', route: 'truck' }[t] || 'bell');
    return {
      html: head('Notifications', list.length + ' total', { back: true }) +
        '<div class="sec">' + (list.length ? list.map(n =>
          '<div class="notif ' + (n.read ? '' : 'unread') + ' ' + (n.type || '') + '">' +
          '<div class="notif-ic">' + icon(ic(n.type), 20) + '</div><div class="grow">' +
          '<div class="notif-t">' + esc(n.title) + '</div><div class="notif-b">' + esc(n.body) + '</div>' +
          '<div class="notif-ts">' + timeAgo(n.ts) + '</div></div>' +
          (n.cropId ? '<button class="btn sm ghost" data-act="openOpp" data-id="' + n.cropId + '">' + icon('right', 16) + '</button>' : '') +
          (n.orderId ? '<button class="btn sm ghost" data-act="openOrder" data-id="' + n.orderId + '">' + icon('right', 16) + '</button>' : '') +
          '</div>').join('') : U.empty('Nothing yet', 'bell')) + '</div>',
      handlers: H({
        openOpp: (n, e, d) => AG.app.go('vendor', 'opportunity', { id: d.id }),
        openOrder: (n, e, d) => AG.app.go('vendor', 'order', { id: d.id })
      })
    };
  }

  function screenProfile() {
    const v = vendor();
    const batches = S.state.batches.filter(b => b.vendorId === v.id);
    return {
      html: head('Profile', v.licence, { back: true }) +
        '<div class="sec">' +
        '<div class="card"><div class="card-h"><div class="avatar" style="width:56px;height:56px;background:var(--amber-bg);color:#8A5A0B">' + icon('store', 26) + '</div>' +
        '<div class="grow"><div class="card-t" style="font-size:18px">' + esc(v.name) + '</div><div class="card-s">' + esc(v.area) + '</div>' +
        '<div class="pill-row" style="margin-top:6px">' + pill(v.frozen ? 'Flagged' : 'Verified', v.frozen ? 'red' : 'green', v.frozen ? 'alert' : 'shield') +
        pill(v.rating + ' ★', 'amber', 'star') + pill('GST ' + v.gst, 'grey') + '</div></div></div>' +
        '<div class="meta" style="margin-top:11px">' +
        '<div><div class="k">Capacity</div><div class="v">' + kg(v.capacityKg) + '</div></div>' +
        '<div><div class="k">In godown</div><div class="v">' + kg(v.usedKg) + '</div></div>' +
        '<div><div class="k">Bids won</div><div class="v">' + v.bidsWon + '</div></div>' +
        '<div><div class="k">Compliance flags</div><div class="v">' + (v.violations || 0) + '</div></div>' +
        '</div></div>' +
        '<div class="card"><div class="between" style="margin-bottom:9px"><b style="font-size:15px">Speciality</b></div>' +
        '<div class="pill-row">' + v.speciality.map(s => pill((CROP_BY_KEY[s] || {}).name || s, 'green', 'sprout')).join('') + '</div></div>' +
        '<div class="card"><div class="sec-h" style="margin:0 0 9px"><h3 style="font-size:15px">Demo persona — switch vendor</h3></div>' +
        '<div class="chips">' + S.state.vendors.map(x => '<button class="chip sm" data-act="setVendor" data-id="' + x.id + '" aria-pressed="' + (x.id === v.id) + '">' + esc(x.name) + '</button>').join('') + '</div></div>' +
        '<div class="card"><div class="sec-h" style="margin:0 0 8px"><h3 style="font-size:15px">Your compliance record</h3>' +
        pill(S.state.alerts.filter(a => a.vendorId === v.id && a.status === 'open').length + ' open', 'red') + '</div>' +
        (S.state.alerts.filter(a => a.vendorId === v.id).length ? S.state.alerts.filter(a => a.vendorId === v.id).slice(0, 4).map(a =>
          '<div class="mv"><span class="dot" style="background:' + (a.severity === 'high' ? 'var(--red)' : 'var(--amber)') + '"></span>' +
          '<div class="grow"><div class="k">' + esc(a.title) + '</div><div class="s">' + esc(a.status) + ' · ' + timeAgo(a.ts) + '</div></div></div>').join('')
          : '<p class="muted" style="font-size:13px">Clean record — no compliance alerts.</p>') + '</div>' +
        '<div class="card"><div class="li static" style="border:0;box-shadow:none;padding:0;background:none"><span class="li-ic">' + icon('logout', 22) + '</span>' +
        '<span class="grow"><span class="li-t">Switch interface</span><span class="li-s">Farmer · Delivery · Customer · Government</span></span>' +
        '<button class="btn sm ghost" data-act="welcome">Roles</button></div></div>' +
        '</div>',
      handlers: H({
        setVendor: (n, e, d) => { S.state.currentVendor = d.id; S.save(); U.toast('Now acting as ' + S.vendor(d.id).name, 'good'); AG.app.go('vendor', 'home'); },
        welcome: () => { S.state.welcomed = false; S.save(); AG.app.refresh(true); }
      })
    };
  }

  /* ---------------- handler factory ---------------- */
  function H(extra) {
    const base = {
      go: (n, e, d) => AG.app.go('vendor', d.tab, d.id ? { id: d.id } : {}),
      back: () => AG.app.go('vendor', L.tab || 'home')
    };
    return Object.assign(base, extra || {});
  }
  const U2 = {
    riskTone: r => r === 'low' ? 'green' : r === 'medium' ? 'amber' : 'red',
    priceBand: (a, bids) => {
      const lo = a.minBid * 0.9, hi = a.maxBid * 1.08;
      const pos = v => clamp((v - lo) / (hi - lo) * 100, 2, 98);
      return '<div class="priceband">' +
        '<div class="tick" style="left:' + pos(a.minBid) + '%"></div><div class="tick" style="left:' + pos(a.maxBid) + '%"></div>' +
        '<div class="sug" style="left:' + pos(a.suggestedPrice) + '%">' + money1(a.suggestedPrice) + '</div>' +
        '<div class="lo">min ' + money1(a.minBid) + '</div><div class="hi">max ' + money1(a.maxBid) + '</div>' +
        (bids || []).map(b => '<div class="marker" style="left:' + pos(b.price) + '%">' + money1(b.price) + '</div>').join('') + '</div>';
    }
  };
  const { clamp } = AG.util;

  /* remember the tab we are on for the back button */
  const TABBY = { home: 'home', opportunities: 'opportunities', opportunity: 'opportunities', mybids: 'mybids', won: 'won', inventory: 'inventory', batch: 'inventory', reserved: 'reserved', orders: 'orders', order: 'orders', notifications: 'home', profile: 'home' };

  AG.apps = AG.apps || {};
  AG.apps.vendor = {
    id: 'vendor', wide: false,
    tabs: [
      { id: 'home', label: 'Home', icon: 'home' },
      { id: 'opportunities', label: 'Crops', icon: 'sprout', badge: () => AG.algo.opportunitiesForVendor(vendor().id, S.state).filter(o => o.invited && o.canBid).length || '' },
      { id: 'inventory', label: 'Stock', icon: 'box' },
      { id: 'orders', label: 'Orders', icon: 'cart', badge: () => S.state.orders.filter(o => o.vendorId === vendor().id && ['placed', 'confirmed'].includes(o.status)).length || '' },
      { id: 'profile', label: 'Profile', icon: 'user' }
    ],
    render(tab) {
      L.tab = TABBY[tab] || 'home';
      switch (tab) {
        case 'home': return screenHome();
        case 'opportunities': return screenOpportunities();
        case 'opportunity': return screenOpportunity();
        case 'mybids': return screenMyBids();
        case 'won': return screenWon();
        case 'inventory': return screenInventory();
        case 'batch': return screenBatch();
        case 'reserved': return screenReserved();
        case 'orders': return screenOrders();
        case 'order': return screenOrder();
        case 'notifications': return screenNotifications();
        case 'profile': return screenProfile();
        default: return screenHome();
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
