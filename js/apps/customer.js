/* ============================================================
   AGRILINK — CUSTOMER APP
   Grocery-style ordering from the vendors' reserved 70% stock,
   with full traceability and delivery-slot selection.
   ============================================================ */
(function (g) {
  'use strict';
  const AG = g.AG, U = AG.ui, S = AG.store;
  const { icon, esc, money, money1, kg, km, pill, progress } = U;
  const { cropArt, DELIVERY_SLOTS, CROP_BY_KEY } = AG.catalog;
  const { roadKm, fmtDate, fmtDay, timeAgo, round } = AG.util;

  const customer = () => S.customer(S.state.currentCustomer) || S.state.customers[0];
  const L = { cat: 'All', q: '', nearKm: 60, slot: 'S3', method: 'UPI', qty: {} };
  const CATS = ['All', 'Vegetable', 'Fruit', 'Grain', 'Oilseed', 'Cash crop'];

  function head(title, sub, opts) {
    const o = opts || {};
    const c = customer();
    return '<div class="apphead green"><div class="head-row">' +
      (o.back ? '<button class="iconbtn" data-act="back">' + icon('left', 22) + '</button>' : '') +
      '<div class="avatar">' + icon('pin', 22) + '</div>' +
      '<div class="grow"><div class="sub" style="font-size:12px;opacity:.85">Deliver to</div><h2 style="font-size:19px">' + esc(title) + '</h2>' +
      (sub ? '<div class="sub" style="font-size:12.5px">' + esc(sub) + '</div>' : '') + '</div>' +
      '<button class="iconbtn" data-act="go" data-tab="orders">' + icon('doc', 21) + '</button>' +
      '</div>' + (o.extra || '') + '</div>';
  }

  function products() {
    return AG.algo.customerProducts(S.state, {
      customerId: customer().id, maxKm: L.nearKm,
      cat: L.cat === 'All' ? null : L.cat, q: L.q
    });
  }

  /* ---------------- HOME ---------------- */
  function screenHome() {
    const c = customer();
    const prods = products();
    const openOrders = S.state.orders.filter(o => o.customerId === c.id && !['delivered', 'completed', 'cancelled'].includes(o.status));
    const cartKg = S.state.cart.reduce((s, i) => s + i.qtyKg, 0);
    return {
      html: head(c.area, c.name + ' · ' + c.family + ' members · Pune', {}) +
        '<div class="sec" style="padding-bottom:8px">' +
        '<div class="mic-input" style="border-radius:16px"><span style="color:var(--ink3)">' + icon('search', 20) + '</span>' +
        '<input id="searchBox" type="text" placeholder="Search vegetables, farmer or tracking ID…" value="' + esc(L.q) + '" data-act="search@input">' +
        (L.q ? '<button class="btn sm ghost" data-act="clearQ" style="min-height:38px">' + icon('x', 16) + '</button>' : '') + '</div>' +
        '<div class="row wrap" style="gap:7px;margin-top:10px">' +
        [15, 30, 60, 120].map(r => '<button class="chip sm" data-act="near" data-r="' + r + '" aria-pressed="' + (L.nearKm === r) + '">' +
          (r === 15 ? 'Very near (15 km)' : r === 30 ? 'Near me (30 km)' : r === 60 ? 'City + suburbs (60 km)' : 'All district (120 km)') + '</button>').join('') +
        '</div></div>' +

        '<div class="catrow">' + CATS.map(cat => '<button class="cat" data-act="cat" data-c="' + cat + '" aria-pressed="' + (L.cat === cat) + '">' +
          icon(cat === 'All' ? 'grid' : cat === 'Fruit' ? 'heart' : cat === 'Grain' ? 'sprout' : 'leaf', 16) + esc(cat === 'All' ? 'All fresh' : cat + 's') + '</button>').join('') + '</div>' +

        (openOrders.length ? '<div class="sec" style="padding-top:0">' + U.section('Track your delivery', pill(openOrders.length + ' active', 'amber'),
          openOrders.map(o => trackCard(o)).join('')) + '</div>' : '') +

        '<div class="sec" style="padding-top:2px"><div class="sec-h"><h3>Available near you</h3>' +
        '<span class="pill green">' + prods.length + ' lots · from reserved 70% stock</span></div></div>' +
        (prods.length ? '<div class="pgrid">' + prods.map(p => productCard(p)).join('') + '</div>'
          : '<div class="sec">' + U.empty('Nothing matches this filter. Try a wider radius or another category.', 'search') + '</div>') +

        '<div class="sec"><div class="card blue"><div class="card-h"><div class="card-ic blue">' + icon('shield', 20) + '</div><div class="grow">' +
        '<div class="card-t" style="font-size:15px">Why AGRILINK produce is different</div>' +
        '<div class="card-s">70% of every vendor batch is reserved for customers like you — no hoarding, no black-market pricing. Each lot carries a tracking ID back to the farmer, and government monitoring watches every movement.</div>' +
        '</div></div></div></div>' +
        (S.state.cart.length ? cartBar(cartKg) : '<div style="height:14px"></div>'),
      handlers: H({
        'search@input': n => { L.q = n.value; debounceRender(); },
        clearQ: () => { L.q = ''; AG.app.refresh(true); },
        cat: (n, e, d) => { L.cat = d.c; AG.app.refresh(true); },
        near: (n, e, d) => { L.nearKm = Number(d.r); AG.app.refresh(true); },
        add: (n, e, d) => addToCart(d.batch, 1),
        openProduct: (n, e, d) => AG.app.go('customer', 'product', { id: d.id }),
        openCart: () => AG.app.go('customer', 'cart'),
        track: (n, e, d) => AG.app.go('customer', 'track', { id: d.id })
      })
    };
  }
  let debT = null;
  function debounceRender() {
    AG.app.freeze(true);
    if (debT) clearTimeout(debT);
    debT = setTimeout(() => { AG.app.freeze(false); AG.app.refresh(true); }, 420);
  }

  function productCard(p) {
    return '<div class="pcard"><div class="pcard-img" data-act="openProduct" data-id="' + p.batchId + '" style="cursor:pointer">' +
      cropArt(p.cropKey, 86) +
      '<span class="pcard-q">' + pill('Grade ' + p.grade, p.grade === 'A' ? 'green' : 'amber') + '</span>' +
      (p.daysLeft <= 2 ? '<span style="position:absolute;top:8px;right:8px">' + pill('Sell-by ' + p.daysLeft + 'd', 'red') + '</span>' : '') +
      '</div>' +
      '<div class="pcard-b"><div class="pcard-n">' + esc(p.name) + '</div>' +
      '<div class="pcard-src">' + icon('sprout', 12) + '<span class="trunc">' + esc(p.farmer) + ' · ' + esc(p.village) + '</span></div>' +
      '<div class="pcard-src">' + icon('store', 12) + '<span class="trunc">' + esc(p.vendor) + ' · ' + km(p.distanceKm) + '</span></div>' +
      '<div class="pcard-price"><b>' + money1(p.price) + '</b><span>/ kg</span>' +
      '<span style="margin-left:auto;font-size:11px;font-weight:800;color:var(--ink3)">' + kg(p.available) + ' left</span></div>' +
      '<div class="trace">' + icon('eye', 12) + '<span class="trunc">' + esc(p.trackingId) + '</span></div>' +
      '<div class="pcard-src">' + icon('clock', 12) + '<span>Delivery in ~' + p.etaHrs + ' h</span></div>' +
      '<button class="addbtn" data-act="add" data-batch="' + p.batchId + '">' + icon('plus', 16) + ' Add to cart</button>' +
      '</div></div>';
  }

  function cartBar(cartKg) {
    return '<div class="cartbar"><div class="grow"><div style="font-size:13px;font-weight:800;color:var(--ink3)">' + S.state.cart.length + ' item(s) · ' + kg(cartKg) + '</div>' +
      '<div style="font-size:19px;font-weight:900;color:var(--g800)">' + money(S.cartTotal()) + '</div></div>' +
      U.btn('View cart', 'openCart', { tone: 'primary', size: 'lg', icon: 'cart' }) + '</div>';
  }

  /* ---------------- PRODUCT ---------------- */
  function screenProduct() {
    const id = AG.app.currentNav().params.id;
    const p = products().find(x => x.batchId === id) || AG.algo.customerProducts(S.state, {}).find(x => x.batchId === id);
    if (!p) return screenHome();
    const b = S.batch(p.batchId), f = S.state.farmers.find(x => x.id === b.farmerId), v = S.vendor(b.vendorId);
    const qty = L.qty[p.batchId] || 1;
    return {
      html: head(p.name, 'From ' + v.name, { back: true }) +
        '<div class="sec">' +
        '<div class="card center" style="padding:18px"><div style="width:132px;margin:0 auto">' + cropArt(p.cropKey, 132) + '</div>' +
        '<h2 style="font-size:23px;margin-top:8px">' + esc(p.name) + '</h2>' +
        '<div class="pill-row" style="justify-content:center;margin-top:8px">' +
        pill('Grade ' + p.grade, p.grade === 'A' ? 'green' : 'amber', 'star') +
        pill('Freshness ' + p.freshness + '%', 'blue', 'drop') +
        pill(p.spoilageRisk + ' spoilage risk', p.spoilageRisk === 'low' ? 'green' : 'amber') +
        pill(kg(p.available) + ' available', 'teal', 'box') + '</div></div>' +

        '<div class="card"><div class="between"><div><div class="card-t" style="font-size:26px">' + money1(p.price) + '<span style="font-size:14px;color:var(--ink3);font-weight:700"> / kg</span></div>' +
        '<div class="card-s">Farm-gate price paid to the farmer: ' + money1(p.farmPrice) + '/kg</div></div>' +
        '<div style="text-align:right"><div class="card-s">Delivery</div><div class="card-t">~' + p.etaHrs + ' h</div></div></div>' +
        '<div class="stats3" style="margin-top:12px">' +
        U.stat({ icon: 'pin', label: 'Vendor distance', value: km(p.distanceKm), tone: 'blue' }) +
        U.stat({ icon: 'clock', label: 'Shelf left', value: p.daysLeft + ' d', sub: 'of ' + p.shelfLife, tone: p.daysLeft <= 2 ? 'red' : 'amber' }) +
        U.stat({ icon: 'scale', label: 'Quality', value: p.quality + '/100', tone: 'green' }) +
        '</div></div>' +

        '<div class="card"><div class="sec-h" style="margin:0 0 9px"><h3 style="font-size:15.5px">Source & traceability</h3>' + pill(p.trackingId, 'blue', 'eye') + '</div>' +
        '<div class="mv"><span class="dot"></span><div class="grow"><div class="k">' + esc(f.name) + ' (Farmer)</div><div class="s">' + esc(f.village) + ' · ' + esc(f.taluka) + ' · harvested ' + fmtDay(b.receivedAt) + '</div></div>' + icon('sprout', 20) + '</div>' +
        '<div class="mv"><span class="dot" style="background:var(--amber)"></span><div class="grow"><div class="k">' + esc(v.name) + ' (Vendor)</div><div class="s">' + esc(v.area) + ' · licence ' + esc(v.licence) + ' · batch ' + esc(b.id) + '</div></div>' + icon('store', 20) + '</div>' +
        '<div class="mv"><span class="dot" style="background:var(--teal)"></span><div class="grow"><div class="k">Reserved 70% stock</div><div class="s">This lot is reserved for AGRILINK customers and cannot be sold privately or hoarded.</div></div>' + icon('lock', 20) + '</div>' +
        '<div style="margin-top:10px">' + U.stockSplit(b.freeKg, b.reservedKg) + '</div>' +
        '<div style="margin-top:10px">' + U.btn('View full government trace', null, { tone: 'ghost', size: 'sm', icon: 'gov', data: 'data-act="traceGov"' }) + '</div></div>' +

        '<div class="card"><div class="between" style="margin-bottom:9px"><b style="font-size:15.5px">Quantity</b>' +
        '<span class="muted" style="font-size:12.5px;font-weight:700">Max ' + kg(p.available) + '</span></div>' +
        '<div class="stepper-input"><button data-act="minus">−</button><div class="val" id="qtyVal">' + qty + ' kg</div><button data-act="plus">+</button></div>' +
        '<div class="chips" style="margin-top:9px">' + [1, 2, 5, 10].filter(q => q <= p.available).map(q =>
          '<button class="chip sm" data-act="setQty" data-q="' + q + '" style="flex:1;text-align:center">' + q + ' kg</button>').join('') + '</div>' +
        '<div class="stats2" style="margin-top:12px">' +
        U.stat({ icon: 'coin', label: 'Item total', value: money(qty * p.price), tone: 'green' }) +
        U.stat({ icon: 'truck', label: 'Delivery', value: 'FREE', sub: 'slot based', tone: 'blue' }) +
        '</div>' +
        '<div style="margin-top:12px">' + U.btn('Add to cart', 'addCart', { tone: 'primary', size: 'xl', icon: 'cart', cls: 'block' }) + '</div></div>' +
        '</div>',
      handlers: H({
        minus: () => setQty(qty - 1, p.available), plus: () => setQty(qty + 1, p.available),
        setQty: (n, e, d) => setQty(Number(d.q), p.available),
        addCart: () => addToCart(p.batchId, qty, true),
        traceGov: () => { S.state.welcomed = true; S.save(); AG.app.go('gov', 'trace', { q: p.trackingId }); }
      })
    };
    function setQty(v, max) {
      L.qty[p.batchId] = Math.max(0.5, Math.min(max, round(v, 1)));
      const n = document.getElementById('qtyVal'); if (n) n.textContent = L.qty[p.batchId] + ' kg';
      AG.app.refresh(true);
    }
  }

  function addToCart(batchId, qty, jump) {
    const r = S.cartAdd({ batchId, qtyKg: qty || 1 });
    if (!r.ok) { U.toast('Only ' + kg(r.max || 0) + ' left in reserved stock', 'warn'); return; }
    U.toast('Added to cart · ' + S.state.cart.length + ' item(s)', 'good', 1600);
    if (jump) AG.app.go('customer', 'cart'); else AG.app.refresh(true);
  }

  /* ---------------- CART / CHECKOUT ---------------- */
  function screenCart() {
    const cart = S.state.cart;
    if (!cart.length) {
      return {
        html: head('Your cart', 'Empty', { back: true }) + '<div class="sec">' +
          U.empty('Your cart is empty. Add fresh vegetables from the reserved stock.', 'cart') +
          '<div style="margin-top:12px">' + U.btn('Browse fresh produce', null, { tone: 'primary', size: 'lg', icon: 'leaf', cls: 'block', data: 'data-act="go" data-tab="home"' }) + '</div></div>',
        handlers: H({})
      };
    }
    const total = S.cartTotal();
    return {
      html: head('Your cart', cart.length + ' item(s) · ' + kg(cart.reduce((s, i) => s + i.qtyKg, 0)), { back: true }) +
        '<div class="sec">' +
        cart.map(i => {
          const b = S.batch(i.batchId), st = S.batchStock(b);
          return '<div class="qtyrow"><div class="row" style="gap:10px">' +
            '<span class="batch-thumb" style="width:44px;height:44px">' + cropArt(i.cropKey, 44) + '</span>' +
            '<div><div style="font-size:15.5px;font-weight:900;color:var(--g900)">' + esc(i.cropName) + '</div>' +
            '<div class="muted" style="font-size:12px;font-weight:700">' + money1(i.pricePerKg) + '/kg · ' + esc(S.vendor(i.vendorId).name) + '</div>' +
            '<div class="trace" style="margin-top:4px">' + icon('eye', 11) + '<span>' + esc(i.trackingId) + '</span></div></div></div>' +
            '<div style="text-align:right"><div style="font-size:16px;font-weight:900;color:var(--g800)">' + money(i.qtyKg * i.pricePerKg) + '</div>' +
            '<div class="qtyctl" style="margin-top:6px"><button data-act="dec" data-b="' + i.batchId + '">−</button>' +
            '<span class="q">' + i.qtyKg + '</span><button data-act="inc" data-b="' + i.batchId + '">+</button></div>' +
            '<div class="muted" style="font-size:11px;font-weight:700;margin-top:4px">' + kg(st.reservedLeft) + ' available</div></div></div>';
        }).join('') +
        '<div class="card green"><div class="between"><b style="font-size:16px">Item total</b><b style="font-size:22px;color:var(--g800)">' + money(total) + '</b></div>' +
        '<div class="between" style="margin-top:6px"><span class="muted" style="font-size:13px;font-weight:700">Delivery (slot based)</span><span style="font-weight:900;color:var(--g700)">FREE</span></div>' +
        '<div class="between" style="margin-top:6px"><span class="muted" style="font-size:13px;font-weight:700">Farmer share of this basket</span><span style="font-weight:900">' + money(cart.reduce((s, i) => s + i.qtyKg * S.batch(i.batchId).pricePerKgFarm, 0)) + '</span></div></div>' +
        U.btn('Checkout · choose delivery slot', 'goCheckout', { tone: 'primary', size: 'xl', icon: 'clock', cls: 'block' }) +
        '<div style="height:8px"></div>' +
        U.btn('Clear cart', 'clearCart', { tone: 'ghost', size: 'lg', icon: 'trash', cls: 'block' }) +
        '</div>',
      handlers: H({
        inc: (n, e, d) => { const i = S.state.cart.find(x => x.batchId === d.b); S.cartSetQty(d.b, i.qtyKg + 1); },
        dec: (n, e, d) => { const i = S.state.cart.find(x => x.batchId === d.b); S.cartSetQty(d.b, i.qtyKg - 1); },
        clearCart: () => { S.cartClear(); U.toast('Cart cleared', 'warn'); AG.app.refresh(true); },
        goCheckout: () => AG.app.go('customer', 'checkout')
      })
    };
  }

  function screenCheckout() {
    const c = customer();
    const cart = S.state.cart;
    if (!cart.length) return screenCart();
    const slots = DELIVERY_SLOTS.map(s => AG.algo.slotCapacity(s.id, S.state));
    const total = S.cartTotal();
    const sel = slots.find(s => s.slot.id === L.slot) || slots[2];
    return {
      html: head('Checkout', cart.length + ' item(s) · ' + money(total), { back: true }) +
        '<div class="sec">' +
        '<div class="card"><div class="card-h"><div class="card-ic blue">' + icon('pin', 20) + '</div><div class="grow">' +
        '<div class="card-t" style="font-size:15.5px">' + esc(c.name) + '</div><div class="card-s">' + esc(c.area) + ', Pune · ' + esc(c.phone) + '</div></div>' +
        pill('Verified', 'green', 'shield') + '</div></div>' +

        '<div class="card"><div class="sec-h" style="margin:0 0 9px"><h3 style="font-size:16px">Select a delivery time slot</h3>' +
        pill('Algorithm 2 checks capacity', 'blue', 'ai') + '</div>' +
        '<div class="slotgrid">' + slots.map(s =>
          '<button class="slot" data-act="slot" data-s="' + s.slot.id + '" aria-pressed="' + (L.slot === s.slot.id) + '" ' + (s.left <= 0 ? 'disabled' : '') + '>' +
          (s.recommended && s.left > 0 ? '<span class="rec">RECOMMENDED</span>' : '') +
          '<div class="t">' + esc(s.slot.label) + '</div>' +
          '<div class="s">' + (s.left <= 0 ? 'Slot full' : s.left + ' of ' + s.capacity + ' slots free') + '</div>' +
          '<div class="prog" style="margin-top:7px"><div class="prog-bar ' + (s.load > 80 ? 'red' : s.load > 55 ? 'amber' : '') + '" style="width:' + Math.min(100, s.load) + '%"></div></div>' +
          '<div class="s" style="margin-top:5px">' + s.partnersAvailable + ' partner(s) free · ' + s.load + '% loaded</div>' +
          '</button>').join('') + '</div>' +
        '<div class="lockrow" style="margin-top:12px">' + icon('route', 18) +
        '<span>Orders in the same slot and area are grouped into one optimised route, so the delivery partner earns more and you get your basket faster.</span></div></div>' +

        '<div class="card"><div class="sec-h" style="margin:0 0 9px"><h3 style="font-size:16px">Payment</h3></div>' +
        '<div class="chips">' + ['UPI', 'Cash on delivery', 'Wallet'].map(m =>
          '<button class="chip" data-act="method" data-m="' + m + '" aria-pressed="' + (L.method === m) + '" style="flex:1;text-align:center">' + esc(m) + '</button>').join('') + '</div>' +
        '<div class="hint">Pay on delivery or via UPI — your receipt is saved in Orders.</div></div>' +

        '<div class="card"><div class="sec-h" style="margin:0 0 9px"><h3 style="font-size:16px">Your basket</h3></div>' +
        cart.map(i => '<div class="mv"><span class="dot"></span><div class="grow"><div class="k">' + esc(i.cropName) + ' · ' + kg(i.qtyKg) + '</div>' +
          '<div class="s">' + esc(i.trackingId) + ' · ' + esc(S.vendor(i.vendorId).name) + '</div></div>' +
          '<div class="li-r">' + money(i.qtyKg * i.pricePerKg) + '</div></div>').join('') +
        '<div class="between" style="margin-top:11px;padding-top:11px;border-top:1px dashed var(--line)">' +
        '<b style="font-size:16px">Total</b><b style="font-size:22px;color:var(--g800)">' + money(total) + '</b></div>' +
        '<div class="between" style="margin-top:4px"><span class="muted" style="font-size:12.5px;font-weight:700">Slot</span><b>' + esc(sel.slot.label) + '</b></div></div>' +

        U.btn('Place order · ' + money(total), 'place', { tone: 'primary', size: 'xl', icon: 'check', cls: 'block', disabled: sel.left <= 0 }) +
        (sel.left <= 0 ? '<p class="muted center" style="font-size:12.5px;margin-top:8px">This slot is full — choose another time.</p>' : '') +
        '<div style="height:14px"></div></div>',
      handlers: H({
        slot: (n, e, d) => { L.slot = d.s; AG.app.refresh(true); },
        method: (n, e, d) => { L.method = d.m; AG.app.refresh(true); },
        place: () => {
          const r = S.placeOrder({ customerId: c.id, slot: L.slot, method: L.method });
          if (!r.ok) { U.toast(r.error === 'slot_full' ? 'That slot just filled up — pick another' : 'Cart is empty', 'warn'); return; }
          const o = r.orders[0];
          U.modal({
            title: 'Order placed 🎉', icon: 'check',
            body: '<div class="card green" style="margin-bottom:12px"><div class="between"><div><div class="card-t">' + esc(o.id) + '</div>' +
              '<div class="card-s">' + esc(o.slotLabel) + ' · ' + esc(o.method) + '</div></div>' +
              '<div style="font-size:24px;font-weight:900;color:var(--g800)">' + money(r.orders.reduce((s, x) => s + x.total, 0)) + '</div></div></div>' +
              '<div class="lockrow" style="margin-bottom:11px">' + icon('lock', 18) +
              '<span>' + kg(r.orders.reduce((s, x) => s + x.qtyKg, 0)) + ' taken from the vendors’ reserved 70% stock. Available stock updated everywhere — including the government dashboard.</span></div>' +
              (r.routes.length ? '<div class="card blue tight"><div class="card-h"><div class="card-ic blue">' + icon('route', 20) + '</div><div>' +
                '<div class="card-t" style="font-size:14.5px">' + r.routes.length + ' optimised route offer(s) created</div>' +
                '<div class="card-s">' + r.routes.map(x => x.stops + ' drops · ' + x.distanceKm + ' km · ₹' + x.earnings).join(' | ') + '</div></div></div></div>' : ''),
            actions: [{ label: 'Track delivery', tone: 'primary', icon: 'truck', onClick: () => AG.app.go('customer', 'track', { id: o.id }) },
            { label: 'Keep shopping', tone: 'ghost', onClick: () => AG.app.go('customer', 'home') }]
          });
          AG.app.refresh(true);
        }
      })
    };
  }

  /* ---------------- TRACK / ORDERS ---------------- */
  function trackCard(o) {
    const st = U.ORDER_STATUS[o.status];
    const b = S.batch(o.batchId), v = S.vendor(o.vendorId);
    const p = o.partnerId ? S.partner(o.partnerId) : null;
    return '<button class="card" data-act="track" data-id="' + o.id + '" style="width:100%;text-align:left;cursor:pointer;display:block">' +
      '<div class="card-h"><div class="batch-thumb">' + cropArt(o.cropKey, 46) + '</div>' +
      '<div class="grow"><div class="card-t" style="font-size:15.5px">' + esc(o.id) + ' · ' + esc(o.cropName) + ' ' + kg(o.qtyKg) + '</div>' +
      '<div class="card-s">' + esc(o.slotLabel) + ' · ' + esc(v.name) + (p ? ' · ' + esc(p.name) : '') + '</div></div>' +
      '<div style="text-align:right">' + pill(st.label, st.tone) + '<div class="card-s" style="margin-top:5px">' + money(o.total) + '</div></div></div>' +
      '<div style="margin-top:10px">' + progress(st.step / 8 * 100, st.step >= 7 ? '' : 'blue') + '</div></button>';
  }

  function screenTrack() {
    const c = customer();
    const id = AG.app.currentNav().params.id;
    const o = id ? S.order(id) : S.state.orders.filter(x => x.customerId === c.id)[0];
    if (!o) return screenOrders();
    const st = U.ORDER_STATUS[o.status];
    const b = S.batch(o.batchId), v = S.vendor(o.vendorId), cust = c;
    const p = o.partnerId ? S.partner(o.partnerId) : null;
    const r = o.routeId ? S.route(o.routeId) : null;
    const steps = ['Placed', 'Confirmed', 'Packed', 'Partner assigned', 'Picked up', 'Out for delivery', 'Delivered'];
    const idx = Math.max(0, Math.min(6, (st.step || 1) - 1));
    const routePts = r ? [{ lat: v.lat, lng: v.lng }].concat(r.stopsList.map(s => ({ lat: s.lat, lng: s.lng }))) : [{ lat: v.lat, lng: v.lng }, { lat: cust.lat, lng: cust.lng }];
    return {
      html: head('Track ' + o.id, o.cropName + ' · ' + kg(o.qtyKg) + ' · ' + o.slotLabel, { back: true }) +
        '<div class="sec">' +
        '<div class="card"><div class="between" style="margin-bottom:10px">' + pill(st.label, st.tone, 'clock') +
        '<span class="muted" style="font-size:12.5px;font-weight:700">' + (o.deliveredAt ? 'Delivered ' + timeAgo(o.deliveredAt) : 'Slot ' + esc(o.slotLabel)) + '</span></div>' +
        U.stepper(steps, idx) + '</div>' +

        '<div class="card" style="padding:0;overflow:hidden">' +
        U.mapSVG({
          width: 380, height: 230,
          points: [{ lat: v.lat, lng: v.lng, color: '#D98A16', label: v.name.split(' ')[0] }]
            .concat(r ? r.stopsList.map((s, i) => ({
              lat: s.lat, lng: s.lng, color: s.done ? '#2E9E5B' : s.orderId === o.id ? '#B3352A' : '#20609F',
              kind: 'route-num', label: String(i + 1)
            })) : [{ lat: cust.lat, lng: cust.lng, color: '#20609F', label: 'You', pulse: true }]),
          routes: [{ points: routePts, color: '#0E7C86' }],
          legend: [{ color: '#D98A16', label: 'Vendor' }, { color: '#0E7C86', label: 'Optimised route' }, { color: '#B3352A', label: 'Your stop' }, { color: '#2E9E5B', label: 'Delivered' }]
        }) + '</div>' +

        (p ? '<div class="card"><div class="card-h"><div class="avatar" style="background:var(--violet-bg);color:var(--violet)">' + icon('truck', 22) + '</div>' +
          '<div class="grow"><div class="card-t" style="font-size:16px">' + esc(p.name) + '</div>' +
          '<div class="card-s">' + esc(p.vehicle) + ' · ' + p.rating + '★ · ' + esc(p.area) + '</div></div>' +
          '<div style="text-align:right"><div class="card-s">Route</div><div class="card-t">' + esc(r ? r.stops + ' drops' : '—') + '</div></div></div>' +
          (r ? '<div class="meta" style="margin-top:11px">' +
            '<div><div class="k">Your stop</div><div class="v">#' + (r.stopsList.findIndex(s => s.orderId === o.id) + 1) + ' of ' + r.stops + '</div></div>' +
            '<div><div class="k">Route distance</div><div class="v">' + km(r.distanceKm) + '</div></div>' +
            '<div><div class="k">Est. time</div><div class="v">' + r.etaMin + ' min</div></div>' +
            '<div><div class="k">Status</div><div class="v" style="font-size:14px">' + esc((U.ROUTE_STATUS[r.status] || {}).label || r.status) + '</div></div></div>' : '') +
          '</div>' :
          '<div class="card amber"><div class="card-h"><div class="card-ic amber">' + icon('clock', 20) + '</div><div>' +
          '<div class="card-t" style="font-size:15px">Waiting for a delivery partner</div>' +
          '<div class="card-s">Algorithm 2 groups orders in your slot and offers an optimised route. Usually assigned within minutes.</div></div></div></div>') +

        '<div class="card"><div class="sec-h" style="margin:0 0 9px"><h3 style="font-size:15.5px">Your basket</h3>' + pill(money(o.total), 'green') + '</div>' +
        '<div class="mv"><span class="dot"></span><div class="grow"><div class="k">' + esc(o.cropName) + ' · ' + kg(o.qtyKg) + '</div>' +
        '<div class="s">' + money1(o.pricePerKg) + '/kg · batch ' + esc(b.id) + ' · Grade ' + esc(b.grade) + '</div></div></div>' +
        '<div class="trace" style="margin-top:9px">' + icon('eye', 13) + '<span>' + esc(o.trackingId) + ' — farm to your home</span></div>' +
        '<div style="margin-top:10px">' + U.btn('Full traceability', null, { tone: 'ghost', size: 'sm', icon: 'gov', data: 'data-act="traceGov"' }) + '</div></div>' +

        '<div class="card"><div class="sec-h" style="margin:0 0 8px"><h3 style="font-size:15.5px">Live updates</h3></div>' +
        o.events.slice().reverse().map(e => '<div class="mv"><span class="dot" style="background:' + (e.status === 'delivered' ? 'var(--g600)' : 'var(--blue)') + '"></span>' +
          '<div class="grow"><div class="k">' + esc((U.ORDER_STATUS[e.status] || {}).label || e.status) + '</div><div class="s">' + esc(e.note) + '</div></div>' +
          '<div class="li-r" style="font-size:11.5px;color:var(--ink3)">' + timeAgo(e.ts) + '</div></div>').join('') + '</div>' +
        '</div>',
      handlers: H({ traceGov: () => { S.state.welcomed = true; S.save(); AG.app.go('gov', 'trace', { q: o.trackingId }); } })
    };
  }

  function screenOrders() {
    const c = customer();
    const list = S.state.orders.filter(o => o.customerId === c.id);
    return {
      html: head('My orders', list.length + ' orders · ' + money(list.reduce((s, o) => s + o.total, 0)) + ' spent', { back: true }) +
        '<div class="sec">' + (list.length ? list.map(trackCard).join('') : U.empty('No orders yet.', 'doc')) + '</div>',
      handlers: H({ track: (n, e, d) => AG.app.go('customer', 'track', { id: d.id }) })
    };
  }

  function screenProfile() {
    const c = customer();
    const list = S.state.orders.filter(o => o.customerId === c.id);
    const delivered = list.filter(o => ['delivered', 'completed'].includes(o.status));
    return {
      html: head(c.name, c.area + ', Pune', { back: true }) +
        '<div class="sec">' +
        '<div class="card"><div class="card-h"><div class="avatar">' + esc(c.name.split(' ').map(w => w[0]).slice(0, 2).join('')) + '</div>' +
        '<div class="grow"><div class="card-t" style="font-size:18px">' + esc(c.name) + '</div><div class="card-s">' + esc(c.area) + ' · ' + esc(c.phone) + '</div>' +
        '<div class="pill-row" style="margin-top:6px">' + pill('Verified', 'green', 'shield') + pill(c.family + ' members', 'blue', 'users') + '</div></div></div>' +
        '<div class="meta" style="margin-top:11px">' +
        '<div><div class="k">Orders</div><div class="v">' + list.length + '</div></div>' +
        '<div><div class="k">Delivered</div><div class="v">' + delivered.length + '</div></div>' +
        '<div><div class="k">Spent</div><div class="v">' + money(list.reduce((s, o) => s + o.total, 0)) + '</div></div>' +
        '<div><div class="k">Fresh lots tracked</div><div class="v">' + new Set(list.map(o => o.trackingId)).size + '</div></div></div></div>' +
        '<div class="card"><div class="sec-h" style="margin:0 0 9px"><h3 style="font-size:15px">Demo persona — switch customer</h3></div>' +
        '<div class="chips">' + S.state.customers.map(x => '<button class="chip sm" data-act="setCust" data-id="' + x.id + '" aria-pressed="' + (x.id === c.id) + '">' + esc(x.name.split(' ')[0]) + ' · ' + esc(x.area) + '</button>').join('') + '</div></div>' +
        '<div class="card"><div class="li static" style="border:0;box-shadow:none;padding:0;background:none"><span class="li-ic">' + icon('logout', 22) + '</span>' +
        '<span class="grow"><span class="li-t">Switch interface</span><span class="li-s">Farmer · Vendor · Delivery · Government</span></span>' +
        '<button class="btn sm ghost" data-act="welcome">Roles</button></div></div>' +
        '</div>',
      handlers: H({
        setCust: (n, e, d) => { S.state.currentCustomer = d.id; S.save(); U.toast('Now shopping as ' + S.customer(d.id).name, 'good'); AG.app.go('customer', 'home'); },
        welcome: () => { S.state.welcomed = false; S.save(); AG.app.refresh(true); }
      })
    };
  }

  function H(extra) {
    return Object.assign({
      go: (n, e, d) => AG.app.go('customer', d.tab, d.id ? { id: d.id } : {}),
      back: () => AG.app.go('customer', 'home')
    }, extra || {});
  }

  AG.apps = AG.apps || {};
  AG.apps.customer = {
    id: 'customer', wide: false,
    tabs: [
      { id: 'home', label: 'Shop', icon: 'home' },
      { id: 'cart', label: 'Cart', icon: 'cart', badge: () => S.state.cart.length || '' },
      { id: 'orders', label: 'Orders', icon: 'doc' },
      { id: 'track', label: 'Track', icon: 'truck' },
      { id: 'profile', label: 'Profile', icon: 'user' }
    ],
    render(tab) {
      switch (tab) {
        case 'home': return screenHome();
        case 'product': return screenProduct();
        case 'cart': return screenCart();
        case 'checkout': return screenCheckout();
        case 'track': return screenTrack();
        case 'orders': return screenOrders();
        case 'profile': return screenProfile();
        default: return screenHome();
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
